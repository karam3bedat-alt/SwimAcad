import React, { useState } from 'react';
import { Plus, CreditCard, Search, Loader2, AlertCircle, Wallet, FileDown, Download } from 'lucide-react';
import { cn, exportToExcel } from '../lib/utils';
import { Payment } from '../types';
import { Modal } from '../components/Modal';
import { toast } from 'react-hot-toast';
import { usePayments, useAddPayment } from '../hooks/usePayments';
import { useStudents } from '../hooks/useStudents';
import { generatePaymentsPDF } from '../services/pdfService';

export default function Payments() {
  const { data: payments = [], isLoading: isLoadingPayments, error: paymentsError } = usePayments();
  const { data: students = [], isLoading: isLoadingStudents } = useStudents();
  
  const addPaymentMutation = useAddPayment();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentId = formData.get('student_id') as string;
    const student = students?.find(s => s.id === studentId);

    const toastId = toast.loading('جاري تسجيل الدفعة...');
    try {
      await addPaymentMutation.mutateAsync({
        student_id: studentId,
        student_name: student?.full_name || '',
        amount: Number(formData.get('amount')),
        date: new Date().toISOString().split('T')[0],
        method: (formData.get('method') as 'نقدي' | 'تحويل') || 'نقدي',
        notes: (formData.get('notes') as string) || ''
      });
      toast.success('تم تسجيل الدفعة بنجاح', { id: toastId });
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدفعة', { id: toastId });
    }
  };

  const filteredPayments = (payments || []).filter(p => 
    p.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const isLoading = isLoadingPayments || isLoadingStudents;

  if (isLoading && (!payments || payments.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">جاري تحميل المدفوعات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">إدارة المدفوعات</h2>
          <p className="text-slate-500">تسجيل ومتابعة جميع العمليات المالية والاشتراكات.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportToExcel(filteredPayments, 'مدفوعات_الأكاديمية')}
            className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <FileDown size={20} />
            <span>Excel</span>
          </button>
          <button 
            onClick={() => generatePaymentsPDF(filteredPayments)}
            disabled={filteredPayments.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <Download size={20} />
            <span>PDF</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            <span>تسجيل دفعة</span>
          </button>
        </div>
      </div>

      {paymentsError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{(paymentsError as any).message || 'فشل تحميل المدفوعات'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
          <p className="text-sm opacity-80 mb-1">إجمالي التحصيل</p>
          <h3 className="text-3xl font-bold">{totalRevenue} ر.س</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">عدد العمليات</p>
            <h4 className="text-xl font-bold text-slate-900">{payments.length} عملية</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">متوسط الدفع</p>
            <h4 className="text-xl font-bold text-slate-900">
              {payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0} ر.س
            </h4>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث باسم الطالب..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الطالب</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">المبلغ</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">التاريخ</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">طريقة الدفع</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{payment.student_name}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-blue-600">{payment.amount} ر.س</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-500">
                    {payment.date ? new Date(payment.date).toLocaleDateString('ar-EG') : '-'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold",
                    payment.method === 'نقدي' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {payment.method}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-500">{payment.notes || '-'}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && !isLoading && (
          <div className="p-12 text-center text-slate-500 italic">
            لا يوجد مدفوعات مسجلة حالياً.
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="تسجيل دفعة جديدة"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الطالب</label>
            <select 
              name="student_id" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الطالب</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">المبلغ (ر.س)</label>
            <input 
              name="amount" 
              type="number"
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">طريقة الدفع</label>
            <select 
              name="method" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="نقدي">نقدي</option>
              <option value="تحويل">تحويل بنكي</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">ملاحظات</label>
            <textarea 
              name="notes" 
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit"
              disabled={addPaymentMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {addPaymentMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'تسجيل الدفعة'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
