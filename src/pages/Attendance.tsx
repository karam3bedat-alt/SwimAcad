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
  Cake,
  Award
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { useBookings, useUpdateBookingStatus, useAddBooking } from '../hooks/useBookings';
import { useStudents } from '../hooks/useStudents';
import { useTrainers, useCoachAttendance, useCoachCheckIn, useCoachCheckOut } from '../hooks/useTrainers';
import { generateAttendancePDF } from '../services/pdfService';
import { format, isToday } from 'date-fns';
import { useI18n } from '../lib/LanguageContext';
import { useAuth } from '../AuthContext';
import { scheduler } from '../services/schedulerService';

export default function Attendance() {
  const { t } = useI18n();
  const { user, isAdmin, isCoach } = useAuth();
  const { data: bookings = [], isLoading: isLoadingBookings, error: bookingsError, refetch: refetchBookings } = useBookings();
  const { data: students = [], isLoading: isLoadingStudents, error: studentsError } = useStudents();
  const { data: trainers = [] } = useTrainers();
  const { data: coachAttendance = [] } = useCoachAttendance(isAdmin() ? undefined : user?.uid);
  
  const [showOnlyMyStudents, setShowOnlyMyStudents] = useState(isCoach());

  const checkInMutation = useCoachCheckIn();
  const checkOutMutation = useCoachCheckOut();

  const updateStatusMutation = useUpdateBookingStatus();
  const addBookingMutation = useAddBooking();
  const [activeTab, setActiveTab] = useState<'bookings' | 'daily' | 'checksheet' | 'coaches'>(isCoach() ? 'daily' : 'bookings');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkStatus, setBulkStatus] = useState<Record<string, 'حضر' | 'غائب' | 'ملغي' | null>>({});

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCoach = !showOnlyMyStudents || s.assigned_coach_id === user?.uid;
    return matchesSearch && matchesCoach;
  });

  const checkAbsenceAlert = async (studentId: string) => {
    const alerts = scheduler.detectConsecutiveAbsences(students, bookings);
    const studentAlert = alerts.find(a => a.student.id === studentId);
    if (studentAlert) {
      toast((t) => (
        <div className="flex flex-col gap-2 font-['Cairo']">
          <p className="font-bold text-rose-600 flex items-center gap-2">
            <AlertCircle size={18} />
            تحذير غياب متكرر!
          </p>
          <p className="text-sm">الطالب غائب لـ {studentAlert.consecutiveDays} أيام متتالية.</p>
          <button 
            onClick={() => {
              const student = studentAlert.student;
              const message = `تنبيه من الأكاديمية: يرجى العلم أن الطالب ${student.full_name} قد تغيب لأكثر من مرتين متتاليتين. نرجو التواصل معنا للاطمئنان.`;
              window.open(`https://wa.me/${(student.phone || student.parent_phone)?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
              toast.dismiss(t.id);
            }}
            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
          >
            إرسال إشعار واتساب
          </button>
        </div>
      ), { duration: 6000 });
    }
  };

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
        
        if (status === 'غائب') {
          await checkAbsenceAlert(studentId);
        }
      }
      toast.success('تم تسجيل الحضور بنجاح', { id: toastId });
      setBulkStatus({});
      refetchBookings();
    } catch (err) {
      toast.error('فشل في تسجيل بعض البيانات', { id: toastId });
    }
  };

  const updateStatus = async (id: string, status: string, studentId?: string) => {
    const toastId = toast.loading(t('loading_data'));
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      if (status === 'غائب' && studentId) {
        await checkAbsenceAlert(studentId);
      }
      toast.success(`${t('status')}: ${t(status === 'حضر' ? 'present' : status === 'غائب' ? 'absent' : 'canceled')}`, { id: toastId });
      refetchBookings();
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
      refetchBookings();
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

  if ((isLoadingBookings || isLoadingStudents) && (!bookings || bookings.length === 0)) {
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
          {isAdmin() && (
            <button
              onClick={() => setActiveTab('coaches')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'coaches' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              حضور المدربين
            </button>
          )}
        </div>

        {isCoach() && (
          <button
            onClick={() => setShowOnlyMyStudents(!showOnlyMyStudents)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2",
              showOnlyMyStudents 
                ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            )}
          >
            <User size={16} />
            <span>{showOnlyMyStudents ? 'عرض جميع الطلاب' : 'طلابي فقط'}</span>
          </button>
        )}

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

      {bookingsError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{(bookingsError as any).message || 'فشل تحميل الحجوزات'}</p>
        </div>
      )}

      {activeTab === 'bookings' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Table View - Hidden on Mobile */}
          <div className="hidden lg:block overflow-x-auto">
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
                  .filter(b => !showOnlyMyStudents || students.find(s => s.id === b.student_id)?.assigned_coach_id === user?.uid)
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
                          onClick={() => updateStatus(booking.id, 'حضر', booking.student_id)}
                          disabled={updateStatusMutation.isPending}
                          title={t('mark_present')}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => updateStatus(booking.id, 'غائب', booking.student_id)}
                          disabled={updateStatusMutation.isPending}
                          title={t('mark_absent')}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle size={18} />
                        </button>
                        <button 
                          onClick={() => updateStatus(booking.id, 'ملغي', booking.student_id)}
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
          </div>

          {/* Card View - Visible on Mobile */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {(bookings || [])
              .filter(b => b.student_name?.toLowerCase().includes(searchTerm.toLowerCase()))
              .filter(b => !showOnlyMyStudents || students.find(s => s.id === b.student_id)?.assigned_coach_id === user?.uid)
              .map((booking) => (
              <div key={booking.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{booking.student_name}</p>
                      <p className="text-xs text-slate-500">{booking.session_time}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    booking.status === 'محجوز' && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                    booking.status === 'حضر' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                    booking.status === 'غائب' && "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
                    booking.status === 'ملغي' && "bg-slate-50 text-slate-500 dark:bg-slate-800/30 dark:text-slate-500",
                  )}>
                    {t(booking.status === 'محجوز' ? 'reserved' : 
                       booking.status === 'حضر' ? 'present' : 
                       booking.status === 'غائب' ? 'absent' : 'canceled')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 dark:border-slate-800 pt-2">
                  <span>{booking.session_day} - {booking.coach_name || booking.trainer_name}</span>
                  <span>{booking.date ? new Date(booking.date).toLocaleDateString('ar-EG') : '-'}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button 
                    onClick={() => updateStatus(booking.id, 'حضر', booking.student_id)}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    {t('present')}
                  </button>
                  <button 
                    onClick={() => updateStatus(booking.id, 'غائب', booking.student_id)}
                    className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    {t('absent')}
                  </button>
                  <button 
                    onClick={() => updateStatus(booking.id, 'ملغي', booking.student_id)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ))}
          </div>

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
            {filteredStudents
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
      ) : activeTab === 'coaches' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xl">نظام تسجيل حضور المدربين ونقاط الولاء</h3>
              <p className="text-sm text-slate-500">يتلقى المدرب 10 نقاط ولاء عند كل تسجيل خروج.</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 capitalize">إجمالي السجلات</p>
                <p className="text-xl font-bold text-blue-600">{coachAttendance.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.filter(t => t.status === 'نشط').map(trainer => {
              const todayEntry = coachAttendance.find(a => 
                a.coach_id === trainer.id && 
                a.date === format(new Date(), 'yyyy-MM-dd')
              );
              
              const isCheckedIn = todayEntry && !todayEntry.check_out;
              const isCheckedOut = todayEntry && todayEntry.check_out;

              return (
                <div key={trainer.id} className="relative group border border-slate-100 dark:border-slate-800 p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-4 transition-all hover:shadow-xl hover:shadow-blue-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-200">
                        {trainer.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-lg">{trainer.name}</p>
                        <p className="text-xs text-blue-600 font-bold">{trainer.specialty}</p>
                      </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full flex items-center gap-1">
                      <Award size={14} className="text-amber-600" />
                      <span className="text-xs font-black text-amber-700">{trainer.loyalty_points || 0}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>دخول</span>
                      <span>{todayEntry?.check_in ? format(new Date(todayEntry.check_in), 'HH:mm') : '--:--'}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>خروج</span>
                      <span>{todayEntry?.check_out ? format(new Date(todayEntry.check_out), 'HH:mm') : '--:--'}</span>
                    </div>
                  </div>
                  
                  {!isCheckedOut ? (
                    <button
                      onClick={async () => {
                        const toastId = toast.loading(t('processing'));
                        try {
                          if (!isCheckedIn) {
                            await checkInMutation.mutateAsync({ coachId: trainer.id, coachName: trainer.name });
                            toast.success(`تم تسجيل دخول: ${trainer.name}`, { id: toastId });
                          } else if (todayEntry) {
                            await checkOutMutation.mutateAsync({ id: todayEntry.id, coachId: trainer.id });
                            toast.success(`تم تسجيل خروج: ${trainer.name} (+10 نقاط)`, { id: toastId });
                          }
                        } catch (err) {
                          toast.error('فشل العملية', { id: toastId });
                        }
                      }}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95",
                        !isCheckedIn 
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100" 
                          : "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-100"
                      )}
                    >
                      {!isCheckedIn ? 'تسجيل دخول الآن' : 'تسجيل خروج الآن'}
                    </button>
                  ) : (
                    <div className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-center text-sm border border-slate-200 dark:border-slate-700">
                      تم الحضور اليوم
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-sm opacity-50">كشف الحضور للجملة</h3>
                    <p className="text-xl font-black text-slate-900 dark:text-white">سجل الحضور السريع</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newStatus = { ...bulkStatus };
                        filteredStudents.forEach(s => {
                          if (!newStatus[s.id]) newStatus[s.id] = 'حضر';
                        });
                        setBulkStatus(newStatus);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      تحديد الكل حاضر
                    </button>
                    <button
                      onClick={handleBulkSubmit}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                    >
                      حفظ الحضور للجملة
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents
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
