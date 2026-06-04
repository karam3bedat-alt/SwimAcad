import React from 'react';
import { SmartInsights } from '../components/SmartInsights';
import { Bell } from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useBookings } from '../hooks/useBookings';
import { useTrainers } from '../hooks/useTrainers';

const Notifications: React.FC = () => {
  const { data: students = [] } = useStudents();
  const { data: payments = [] } = usePayments();
  const { data: bookings = [] } = useBookings();
  const { data: trainers = [] } = useTrainers();

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <span className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Bell size={28} />
            </span>
            مركز الإشعارات والذكاء الأعمال
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
            هنا يمكنك متابعة التنبيهات التلقائية، مراجعة التحليلات الذكية، والتواصل مع أولياء الأمور بسهولة عبر واتساب.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
      </div>

      {/* Smart AI Insights Section */}
      <section className="bg-white dark:bg-slate-900 overflow-hidden">
        <SmartInsights 
          students={students} 
          payments={payments} 
          bookings={bookings}
          trainers={trainers}
        />
      </section>

      {/* Action Footer */}
      <div className="mt-8 flex justify-center">
        <p className="text-xs text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-800">
          ✨ يتم تحديث هذه التنبيهات تلقائياً بناءً على تحليل عميق لبيانات الطلاب والدفعات.
        </p>
      </div>
    </div>
  );
};

export default Notifications;
