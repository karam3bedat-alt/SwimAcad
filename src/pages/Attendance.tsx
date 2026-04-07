import React from 'react';
import { CheckCircle, XCircle, User, Loader2, AlertCircle, Ban, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { useBookings, useUpdateBookingStatus } from '../hooks/useBookings';
import { generateAttendancePDF } from '../services/pdfService';

export default function Attendance() {
  const { data: bookings = [], isLoading, error } = useBookings();
  const updateStatusMutation = useUpdateBookingStatus();

  const updateStatus = async (id: string, status: string) => {
    const toastId = toast.loading('جاري تحديث الحالة...');
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      toast.success(`تم تسجيل الحالة: ${status}`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث الحالة', { id: toastId });
    }
  };

  if (isLoading && (!bookings || bookings.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">جاري تحميل الحجوزات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">تسجيل الحضور</h2>
          <p className="text-slate-500">متابعة حضور وغياب الطلاب في الحصص المجدولة.</p>
        </div>
        <button 
          onClick={() => generateAttendancePDF(bookings)}
          disabled={bookings.length === 0}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
        >
          <Download size={20} />
          <span>تصدير PDF</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{(error as any).message || 'فشل تحميل الحجوزات'}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الطالب</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الحصة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">التاريخ</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الحالة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">تسجيل الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                      <User size={16} />
                    </div>
                    <p className="font-bold text-slate-900">{booking.student_name}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{booking.session_day} - {booking.coach_name || booking.trainer_name}</p>
                    <p className="text-xs text-slate-500">{booking.session_time}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-500">{booking.date ? new Date(booking.date).toLocaleDateString('ar-EG') : '-'}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    booking.status === 'محجوز' && "bg-blue-50 text-blue-600",
                    booking.status === 'حضر' && "bg-emerald-50 text-emerald-600",
                    booking.status === 'غائب' && "bg-rose-50 text-rose-600",
                    booking.status === 'ملغي' && "bg-slate-50 text-slate-500",
                  )}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateStatus(booking.id, 'حضر')}
                      disabled={updateStatusMutation.isPending}
                      title="تسجيل حضور"
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button 
                      onClick={() => updateStatus(booking.id, 'غائب')}
                      disabled={updateStatusMutation.isPending}
                      title="تسجيل غياب"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle size={18} />
                    </button>
                    <button 
                      onClick={() => updateStatus(booking.id, 'ملغي')}
                      disabled={updateStatusMutation.isPending}
                      title="إلغاء الحجز"
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Ban size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && !isLoading && (
          <div className="p-12 text-center text-slate-500 italic">
            لا يوجد حجوزات مسجلة حالياً.
          </div>
        )}
      </div>
    </div>
  );
}
