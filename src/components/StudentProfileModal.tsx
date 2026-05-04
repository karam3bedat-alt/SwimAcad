import React, { useState } from 'react';
import { Modal } from './Modal';
import { Student, Payment, Booking, Coach, CourseCycle } from '../types';
import { Loader2, User, Wallet, Calendar, Star, Image as ImageIcon, Phone, MapPin, Award, UserCheck, Clock, RefreshCw, Users, AlertCircle as AlertIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePayments } from '../hooks/usePayments';
import { useTransactions } from '../hooks/useTransactions';
import { useBookings } from '../hooks/useBookings';
import { useTrainers } from '../hooks/useTrainers';
import { useCourses } from '../hooks/useCourses';
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
  const { data: trainers = [] } = useTrainers();
  const { data: courses = [] } = useCourses();
  const { data: evaluations = [], isLoading: isLoadingEvaluations } = useStudentEvaluations(student?.id || '');
  const { data: media = [], isLoading: isLoadingMedia } = useStudentMedia(student?.id || '');

  if (!student) return null;

  const studentPayments = allPayments.filter(p => p.student_id === student.id);
  const studentTransactions = allTransactions.filter(t => t.student_id === student.id);
  const studentBookings = allBookings.filter(b => b.student_id === student.id);

  const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalTransactions = studentTransactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const overallTotal = totalPaid + totalTransactions;

  // Find assigned trainers
  let assignedTrainers: Coach[] = [];
  if (student.course_id) {
    const course = courses.find(c => c.id === student.course_id);
    if (course) {
      if (course.coach_ids && course.coach_ids.length > 0) {
        assignedTrainers = trainers.filter(t => course.coach_ids?.includes(t.id));
      } else if (course.coach_id) {
        const coach = trainers.find(t => t.id === course.coach_id);
        if (coach) assignedTrainers = [coach];
      }
    }
  }

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

              {assignedTrainers.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={18} className="text-blue-600" />
                    <span className="text-sm font-black text-blue-800 dark:text-blue-200">المدربون المسؤولون</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assignedTrainers.map(trainer => (
                      <div key={trainer.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-[10px] font-bold">
                          {trainer.name?.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{trainer.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">إجمالي المدفوعات</span>
                  <Wallet size={14} className="text-emerald-500" />
                </div>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{overallTotal.toLocaleString()} ₪</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">العمليات المالية</span>
                  <RefreshCw size={14} className="text-blue-500" />
                </div>
                <span className="text-xl font-black text-blue-700 dark:text-blue-400">{studentPayments.length + studentTransactions.length}</span>
              </div>
            </div>

            {/* Subscriptions Summary Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 px-1">
                <div className="w-2 h-4 bg-blue-600 rounded-full shadow-sm" />
                ملخص الاشتراك المالي لكل دورة
              </h4>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-4 py-3 font-bold text-slate-500">الفترة/الدورة</th>
                        <th className="px-4 py-3 font-bold text-slate-500">المبلغ المطلوب</th>
                        <th className="px-4 py-3 font-bold text-slate-500">تم سداده</th>
                        <th className="px-4 py-3 font-bold text-slate-500">المبلغ المتبقي</th>
                        <th className="px-4 py-3 font-bold text-slate-500">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(groupedPayments).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">لا توجد اشتراكات مسجلة.</td>
                        </tr>
                      ) : (
                        Object.entries(groupedPayments).map(([key, data]) => {
                          const balance = Math.max(0, data.required - data.total);
                          const isFullyPaid = balance <= 0 && data.required > 0;
                          return (
                            <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{selectedStudent.course_id && key.includes('غير محدد') ? courses.find(c => c.id === selectedStudent.course_id)?.name || key : key}</td>
                              <td className="px-4 py-3 text-slate-500 font-medium">{data.required > 0 ? `${data.required.toLocaleString()} ₪` : '-'}</td>
                              <td className="px-4 py-3 text-emerald-600 font-bold">{data.total.toLocaleString()} ₪</td>
                              <td className="px-4 py-3">
                                {balance > 0 ? (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg font-black">{balance.toLocaleString()} ₪</span>
                                ) : (
                                  <span className="text-emerald-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isFullyPaid ? (
                                  <div className="flex items-center gap-1 text-emerald-500 font-bold">
                                    <UserCheck size={14} />
                                    <span>مكتمل</span>
                                  </div>
                                ) : data.required > 0 ? (
                                  <div className="flex items-center gap-1 text-rose-500 font-bold">
                                    <AlertIcon size={14} />
                                    <span>متبقي</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
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
            </div>

            {/* List of All Transactions/Payments */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 px-1">
                <div className="w-2 h-4 bg-emerald-500 rounded-full shadow-sm" />
                سجل الدفعات والمشتريات التفصيلي
              </h4>
              <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoadingPayments || isLoadingTransactions ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : (studentPayments.length === 0 && studentTransactions.length === 0) ? (
                  <p className="text-center text-slate-400 py-8 italic font-['Cairo']">لا توجد سجلات مالية تفصيلية.</p>
                ) : (
                  [
                    ...studentPayments.map(p => ({ ...p, type: 'payment' as const })),
                    ...studentTransactions.map(t => ({ ...t, type: 'transaction' as const }))
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm hover:border-blue-200 transition-all hover:bg-slate-50/50">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={cn(
                            "font-black text-sm",
                            item.type === 'payment' ? "text-slate-900 dark:text-slate-100" : "text-blue-600"
                          )}>
                            {(item as any).amount?.toLocaleString() || (item as any).total_amount?.toLocaleString()} ₪
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase",
                            item.type === 'payment' ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-blue-50 text-blue-600 border border-blue-100"
                          )}>
                            {item.type === 'payment' ? 'دفعة اشتراك' : 'شراء منتجات'}
                          </span>
                          {(item as any).course_type && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-bold border border-indigo-100">
                              {(item as any).course_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-bold text-slate-500">{(item as any).month || (item as any).method || '-'} • {(item as any).date ? format(new Date((item as any).date), 'yyyy-MM-dd') : '-'}</p>
                          {(item as any).notes && <p className="text-[10px] text-slate-400 italic font-medium"> • {(item as any).notes}</p>}
                        </div>
                      </div>
                      <div className="text-left">
                        {item.type === 'transaction' ? (
                          <span className="text-[10px] font-bold text-blue-500 block whitespace-nowrap">{(item as any).items?.length} أصناف</span>
                        ) : (
                          <div className="text-emerald-500">
                            <UserCheck size={14} />
                          </div>
                        )}
                      </div>
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
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                <p className="text-[10px] text-emerald-600 font-bold mb-1">حضر</p>
                <p className="text-xl font-black text-emerald-700">{studentBookings.filter(b => b.status === 'حضر').length}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
                <p className="text-[10px] text-rose-600 font-bold mb-1">غاب</p>
                <p className="text-xl font-black text-rose-700">{studentBookings.filter(b => b.status === 'غائب').length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-500 font-bold mb-1">الإجمالي</p>
                <p className="text-xl font-black text-slate-600">{studentBookings.length}</p>
              </div>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {isLoadingBookings ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : studentBookings.length === 0 ? (
                <p className="text-center text-slate-400 py-8 italic font-['Cairo'] text-sm">لا توجد سجلات حضور مسجلة.</p>
              ) : (
                studentBookings.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(b => (
                  <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {b.date ? format(new Date(b.date), 'yyyy-MM-dd') : '-'} | {b.session_day || b.day}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock size={10} />
                        <span>{b.session_time || b.start_time || '-'}</span>
                        <span className="mx-1">•</span>
                        <User size={10} />
                        <span>{b.coach_name || b.trainer_name || 'مدرب غير معروف'}</span>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black",
                      b.status === 'حضر' ? "bg-emerald-100 text-emerald-700" :
                      b.status === 'غائب' ? "bg-rose-100 text-rose-700" :
                      "bg-slate-200 text-slate-700"
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
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {isLoadingEvaluations ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : evaluations.length === 0 ? (
                <p className="text-center text-slate-400 py-8 italic font-['Cairo'] text-sm">لا توجد تقييمات فنية متاحة حتى الآن.</p>
              ) : (
                evaluations.map(ev => (
                  <div key={ev.id} className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                           {ev.coach_name?.charAt(0)}
                         </div>
                         <div>
                           <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{ev.coach_name}</p>
                           <p className="text-[10px] text-slate-400">{format(new Date(ev.date), 'yyyy-MM-dd')}</p>
                         </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-blue-600">{ev.total_score}/5</span>
                        <StarRating value={ev.total_score} readOnly size={10} />
                      </div>
                    </div>
                    {ev.comments && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">"{ev.comments}"</p>
                      </div>
                    )}
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
              <p className="col-span-full text-center text-slate-400 py-8 italic font-['Cairo'] text-sm">لا توجد صور أو فيديوهات لهذا الطالب.</p>
            ) : (
              media.map(m => (
                <div key={m.id} className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                  {m.type === 'image' ? (
                    <img src={m.url} alt={m.description} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-500 bg-slate-200 dark:bg-slate-800">
                      <ImageIcon size={32} strokeWidth={1.5} />
                      <span className="text-[10px] mt-2 font-bold">فيديو تدريبي</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-[10px] font-bold line-clamp-1 mb-2">{m.description || 'بدون وصف'}</p>
                    <button 
                      onClick={() => window.open(m.url, '_blank')}
                      className="w-full text-[10px] bg-white text-slate-900 py-1.5 rounded-lg font-black hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      عرض بالحجم الكامل
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
    }
  };

  const selectedStudent = student; // For readability in inner logic

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ملف الطالب: ${student.full_name}`} size="xl">
      <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh]">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-52 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 font-['Cairo'] scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all whitespace-nowrap lg:whitespace-normal group",
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]" 
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                activeTab === tab.id ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50"
              )}>
                <tab.icon size={18} />
              </div>
              <span>{tab.label}</span>
            </button>
          ))}
          
          <div className="mt-auto hidden lg:block p-4 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] font-black text-blue-600 uppercase mb-1">الرصيد الكلي</p>
              <p className="text-xl font-black text-blue-800 dark:text-blue-200">{overallTotal.toLocaleString()} <span className="text-xs">₪</span></p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner overflow-y-auto max-h-[80vh] custom-scrollbar">
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-100 transition-colors group">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
        {value || 'غير محدد'}
      </p>
    </div>
  );
}
