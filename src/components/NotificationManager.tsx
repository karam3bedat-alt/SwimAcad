import React, { useState, useEffect } from 'react';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useSettings } from '../hooks/useSettings';
import { scheduler, ScheduledNotification } from '../services/schedulerService';
import { Bell, Send, Calendar, AlertTriangle, CheckCircle, MessageCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const NotificationManager: React.FC = () => {
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: payments, isLoading: loadingPayments } = usePayments();
  const { data: settings } = useSettings();
  
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toLocaleString('ar-SA', { month: 'long' })
  );
  
  const [overdueList, setOverdueList] = useState<{ student: any; daysOverdue: number; amount: number; dueDate: string }[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate overdue payments automatically
  useEffect(() => {
    if (students && payments) {
      const coursePrices = (settings?.payment_config as any)?.coursePrices;
      const overdue = scheduler.calculateOverduePayments(students, payments, currentMonth, coursePrices);
      setOverdueList(overdue);
    }
  }, [students, payments, currentMonth, settings]);

  // Generate notifications
  const generateNotifications = () => {
    setIsProcessing(true);
    
    const notifications = scheduler.generatePaymentNotifications(overdueList, currentMonth);
    setScheduledNotifications(notifications);
    
    toast.success(`تم توليد ${notifications.length} إشعار`);
    setIsProcessing(false);
  };

  // Send notification
  const sendNotification = (notification: ScheduledNotification) => {
    scheduler.sendWhatsApp(notification);
    
    // Update list
    setScheduledNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, status: 'sent' } : n)
    );
    
    toast.success('تم فتح واتساب');
  };

  // Send all
  const sendAll = () => {
    const pending = scheduledNotifications.filter(n => n.status === 'pending');
    
    if (pending.length === 0) {
      toast.error('لا توجد إشعارات معلقة');
      return;
    }

    pending.forEach((notification, index) => {
      setTimeout(() => {
        sendNotification(notification);
      }, index * 3000);
    });

    toast.success(`جاري إرسال ${pending.length} إشعار...`);
  };

  if (loadingStudents || loadingPayments) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Bell className="text-blue-600" />
            نظام الإشعارات الذكي
          </h2>
          <p className="text-slate-500 dark:text-slate-400">إدارة وتنبيه أولياء الأمور بالدفعات المتأخرة.</p>
        </div>
        
        <select
          value={currentMonth}
          onChange={(e) => setCurrentMonth(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
        >
          {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
            .map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-200 dark:border-orange-800/50">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-2">
            <AlertTriangle size={20} />
            <span className="font-bold">متأخرون عن الدفع</span>
          </div>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-500">{overdueList.length}</p>
          <p className="text-sm text-orange-600 dark:text-orange-400">طالب لم يسدد لشهر {currentMonth}</p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
            <Calendar size={20} />
            <span className="font-bold">إجمالي المستحقات</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-500">
            {overdueList.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} ₪
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">مبلغ متوقع تحصيله</p>
        </div>
        
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
            <CheckCircle size={20} />
            <span className="font-bold">إشعارات جاهزة</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">
            {scheduledNotifications.filter(n => n.status === 'pending').length}
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">إشعار معلق للإرسال</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={generateNotifications}
          disabled={isProcessing || overdueList.length === 0}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100 dark:shadow-none transition-all"
        >
          <Bell size={20} />
          توليد إشعارات الدفع
        </button>
        
        <button
          onClick={sendAll}
          disabled={scheduledNotifications.filter(n => n.status === 'pending').length === 0}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100 dark:shadow-none transition-all"
        >
          <Send size={20} />
          إرسال الكل
        </button>
      </div>

      {/* Notifications Table */}
      {scheduledNotifications.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الطالب</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">نوع الإشعار</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">المبلغ</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الأولوية</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الحالة</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {scheduledNotifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {students?.find(s => s.id === notification.studentId)?.full_name || notification.studentId}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        notification.type === 'payment_overdue' 
                          ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' 
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      }`}>
                        {notification.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{notification.amount} ₪</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        notification.urgency === 'high' 
                          ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' 
                          : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {notification.urgency === 'high' ? 'عالية' : 'عادية'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {notification.status === 'sent' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm font-bold">
                          <CheckCircle size={16} /> تم الإرسال
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">معلق</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => sendNotification(notification)}
                        disabled={notification.status === 'sent'}
                        className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                      >
                        <MessageCircle size={16} />
                        إرسال
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManager;
