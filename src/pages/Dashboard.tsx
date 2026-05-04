import React, { useMemo } from 'react';
import { StatCard } from '../components/Card';
import { Users, Calendar, CreditCard, Clock, TrendingUp, Loader2, AlertCircle, Award } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboard';
import StatsCharts from '../components/StatsCharts';
import { SmartInsights } from '../components/SmartInsights';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useTrainers, useCoachAttendance, useCoachCheckIn, useCoachCheckOut } from '../hooks/useTrainers';
import { useAuth } from '../AuthContext';
import { useI18n } from '../lib/LanguageContext';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, error } = useDashboardStats();
  const { data: students = [] } = useStudents();
  const { data: payments = [] } = usePayments();
  const { data: trainers = [] } = useTrainers();
  const { t, language } = useI18n();
  const { user, isAdmin, isCoach } = useAuth();
  const { data: coachAttendance = [] } = useCoachAttendance(isCoach() ? user?.uid : undefined);
  const checkInMutation = useCoachCheckIn();
  const checkOutMutation = useCoachCheckOut();

  // Calculate Real Trends
  const trends = useMemo(() => {
    if (!students.length || !payments.length) return {};

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    // 1. Student Growth
    const studentsThisMonth = students.filter(s => {
      if (!s.registration_date) return false;
      const d = new Date(s.registration_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    
    const studentsLastMonth = students.filter(s => {
      if (!s.registration_date) return false;
      const d = new Date(s.registration_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;

    const studentTrend = studentsLastMonth === 0 ? (studentsThisMonth > 0 ? 100 : 0) : Math.round(((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100);

    // 2. Revenue Growth
    const revenueThisMonth = payments.filter(p => {
      const d = new Date(p.date || '');
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const revenueLastMonth = payments.filter(p => {
      const d = new Date(p.date || '');
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const revenueTrend = revenueLastMonth === 0 ? (revenueThisMonth > 0 ? 100 : 0) : Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100);

    // 3. Trainer Growth
    const trainersThisMonth = trainers.filter(t => {
      if (!t.join_date) return false;
      const d = new Date(t.join_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const trainersLastMonth = trainers.filter(t => {
      if (!t.join_date) return false;
      const d = new Date(t.join_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;

    const trainerTrend = trainersLastMonth === 0 ? (trainersThisMonth > 0 ? 100 : 0) : Math.round(((trainersThisMonth - trainersLastMonth) / trainersLastMonth) * 100);

    // 4. Activity (Status Distribution / Attendance)
    const activeStudents = students.filter(s => s.status !== 'غير نشط').length;
    const activeRate = students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0;

    return {
      students: { value: `${Math.abs(studentTrend)}%`, isUp: studentTrend >= 0 },
      revenue: { value: `${Math.abs(revenueTrend)}%`, isUp: revenueTrend >= 0 },
      trainers: { value: `${Math.abs(trainerTrend)}%`, isUp: trainerTrend >= 0 },
      sessions: { value: `${activeRate}%`, isUp: true }
    };
  }, [students, payments, trainers, t]);

  const currentCoach = trainers.find(t => t.email === user?.email || t.id === user?.uid);

  if (statsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">{t('loading_data')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-4 text-red-700">
        <AlertCircle size={24} />
        <p className="font-bold">{t('error_loading_data')}: {(error as any).message}</p>
      </div>
    );
  }

  if (isCoach()) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">أهلاً بك كابتن {currentCoach?.name || user?.displayName}</h2>
            <p className="text-slate-500 dark:text-slate-400">إليك نظرة سريعة على طلابك وأدائك.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Calendar size={16} />
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            title="نقاط الولاء" 
            value={currentCoach?.loyalty_points || 0} 
            icon={<Award size={24} />} 
            color="orange"
          />
          <StatCard 
            title="طلابك المسجلون" 
            value={students.filter(s => s.assigned_coach_id === user?.uid).length} 
            icon={<Users size={24} />} 
            color="blue"
          />
          <StatCard 
            title="جلسات اليوم" 
            value={stats?.sessionsCount || 0} 
            icon={<Clock size={24} />} 
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 font-['Cairo']">طلابك النشطون</h3>
            <div className="space-y-4">
              {students.filter(s => s.assigned_coach_id === user?.uid).slice(0, 5).map(student => (
                <div key={student.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 font-['Cairo']">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{student.level}</p>
                    </div>
                  </div>
                  <button className="text-blue-600 dark:text-blue-400 text-sm font-bold">عرض التفاصيل</button>
                </div>
              ))}
              {students.filter(s => s.assigned_coach_id === user?.uid).length === 0 && (
                <p className="text-center text-slate-500 py-8 italic font-['Cairo']">لم يتم تعيين طلاب لك بعد.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 font-['Cairo']">تسجيل الحضور اليومي</h3>
            {(() => {
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              const todayEntry = coachAttendance.find(a => a.date === todayStr);

              return (
                <div className="flex flex-col items-center justify-center py-4 space-y-4 font-['Cairo']">
                  <div className={`p-4 rounded-full ${todayEntry ? (todayEntry.check_out ? 'bg-slate-100' : 'bg-emerald-100') : 'bg-blue-100'}`}>
                    <Clock size={32} className={todayEntry ? (todayEntry.check_out ? 'text-slate-500' : 'text-emerald-600') : 'text-blue-600'} />
                  </div>
                  
                  <div className="text-center">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                      {todayEntry 
                        ? (todayEntry.check_out ? 'تم إنهاء الجلسة بنجاح' : `جاري التدريب (منذ ${todayEntry.check_in})`)
                        : 'لم يتم تسجيل الحضور اليوم'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {todayEntry && !todayEntry.check_out && 'تذكر تسجيل الخروج للحصول على نقاط الولاء'}
                    </p>
                  </div>

                  {!todayEntry ? (
                    <button
                      onClick={async () => {
                        const loadingToast = toast.loading('جاري تسجيل الحضور...');
                        try {
                          await checkInMutation.mutateAsync({ coachId: user!.uid, coachName: currentCoach?.name || user?.displayName || 'مدرب' });
                          toast.success('تم تسجيل الحضور بنجاح', { id: loadingToast });
                        } catch (err: any) {
                          toast.error(err.message || 'فشل تسجيل الحضور', { id: loadingToast });
                        }
                      }}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      تسجيل دخول الآن
                    </button>
                  ) : !todayEntry.check_out ? (
                    <button
                      onClick={async () => {
                        const loadingToast = toast.loading('جاري تسجيل الخروج...');
                        try {
                          await checkOutMutation.mutateAsync({ id: todayEntry.id, coachId: user!.uid });
                          toast.success('تم تسجيل الخروج! حصلت على 10 نقاط ولاء', { id: loadingToast });
                        } catch (err: any) {
                          toast.error(err.message || 'فشل تسجيل الخروج', { id: loadingToast });
                        }
                      }}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                    >
                      تسجيل خروج (إنهاء الجلسة)
                    </button>
                  ) : (
                    <div className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-slate-500 font-bold border border-slate-200 dark:border-slate-700">
                      داومت اليوم بنجاح و حصلت على النقاط
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 font-['Cairo']">مهام سريعة</h3>
            <div className="grid grid-cols-2 gap-4 font-['Cairo']">
              <button 
                onClick={() => window.location.href = '/students'}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex flex-col items-center gap-2 group"
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Users size={24} />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">إضافة طالب</span>
              </button>
              <button 
                onClick={() => window.location.href = '/attendance'}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex flex-col items-center gap-2 group"
              >
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock size={24} />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">تسجيل حضور</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-['Cairo']">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('dashboard')}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t('welcome_back')}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2 transition-colors">
          <Calendar size={16} />
          {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('total_students')} 
          value={stats?.studentsCount || 0} 
          icon={<Users size={24} />} 
          trend={trends.students}
          color="blue"
        />
        <StatCard 
          title={t('total_trainers')} 
          value={stats?.trainersCount || 0} 
          icon={<Clock size={24} />} 
          trend={trends.trainers}
          color="orange"
        />
        <StatCard 
          title={t('total_revenue')} 
          value={`${stats?.totalRevenue?.toLocaleString() || 0} ₪`} 
          icon={<CreditCard size={24} />} 
          trend={trends.revenue}
          color="green"
        />
        <StatCard 
          title={t('scheduled_sessions')} 
          value={stats?.sessionsCount || 0} 
          icon={<TrendingUp size={24} />} 
          trend={trends.sessions}
          color="purple"
        />
      </div>

      <StatsCharts />

      {/* Smart Insights Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <SmartInsights 
          students={students} 
          payments={payments} 
          bookings={(stats as any)?.recentBookings || []} 
          trainers={trainers} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">{t('recent_payments')}</h3>
          <div className="space-y-4">
            {stats?.recentPayments?.length ? stats.recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{payment.student_name || 'طالب غير معروف'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{payment.date || 'تاريخ غير معروف'}</p>
                  </div>
                </div>
                <span className="font-bold text-green-600 dark:text-emerald-400">+{payment.amount} ₪</span>
              </div>
            )) : (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('recent_payments')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
