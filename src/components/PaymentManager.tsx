import React, { useState, useMemo } from 'react';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { generatePaymentMessage, calculateMonthlyFee, formatAmount, PAYMENT_CONFIG } from '../services/paymentService';
import { autoNotifier } from '../services/autoNotificationService';
import { createWhatsAppLink } from '../utils/whatsapp';
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MessageCircle, 
  Send,
  Calendar,
  TrendingUp,
  Users,
  Bell,
  Download,
  Loader2,
  Settings,
  X,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { Modal } from './Modal';
import { useAuth } from '../AuthContext';

export const PaymentManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: appSettings, isLoading: settingsLoading } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'paid' | 'auto'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Local settings state for the form
  const [tempSettings, setTempSettings] = useState(PAYMENT_CONFIG);

  // Sync temp settings when appSettings loads
  React.useEffect(() => {
    if (appSettings?.payment_config) {
      setTempSettings(appSettings.payment_config);
    }
  }, [appSettings]);

  const currentConfig = appSettings?.payment_config || PAYMENT_CONFIG;

  // Arabic Months
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Calculate Stats
  const stats = useMemo(() => {
    if (!students || !payments) return { total: 0, paid: 0, pending: 0, overdue: 0, revenue: 0 };

    const monthPayments = payments.filter(p => {
      const pDate = new Date(p.date);
      return pDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' }) === selectedMonth;
    });
    
    const paidStudentIds = new Set(monthPayments.map(p => p.student_id));
    
    const total = students.length;
    const paid = paidStudentIds.size;
    const pending = total - paid;
    
    // Calculate overdue (more than 5 days)
    const today = new Date();
    const overdue = students.filter(s => {
      if (paidStudentIds.has(s.id)) return false;
      const dueDate = new Date();
      dueDate.setDate(1);
      return (today.getTime() - dueDate.getTime()) > (5 * 24 * 60 * 60 * 1000);
    }).length;

    const revenue = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return { total, paid, pending, overdue, revenue };
  }, [students, payments, selectedMonth]);

  // Students with status
  const studentsWithStatus = useMemo(() => {
    if (!students) return [];
    
    return students.map(student => {
      const payment = payments?.find(p => {
        const pDate = new Date(p.date);
        return p.student_id === student.id && 
               pDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' }) === selectedMonth;
      });
      
      const amount = calculateMonthlyFee(student.level);
      const dueDate = new Date();
      dueDate.setDate(1);
      const today = new Date();
      const daysOverdue = payment ? 0 : 
        Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...student,
        amount,
        status: payment ? 'confirmed' : 'pending',
        paymentDate: payment?.date,
        daysOverdue: Math.max(0, daysOverdue),
        receiptNumber: payment?.id
      };
    });
  }, [students, payments, selectedMonth]);

  // Send payment request
  const sendPaymentRequest = (student: any, type: 'due' | 'overdue' | 'reminder' | 'confirmed' = 'due') => {
    const message = generatePaymentMessage(student, student.amount, selectedMonth, type, currentConfig);
    const link = createWhatsAppLink(student.phone || student.parent_phone || '', message);
    window.open(link, '_blank');
    toast.success(`تم إرسال طلب دفع لـ ${student.full_name}`);
  };

  // Confirm payment receipt
  const confirmPayment = async (student: any) => {
    const receiptNum = `REC-${Date.now()}-${student.id}`;
    const message = generatePaymentMessage(
      { ...student, receiptNumber: receiptNum }, 
      student.amount, 
      selectedMonth, 
      'confirmed',
      currentConfig
    );
    
    const link = createWhatsAppLink(student.phone || student.parent_phone || '', message);
    window.open(link, '_blank');
    
    toast.success(`✅ تم تأكيد استلام دفع ${student.full_name}`);
  };

  // Send bulk requests
  const sendBulkRequest = () => {
    const pending = studentsWithStatus.filter(s => s.status === 'pending');
    
    if (pending.length === 0) {
      toast.error('لا توجد مدفوعات معلقة');
      return;
    }

    setIsProcessing(true);
    
    pending.forEach((student, index) => {
      setTimeout(() => {
        const type = student.daysOverdue > 5 ? 'overdue' : 'due';
        sendPaymentRequest(student, type);
      }, index * 3000);
    });

    setTimeout(() => setIsProcessing(false), pending.length * 3000);
    toast.success(`جاري إرسال ${pending.length} طلب دفع...`);
  };

  // Enable auto reminders
  const enableAutoReminders = () => {
    const notifications = autoNotifier.generateMonthlyNotifications(
      students || [], 
      payments || [], 
      selectedMonth,
      currentConfig
    );
    
    toast.success(`تمت جدولة ${notifications.length} تذكير تلقائي`);
  };

  // Export report
  const exportReport = () => {
    const headers = ['الاسم', 'المستوى', 'الحالة', 'المبلغ', 'أيام التأخير'];
    const rows = studentsWithStatus.map(s => [
      s.full_name,
      s.level,
      s.status === 'confirmed' ? 'تم الدفع' : 'معلق',
      s.amount,
      s.daysOverdue
    ]);
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير-مدفوعات-${selectedMonth}.csv`;
    link.click();
    toast.success('تم تحميل التقرير بنجاح');
  };

  if (studentsLoading || paymentsLoading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">جاري تحميل بيانات المدفوعات...</p>
      </div>
    );
  }

  const handleSaveSettings = () => {
    updateSettings({ payment_config: tempSettings });
    setIsSettingsOpen(false);
    toast.success('تم حفظ إعدادات الدفع بنجاح');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-slate-100">
            <DollarSign className="text-emerald-600" size={32} />
            إدارة المدفوعات والتحصيل
          </h2>
          <p className="text-slate-500 dark:text-slate-400">متابعة الاشتراكات الشهرية وتنبيه المتأخرين.</p>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title="إعدادات الدفع"
            >
              <Settings size={24} />
            </button>
          )}

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {arabicMonths.map(m => {
              const year = new Date().getFullYear();
              const monthYear = `${m} ${year}`;
              return (
                <option key={monthYear} value={monthYear}>{monthYear}</option>
              );
            })}
          </select>
          
          <button
            onClick={exportReport}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none"
          >
            <Download size={18} />
            تصدير تقرير
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          icon={Users} 
          label="إجمالي الطلاب" 
          value={stats.total} 
          color="blue" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="تم الدفع" 
          value={stats.paid} 
          color="green" 
        />
        <StatCard 
          icon={Clock} 
          label="معلق" 
          value={stats.pending} 
          color="yellow" 
        />
        <StatCard 
          icon={AlertTriangle} 
          label="متأخر" 
          value={stats.overdue} 
          color="red" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="الإيرادات" 
          value={formatAmount(stats.revenue)} 
          color="purple" 
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: Calendar },
          { id: 'pending', label: 'المعلقون', icon: Clock },
          { id: 'paid', label: 'تم الدفع', icon: CheckCircle },
          { id: 'auto', label: 'تذكيرات تلقائية', icon: Bell },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap font-bold",
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={sendBulkRequest}
          disabled={isProcessing || stats.pending === 0}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100 dark:shadow-none transition-all"
        >
          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          {isProcessing ? 'جاري الإرسال...' : `إرسال طلبات للجميع (${stats.pending})`}
        </button>
        
        <button
          onClick={enableAutoReminders}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none transition-all"
        >
          <Bell size={20} />
          تفعيل التذكيرات التلقائية
        </button>
        
        <button
          onClick={() => autoNotifier.checkAndSend()}
          className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-100 dark:shadow-none transition-all"
        >
          <MessageCircle size={20} />
          فحص وإرسال فوري
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {activeTab === 'overview' && (
          <OverviewTab students={studentsWithStatus} onSend={sendPaymentRequest} onConfirm={confirmPayment} />
        )}
        {activeTab === 'pending' && (
          <PendingTab students={studentsWithStatus.filter(s => s.status === 'pending')} onSend={sendPaymentRequest} />
        )}
        {activeTab === 'paid' && (
          <PaidTab students={studentsWithStatus.filter(s => s.status === 'confirmed')} />
        )}
        {activeTab === 'auto' && (
          <AutoTab stats={autoNotifier.getStats()} />
        )}
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="إعدادات الدفع والتحصيل"
      >
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم الأكاديمية</label>
              <input
                type="text"
                value={tempSettings.academyName}
                onChange={(e) => setTempSettings({ ...tempSettings, academyName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">هاتف الأكاديمية</label>
              <input
                type="text"
                value={tempSettings.academyPhone}
                onChange={(e) => setTempSettings({ ...tempSettings, academyPhone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم Bit</label>
              <input
                type="text"
                value={tempSettings.bitPhone}
                onChange={(e) => setTempSettings({ ...tempSettings, bitPhone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم PayBox</label>
              <input
                type="text"
                value={tempSettings.payboxPhone}
                onChange={(e) => setTempSettings({ ...tempSettings, payboxPhone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم البنك</label>
              <input
                type="text"
                value={tempSettings.bankName}
                onChange={(e) => setTempSettings({ ...tempSettings, bankName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم الحساب البنكي</label>
              <input
                type="text"
                value={tempSettings.bankAccount}
                onChange={(e) => setTempSettings({ ...tempSettings, bankAccount: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveSettings}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <Save size={20} />
              حفظ الإعدادات
            </button>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Sub-components
const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30',
    green: 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30',
    yellow: 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30',
    red: 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/30',
    purple: 'bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800/30'
  };

  return (
    <div className={cn("p-4 rounded-2xl border transition-all", colors[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} />
        <span className="text-xs font-bold opacity-80">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
};

const OverviewTab = ({ students, onSend, onConfirm }: { students: any[], onSend: any, onConfirm: any }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-right">
      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
        <tr>
          <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الطالب</th>
          <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">المستوى</th>
          <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">المبلغ</th>
          <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الحالة</th>
          <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">أيام التأخير</th>
          <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الإجراءات</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
        {students.map(student => (
          <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
            <td className="px-6 py-4">
              <p className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{student.phone || student.parent_phone}</p>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{student.level}</td>
            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{formatAmount(student.amount)}</td>
            <td className="px-6 py-4">
              <StatusBadge status={student.status} daysOverdue={student.daysOverdue} />
            </td>
            <td className="px-6 py-4">
              {student.daysOverdue > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">{student.daysOverdue} يوم</span>
              ) : (
                <span className="text-slate-400 dark:text-slate-600">-</span>
              )}
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                {student.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => onSend(student, student.daysOverdue > 5 ? 'overdue' : 'due')}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                    >
                      طلب دفع
                    </button>
                    <button
                      onClick={() => onConfirm(student)}
                      className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
                    >
                      تأكيد
                    </button>
                  </>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm font-bold">
                    <CheckCircle size={16} /> تم الدفع
                  </span>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PendingTab = ({ students, onSend }: { students: any[], onSend: any }) => (
  <div className="p-6">
    <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-slate-100">مدفوعات معلقة ({students.length})</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {students.map(student => (
        <div key={student.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{student.full_name}</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{student.level} - {formatAmount(student.amount)}</p>
            {student.daysOverdue > 0 && (
              <p className="text-rose-600 dark:text-rose-400 text-xs font-bold mt-1">متأخر {student.daysOverdue} يوم</p>
            )}
          </div>
          <button
            onClick={() => onSend(student, student.daysOverdue > 5 ? 'overdue' : 'due')}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-emerald-700 transition-all"
          >
            <MessageCircle size={18} />
            تذكير
          </button>
        </div>
      ))}
      {students.length === 0 && (
        <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400">
          لا توجد مدفوعات معلقة حالياً.
        </div>
      )}
    </div>
  </div>
);

const PaidTab = ({ students }: { students: any[] }) => (
  <div className="p-6">
    <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-slate-100">مدفوعات تم استلامها ({students.length})</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {students.map(student => (
        <div key={student.id} className="border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-900/10">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{student.full_name}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{formatAmount(student.amount)}</p>
            </div>
            <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle size={24} />
              <span className="font-bold">تم الدفع</span>
            </div>
          </div>
          {student.receiptNumber && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">رقم المرجع: {student.receiptNumber}</p>
          )}
        </div>
      ))}
      {students.length === 0 && (
        <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400">
          لم يتم تسجيل أي مدفوعات لهذا الشهر بعد.
        </div>
      )}
    </div>
  </div>
);

const AutoTab = ({ stats }: { stats: any }) => (
  <div className="p-6 space-y-8">
    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">نظام التذكيرات التلقائي</h3>
    
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl text-center border border-blue-100 dark:border-blue-800/30">
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.scheduled}</p>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">مجدولة</p>
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl text-center border border-emerald-100 dark:border-emerald-800/30">
        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.sent}</p>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">تم الإرسال</p>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl text-center border border-amber-100 dark:border-amber-800/30">
        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">معلقة</p>
      </div>
    </div>

    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
      <h4 className="font-bold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Bell size={18} className="text-blue-600" />
        كيف يعمل النظام؟
      </h4>
      <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm">
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
          <span>قبل 3 أيام من موعد الاستحقاق - يتم إرسال تذكير لطيف لولي الأمر.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
          <span>بعد 5 أيام من التأخير - يتم إرسال تنبيه عاجل بضرورة السداد.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
          <span>يتم فتح محادثة الواتساب تلقائياً مع الرسالة المجهزة لتسهيل التواصل.</span>
        </li>
      </ul>
    </div>
  </div>
);

const StatusBadge = ({ status, daysOverdue }: { status: string, daysOverdue: number }) => {
  if (status === 'confirmed') {
    return (
      <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">
        تم الدفع
      </span>
    );
  }
  
  if (daysOverdue > 5) {
    return (
      <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full text-xs font-bold">
        متأخر {daysOverdue} يوم
      </span>
    );
  }
  
  return (
    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold">
      معلق
    </span>
  );
};
