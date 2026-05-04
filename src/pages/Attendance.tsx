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
  Award,
  ChevronLeft,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { cn, exportToExcel } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { useBookings, useUpdateBookingStatus, useAddBooking, useDeleteBooking } from '../hooks/useBookings';
import { useStudents, useUpdateStudent } from '../hooks/useStudents';
import { useTrainers, useCoachAttendance, useCoachCheckIn, useCoachMarkAbsent, useCoachCheckOut, useAddCoachAttendance } from '../hooks/useTrainers';
import { Modal } from '../components/Modal';
import { format, isToday, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useI18n } from '../lib/LanguageContext';
import { useAuth } from '../AuthContext';
import { scheduler } from '../services/schedulerService';
import { CoachAttendance } from '../types';

import { logLoyaltyPoints } from '../services/firebaseService';

export default function Attendance() {
  const { t } = useI18n();
  const { user, isAdmin, isCoach } = useAuth();
  const { data: bookings = [], isLoading: isLoadingBookings, error: bookingsError, refetch: refetchBookings } = useBookings();
  const { data: students = [], isLoading: isLoadingStudents, error: studentsError } = useStudents();
  const { data: trainers = [] } = useTrainers();
  const { data: coachAttendance = [] } = useCoachAttendance(isAdmin() ? undefined : user?.uid);
  
  const [showOnlyMyStudents, setShowOnlyMyStudents] = useState(isCoach());
  const [activeTab, setActiveTab] = useState<'daily' | 'checksheet' | 'coaches'>(isCoach() ? 'daily' : 'checksheet');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const checkInMutation = useCoachCheckIn();
  const markAbsentCoachMutation = useCoachMarkAbsent();
  const checkOutMutation = useCoachCheckOut();
  const addCoachAttendanceMutation = useAddCoachAttendance();

  const updateStatusMutation = useUpdateBookingStatus();
  const addBookingMutation = useAddBooking();
  const deleteBookingMutation = useDeleteBooking();
  const updateStudentMutation = useUpdateStudent();

  const [coachLessons, setCoachLessons] = useState<Record<string, number>>({});
  
  // Details Modal States
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  const isSubscriptionExpired = (student: any) => {
    const today = new Date();
    if (student.subscription_model === 'rolling') {
      if (student.subscription_end_date) {
        return new Date(student.subscription_end_date) < today;
      }
      // Fallback if no end date but has start date
      if (student.subscription_start_date) {
        const startDate = new Date(student.subscription_start_date);
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 31);
        return today > expiryDate;
      }
    }
    if (student.subscription_model === 'credit') {
      // Expiry check even for credits if date is set
      if (student.subscription_end_date) {
        return new Date(student.subscription_end_date) < today;
      }
      // If no end date, check 31 days from first session or start date
      const referenceDate = student.subscription_start_date || student.first_session_date;
      if (referenceDate) {
        const startDate = new Date(referenceDate);
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 31);
        return today > expiryDate;
      }
    }
    return false;
  };

  const courses = [
    'دورات عادية مع مواصلات فوق ال ٥ سنوات',
    'دورات عادية بدون مواصلات فوق ال ٥ سنوات',
    'دورات عادية مع مواصلات فوق ال ٥ سنوات (زبائن صيف)',
    'دورات عادية بدون مواصلات فوق ال ٥ سنوات (زبائن صيف)',
    'دورات نساء (بدون مواصلات)',
    'دورات رجال (بدون مواصلات)',
    'دورات خاصة لجميع الأعمار'
  ];

  const filteredStudents = [...students].filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCoach = !showOnlyMyStudents || s.assigned_coach_id === user?.uid;
    const matchesCourse = !selectedCourse || s.course_type === selectedCourse;
    // More robust status check: treat anything that isn't explicitly "inactive" or "غير نشط" as active
    const isActive = (s.status as any) !== 'غير نشط' && (s.status as any) !== 'inactive' && (s.status as any) !== 'مركز';
    return matchesSearch && matchesCoach && matchesCourse && isActive;
  }).sort((a, b) => (a.full_name || '').trim().localeCompare((b.full_name || '').trim(), 'ar'));

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

  const handleStatusUpdate = async (studentId: string, status: 'حضر' | 'غائب' | null) => {
    if (!status) return;
    
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingBooking = (bookings || []).find(b => 
      b.student_id === studentId && 
      format(new Date(b.date), 'yyyy-MM-dd') === todayStr
    );

    const toastId = toast.loading(`جاري تسجيل ${status} لـ ${student.full_name}...`);
    try {
      if (existingBooking) {
        if (existingBooking.status === status) {
          await updateStatusMutation.mutateAsync({ id: existingBooking.id, status });
        } else {
          await updateStatusMutation.mutateAsync({ id: existingBooking.id, status });
          
          // If changing FROM anything TO 'حضر', deduct session
          if (status === 'حضر' && student.subscription_model === 'credit') {
            const remaining = (student.remaining_sessions || 0) - 1;
            const updateData: any = { remaining_sessions: Math.max(0, remaining) };
            if (!student.first_session_date) {
              updateData.first_session_date = new Date().toISOString();
            }
            await updateStudentMutation.mutateAsync({ id: student.id, data: updateData });
          }
          // If changing FROM 'حضر' TO anything ELSE, refund session? 
          // (Usually safety measure, but let's keep it simple for now as per user request)
        }
      } else {
        await addBookingMutation.mutateAsync({
          student_id: student.id,
          student_name: student.full_name,
          session_id: 'bulk',
          date: new Date().toISOString(),
          status: status as any,
          session_day: format(new Date(), 'EEEE'),
          session_time: format(new Date(), 'HH:mm')
        });

        // New attendance 'حضر' and credit system
        if (status === 'حضر' && student.subscription_model === 'credit') {
          const remaining = (student.remaining_sessions || 0) - 1;
          const updateData: any = { remaining_sessions: Math.max(0, remaining) };
          if (!student.first_session_date) {
            updateData.first_session_date = new Date().toISOString();
          }
          await updateStudentMutation.mutateAsync({ id: student.id, data: updateData });
        }
      }

      if (status === 'غائب') {
        await checkAbsenceAlert(studentId);
      }
      toast.success(`${student.full_name}: تم التسجيل ${status}`, { id: toastId });
      refetchBookings();
    } catch (err) {
      toast.error('فشل في تسجيل الحضور', { id: toastId });
    }
  };

  const handleExportAttendance = () => {
    const monthFiltered = bookings.filter(b => {
      const bDate = new Date(b.date);
      const mMatch = selectedMonth ? (bDate.getMonth() + 1).toString().padStart(2, '0') === selectedMonth : true;
      const yMatch = selectedYear ? bDate.getFullYear().toString() === selectedYear : true;
      const student = students.find(s => s.id === b.student_id);
      const cMatch = selectedCourse ? student?.course_type === selectedCourse : true;
      return mMatch && yMatch && cMatch;
    });

    const data = monthFiltered.map(b => {
      const student = students.find(s => s.id === b.student_id);
      return {
        'اسم الطالب': b.student_name,
        'الدورة': student?.course_type || '-',
        'المستوى': student?.level || '-',
        'التاريخ': b.date ? format(new Date(b.date), 'yyyy-MM-dd') : '-',
        'اليوم': b.session_day,
        'الوقت': b.session_time,
        'الحالة': b.status,
        'المدرب': b.coach_name || b.trainer_name || '-'
      };
    });

    const monthName = selectedMonth ? format(new Date(2024, parseInt(selectedMonth) - 1, 1), 'MMMM') : 'عام';
    const fileName = `حضور_الطلاب_${selectedCourse || 'جميع_الدورات'}_${monthName}_${selectedYear}`;
    exportToExcel(data, fileName);
  };

  const handleExportCoachAttendance = () => {
    const monthFiltered = coachAttendance.filter(a => {
      const aDate = new Date(a.date);
      const mMatch = selectedMonth ? (aDate.getMonth() + 1).toString().padStart(2, '0') === selectedMonth : true;
      const yMatch = selectedYear ? aDate.getFullYear().toString() === selectedYear : true;
      return mMatch && yMatch;
    });

    const data = monthFiltered.map(a => ({
      'اسم المدرب': a.coach_name,
      'التاريخ': a.date,
      'الدخول': a.check_in ? format(new Date(a.check_in), 'HH:mm') : '-',
      'الخروج': a.check_out ? format(new Date(a.check_out), 'HH:mm') : '-',
      'المدة (دقائق)': a.duration_minutes || 0,
      'عدد الدروس': a.lessons_count || 0,
      'الحالة': a.status
    }));

    exportToExcel(data, `سجل_حضور_المدربين_${selectedMonth}_${selectedYear}`);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">{t('attendance')}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t('attendance_status')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExportAttendance}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <FileSpreadsheet size={20} />
            <span className="text-sm font-bold">تصدير حضور الطلاب (Excel)</span>
          </button>
          {isAdmin() && (
            <button 
              onClick={handleExportCoachAttendance}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              <FileSpreadsheet size={20} />
              <span className="text-sm font-bold">تصدير حضور المدربين (Excel)</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
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

        <div className="flex gap-2">
          {activeTab === 'coaches' ? (
            <button 
              onClick={handleExportCoachAttendance}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              <FileSpreadsheet size={20} />
              <span>تصدير Excel</span>
            </button>
          ) : (
            <button 
              onClick={handleExportAttendance}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <FileSpreadsheet size={20} />
              <span>تصدير Excel</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('bookings')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'bookings' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t('bookings')}
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'daily' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t('daily_attendance')}
          </button>
          <button
            onClick={() => setActiveTab('checksheet')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'checksheet' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            كشف الحضور (جملة)
          </button>
          {isAdmin() && (
            <button
              onClick={() => setActiveTab('coaches')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeTab === 'coaches' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              حضور المدربين
            </button>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 flex-1 md:w-32"
          >
            <option value="">كل الأشهر</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={(i + 1).toString().padStart(2, '0')}>
                {format(new Date(2024, i, 1), 'MMMM')}
              </option>
            ))}
          </select>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 flex-1 md:w-40"
          >
            <option value="">جميع الدورات</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="relative flex-1 w-full">
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

      {activeTab === 'daily' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('daily_attendance')} - {new Date().toLocaleDateString('ar-EG')}</h3>
            <p className="text-sm text-slate-500">سجل الحضور اليومي مرتب أبجدياً</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {filteredStudents
              .map((student) => {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const todayBooking = bookings.find(b => 
                  b.student_id === student.id && 
                  format(new Date(b.date), 'yyyy-MM-dd') === todayStr
                );
                const isArrived = todayBooking?.status === 'حضر';
                const isAbsent = todayBooking?.status === 'غائب';

                return (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-600">
                        {student.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p 
                            onClick={() => setSelectedStudentId(student.id)}
                            className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600"
                          >
                            {student.full_name}
                          </p>
                          {isBirthdayToday(student.birth_date) && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full text-[10px] font-bold animate-pulse">
                              <Cake size={10} />
                              {t('birthday_today')}
                            </span>
                          )}
                          {(isSubscriptionExpired(student) || (student.subscription_model === 'credit' && (student.remaining_sessions || 0) <= 0)) && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-bold">
                              <AlertCircle size={10} />
                              منتهي
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{student.course_type || student.level}</p>
                        {student.subscription_model === 'credit' && (
                          <p className={cn(
                            "text-[10px] font-bold",
                            (student.remaining_sessions || 0) <= 1 ? "text-rose-500" : "text-blue-500"
                          )}>
                            الرصيد: {student.remaining_sessions || 0} حصص
                          </p>
                        )}
                        {student.subscription_model === 'rolling' && student.subscription_end_date && (
                          <p className="text-[10px] font-medium text-slate-400">
                            ينتهي: {new Date(student.subscription_end_date).toLocaleDateString('ar-EG')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const toastId = toast.loading('جاري منح نقطة التميز...');
                          try {
                            const newLifetimePoints = (student.lifetime_points || 0) + 20;
                            const newTier = (newLifetimePoints >= 1501) ? 'ذهبي' : (newLifetimePoints >= 501) ? 'فضي' : 'برونزي';
                            
                            await updateStudentMutation.mutateAsync({
                              id: student.id,
                              data: {
                                current_points: (student.current_points || student.loyalty_points || 0) + 20,
                                lifetime_points: newLifetimePoints,
                                loyalty_tier: newTier
                              }
                            });
                            await logLoyaltyPoints(student.id, 20, 'جائزة نجم الحصة', 'earned');
                            toast.success(`تم منح 20 نقطة تميز لـ ${student.full_name}`, { id: toastId });
                          } catch (err) {
                            toast.error('فشل منح النقاط', { id: toastId });
                          }
                        }}
                        className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                        title="نجم الحصة (+20 نقطة)"
                      >
                        <Award size={20} />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(student.id, 'حضر')}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          isArrived 
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                        )}
                      >
                        <CheckCircle size={18} />
                        حاضر
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(student.id, 'غائب')}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          isAbsent 
                            ? "bg-rose-600 text-white shadow-lg shadow-rose-200" 
                            : "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100"
                        )}
                      >
                        <XCircle size={18} />
                        غائب
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
                    <div 
                      onClick={() => setSelectedCoachId(trainer.id)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                        {trainer.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors">{trainer.name}</p>
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
                    {todayEntry?.lessons_count !== undefined && (
                      <div className="flex justify-between text-[10px] text-blue-500 font-bold mt-1 pt-1 border-t border-slate-50 dark:border-slate-800">
                        <span>عدد الدروس</span>
                        <span>{todayEntry.lessons_count} دروس</span>
                      </div>
                    )}
                  </div>

                  {!isCheckedOut ? (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const toastId = toast.loading(t('processing'));
                          try {
                            if (!isCheckedIn) {
                              await checkInMutation.mutateAsync({ coachId: trainer.id, coachName: trainer.name });
                              toast.success(`تم تسجيل دخول: ${trainer.name}`, { id: toastId });
                            } else if (todayEntry) {
                              const lessonsCount = coachLessons[trainer.id] || 0;
                              await checkOutMutation.mutateAsync({ 
                                id: todayEntry.id, 
                                coachId: trainer.id, 
                                lessonsCount 
                              });
                              toast.success(`تم تسجيل خروج: ${trainer.name} (+${10 + (lessonsCount * 10)} نقاط)`, { id: toastId });
                              setCoachLessons(prev => {
                                const next = { ...prev };
                                delete next[trainer.id];
                                return next;
                              });
                            }
                          } catch (err) {
                            toast.error('فشل العملية', { id: toastId });
                          }
                        }}
                        className={cn(
                          "flex-1 py-4 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95",
                          !isCheckedIn 
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100" 
                            : "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-100"
                        )}
                      >
                        {!isCheckedIn ? 'حاضر (دخول)' : 'إنهاء (خروج)'}
                      </button>
                      
                      {!isCheckedIn && !todayEntry && (
                        <button
                          onClick={async () => {
                            const toastId = toast.loading('جاري تسجيل غياب المدرب...');
                            try {
                              await markAbsentCoachMutation.mutateAsync({ coachId: trainer.id, coachName: trainer.name });
                              toast.success(`تم تسجيل غياب: ${trainer.name}`, { id: toastId });
                            } catch (err) {
                              toast.error('فشل العملية', { id: toastId });
                            }
                          }}
                          className="px-4 py-4 rounded-2xl font-black text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all border border-slate-200"
                        >
                          غائب
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={cn(
                      "w-full py-4 rounded-2xl font-bold text-center text-sm border",
                      todayEntry?.status === 'غائب' 
                        ? "bg-rose-50 text-rose-500 border-rose-100" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                    )}>
                      {todayEntry?.status === 'غائب' ? 'المدرب غائب اليوم' : 'تم الحضور اليوم'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">سجل الحضور السريع</h3>
              <p className="text-sm text-slate-500">يتم حفظ الحضور تلقائياً عند الضغط على الحالة</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const confirm = window.confirm('هل أنت متأكد من تسجيل جميع الطلاب الظاهرين كـ "حضر" لهذا اليوم؟');
                  if (!confirm) return;
                  const toastId = toast.loading('جاري تسجيل الحضور للجميع...');
                  try {
                    for (const s of filteredStudents) {
                      await handleStatusUpdate(s.id, 'حضر');
                    }
                    toast.success('تم تسجيل الحضور للجميع بنجاح', { id: toastId });
                  } catch (err) {
                    toast.error('حدث خطأ أثناء التسجيل الجماعي', { id: toastId });
                  }
                }}
                className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
              >
                تحديد الكل حاضر
              </button>
              <button
                onClick={async () => {
                   const confirm = window.confirm('هل أنت متأكد من تسجيل جميع الطلاب الظاهرين كـ "غائب" لهذا اليوم؟');
                   if (!confirm) return;
                   const toastId = toast.loading('جاري تسجيل الغياب للجميع...');
                   try {
                     for (const s of filteredStudents) {
                       await handleStatusUpdate(s.id, 'غائب');
                     }
                     toast.success('تم تسجيل الغياب للجميع بنجاح', { id: toastId });
                   } catch (err) {
                     toast.error('حدث خطأ أثناء التسجيل الجماعي', { id: toastId });
                   }
                }}
                className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
              >
                تحديد الكل غائب
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 text-right">اسم الطالب</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 text-right">الدورة</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 text-center">الحالة اليوم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  const todayBooking = bookings.find(b => 
                    b.student_id === student.id && 
                    format(new Date(b.date), 'yyyy-MM-dd') === todayStr
                  );

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <p 
                          onClick={() => setSelectedStudentId(student.id)}
                          className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 flex items-center gap-2"
                        >
                          {student.full_name}
                          {(isSubscriptionExpired(student) || (student.subscription_model === 'credit' && (student.remaining_sessions || 0) <= 0)) && (
                            <AlertCircle size={12} className="text-rose-500" />
                          )}
                        </p>
                        <p className="text-[10px] text-blue-500 font-bold">{student.course_type}</p>
                        {student.subscription_model === 'credit' && (
                          <p className={cn(
                            "text-[10px] font-black",
                            (student.remaining_sessions || 0) <= 1 ? "text-rose-500" : "text-emerald-600"
                          )}>
                            الرصيد: {student.remaining_sessions || 0}
                          </p>
                        )}
                        {student.subscription_model === 'rolling' && student.subscription_end_date && (
                          <p className="text-[9px] text-slate-400">
                             ينتهي: {new Date(student.subscription_end_date).toLocaleDateString('ar-EG')}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-slate-500">{student.level}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center gap-2 items-center">
                          <button
                            onClick={async () => {
                              const toastId = toast.loading('جاري منح نقطة التميز...');
                              try {
                                const newLifetimePoints = (student.lifetime_points || 0) + 20;
                                const newTier = (newLifetimePoints >= 1501) ? 'ذهبي' : (newLifetimePoints >= 501) ? 'فضي' : 'برونزي';
                                
                                await updateStudentMutation.mutateAsync({
                                  id: student.id,
                                  data: {
                                    current_points: (student.current_points || student.loyalty_points || 0) + 20,
                                    lifetime_points: newLifetimePoints,
                                    loyalty_tier: newTier
                                  }
                                });
                                await logLoyaltyPoints(student.id, 20, 'جائزة نجم الحصة', 'earned');
                                toast.success(`تم منح 20 نقطة تميز لـ ${student.full_name}`, { id: toastId });
                              } catch (err) {
                                toast.error('فشل منح النقاط', { id: toastId });
                              }
                            }}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                            title="نجم الحصة (+20 نقطة)"
                          >
                            <Award size={16} />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(student.id, 'حضر')}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                              todayBooking?.status === 'حضر' 
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                                : "bg-slate-50 text-slate-500 hover:bg-emerald-50"
                            )}
                          >
                            حاضر
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(student.id, 'غائب')}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                              todayBooking?.status === 'غائب' 
                                ? "bg-rose-600 text-white shadow-lg shadow-rose-100" 
                                : "bg-slate-50 text-slate-500 hover:bg-rose-50"
                            )}
                          >
                            غائب
                          </button>
                          {todayBooking && (
                            <button
                              onClick={async () => {
                                const toastId = toast.loading('جاري الحذف...');
                                try {
                                  await deleteBookingMutation.mutateAsync(todayBooking.id);
                                  toast.success('تم الحذف', { id: toastId });
                                  refetchBookings();
                                } catch (err) {
                                  toast.error('فشل الحذف', { id: toastId });
                                }
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-500 hover:bg-rose-100"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                      لا يوجد طلاب ينطبق عليهم البحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modals */}
      <Modal 
        isOpen={!!selectedStudentId} 
        onClose={() => setSelectedStudentId(null)}
        title="تفاصيل حضور الطالب"
        size="lg"
      >
        {selectedStudentId && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
              <div>
                <h4 className="font-bold text-lg">{students.find(s => s.id === selectedStudentId)?.full_name}</h4>
                <p className="text-xs text-slate-500">العمر: {students.find(s => s.id === selectedStudentId)?.age}</p>
              </div>
              <p className="text-sm font-bold text-blue-600">سجل الحضور</p>
            </div>

            {/* Manual Entry Form */}
            <div className="border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-blue-600">إضافة سجل حضور يدوي</p>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const date = formData.get('date') as string;
                  const status = formData.get('status') as string;
                  const student = students.find(s => s.id === selectedStudentId);
                  
                  if (!date || !status || !student) return;

                  const toastId = toast.loading('جاري إضافة السجل...');
                  try {
                    await addBookingMutation.mutateAsync({
                      student_id: student.id,
                      student_name: student.full_name,
                      session_id: 'manual',
                      date: new Date(date).toISOString(),
                      status: status as any,
                      session_day: format(new Date(date), 'EEEE'),
                      session_time: '00:00'
                    });
                    toast.success('تمت الإضافة بنجاح', { id: toastId });
                    refetchBookings();
                    (e.target as HTMLFormElement).reset();
                  } catch (err) {
                    toast.error('فشل في إضافة السجل', { id: toastId });
                  }
                }}
                className="grid grid-cols-3 gap-2"
              >
                <input 
                  type="date" 
                  name="date"
                  required
                  defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 text-xs outline-none"
                />
                <select 
                  name="status"
                  required
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 text-xs outline-none"
                >
                  <option value="حضر">حضر</option>
                  <option value="غائب">غائب</option>
                </select>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white rounded-lg py-1.5 px-4 text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  إضافة
                </button>
              </form>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              {bookings.filter(b => b.student_id === selectedStudentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(b => (
                <div key={b.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{format(new Date(b.date), 'dd/MM/yyyy')}</p>
                    <p className="text-xs text-slate-500">{b.session_day} - {b.session_time}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-slate-400">{b.coach_name || 'مدرب غير محدد'}</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold",
                      b.status === 'حضر' && "bg-emerald-50 text-emerald-600",
                      b.status === 'غائب' && "bg-rose-50 text-rose-600",
                      b.status === 'ملغي' && "bg-slate-50 text-slate-500"
                    )}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
              {bookings.filter(b => b.student_id === selectedStudentId).length === 0 && (
                <p className="p-8 text-center text-slate-400 italic">لا يوجد سجل حضور لهذا الطالب</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={!!selectedCoachId} 
        onClose={() => setSelectedCoachId(null)}
        title="تفاصيل حضور المدرب"
        size="lg"
      >
        {selectedCoachId && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
              <h4 className="font-bold text-lg">{trainers.find(t => t.id === selectedCoachId)?.name}</h4>
              <p className="text-sm font-bold text-emerald-600">سجل الدخول والخروج</p>
            </div>

            {/* Manual Coach Entry Form */}
            <div className="border border-emerald-100 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-emerald-600">إضافة سجل حضور يدوي للمدرب</p>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const date = formData.get('date') as string;
                  const checkIn = formData.get('checkIn') as string;
                  const checkOut = formData.get('checkOut') as string;
                  const lessons = parseInt(formData.get('lessons') as string) || 0;
                  
                  const trainer = trainers.find(t => t.id === selectedCoachId);
                  if (!date || !checkIn || !trainer) return;

                  const toastId = toast.loading('جاري إضافة سجل المدرب...');
                  try {
                    const checkInDate = new Date(`${date}T${checkIn}`);
                    const checkOutDate = checkOut ? new Date(`${date}T${checkOut}`) : undefined;
                    
                    await addCoachAttendanceMutation.mutateAsync({ 
                      coach_id: trainer.id,
                      coach_name: trainer.name,
                      date,
                      check_in: checkInDate.toISOString(),
                      check_out: checkOutDate?.toISOString(),
                      lessons_count: lessons,
                      status: 'حاضر'
                    });
                    
                    toast.success('تمت الإضافة بنجاح', { id: toastId });
                    refetchBookings();
                    (e.target as HTMLFormElement).reset();
                  } catch (err) {
                    toast.error('فشل في إضافة السجل', { id: toastId });
                  }
                }}
                className="grid grid-cols-2 md:grid-cols-4 gap-2"
              >
                <input 
                  type="date" 
                  name="date"
                  required
                  defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 text-[10px] outline-none"
                />
                <input 
                  type="time" 
                  name="checkIn"
                  required
                  placeholder="وقت الدخول"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 text-[10px] outline-none"
                />
                <input 
                  type="number" 
                  name="lessons"
                  placeholder="عدد الدروس"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 text-[10px] outline-none"
                />
                <button 
                  type="submit"
                  className="bg-emerald-600 text-white rounded-lg py-1.5 px-4 text-[10px] font-bold hover:bg-emerald-700 transition-colors w-full"
                >
                  إضافة
                </button>
              </form>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              {coachAttendance.filter(a => a.coach_id === selectedCoachId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                <div key={a.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{a.date}</p>
                    <p className="text-xs text-slate-500">المدة: {a.duration_minutes || 0} دقيقة</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-2 text-[10px] font-bold">
                      <span className="text-emerald-600">دخول: {a.check_in ? format(new Date(a.check_in), 'HH:mm') : '-'}</span>
                      <span className="text-rose-600">خروج: {a.check_out ? format(new Date(a.check_out), 'HH:mm') : '-'}</span>
                    </div>
                    {a.lessons_count !== undefined && (
                      <span className="text-[10px] text-blue-600 font-bold">الدروس: {a.lessons_count}</span>
                    )}
                  </div>
                </div>
              ))}
              {coachAttendance.filter(a => a.coach_id === selectedCoachId).length === 0 && (
                <p className="p-8 text-center text-slate-400 italic">لا يوجد سجل حضور لهذا المدرب</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
