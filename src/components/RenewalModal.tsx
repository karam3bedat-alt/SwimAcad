import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, Wallet, Calendar, AlertTriangle, CheckCircle2, Award, 
  DollarSign, Search, ShoppingCart, Plus, Minus, Trash2, 
  Check, Printer, Send, Ticket
} from 'lucide-react';
import { Student, TransactionItem } from '../types';
import { Modal } from './Modal';
import { useAddTransaction } from '../hooks/useTransactions';
import { useProducts } from '../hooks/useProducts';
import { useUpdateStudent } from '../hooks/useStudents';
import { useSettings } from '../hooks/useSettings';
import { useAddPayment } from '../hooks/usePayments';
import { useCourses } from '../hooks/useCourses';
import { format } from 'date-fns';
import { DEFAULT_COURSE_PRICES, PaymentConfig } from '../services/paymentService';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { calculateTier } from '../services/firebaseService';

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

// Fixed Promo/Discount Codes
const PROMO_CODES = [
  { code: 'WELCOME10', type: 'percent', value: 10, label: 'خصم ترحيبي ١٠%' },
  { code: 'VIP20', type: 'percent', value: 20, label: 'خصم كبار العملاء ٢٠%' },
  { code: 'KARAM50', type: 'fixed', value: 50, label: 'كوبون مطور الأكاديمية كرم كرم - ٥٠ شيكل' },
  { code: 'ACADEMY100', type: 'fixed', value: 100, label: 'منحة الأكاديمية الخاصة - ١٠٠ شيكل' }
] as const;

