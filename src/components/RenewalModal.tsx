import React, { useState } from 'react';
import { RefreshCw, Wallet, Calendar, AlertTriangle, CheckCircle2, Award, DollarSign, Search } from 'lucide-react';
import { Student } from '../types';
import { Modal } from './Modal';
import { usePayments, useAddPayment } from '../hooks/usePayments';
import { useUpdateStudent } from '../hooks/useStudents';
import { useSettings } from '../hooks/useSettings';
import { format } from 'date-fns';
import { DEFAULT_COURSE_PRICES, PaymentConfig } from '../services/paymentService';
import { toast } from 'react-hot-toast';

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

export function RenewalModal({ isOpen, onClose, student }: RenewalModalProps) {
  const { data: appSettings } = useSettings();
  const addPaymentMutation = useAddPayment();
  const updateStudentMutation = useUpdateStudent();
  
  const currentPrices = (appSettings?.payment_config as PaymentConfig)?.coursePrices || DEFAULT_COURSE_PRICES;
  
  const standardPrice = student?.custom_fee || currentPrices[student?.course_type as keyof typeof DEFAULT_COURSE_PRICES] || 0;
  
  const hasLoyaltyDiscount = (student?.loyalty_points || 0) >= 100;
  const discountAmount = hasLoyaltyDiscount ? 100 : 0;
  const initialPrice = Math.max(0, standardPrice - discountAmount);

  const [paymentMethod, setPaymentMethod] = useState<'bit' | 'paybox' | 'transfer' | 'cash'>('cash');
  const [courseType, setCourseType] = useState(student?.course_type || '');
  const [subscriptionModel, setSubscriptionModel] = useState<'monthly' | 'credit' | 'rolling'>(student?.subscription_model || 'monthly');
  const [sessionsToAdd, setSessionsToAdd] = useState(8);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(new Date().setDate(new Date().getDate() + 31)), 'yyyy-MM-dd'));
  const [customAmount, setCustomAmount] = useState(initialPrice);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update initial values if student changes or loyalty discount status changes
  React.useEffect(() => {
    if (!student) return;
    const sPrice = student.custom_fee || currentPrices[student.course_type as keyof typeof DEFAULT_COURSE_PRICES] || 0;
    const disc = (student.loyalty_points || 0) >= 100 ? 100 : 0;
    setCustomAmount(Math.max(0, sPrice - disc));
    setCourseType(student.course_type || '');
    setSubscriptionModel(student.subscription_model || 'monthly');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 31);
    setEndDate(format(nextMonth, 'yyyy-MM-dd'));
  }, [student, currentPrices]);

  if (!student) return null;

  const handleRenew = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('جاري تجديد الاشتراك...');
    
    try {
      // 1. Add Payment Record
      await addPaymentMutation.mutateAsync({
        student_id: student.id,
        student_name: student.full_name,
        amount: customAmount,
        method: paymentMethod,
        course_type: courseType,
        date: new Date().toISOString(),
        month: new Date().toLocaleString('ar-EG', { month: 'long' }),
        notes: `${hasLoyaltyDiscount ? 'تم تطبيق خصم نقاط الولاء. ' : ''}${subscriptionModel === 'credit' ? `شراء ${sessionsToAdd} حصص` : ''}`
      });

      // 2. Update Student Info
      const updateData: any = { 
        course_type: courseType,
        subscription_model: subscriptionModel,
        subscription_start_date: new Date(startDate).toISOString()
      };

      if (subscriptionModel === 'credit') {
        updateData.remaining_sessions = (student.remaining_sessions || 0) + sessionsToAdd;
        updateData.first_session_date = null; // Reset first session date for new credit pack
        updateData.subscription_end_date = new Date(endDate).toISOString();
      } else if (subscriptionModel === 'rolling') {
        updateData.subscription_end_date = new Date(endDate).toISOString();
      }

      await updateStudentMutation.mutateAsync({
        id: student.id,
        data: updateData
      });
      
      toast.success('تم تجديد الاشتراك بنجاح (+10 نقاط ولاء)', { id: toastId });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'فشل تجديد الاشتراك', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تجديد الاشتراك" size="md">
      <div className="space-y-6 text-right">
        <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {student.full_name.charAt(0)}
          </div>
          <div className="text-right">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</h4>
            <p className="text-sm text-slate-500">الاشتراك الحالي: {student.course_type}</p>
            <p className="text-[10px] text-blue-600 font-bold">
              {student.subscription_model === 'credit' ? `رصيد متبقي: ${student.remaining_sessions || 0} حصص` : 
               student.subscription_model === 'rolling' ? `ينتهي في: ${student.subscription_end_date ? new Date(student.subscription_end_date).toLocaleDateString('ar-EG') : '-'}` :
               'نظام شهري ميلادي'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم الدورة / الفئة</label>
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
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">نظام الاشتراك</label>
            <select
              value={subscriptionModel}
              onChange={(e) => setSubscriptionModel(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">نظام شهري ميلادي</option>
              <option value="rolling">نظام فترة متدحرجة (30 يوم)</option>
              <option value="credit">نظام حصص (رصيد)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptionModel !== 'monthly' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">تاريخ البداية</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    // Automatically adjust end date
                    const nextEnd = new Date(newStart);
                    nextEnd.setDate(nextEnd.getDate() + 31);
                    setEndDate(format(nextEnd, 'yyyy-MM-dd'));
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {subscriptionModel === 'credit' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">عدد الحصص المضافة</label>
              <input
                type="number"
                value={sessionsToAdd}
                onChange={(e) => setSessionsToAdd(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">المبلغ المدفوع (₪)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 mb-1">نقاط الولاء الحالية</p>
            <div className="flex items-center gap-2 text-amber-600 font-bold">
              <Award size={18} />
              <span>{student.loyalty_points || 0} نقطة</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 mb-1">السعر المعتاد</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">{standardPrice} ₪</p>
          </div>
        </div>

        {hasLoyaltyDiscount && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="font-bold text-emerald-800 dark:text-emerald-400">خصم الولاء متاح! 🎁</p>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-500/70">سيتم خصم 100 ₪ من الرسوم مقابل 100 نقطة.</p>
            </div>
          </div>
        )}

        {!hasLoyaltyDiscount && (student.loyalty_points || 0) > 80 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg text-amber-600 dark:text-amber-400">
              <Award size={20} />
            </div>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-400 text-sm">شارف على الخصم!</p>
              <p className="text-xs text-amber-700/70">بقي {(100 - (student.loyalty_points || 0))} نقاط للحصول على الخصم القادم.</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">طريقة الدفع</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'cash', label: 'نقدي' },
              { id: 'bit', label: 'Bit' },
              { id: 'paybox', label: 'PayBox' },
              { id: 'transfer', label: 'تحويل' }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id as any)}
                className={`py-2 px-4 rounded-xl text-sm font-bold border transition-all ${
                  paymentMethod === method.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-blue-300'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <p className="font-bold text-slate-900 dark:text-slate-100">الإجمالي المطلوب:</p>
            <p className="text-2xl font-black text-blue-600">{customAmount} ₪</p>
          </div>
          
          <button
            onClick={handleRenew}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
            <span>تجديد الاشتراك الآن</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
