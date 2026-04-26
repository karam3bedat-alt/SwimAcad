import React, { useState } from 'react';
import { Modal } from './Modal';
import { Student, Payment, Booking } from '../types';
import { Loader2, User, Wallet, Calendar, Star, Image as ImageIcon, Phone, MapPin, Award, UserCheck, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePayments } from '../hooks/usePayments';
import { useBookings } from '../hooks/useBookings';
import { useStudentEvaluations, useStudentMedia } from '../hooks/useStudents';
import { StarRating } from './StudentCoachFeatures';
import { format } from 'date-fns';
import { useI18n } from '../lib/LanguageContext';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

type TabType = 'info' | 'payments' | 'attendance' | 'evaluations' | 'media';

export function StudentProfileModal({ isOpen, onClose, student }: StudentProfileModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  const { data: allPayments = [], isLoading: isLoadingPayments } = usePayments();
  const { data: allBookings = [], isLoading: isLoadingBookings } = useBookings();
  const { data: evaluations = [], isLoading: isLoadingEvaluations } = useStudentEvaluations(student.id);
  const { data: media = [], isLoading: isLoadingMedia } = useStudentMedia(student.id);

  const studentPayments = allPayments.filter(p => p.student_id === student.id);
  const studentBookings = allBookings.filter(b => b.student_id === student.id);

  const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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
              <InfoCard icon={Award} label="نقاط الولاء" value={`${student.loyalty_points || 0} نقطة`} />
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
        return (
          <div className="space-y-4 font-['Cairo'] animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl flex justify-between items-center">
              <span className="text-sm font-bold text-emerald-700">إجمالي المدفوعات</span>
              <span className="text-xl font-bold text-emerald-700">{totalPaid.toLocaleString()} ₪</span>
            </div>
            <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
              {isLoadingPayments ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : studentPayments.length === 0 ? (
                <p className="text-center text-slate-400 py-8 italic font-['Cairo']">لا توجد دفعات مسجلة.</p>
              ) : (
                studentPayments.map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{p.amount.toLocaleString()} ₪</p>
                      <p className="text-[10px] text-slate-500">{p.month || '-'} • {p.method}</p>
                    </div>
                    <p className="text-xs text-slate-400">{format(new Date(p.date), 'yyyy-MM-dd')}</p>
                  </div>
                ))
              )}
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