export function RenewalModal({ isOpen, onClose, student }: RenewalModalProps) {
  const { data: appSettings } = useSettings();
  const { data: products } = useProducts();
  const addTransactionMutation = useAddTransaction();
  const updateStudentMutation = useUpdateStudent();
  const addPaymentMutation = useAddPayment();
  const { data: courses = [] } = useCourses();
  
  const currentPrices = (appSettings?.payment_config as PaymentConfig)?.coursePrices || DEFAULT_COURSE_PRICES;
  
  const safeLocaleDateString = (dateVal: any, locale: string = 'ar-EG') => {
    if (!dateVal || dateVal === 'null' || dateVal === 'undefined' || dateVal === '-') return '-';
    try {
      const parsed = new Date(dateVal);
      if (isNaN(parsed.getTime())) return '-';
      return parsed.toLocaleDateString(locale);
    } catch {
      return '-';
    }
  };
  
  // States
  const [courseType, setCourseType] = useState('');
  const [subscriptionModel, setSubscriptionModel] = useState<'monthly' | 'credit' | 'rolling'>('monthly');
  const [selectedDuration, setSelectedDuration] = useState<1 | 3 | 6 | 12 | 'custom'>(1);
  const [sessionsToAdd, setSessionsToAdd] = useState(8);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(new Date().setDate(new Date().getDate() + 31)), 'yyyy-MM-dd'));
  const [subscriptionAmount, setSubscriptionAmount] = useState(0);
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bit' | 'paybox' | 'transfer' | 'cash'>('cash');
  
  // Advanced features state
  const [redemptionChoice, setRedemptionChoice] = useState<'none' | 'discount' | 'session' | 'voucher'>('none');
  const [promoCode, setPromoCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; type: 'percent' | 'fixed'; value: number; label: string } | null>(null);
  
  // Custom amount paid vs invoice total (Debt tracking)
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isAmountPaidCustom, setIsAmountPaidCustom] = useState(false);
  
  // Receipt State
  const [renewalReceipt, setRenewalReceipt] = useState<{
    id: string;
    studentName: string;
    courseType: string;
    durationLabel: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    amountPaid: number;
    remainingDebt: number;
    paymentMethod: string;
    pointsEarned: number;
    pointsUsed: number;
  } | null>(null);

  // Derive loyal points
  const loyaltyPoints = student?.current_points ?? student?.loyalty_points ?? 0;

  const availableRedemptions = useMemo(() => {
    return {
      discount: loyaltyPoints >= 100,
      session: loyaltyPoints >= 150,
      voucher: loyaltyPoints >= 200
    };
  }, [loyaltyPoints]);

  const discountAmount = useMemo(() => {
    if (redemptionChoice === 'discount') return 50;
    return 0;
  }, [redemptionChoice]);

  // Base Course Single Month Price
  const baseCoursePrice = useMemo(() => {
    if (!student) return 0;
    return student.custom_fee || currentPrices[courseType] || currentPrices[student.course_type || ''] || Object.values(currentPrices)[0] || 600;
  }, [student, currentPrices, courseType]);

  // Sync Initial Values when Student changes
  React.useEffect(() => {
    if (!student) return;
    const initialCourseType = student.course_type || Object.keys(currentPrices)[0] || '';
    setCourseType(initialCourseType);
    
    const initialModel = student.subscription_model || 'monthly';
    setSubscriptionModel(initialModel);
    
    setRedemptionChoice('none');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedDuration(initialModel === 'credit' ? 'custom' : 1);
    setCart([]);
    setIsAmountPaidCustom(false);
    setActiveCoupon(null);
    setPromoCode('');
    setRenewalReceipt(null);
  }, [student, currentPrices]);

  // Dynamically update Subscription price and End Date based on Package Duration and Start Date
  React.useEffect(() => {
    if (!student) return;

    if (subscriptionModel === 'credit') {
      setSubscriptionAmount(baseCoursePrice);
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + 3); // 3 months credit validity
      setEndDate(format(d, 'yyyy-MM-dd'));
      return;
    }

    if (selectedDuration === 'custom') {
      return;
    }

    const months = selectedDuration;
    const discountPercent = 
      months === 3 ? 0.10 :
      months === 6 ? 0.15 :
      months === 12 ? 0.25 : 0;
    
    const calculatedAmount = Math.round(baseCoursePrice * months * (1 - discountPercent));
    setSubscriptionAmount(calculatedAmount);

    const d = new Date(startDate);
    d.setMonth(d.getMonth() + months);
    setEndDate(format(d, 'yyyy-MM-dd'));
  }, [baseCoursePrice, selectedDuration, startDate, subscriptionModel, student]);

  const couponDiscountAmount = useMemo(() => {
    if (!activeCoupon) return 0;
    if (activeCoupon.type === 'percent') {
      return Math.round(subscriptionAmount * (activeCoupon.value / 100));
    }
    return activeCoupon.value;
  }, [activeCoupon, subscriptionAmount]);

  // Product Inventory Search
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

  // Calculations
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  
  const finalTotal = useMemo(() => {
    const total = subscriptionAmount + cartTotal - discountAmount - couponDiscountAmount;
    return Math.max(0, total);
  }, [subscriptionAmount, cartTotal, discountAmount, couponDiscountAmount]);

  // Auto-sync amount paid with invoice total unless customized
  React.useEffect(() => {
    if (!isAmountPaidCustom) {
      setAmountPaid(finalTotal);
    }
  }, [finalTotal, isAmountPaidCustom]);

  if (!student) return null;

  const handleRenew = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('جاري تنفيذ تسوية الاشتراك والمبيعات...');
    
    try {
      const pointsUsed = 
        redemptionChoice === 'discount' ? 100 :
        redemptionChoice === 'session' ? 150 :
        redemptionChoice === 'voucher' ? 200 : 0;

      const durationLabel = subscriptionModel === 'credit' 
        ? `رصيد حصص (${sessionsToAdd} حصص)` 
        : (selectedDuration === 'custom' ? 'باقة مخصصة' : `باقة ${selectedDuration} أشهر`);

      // 1. Prepare items
      const items: TransactionItem[] = [
        {
          id: 'subscription',
          type: 'subscription',
          name: `اشتراك ${courseType} (${durationLabel})${redemptionChoice !== 'none' ? ` - نقاط (${pointsUsed})` : ''}${activeCoupon ? ` [كوبون ${activeCoupon.code}]` : ''}`,
          quantity: 1,
          price: subscriptionAmount - discountAmount - couponDiscountAmount,
          total: subscriptionAmount - discountAmount - couponDiscountAmount
        },
        ...cart
      ];

      // 2. Add Transaction Record (Handles stock updating & loyalty points calculation in Firebase)
      await addTransactionMutation.mutateAsync({
        student_id: student.id,
        student_name: student.full_name,
        items,
        total_amount: finalTotal,
        method: paymentMethod,
        date: new Date().toISOString(),
        loyalty_points_used: pointsUsed,
        notes: `${subscriptionModel === 'credit' ? `شراء ${sessionsToAdd} حصص.` : ''} تجديد باقة ${durationLabel}. المدفوع: ${amountPaid}، المتبقي: ${Math.max(0, finalTotal - amountPaid)} ₪. ${cart.length > 0 ? `منتجات إضافية (${cart.length}).` : ''}`
      });

      // 3. Add Payment Ledger Entry (Aligns with Monthly Payment Dashboard & outstanding debts list!)
      await addPaymentMutation.mutateAsync({
        student_id: student.id,
        student_name: student.full_name,
        amount: amountPaid,
        required_amount: finalTotal,
        method: paymentMethod,
        month: new Date(startDate).toLocaleString('ar-EG', { month: 'long', year: 'numeric' }),
        course_type: courseType,
        date: new Date().toISOString(),
        notes: `تجديد باقة ${durationLabel}. تذكرة رقمية.${amountPaid < finalTotal ? ` (متبقي مستحق: ${finalTotal - amountPaid} ₪)` : ' (مسدد بالكامل)'}`
      });

      // 4. Update Student Subscriber Meta Details
      const updateData: any = { 
        course_type: courseType,
        subscription_model: subscriptionModel,
        subscription_start_date: new Date(startDate).toISOString(),
        subscription_end_date: subscriptionModel === 'credit' ? null : new Date(endDate).toISOString()
      };

      // Check if current course cycle is completed or missing
      const currentCourse = student.course_id ? courses.find(c => c.id === student.course_id) : null;
      if (!currentCourse || currentCourse.status === 'مكتمل') {
        // Find a pre-added course of the same course_type/category that is not completed (either 'نشط' or 'قادم')
        const nextActiveCourse = courses.find(c => c.course_type === courseType && c.status !== 'مكتمل');
        if (nextActiveCourse) {
          updateData.course_id = nextActiveCourse.id;
        } else {
          updateData.course_id = ''; // remove their completed/stale course assignment
        }
      }

      if (subscriptionModel === 'credit') {
        const addedSessions = sessionsToAdd + (redemptionChoice === 'session' ? 1 : 0);
        updateData.remaining_sessions = (student.remaining_sessions || 0) + addedSessions;
        updateData.first_session_date = null;
        updateData.subscription_end_date = new Date(endDate).toISOString();
      }

      await updateStudentMutation.mutateAsync({
        id: student.id,
        data: updateData
      });

      // Calculate approximate points earned for receipt card
      const pointsEarned = Math.floor(subscriptionAmount) + Math.floor(cartTotal);
      
      // Initialize Receipt template state to redirect UI
      setRenewalReceipt({
        id: `REC-${Date.now().toString().slice(-6)}`,
        studentName: student.full_name,
        courseType,
        durationLabel,
        startDate,
        endDate: subscriptionModel === 'credit' ? 'صلاحية مفتوحة' : endDate,
        totalAmount: finalTotal,
        amountPaid,
        remainingDebt: Math.max(0, finalTotal - amountPaid),
        paymentMethod: paymentMethod === 'cash' ? 'نقدي' : paymentMethod.toUpperCase(),
        pointsEarned,
        pointsUsed
      });

      toast.success('تمت تسوية وتجديد الاشتراك بنجاح', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'فشل تنفيذ تجديد الاشتراك', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptClose = () => {
    setRenewalReceipt(null);
    onClose();
  };

  const handleWhatsAppShare = () => {
    if (!renewalReceipt) return;
    const debtMsg = renewalReceipt.remainingDebt > 0 
      ? `\n⚠️ المبلغ المتبقي للسداد (دين): *${renewalReceipt.remainingDebt} ₪*` 
      : `\n✅ تم السداد بالكامل والحمد لله.`;

    const text = `*سند استلام وتجديد اشتراك رقم: ${renewalReceipt.id}* 🏊‍♂️✨
-----------------------------------------
مرحباً بكم، تم بنجاح تجديد الاشتراك في الأكاديمية:

👤 *الطالب:* ${renewalReceipt.studentName}
🏊‍♂️ *الدورة:* ${renewalReceipt.courseType}
🗓️ *المدّة/الباقة:* ${renewalReceipt.durationLabel}
📅 *تاريخ البدء:* ${renewalReceipt.startDate}
📅 *تاريخ الانتهاء:* ${renewalReceipt.endDate}

💎 *تفاصيل الحساب المالي:*
- إجمالي قيمة الفاتورة: ${renewalReceipt.totalAmount} ₪
- المبلغ المستلم: ${renewalReceipt.amountPaid} ₪${debtMsg}
- طريقة المحاسبة: *${renewalReceipt.paymentMethod}*

🎁 *نقاط الولاء المكتسبة:* +${renewalReceipt.pointsEarned} نقطة

يسعدنا دوماً خدمتكم ونهدف دوماً لسلامة ورقي أبنائكم! 🌸`;

    const cleanedPhone = (student.phone || student.parent_phone || '').replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // If receipt is active, render the Digital Invoice Screen instead of the renewal form
  if (renewalReceipt) {
    return (
      <Modal isOpen={isOpen} onClose={handleReceiptClose} title="سند قبض واشتراك رقمي" size="md">
        <div className="space-y-6 text-right font-['Cairo'] pb-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-950/10 rounded-full -mr-16 -mt-16 -z-10" />
            
            <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">سند دفع وإيصال مالي</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">CODE: {renewalReceipt.id}</p>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">{format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
            </div>

            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="font-extrabold text-slate-900 dark:text-slate-100">{renewalReceipt.studentName}</span>
                <span className="text-slate-400">اسم الطالب:</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">{renewalReceipt.courseType}</span>
                <span className="text-slate-400">الدورة / التصنيف:</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">{renewalReceipt.durationLabel}</span>
                <span className="text-slate-400">المدّة / باقة التجديد:</span>
              </div>
              
              {renewalReceipt.endDate !== 'صلاحية مفتوحة' && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-bold border border-slate-100 dark:border-slate-800 my-4">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-slate-400">تاريخ انتهاء الاشتراك</p>
                    <p className="font-mono mt-1 text-slate-900 dark:text-white text-sm">{renewalReceipt.endDate}</p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-slate-400">تاريخ بدء الاشتراك</p>
                    <p className="font-mono mt-1 text-slate-900 dark:text-white text-sm">{renewalReceipt.startDate}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{renewalReceipt.totalAmount} ₪</span>
                  <span className="text-slate-400">إجمالي قيمة الفاتورة:</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">{renewalReceipt.amountPaid} ₪</span>
                  <span className="text-slate-400">المبلغ المدفوع كاش:</span>
                </div>
                
                {renewalReceipt.remainingDebt > 0 ? (
                  <div className="flex justify-between items-center text-sm bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
                    <span className="font-black text-base">{renewalReceipt.remainingDebt} ₪</span>
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      <AlertTriangle size={14} />
                      متبقي ذمة مالية معلقة:
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/40">
                    <span>مغلق ومسدد بالكامل</span>
                    <span>✓ حالة الحساب</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{renewalReceipt.paymentMethod}</span>
                  <span className="text-slate-400">طريقة الدفع الفعليّة:</span>
                </div>
              </div>

              {/* Loyalty banner */}
              <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-3 rounded-2xl text-amber-700 dark:text-amber-300 flex items-center justify-between text-xs border border-amber-200/40 mt-3 shadow-inner">
                <div className="flex items-center gap-1.5 font-bold">
                  <Award size={16} className="text-amber-500 animate-pulse" />
                  <span>النقاط الجديدة المكتسبة:</span>
                </div>
                <span className="font-black text-sm">+{renewalReceipt.pointsEarned} نقطة</span>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 italic">
              الأكاديمية الأحدث للتأهيل والرياضات المائية 🏊‍♂️✨
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <Send size={15} />
              <span>مشاركة الوصل (واتساب)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3.5 px-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة سند القبض</span>
            </button>

            <button
              onClick={handleReceiptClose}
              className="bg-blue-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer sm:col-span-1 col-span-2"
            >
              <CheckCircle2 size={15} />
              <span>إنهاء ومتابعة</span>
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تجديد الاشتراك ونظام المبيعات المتكامل" size="lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right font-['Cairo']">
        
        {/* Left Column: Subscription Details */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-2xl border border-blue-100/60 dark:border-blue-900/30 shadow-sm">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-extrabold text-xl shrink-0">
              {student.full_name.charAt(0)}
            </div>
            <div className="text-right flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">{student.full_name}</h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">الدورة الحالية: {student.course_type || 'غير محدد'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-100/60 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
                  {student.subscription_model === 'credit' ? `رصيد متبقي: ${student.remaining_sessions || 0} حصص` : 
                  student.subscription_model === 'rolling' ? `ينتهي في: ${safeLocaleDateString(student.subscription_end_date)}` :
                  'نظام شهري ميلادي'}
                </span>
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100/60 dark:bg-amber-950/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award size={10} />
                  {loyaltyPoints} نقطة ({student.loyalty_tier || 'برونزي'})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">نوع الدورة التدريبية</label>
              <select
                value={courseType}
                onChange={(e) => {
                  setCourseType(e.target.value);
                  setIsAmountPaidCustom(false);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
              >
                {Object.keys(currentPrices).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">نظام التجديد الفعلي</label>
              <select
                value={subscriptionModel}
                onChange={(e) => {
                  const model = e.target.value as any;
                  setSubscriptionModel(model);
                  setSelectedDuration(model === 'credit' ? 'custom' : 1);
                  setIsAmountPaidCustom(false);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
              >
                <option value="monthly">نظام باقة شهري ميلادي</option>
                <option value="rolling">فترة متدحرجة (30 يوم أو باقات)</option>
                <option value="credit">شراء حصص (رصيد حصص)</option>
              </select>
            </div>
          </div>

          {/* New Package Duration Selector */}
          {subscriptionModel !== 'credit' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">اختر باقة الاشتراك والمدّة</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { value: 1, label: '١ شهر', tag: 'بدون خصم' },
                  { value: 3, label: '٣ أشهر', tag: 'وفر ١٠%' },
                  { value: 6, label: '٦ أشهر', tag: 'وفر ١٥%' },
                  { value: 12, label: '١٢ شهر', tag: 'وفر ٢٥%' },
                  { value: 'custom', label: 'مخصص', tag: 'تاريخ مرن' }
                ].map((dur) => (
                  <button
                    key={dur.value}
                    type="button"
                    onClick={() => {
                      setSelectedDuration(dur.value as any);
                      setIsAmountPaidCustom(false);
                    }}
                    className={cn(
                      "py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm text-center",
                      selectedDuration === dur.value
                        ? "bg-blue-600 border-blue-600 text-white scale-102 ring-2 ring-blue-400 ring-offset-1"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                    )}
                  >
                    <span className="text-[11px] font-black leading-tight">{dur.label}</span>
                    <span className={cn(
                      "text-[8px] font-medium leading-none mt-1 opacity-90",
                      selectedDuration === dur.value ? "text-blue-100" : "text-amber-600 font-bold"
                    )}>
                      {dur.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Calendar selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">تاريخ بدء الاشتراك</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setIsAmountPaidCustom(false);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">تاريخ انتهاء الاشتراك</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedDuration('custom');
                    setIsAmountPaidCustom(false);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                  disabled={subscriptionModel === 'credit'}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subscriptionModel === 'credit' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">عدد الحصص المضافة</label>
                <input
                  type="number"
                  value={sessionsToAdd}
                  onChange={(e) => {
                    setSessionsToAdd(Number(e.target.value));
                    setIsAmountPaidCustom(false);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-sm"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 text-right block">سعر باقة الاشتراك (₪)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="number"
                  value={subscriptionAmount}
                  onChange={(e) => {
                    setSubscriptionAmount(Number(e.target.value));
                    setIsAmountPaidCustom(false);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-extrabold text-sm"
                />
              </div>
            </div>
          </div>

          {/* Loyalty Rewards integration */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] text-slate-400 font-bold">نقاطك: {loyaltyPoints}</span>
              <h5 className="font-bold text-slate-900 dark:text-white text-xs">استبدال نقاط الولاء والمكافآت</h5>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRedemptionChoice(redemptionChoice === 'discount' ? 'none' : 'discount');
                  setIsAmountPaidCustom(false);
                }}
                disabled={!availableRedemptions.discount}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs",
                  redemptionChoice === 'discount' 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-30 dark:text-slate-400"
                )}
              >
                <div className="flex items-center gap-2 font-bold">
                  <DollarSign size={15} className="text-emerald-500" />
                  <span>خصم مالي بقيمة (100 نقطة)</span>
                </div>
                <span className="font-black text-xs">50 ₪</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRedemptionChoice(redemptionChoice === 'session' ? 'none' : 'session');
                  setIsAmountPaidCustom(false);
                }}
                disabled={!availableRedemptions.session}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs",
                  redemptionChoice === 'session' 
                    ? "bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-30 dark:text-slate-400"
                )}
              >
                <div className="flex items-center gap-2 font-bold">
                  <Calendar size={15} className="text-blue-500" />
                  <span>حصة سباحة إضافية مجانية (150 نقطة)</span>
                </div>
                <span className="font-black text-xs">+1 حصة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRedemptionChoice(redemptionChoice === 'voucher' ? 'none' : 'voucher');
                  setIsAmountPaidCustom(false);
                }}
                disabled={!availableRedemptions.voucher}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs",
                  redemptionChoice === 'voucher' 
                    ? "bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-30 dark:text-slate-400"
                )}
              >
                <div className="flex items-center gap-2 font-bold">
                  <ShoppingCart size={15} className="text-amber-500" />
                  <span>قسيمة هدايا فورية (200 نقطة)</span>
                </div>
                <span className="font-black text-xs">كوبون/هدية</span>
              </button>
            </div>
          </div>

          {/* New Promo Coupon Code field */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-white mb-2 text-xs">تطبيق كوبون خصم ترويجي</h5>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="أدخل رمز الكوبون (مثل: VIP20, WELCOME10)"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                }}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                disabled={!!activeCoupon}
              />
              {activeCoupon ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCoupon(null);
                    setPromoCode('');
                    setIsAmountPaidCustom(false);
                  }}
                  className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 cursor-pointer"
                >
                  إلغاء الكوبون
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const matched = PROMO_CODES.find(cc => cc.code === promoCode.trim());
                    if (matched) {
                      setActiveCoupon(matched);
                      setIsAmountPaidCustom(false);
                      toast.success(`تم تفعيل: ${matched.label}`);
                    } else {
                      toast.error('هذا الكوبون غير متاح أو تالف');
                    }
                  }}
                  className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-200 dark:border-blue-900/30 cursor-pointer"
                  disabled={!promoCode.trim()}
                >
                  تطبيق
                </button>
              )}
            </div>
            {activeCoupon && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                <span>✓ تم تفعيل كوبون:</span>
                <span className="underline">{activeCoupon.label}</span>
                <span>(-{activeCoupon.type === 'percent' ? `${activeCoupon.value}%` : `${activeCoupon.value} ₪`})</span>
              </p>
            )}
          </div>

          {/* Amount Paid vs Total (Debt configuration) */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className={cn(
                "p-1.5 rounded-lg text-[10px]", 
                amountPaid < finalTotal ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
              )}>
                {amountPaid < finalTotal ? `⚠️ ذمة مالية متبقية: ${finalTotal - amountPaid} ₪` : '✓ مسدد بالكامل'}
              </span>
              <label>المبلغ المستلم فعلياً (₪)</label>
            </div>
            <div className="relative">
              <Wallet className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => {
                  setAmountPaid(Number(e.target.value));
                  setIsAmountPaidCustom(true);
                }}
                className={cn(
                  "w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm",
                  amountPaid < finalTotal 
                    ? "border-amber-400 bg-amber-50/10 focus:ring-amber-500" 
                    : "border-slate-200 dark:border-slate-700"
                )}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h5 className="font-bold text-slate-900 dark:text-white mb-2 text-xs">طريقة الدفع للمحاسب</h5>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'نقدي' },
                { id: 'bit', label: 'Bit ₪' },
                { id: 'paybox', label: 'PayBox' },
                { id: 'transfer', label: 'تحويل بنكي' }
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    paymentMethod === method.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md font-black scale-102 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
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
          <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col h-full max-h-[580px] shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={18} className="text-blue-600" />
              <h5 className="font-bold text-slate-900 dark:text-white text-xs">إضافة مبيعات موازية للسلة السريعة</h5>
            </div>

            <div className="relative mb-3">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="ابحث عن منتج متوفر بالمخزن..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-3 mb-3 custom-scrollbar whitespace-nowrap">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl hover:border-blue-500 transition-all text-center min-w-[100px] cursor-pointer"
                >
                  <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{product.name}</p>
                  <p className="text-[10px] text-blue-600 font-extrabold mt-0.5">{product.price} ₪</p>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center w-full italic">لا يوجد منتجات متوفرة حالياً.</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">عناصر السلة الحالية ({cart.length})</h6>
              
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="max-w-[110px] text-right">
                    <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{item.price} ₪ / قطعة</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      <button type="button" onClick={() => updateCartQuantity(item.id, -1)} className="text-blue-600 hover:scale-110 active:scale-95 cursor-pointer"><Minus size={13} /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQuantity(item.id, 1)} className="text-blue-600 hover:scale-110 active:scale-95 cursor-pointer"><Plus size={13} /></button>
                    </div>
                    <button type="button" onClick={() => removeFromCart(item.id)} className="text-rose-500 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 gap-2 opacity-50">
                  <ShoppingCart size={28} />
                  <p className="text-[10px]">لم يتم تحديد أي مبيعات إضافية.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">مجموع المبيعات الإضافية (₪)</p>
              <p className="text-base font-black text-slate-900 dark:text-white font-mono">{cartTotal} ₪</p>
            </div>
          </div>
        </div>

        {/* Invoice Summary Box & action button */}
        <div className="lg:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 mb-4 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="font-bold">{subscriptionAmount} ₪</span>
              <span>باقة الاشتراك الأساسي:</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 font-bold">
                <span>-{discountAmount} ₪</span>
                <span>خصم نقاط الولاء مستبدل:</span>
              </div>
            )}
            {couponDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600 font-bold">
                <span>-{couponDiscountAmount} ₪</span>
                <span>خصم الكوبون المستعمل:</span>
              </div>
            )}
            {cartTotal > 0 && (
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>+{cartTotal} ₪</span>
                <span>منتجات ومبيعات السلة:</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-900 dark:text-white font-black text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>{finalTotal} ₪</span>
              <span>المبلغ الإجمالي المستحق للفاتورة:</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-blue-600 text-white p-6 rounded-3xl shadow-xl shadow-blue-100 dark:shadow-none">
            <div className="text-right">
              <p className="text-xs font-bold opacity-80 mb-1">المطلوب سداده الآن:</p>
              <p className="text-2xl font-black font-sans">{amountPaid} ₪</p>
            </div>
            
            <button
              onClick={handleRenew}
              disabled={isProcessing}
              className="bg-white text-blue-600 px-8 py-3.5 rounded-2xl font-black hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-sm shrink-0"
            >
              {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              <span>تأكيد وتسجيل التجديد</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
