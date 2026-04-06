import React, { useEffect, useState } from 'react';
import { Plus, Search, Loader2, AlertCircle, Calendar, User, Clock, Trash2 } from 'lucide-react';
import { apiFetch, cn } from '../lib/utils';
import { Booking, Student, Session } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../lib/ToastContext';

export default function Bookings() {
  const { showToast, hideToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [b, s, sess] = await Promise.all([
        apiFetch('getBookings'),
        apiFetch('getStudents'),
        apiFetch('getSessions')
      ]);
      setBookings(Array.isArray(b) ? b : []);
      setStudents(Array.isArray(s) ? s : []);
      setSessions(Array.isArray(sess) ? sess : []);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل البيانات');
      showToast(err.message || 'فشل تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentId = formData.get('student_id');
    const sessionId = formData.get('session_id');
    
    const student = students.find(s => Number(s.id) === Number(studentId));
    const session = sessions.find(s => Number(s.id) === Number(sessionId));

    const toastId = showToast('جاري إضافة الحجز...', 'loading');
    try {
      setLoading(true);
      await apiFetch('addBooking', {
        method: 'POST',
        body: JSON.stringify({
          action: 'addBooking',
          student_id: studentId,
          student_name: student?.full_name,
          session_id: sessionId,
          session_day: session?.day,
          session_time: `${session?.start_time} - ${session?.end_time}`,
          date: formData.get('date')
        }),
      });
      hideToast(toastId);
      showToast('تمت إضافة الحجز بنجاح', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل إضافة الحجز', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingDelete = async () => {
    if (!selectedBooking) return;
    
    const toastId = showToast('جاري حذف الحجز...', 'loading');
    try {
      setLoading(true);
      await apiFetch('deleteBooking', {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteBooking',
          id: selectedBooking.id
        }),
      });
      hideToast(toastId);
      showToast('تم حذف الحجز بنجاح', 'success');
      setIsDeleteModalOpen(false);
      setSelectedBooking(null);
      fetchData();
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل حذف الحجز', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && bookings.length === 0) {
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
          <h2 className="text-2xl font-bold text-slate-900">إدارة الحجوزات</h2>
          <p className="text-slate-500">عرض وإضافة حجوزات الطلاب في الحصص التدريبية.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          <span>إضافة حجز جديد</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

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
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الحصة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">التاريخ</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الحالة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredBookings.map((booking) => (
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
                  <p className="text-sm text-slate-500">
                    {booking.date ? new Date(booking.date).toLocaleDateString('ar-EG') : '-'}
                  </p>
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
                  <button 
                    onClick={() => {
                      setSelectedBooking(booking);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="حذف الحجز"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBookings.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500 italic">
            لا يوجد حجوزات مطابقة للبحث.
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="إضافة حجز جديد"
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
            <label className="text-sm font-bold text-slate-700">الحصة التدريبية</label>
            <select 
              name="session_id" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الحصة</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.day} | {s.start_time} - {s.end_time} | {s.trainer_name || s.coach_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">التاريخ</label>
            <input 
              name="date" 
              type="date"
              required 
              defaultValue={new Date().toISOString().split('T')[0]}
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'إضافة الحجز'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="تأكيد حذف الحجز"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            هل أنت متأكد من رغبتك في حذف حجز الطالب <span className="font-bold text-slate-900">{selectedBooking?.student_name}</span>؟
            هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleBookingDelete}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد الحذف'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
