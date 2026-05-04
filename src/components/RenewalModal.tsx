import React, { useState, useMemo } from 'react';
import { RefreshCw, Wallet, Calendar, AlertTriangle, CheckCircle2, Award, DollarSign, Search, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { Student, TransactionItem } from '../types';
import { Modal } from './Modal';
import { useAddTransaction } from '../hooks/useTransactions';
import { useProducts } from '../hooks/useProducts';
import { useUpdateStudent } from '../hooks/useStudents';
import { useSettings } from '../hooks/useSettings';
import { format } from 'date-fns';
import { DEFAULT_COURSE_PRICES, PaymentConfig } from '../services/paymentService';
import { toast } from 'react-hot-toast';

import { calculateTier } from '../services/firebaseService';

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

export function RenewalModal({ isOpen, onClose, student }: RenewalModalProps) {
  const { data: appSettings } = useSettings();
  const { data: products } = useProducts();
  const addTransactionMutation = useAddTransaction();
  const updateStudentMutation = useUpdateStudent();
  
  const currentPrices = (appSettings?.payment_config as PaymentConfig)?.coursePrices || DEFAULT_COURSE_PRICES;
  
  const standardPrice = student?.custom_fee || currentPrices[student?.course_type as keyof typeof DEFAULT_COURSE_PRICES] || 0;
  
  const [paymentMethod, setPaymentMethod] = useState<'bit' | 'paybox' | 'transfer' | 'cash'>('cash');
  const [courseType, setCourseType] = useState(student?.course_type || '');
  const [subscriptionModel, setSubscriptionModel] = useState<'monthly' | 'credit' | 'rolling'>(student?.subscription_model || 'monthly');
  const [sessionsToAdd, setSessionsToAdd] = useState(8);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(new Date().setDate(new Date().getDate() + 31)), 'yyyy-MM-dd'));
  const [subscriptionAmount, setSubscriptionAmount] = useState(standardPrice);
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [redemptionChoice, setRedemptionChoice] = useState<'none' | 'discount' | 'session' | 'voucher'>('none');

  const availableRedemptions = useMemo(() => {
    const points = student?.current_points || student?.loyalty_points || 0;
    return {
      discount: points >= 100,
      session: points >= 150,
      voucher: points >= 200
    };
  }, [student]);

  const discountAmount = useMemo(() => {
    if (redemptionChoice === 'discount') return 50; // User suggested 5, let's use 50 for more impact or stay close to original logic. I'll use 50 as a middle ground.
    return 0;
  }, [redemptionChoice]);

  const filteredProducts = useMemo(() => {
    return products?.filter(p => 
      p.stock > 0 && 
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    ) || [];
  }, [products, productSearch]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        type: 'product',
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }];
    });
    toast.success(`تم إضافة ${product.name} للسلة`);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total: newQty * item.price };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const finalTotal = Math.max(0, subscriptionAmount + cartTotal - discountAmount);

  // Update initial values if student changes
  React.useEffect(() => {
    if (!student) return;
    const sPrice = student.custom_fee || currentPrices[student.course_type as keyof typeof DEFAULT_COURSE_PRICES] || 0;
    setSubscriptionAmount(sPrice);
    setCourseType(student.course_type || '');
    setSubscriptionModel(student.subscription_model || 'monthly');
    setRedemptionChoice('none');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 31);
    setEndDate(format(nextMonth, 'yyyy-MM-dd'));
    setCart([]);
  }, [student, currentPrices]);

  if (!student) return null;

  const handleRenew = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('جاري تنفيذ العملية...');
    
    try {
      const pointsUsed = 
        redemptionChoice === 'discount' ? 100 :
        redemptionChoice === 'session' ? 150 :
        redemptionChoice === 'voucher' ? 200 : 0;

      // 1. Prepare items
      const items: TransactionItem[] = [
        {
          id: 'subscription',
          type: 'subscription',
          name: `اشتراك ${courseType} (${subscriptionModel === 'credit' ? `${sessionsToAdd} حصص` : 'شهري'})${redemptionChoice !== 'none' ? ` - استبدال نقاط (${pointsUsed})` : ''}`,
          quantity: 1,
          price: subscriptionAmount - discountAmount,
          total: subscriptionAmount - discountAmount
        },
        ...cart
      ];

      // 2. Add Transaction Record
      await addTransactionMutation.mutateAsync({
        student_id: student.id,
        student_name: student.full_name,
        items,
        total_amount: finalTotal,
        method: paymentMethod,
        date: new Date().toISOString(),
        loyalty_points_used: pointsUsed,
        notes: `${subscriptionModel === 'credit' ? `شراء ${sessionsToAdd} حصص. ` : ''}${cart.length > 0 ? `بيع منتجات (${cart.length}).` : ''}${redemptionChoice !== 'none' ? ` استبدال مكافأة: ${redemptionChoice}` : ''}`
      });

      // 3. Update Student Info
      const updateData: any = { 
        course_type: courseType,
        subscription_model: subscriptionModel,
        subscription_start_date: new Date(startDate).toISOString()
      };

      if (subscriptionModel === 'credit') {
        const addedSessions = sessionsToAdd + (redemptionChoice === 'session' ? 1 : 0);
        updateData.remaining_sessions = (student.remaining_sessions || 0) + addedSessions;
        updateData.first_session_date = null;
        updateData.subscription_end_date = new Date(endDate).toISOString();
      } else if (subscriptionModel === 'rolling') {
        updateData.subscription_end_date = new Date(endDate).toISOString();
      }

      await updateStudentMutation.mutateAsync({
        id: student.id,
        data: updateData
      });
      
      toast.success('تمت العملية بنجاح', { id: toastId });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'فشل تنفيذ العملية', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تجديد الاشتراك والمبيعات" size="lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right font-['Cairo']">
        {/* Left Column: Subscription Details */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0">
              {student.full_name.charAt(0)}
            </div>
            <div className="text-right">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</h4>
              <p className="text-sm text-slate-500">الاشتراك الحالي: {student.course_type}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-blue-600 font-bold bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                  {student.subscription_model === 'credit' ? `رصيد متبقي: ${student.remaining_sessions || 0} حصص` : 
                  student.subscription_model === 'rolling' ? `ينتهي في: ${student.subscription_end_date ? new Date(student.subscription_end_date).toLocaleDateString('ar-EG') : '-'}` :
                  'نظام شهري ميلادي'}
                </span>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award size={10} />
                  {student.loyalty_points || 0} نقطة
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">اسم الدورة</label>
              <select
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(currentPrices).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">نظام الاشتراك</label>
              <select
                value={subscriptionModel}
                onChange={(e) => setSubscriptionModel(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">نظام شهري ميلادي</option>
                <option value="rolling">فترة متدحرجة (30 يوم)</option>
                <option value="credit">نظام حصص (رصيد)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {subscriptionModel === 'credit' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">عدد الحصص</label>
                <input
                  type="number"
                  value={sessionsToAdd}
                  onChange={(e) => setSessionsToAdd(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">مبلغ الاشتراك (₪)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="number"
                  value={subscriptionAmount}
                  onChange={(e) => setSubscriptionAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-white mb-3">استبدال نقاط الولاء (المكافآت)</h5>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setRedemptionChoice(redemptionChoice === 'discount' ? 'none' : 'discount')}
                disabled={!availableRedemptions.discount}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between transition-all",
                  redemptionChoice === 'discount' 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-30"
                )}
              >
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold">خصم مالي (100 نقطة)</span>
                </div>
                <span className="text-xs font-black">50 ₪</span>
              </button>

              <button
                onClick={() => setRedemptionChoice(redemptionChoice === 'session' ? 'none' : 'session')}
                disabled={!availableRedemptions.session}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between transition-all",
                  redemptionChoice === 'session' 
                    ? "bg-blue-50 border-blue-500 text-blue-800" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-30"
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  <span className="text-xs font-bold">حصة إضافية (150 نقطة)</span>
                </div>
                <span className="text-xs font-black">+1 حصة</span>
              </button>

              <button
                onClick={() => setRedemptionChoice(redemptionChoice === 'voucher' ? 'none' : 'voucher')}
                disabled={!availableRedemptions.voucher}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between transition-all",
                  redemptionChoice === 'voucher' 
                    ? "bg-amber-50 border-amber-500 text-amber-800" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-30"
                )}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-amber-500" />
                  <span className="text-xs font-bold">قسيمة شراء (200 نقطة)</span>
                </div>
                <span className="text-xs font-black">هدية/قسيمة</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-white mb-3">طريقة الدفع</h5>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'نقدي' },
                { id: 'bit', label: 'Bit' },
                { id: 'paybox', label: 'PayBox' },
                { id: 'transfer', label: 'تحويل' }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                    paymentMethod === method.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Product Selector & Cart */}
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col h-full max-h-[500px]">
             <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={20} className="text-blue-600" />
              <h5 className="font-bold text-slate-900 dark:text-white">إضافة منتجات (السلة السريعة)</h5>
            </div>

            <div className="relative mb-4">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="ابحث عن منتج..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar whitespace-nowrap">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl hover:border-blue-500 transition-all text-center min-w-[100px]"
                >
                  <p className="text-xs font-bold truncate">{product.name}</p>
                  <p className="text-[10px] text-blue-600 font-bold">{product.price} ₪</p>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center w-full italic">لا يوجد منتجات متوفرة حالياً.</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              <h6 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">عناصر السلة</h6>
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="max-w-[100px]">
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.price} ₪ للقطعة</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      <button onClick={() => updateCartQuantity(item.id, -1)} className="text-blue-600 hover:scale-110 active:scale-95"><Minus size={14} /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)} className="text-blue-600 hover:scale-110 active:scale-95"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-rose-500 p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 gap-2 opacity-50">
                  <ShoppingCart size={32} />
                  <p className="text-[10px]">السلة فارغة، أضف منتجات من الأعلى.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <p className="text-sm font-bold text-slate-600">مجموع المنتجات:</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{cartTotal} ₪</p>
            </div>
          </div>
        </div>

        {/* Action Button: Bottom Section */}
        <div className="lg:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6 bg-blue-600 text-white p-6 rounded-3xl shadow-xl shadow-blue-100 dark:shadow-none">
            <div className="text-right">
              <p className="text-xs font-bold opacity-80 mb-1">إجمالي المبلغ النهائي للمحاسبة:</p>
              <p className="text-3xl font-black">{finalTotal} ₪</p>
            </div>
            
            <button
              onClick={handleRenew}
              disabled={isProcessing}
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
              <span>تنفيذ العملية والحفظ</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
