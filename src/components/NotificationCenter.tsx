import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, CreditCard, Clock, MessageCircle, X, ChevronRight, AlertCircle } from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useBookings } from '../hooks/useBookings';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { calculateMonthlyFee } from '../services/paymentService';
import { useSettings } from '../hooks/useSettings';

interface Notification {
  id: string;
  type: 'lesson' | 'payment' | 'system';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  studentId?: string;
  phone?: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: students } = useStudents();
  const { data: payments } = usePayments();
  const { data: bookings } = useBookings();
  const { data: settings } = useSettings();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const generateNotifications = () => {
      const newNotifications: Notification[] = [];
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      // 1. Session Reminders (2-3 hours before)
      if (bookings && students) {
        bookings.forEach(booking => {
          // Check if booking is today and scheduled
          if (booking.date === todayStr && booking.status === 'محجوز') {
            const timeStr = booking.session_time || booking.start_time;
            if (timeStr) {
              const [hours, minutes] = timeStr.split(':').map(Number);
              const sessionDate = new Date();
              sessionDate.setHours(hours, minutes, 0, 0);
              
              const diffMs = sessionDate.getTime() - now.getTime();
              const diffHours = diffMs / (1000 * 60 * 60);

              // Notify if session is in the next 3 hours
              if (diffHours > 0 && diffHours <= 3) {
                const student = students.find(s => s.id === booking.student_id);
                newNotifications.push({
                  id: `lesson-${booking.id}`,
                  type: 'lesson',
                  title: 'تذكير بموعد درس اليوم',
                  message: `تذكير: البطل ${booking.student_name} لديه حصة اليوم الساعة ${timeStr}. نتمنى له تدريباً ممتعاً!`,
                  time: 'عاجل',
                  isRead: false,
                  studentId: booking.student_id,
                  phone: student?.phone || student?.parent_phone
                });
              }
            }
          }
        });
      }

      // 2. Payment Reminders (Partial or Pending for current month)
      if (students && payments) {
        const currentMonthName = now?.toLocaleString('ar-EG', { month: 'long' }) || '';
        const currentYear = now?.getFullYear() || new Date().getFullYear();
        const currentMonthYear = `${currentMonthName} ${currentYear}`;
        
        students.forEach(student => {
          if (student.status === 'نشط') {
            const studentPayments = payments.filter(p => {
              if (!p || !p.date) return false;
              const pDate = new Date(p.date);
              const pMonthStr = pDate?.toLocaleString('ar-EG', { month: 'long', year: 'numeric' }) || '';
              return p.student_id === student.id && (pMonthStr === currentMonthYear || p.month === currentMonthYear);
            });

            const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const currentConfig = settings?.payment_config as any;
            const baseFee = student.custom_fee || calculateMonthlyFee(student.course_type || student.level, currentConfig?.coursePrices);
            const requiredAmount = (student.loyalty_points || 0) >= 100 ? Math.max(0, baseFee - 100) : baseFee;

            if (totalPaid < requiredAmount) {
              newNotifications.push({
                id: `payment-${student.id}-${currentMonthYear}`,
                type: 'payment',
                title: totalPaid > 0 ? 'اشتراك جزئي معلق' : 'اشتراك متبقي',
                message: totalPaid > 0 
                  ? `باقي مبلغ ${requiredAmount - totalPaid} ₪ من اشتراك ${student.full_name} لشهر ${currentMonthName}.`
                  : `لم يتم سداد اشتراك ${student.full_name} لشهر ${currentMonthName} بعد.`,
                time: 'بانتظار التحصيل',
                isRead: false,
                studentId: student.id,
                phone: student.phone || student.parent_phone
              });
            }
          }
        });
      }

      setNotifications(newNotifications);
    };

    generateNotifications();
    const interval = setInterval(generateNotifications, 1000 * 60 * 15); // Refresh every 15 mins
    return () => clearInterval(interval);
  }, [students, payments, bookings]);

  const unreadCount = notifications.length;

  const handleWhatsApp = (notification: Notification) => {
    if (notification.phone) {
      const message = encodeURIComponent(notification.message);
      window.open(`https://wa.me/${notification.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2.5 rounded-xl transition-all duration-300 group",
          isOpen 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" 
            : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700"
        )}
      >
        <Bell size={22} className={cn(unreadCount > 0 && !isOpen && "animate-tada")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 font-black shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute left-0 mt-3 w-[360px] bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 overflow-hidden z-50 text-right"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-gradient-to-l from-slate-50/80 to-white dark:from-slate-800/50 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 dark:shadow-none">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100">الإشعارات الذكية</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">تذكيرات الدروس والمدفوعات</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[480px] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <p className="text-slate-900 dark:text-slate-100 font-bold mb-1">كل شيء تمام!</p>
                  <p className="text-sm text-slate-500">لا توجد تنبيهات عاجلة في الوقت الحالي.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-default group"
                    >
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                          notification.type === 'lesson' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20' : 
                          'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20'
                        )}>
                          {notification.type === 'lesson' ? <Calendar size={22} /> : <CreditCard size={22} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-black">
                              {notification.time}
                            </span>
                            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{notification.title}</h4>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                            {notification.message}
                          </p>
                          
                          {notification.phone && (
                            <button 
                              onClick={() => handleWhatsApp(notification)}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                            >
                              <MessageCircle size={16} />
                              إرسال واتساب لولي الأمر
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button className="flex items-center justify-center gap-2 w-full text-xs font-black text-blue-600 dark:text-blue-400 hover:gap-3 transition-all">
                  مشاهدة كافة السجلات
                  <ChevronRight size={14} className="rotate-180" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple Helper Components for the Dropdown
function CheckCircle({ className, ...props }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
