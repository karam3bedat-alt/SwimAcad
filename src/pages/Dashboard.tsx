import React from 'react';
import { StatCard } from '../components/Card';
import { Users, Calendar, CreditCard, Clock, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboard';
import StatsCharts from '../components/StatsCharts';

import { useI18n } from '../lib/LanguageContext';

export default function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { t, language } = useI18n();

  if (isLoading) {
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

  return (
    <div className="space-y-8">
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
          trend={{ value: '12%', isUp: true }}
          color="blue"
        />
        <StatCard 
          title={t('total_trainers')} 
          value={stats?.trainersCount || 0} 
          icon={<Clock size={24} />} 
          trend={{ value: '5%', isUp: true }}
          color="orange"
        />
        <StatCard 
          title={t('total_revenue')} 
          value={`${stats?.totalRevenue?.toLocaleString() || 0} ₪`} 
          icon={<CreditCard size={24} />} 
          trend={{ value: '8%', isUp: true }}
          color="green"
        />
        <StatCard 
          title={t('scheduled_sessions')} 
          value={stats?.sessionsCount || 0} 
          icon={<TrendingUp size={24} />} 
          trend={{ value: '3%', isUp: true }}
          color="purple"
        />
      </div>

      <StatsCharts />

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
