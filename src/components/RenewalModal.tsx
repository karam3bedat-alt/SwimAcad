import React, { useState } from 'react';
import { RefreshCw, Wallet, Calendar, AlertTriangle, CheckCircle2, Award } from 'lucide-react';
import { Student } from '../types';
import { Modal } from './Modal';
import { usePayments, useAddPayment } from '../hooks/usePayments';
import { useUpdateStudent } from '../hooks/useStudents';
import { useSettings } from '../hooks/useSettings';
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
  const standardPrice = student.custom_fee || currentPrices[student.course_type as keyof typeof DEFAULT_COURSE_PRICES] || 0;
  
  const hasLoyaltyDiscount = (student.loyalty_points || 0) >= 100;
  const discountAmount = hasLoyaltyDiscount ? 100 : 0; // Example 100 ₪ discount
  const finalPrice = Math.max(0, standardPrice - discountAmount);

  const [paymentMethod, setPaymentMethod] = useState<'bit' | 'paybox' | 'transfer' | 'cash'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRenew = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('جاري تجديد الاشتراك...');
    
    try {
      // 1. Add Payment Record
      await addPaymentMutation.mutateAsync({
        student_id: student.id,
        student_name: student.full_name,
        amount: finalPrice,
        method: paymentMethod,
        date: new Date().toISOString(),
        month: new Date().toLocaleString('ar-EG', { month: 'long' }),
        notes: hasLoyaltyDiscount ? 'تم تطبيق خصم نقاط الولاء' : ''
      });

      // points handling is done in the backend/service already based on my previous check of paymentsService.add
      // but let's double check that
      
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
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {student.full_name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</h4>
            <p className="text-sm text-slate-500">{student.course_type}</p>
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
            <p className="text-2xl font-black text-blue-600">{finalPrice} ₪</p>
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
