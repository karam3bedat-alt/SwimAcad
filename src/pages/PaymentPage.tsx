import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Shield, CheckCircle, Loader2 } from 'lucide-react';

export const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const amount = searchParams.get('amount');
  const month = searchParams.get('month');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsProcessing(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">تم الدفع بنجاح!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            تم استلام مبلغ <span className="font-bold text-slate-900 dark:text-slate-100">{amount} ₪</span> لشهر {month}
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-sm text-slate-500 dark:text-slate-400">
            سيتم إرسال إيصال الدفع عبر الواتساب قريباً. شكراً لثقتكم بأكاديمية السباحة.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">دفع الاشتراك</h1>
          <p className="text-slate-500 dark:text-slate-400">أكاديمية السباحة 🏊‍♂️</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl mb-8 border border-blue-100 dark:border-blue-800/30">
          <div className="flex justify-between mb-3">
            <span className="text-slate-600 dark:text-slate-400">رقم الطالب:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{studentId}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-slate-600 dark:text-slate-400">الشهر:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{month}</span>
          </div>
          <div className="h-px bg-blue-200 dark:bg-blue-800/50 my-3" />
          <div className="flex justify-between text-lg">
            <span className="text-slate-600 dark:text-slate-400 font-bold">المبلغ المستحق:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{amount} ₪</span>
          </div>
        </div>

        <form onSubmit={handlePayment} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              رقم البطاقة
            </label>
            <div className="relative">
              <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="**** **** **** ****"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                تاريخ الانتهاء
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                CVV
              </label>
              <input
                type="text"
                placeholder="***"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              الاسم على البطاقة
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none transition-all"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : null}
            {isProcessing ? 'جاري المعالجة...' : `دفع ${amount} ₪`}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Shield size={14} />
          <span>دفع آمن ومشفر 256-bit</span>
        </div>
      </div>
    </div>
  );
};
