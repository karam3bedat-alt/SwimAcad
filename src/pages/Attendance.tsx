import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Loader2, 
  AlertCircle, 
  Ban, 
  Download,
  Search,
  Cake
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { useBookings, useUpdateBookingStatus, useAddBooking } from '../hooks/useBookings';
import { useStudents } from '../hooks/useStudents';
import { generateAttendancePDF } from '../services/pdfService';
import { format, isToday } from 'date-fns';
import { useI18n } from '../lib/LanguageContext';

export default function Attendance() {
  const { t } = useI18n();
  const { data: bookings = [], isLoading: isLoadingBookings, error: bookingsError } = useBookings();
  const { data: students = [], isLoading: isLoadingStudents, error: studentsError } = useStudents();
  const updateStatusMutation = useUpdateBookingStatus();
  const addBookingMutation = useAddBooking();
  const [activeTab, setActiveTab] = useState<'bookings' | 'daily' | 'checksheet'>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkStatus, setBulkStatus] = useState<Record<string, 'حضر' | 'غائب' | 'ملغي' | null>>({});

  const isLoading = isLoadingBookings || isLoadingStudents;
  const error = bookingsError || studentsError;

  const handleBulkSubmit = async () => {
    const studentsToUpdate = Object.entries(bulkStatus).filter(([_, status]) => status !== null);
    if (studentsToUpdate.length === 0) {
      toast.error('لم يتم تحديد أي طالب');
      return;
    }

    const toastId = toast.loading('جاري تسجيل الحضور للجملة...');
    try {
      for (const [studentId, status] of studentsToUpdate) {
        const student = students.find(s => s.id === studentId);
        if (!student || !status) continue;

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const existingBooking = (bookings || []).find(b => 
          b.student_id === studentId && 
          format(new Date(b.date), 'yyyy-MM-dd') === todayStr
        );

        if (existingBooking) {
          await updateStatusMutation.mutateAsync({ id: existingBooking.id, status: status as unknown as string });
        } else if (status === 'حضر') {
          await addBookingMutation.mutateAsync({
            student_id: student.id,
            student_name: student.full_name,
            session_id: 'bulk',
            date: new Date().toISOString(),
            status: 'حضر',
            session_day: format(new Date(), 'EEEE'),
            session_time: format(new Date(), 'HH:mm')
          });
        }
      }
      toast.success('تم تسجيل الحضور بنجاح', { id: toastId });
      setBulkStatus({});
    } catch (err) {
      toast.error('فشل في تسجيل بعض البيانات', { id: toastId });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const toastId = toast.loading(t('loading_data'));
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      toast.success(`${t('status')}: ${t(status === 'حضر' ? 'present' : status === 'غائب' ? 'absent' : 'canceled')}`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || t('error_loading_data'), { id: toastId });
    }
  };

  const handleQuickCheckIn = async (student: any) => {
    const toastId = toast.loading(t('processing'));
    try {
      await addBookingMutation.mutateAsync({
        student_id: student.id,
        student_name: student.full_name,
        session_id: 'manual', // Non-session booking
        date: new Date().toISOString(),
        status: 'حضر',
        session_day: format(new Date(), 'EEEE'),
        session_time: format(new Date(), 'HH:mm')
      });
      toast.success(`${student.full_name}: ${t('arrived')}`, { id: toastId });
    } catch (err: any) {
      toast.error(t('error_processing'), { id: toastId });
    }
  };

  const isBirthdayToday = (birthDate?: string) => {
    if (!birthDate) return false;
    const today = new Date();
    const bd = new Date(birthDate);
    return bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();
  };

  if (isLoading && (!bookings || bookings.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">{t('bookings_loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('attendance')}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t('attendance_status')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => generateAttendancePDF(bookings)}
            disabled={bookings.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <Download size={20} />
            <span>{t('export_pdf')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('bookings')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'bookings' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t('bookings')}
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'daily' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t('daily_attendance')}
          </button>
          <button
            onClick={() => setActiveTab('checksheet')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'checksheet' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            كشف الحضور (جملة)
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('search_students')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{(error as any).message || 'فشل تحميل الحجوزات'}</p>
        </div>
      )}

      {activeTab === 'bookings' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('students')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('sessions')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('date')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('status')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {(bookings || [])
                .filter(b => b.student_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                        <User size={16} />
                      </div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{booking.student_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{booking.session_day} - {booking.coach_name || booking.trainer_name}</p>
                      <p className="text-xs text-slate-500">{booking.session_time}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-500">{booking.date ? new Date(booking.date).toLocaleDateString('ar-EG') : '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      booking.status === 'محجوز' && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                      booking.status === 'حضر' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                      booking.status === 'غائب' && "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
                      booking.status === 'ملغي' && "bg-slate-50 text-slate-500 dark:bg-slate-800/30 dark:text-slate-500",
                    )}>
                      {t(booking.status === 'محجوز' ? 'reserved' : 
                         booking.status === 'حضر' ? 'present' : 
                         booking.status === 'غائب' ? 'absent' : 'canceled')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateStatus(booking.id, 'حضر')}
                        disabled={updateStatusMutation.isPending}
                        title={t('mark_present')}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => updateStatus(booking.id, 'غائب')}
                        disabled={updateStatusMutation.isPending}
                        title={t('mark_absent')}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle size={18} />
                      </button>
                      <button 
                        onClick={() => updateStatus(booking.id, 'ملغي')}
                        disabled={updateStatusMutation.isPending}
                        title={t('cancel_booking')}
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
          {bookings.length === 0 && !isLoadingBookings && (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 italic">
              {t('no_bookings')}
            </div>
          )}
        </div>
      ) : activeTab === 'daily' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('daily_attendance')} - {new Date().toLocaleDateString('ar-EG')}</h3>
            <p className="text-sm text-slate-500">{t('manage_attendance_subtitle')}</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {students
              .filter(s => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((student) => {
                const isArrived = bookings.some(b => 
                  b.student_id === student.id && 
                  format(new Date(b.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                  b.status === 'حضر'
                );

                return (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-600">
                        {student.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white">{student.full_name}</p>
                          {isBirthdayToday(student.birth_date) && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full text-[10px] font-bold animate-pulse">
                              <Cake size={10} />
                              {t('birthday_today')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{student.level}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isBirthdayToday(student.birth_date) && (
                        <button
                          onClick={() => {
                            const message = t('birthday_greeting').replace('{name}', student.full_name);
                            const phone = student.phone || student.parent_phone;
                            if (phone) {
                              window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                            } else {
                              toast.error(t('no_phone'));
                            }
                          }}
                          className="p-2 text-pink-500 hover:bg-pink-50 rounded-xl transition-colors"
                          title={t('send_birthday_greeting')}
                        >
                          <Cake size={20} />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const studentBooking = (bookings || []).find(b => 
                            b.student_id === student.id && 
                            format(new Date(b.date), 'yyyy-MM-dd') === todayStr
                          );
                          if (studentBooking) {
                            updateStatus(studentBooking.id, 'حضر');
                          } else {
                            handleQuickCheckIn(student);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          isArrived 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                        )}
                      >
                        {isArrived ? (
                          <>
                            <CheckCircle size={18} />
                            {t('arrived')}
                          </>
                        ) : (
                          <>
                            <User size={18} />
                            {t('mark_arrived')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">كشف الحضور السريع لجميع الطلاب</h3>
              <p className="text-sm text-slate-500">حدد حالة الحضور لكل طالب ثم اضغط على حفظ في الأسفل.</p>
            </div>
            <button
              onClick={handleBulkSubmit}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100"
            >
              حفظ الحضور للجملة
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students
              .filter(s => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(student => (
              <div key={student.id} className="border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{student.full_name}</p>
                  <span className="text-[10px] text-slate-400">{student.level}</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkStatus(prev => ({ ...prev, [student.id]: 'حضر' }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                      bulkStatus[student.id] === 'حضر' 
                        ? "bg-emerald-600 text-white shadow-md" 
                        : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800"
                    )}
                  >
                    حاضر
                  </button>
                  <button
                    onClick={() => setBulkStatus(prev => ({ ...prev, [student.id]: 'غائب' }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                      bulkStatus[student.id] === 'غائب' 
                        ? "bg-rose-600 text-white shadow-md" 
                        : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800"
                    )}
                  >
                    غائب
                  </button>
                  <button
                    onClick={() => setBulkStatus(prev => ({ ...prev, [student.id]: 'ملغي' }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                      bulkStatus[student.id] === 'ملغي' 
                        ? "bg-slate-600 text-white shadow-md" 
                        : "bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800"
                    )}
                  >
                    ملغي
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
