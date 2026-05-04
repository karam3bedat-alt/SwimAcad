import React, { useState } from 'react';
import { Modal } from './Modal';
import { Student, Payment, Booking } from '../types';
import { Loader2, User, Wallet, Calendar, Star, Image as ImageIcon, Phone, MapPin, Award, UserCheck, Clock, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePayments } from '../hooks/usePayments';
import { useTransactions } from '../hooks/useTransactions';
import { useBookings } from '../hooks/useBookings';
import { useStudentEvaluations, useStudentMedia } from '../hooks/useStudents';
import { StarRating } from './StudentCoachFeatures';
import { format } from 'date-fns';
import { useI18n } from '../lib/LanguageContext';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

type TabType = 'info' | 'payments' | 'attendance' | 'evaluations' | 'media';

export function StudentProfileModal({ isOpen, onClose, student }: StudentProfileModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  const { data: allPayments = [], isLoading: isLoadingPayments } = usePayments();
  const { data: allTransactions = [], isLoading: isLoadingTransactions } = useTransactions();
  const { data: allBookings = [], isLoading: isLoadingBookings } = useBookings();
  const { data: evaluations = [], isLoading: isLoadingEvaluations } = useStudentEvaluations(student?.id || '');
  const { data: media = [], isLoading: isLoadingMedia } = useStudentMedia(student?.id || '');

  if (!student) return null;

  const studentPayments = allPayments.filter(p => p.student_id === student.id);
  const studentTransactions = allTransactions.filter(t => t.student_id === student.id);
  const studentBookings = allBookings.filter(b => b.student_id === student.id);

  const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalTransactions = studentTransactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const overallTotal = totalPaid + totalTransactions;

  const tabs: { id: TabType, label: string, icon: any }[] = [
    { id: 'info', label: 'المعلومات الأساسية', icon: User },
    { id: 'payments', label: 'السجل المالي', icon: Wallet },
    { id: 'attendance', label: 'سجل الحضور', icon: Clock },
    { id: 'evaluations', label: 'التقييمات الفنية', icon: Star },
    { id: 'media', label: 'المعرض والميديا', icon: ImageIcon },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="space-y-6 font-['Cairo'] animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard icon={User} label="الاسم الكامل" value={student.full_name} />
              <InfoCard icon={Calendar} label="تاريخ التسجيل" value={student.registration_date ? format(new Date(student.registration_date), 'yyyy-MM-dd') : '-'} />
              <InfoCard icon={Phone} label="رقم الهاتف" value={student.phone} />
              <InfoCard icon={UserCheck} label="اسم ولي الأمر" value={student.parent_name} />
              <InfoCard icon={Award} label="المستوى الحالي" value={student.level} />
              <InfoCard icon={Star} label="نوع الدورة" value={student.course_type || 'غير محدد'} />
              <InfoCard icon={Clock} label="العمر" value={`${student.age} سنة`} />
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Award size={20} />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-600/70 uppercase tracking-wider block">نظام الولاء والمكافآت</span>
                      <span className="text-sm font-black text-amber-800 dark:text-amber-400">المستوى: {student.loyalty_tier || 'برونزي'}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-black text-amber-600">{(student.current_points !== undefined ? student.current_points : student.loyalty_points) || 0} <span className="text-xs">نقطة</span></p>
                    <p className="text-[10px] text-slate-500">الإجمالي: {student.lifetime_points || 0}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                   className="bg-amber-500 h-full transition-all duration-1000" 
                   style={{ 
                     width: `${Math.min(100, (((student.lifetime_points || 0) % 500) / 500) * 100)}%` 
                   }} 
                  />
                </div>
              </div>
              <InfoCard 
                icon={RefreshCw} 
                label="نظام الاشتراك" 
                value={
                  student.subscription_model === 'credit' ? 'نظام حصص (رصيد)' :
                  student.subscription_model === 'rolling' ? 'نظام فترة متدحرجة' :
                  'نظام شهري ميلادي'
                } 
              />
              {student.subscription_model === 'credit' && (
                <InfoCard 
                  icon={Clock} 
                  label="الرصيد المتبقي" 
                  value={`${student.remaining_sessions || 0} حصص`} 
                />
              )}
              {student.subscription_model === 'rolling' && (
                <InfoCard 
                  icon={Calendar} 
                  label="تاريخ انتهاء الاشتراك" 
                  value={student.subscription_end_date ? format(new Date(student.subscription_end_date), 'yyyy-MM-dd') : '-'} 
                />
              )}
            </div>
            
            {student.medical_notes && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-4 rounded-xl">
                <p className="text-xs font-bold text-rose-600 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
                  ملاحظات طبية
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{student.medical_notes}</p>
              </div>
            )}
          </div>
        );
      case 'payments':
        // Group payments by Month and Course Type to find balances
        const groupedPayments: Record<string, { total: number, required: number, payments: Payment[] }> = {};
        
        studentPayments.forEach(p => {
          const key = `${p.month || 'غير محدد'}-${p.course_type || 'دورة'}`;
          if (!groupedPayments[key]) {
            groupedPayments[key] = { total: 0, required: 0, payments: [] };
          }
          groupedPayments[key].total += Number(p.amount) || 0;
          // Take the highest required_amount as the target for this month/course
          if (p.required_amount && p.required_amount > groupedPayments[key].required) {
            groupedPayments[key].required = p.required_amount;
          }
          groupedPayments[key].payments.push(p);
        });

        return (
          <div className="space-y-6 font-['Cairo'] animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1 tracking-wider">إجمالي المدفوعات</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{overallTotal.toLocaleString()} ₪</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1 tracking-wider">عدد العمليات</span>
                <span className="text-xl font-black text-blue-700 dark:text-blue-400">{studentPayments.length + studentTransactions.length}</span>
              </div>
            </div>

            {/* Subscriptions Summary Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <div className="w-2 h-4 bg-blue-600 rounded-full" />
                ملخص الدورات والاشتراكات
              </h4>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 font-bold text-slate-500">الفترة/الدورة</th>
                      <th className="px-4 py-3 font-bold text-slate-500">المبلغ المطلوب</th>
                      <th className="px-4 py-3 font-bold text-slate-500">المدفوع</th>
                      <th className="px-4 py-3 font-bold text-slate-500">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(groupedPayments).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">لا توجد بيانات اشتراكات.</td>
                      </tr>
                    ) : (
                      Object.entries(groupedPayments).map(([key, data]) => {
                        const balance = Math.max(0, data.required - data.total);
                        return (
                          <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{key}</td>
                            <td className="px-4 py-3 text-slate-500">{data.required > 0 ? `${data.required.toLocaleString()} ₪` : '-'}</td>
                            <td className="px-4 py-3 text-emerald-600 font-bold">{data.total.toLocaleString()} ₪</td>
                            <td className="px-4 py-3">
                              {balance > 0 ? (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg font-black">{balance.toLocaleString()} ₪</span>
                              ) : (
                                <span className="text-emerald-500">✓ مسدد</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* List of All Transactions/Payments */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <div className="w-2 h-4 bg-emerald-500 rounded-full" />
                سجل الدفعات التفصيلي
              </h4>
              <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoadingPayments || isLoadingTransactions ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : (studentPayments.length === 0 && studentTransactions.length === 0) ? (
                  <p className="text-center text-slate-400 py-8 italic">لا توجد سجلات مالية.</p>
                ) : (
                  [
                    ...studentPayments.map(p => ({ ...p, type: 'payment' as const })),
                    ...studentTransactions.map(t => ({ ...t, type: 'transaction' as const }))
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm hover:border-blue-200 transition-all">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={cn(
                            "font-black",
                            item.type === 'payment' ? "text-slate-900 dark:text-slate-100" : "text-blue-600"
                          )}>
                            {(item as any).amount?.toLocaleString() || (item as any).total_amount?.toLocaleString()} ₪
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase",
                            item.type === 'payment' ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {item.type === 'payment' ? 'دفعة اشتراك' : 'شراء منتجات'}
                          </span>
                          {(item as any).course_type && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-bold">
                              {(item as any).course_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-bold text-slate-500">{(item as any).month || (item as any).method || '-'} • {(item as any).date ? format(new Date((item as any).date), 'yyyy-MM-dd') : '-'}</p>
                          {(item as any).notes && <p className="text-[10px] text-slate-400 italic">{(item as any).notes}</p>}
                        </div>
                      </div>
                      {item.type === 'transaction' && (
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block whitespace-nowrap">{(item as any).items?.length} أصناف</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-4 font-['Cairo'] animate-in fade-in slide-in-from-bottom-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
              {isLoadingBookings ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : studentBookings.length === 0 ? (
                <p className="text-center text-slate-400 py-8 italic font-['Cairo']">لا توجد سجلات حضور مسجلة.</p>
              ) : (
                studentBookings.map(b => (
                  <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{b.session_day || b.day} | {b.session_time || b.start_time}</p>
                      <p className="text-[10px] text-slate-500">{b.coach_name || b.trainer_name || 'مدرب غير معروف'}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold",
                      b.status === 'حضر' ? "bg-emerald-50 text-emerald-600" :
                      b.status === 'غائب' ? "bg-rose-50 text-rose-600" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {b.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'evaluations':
        return (
          <div className="space-y-4 font-['Cairo'] animate-in fade-in slide-in-from-bottom-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
              {isLoadingEvaluations ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : evaluations.length === 0 ? (
                <p className="text-center text-slate-400 py-8 italic font-['Cairo']">لا توجد تقييمات فنية متاحة.</p>
              ) : (
                evaluations.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-2 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">{format(new Date(ev.date), 'yyyy-MM-dd')} • {ev.coach_name}</p>
                        <StarRating value={ev.total_score} readOnly size={12} />
                      </div>
                      <span className="text-lg font-bold text-blue-600">{ev.total_score}/5</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ev.comments}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'media':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-['Cairo'] animate-in fade-in slide-in-from-bottom-4">
            {isLoadingMedia ? (
              <div className="col-span-full flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : media.length === 0 ? (
              <p className="col-span-full text-center text-slate-400 py-8 italic font-['Cairo']">لا توجد ميديا متاحة لهذا الطالب.</p>
            ) : (
              media.map(m => (
                <div key={m.id} className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  {m.type === 'image' ? (
                    <img src={m.url} alt={m.description} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-500">
                      <ImageIcon size={32} />
                      <span className="text-[10px] mt-1">فيديو</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-white text-[10px] font-bold line-clamp-2">{m.description}</span>
                    <button 
                      onClick={() => window.open(m.url, '_blank')}
                      className="mt-2 text-[10px] bg-white px-3 py-1 rounded-full font-bold"
                    >
                      عرض
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ملف الطالب: ${student.full_name}`} size="xl">
      <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh]">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-48 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 font-['Cairo']">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal",
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mr-11">
        {value}
      </p>
    </div>
  );
}
