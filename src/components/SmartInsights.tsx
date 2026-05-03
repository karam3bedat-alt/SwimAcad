import React, { useMemo, useState } from 'react';
import { 
  Lightbulb, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Zap,
  ArrowUpRight,
  Gift,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  BookOpen,
  PieChart,
  UserX
} from 'lucide-react';
import { Student, Payment, Booking, Coach } from '../types';
import { useI18n } from '../lib/LanguageContext';
import { format, isSameDay, addDays, isWithinInterval, subDays, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Modal } from './Modal';
import { createWhatsAppLink, whatsappTemplates } from '../utils/whatsapp';

interface InsightItem {
  id: string;
  title: string;
  desc: string;
  type?: 'warning' | 'info' | 'success';
  icon?: any;
  color?: string;
  data?: any[];
  category: 'warning' | 'suggestion';
}

interface SmartInsightsProps {
  students: Student[];
  payments: Payment[];
  bookings?: Booking[];
  trainers?: Coach[];
}

export function SmartInsights({ students, payments, bookings = [], trainers = [] }: SmartInsightsProps) {
  const { t, language } = useI18n();
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(null);

  const insights = useMemo(() => {
    const warnings: InsightItem[] = [];
    const suggestions: InsightItem[] = [];

    const today = new Date();
    const nextWeek = addDays(today, 7);

    // 1. Birthdays (Existing)
    const upcomingBirthdays = students.filter(s => {
      if (!s.birth_date) return false;
      const bDate = new Date(s.birth_date);
      const bThisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      return isWithinInterval(bThisYear, { start: today, end: nextWeek });
    }).sort((a, b) => {
      const bA = new Date(a.birth_date!);
      const bB = new Date(b.birth_date!);
      return bA.getMonth() - bB.getMonth() || bA.getDate() - bB.getDate();
    });

    if (upcomingBirthdays.length > 0) {
      warnings.push({
        id: 'birthdays',
        title: 'أعياد ميلاد قادمة',
        desc: `لديك ${upcomingBirthdays.length} طلاب سيحتفلون بأعياد ميلادهم هذا الأسبوع. اهتم بمشاركتهم الفرحة!`,
        type: 'info',
        data: upcomingBirthdays,
        category: 'warning'
      });
    }

    // 2. Low Credits Warning (New for Credit System)
    const lowCreditStudents = students.filter(s => 
      s.subscription_model === 'credit' && 
      (s.remaining_sessions || 0) <= 2 &&
      s.status !== 'غير نشط'
    );

    if (lowCreditStudents.length > 0) {
      warnings.push({
        id: 'low_credits',
        title: 'طلاب شارف رصيدهم على الانتهاء',
        desc: `هناك ${lowCreditStudents.length} طلاب متبقي لهم حصتان أو أقل. تواصل معهم للتجديد.`,
        type: 'warning',
        data: lowCreditStudents,
        category: 'warning'
      });
    }

    // 3. Attendance Dormant (Inactive Participation)
    const last14Days = subDays(today, 14);
    const inactiveAttendees = students.filter(s => {
      if (s.status === 'غير نشط') return false;
      const studentBookings = bookings.filter(b => b.student_id === s.id && b.status === 'حضر');
      if (studentBookings.length === 0) {
        // If registered more than 14 days ago and no attendance
        const regDate = s.registration_date ? parseISO(s.registration_date) : today;
        return regDate < last14Days;
      }
      // Last attendance check
      const lastBooking = studentBookings.sort((a, b) => 
        parseISO(b.date).getTime() - parseISO(a.date).getTime()
      )[0];
      return parseISO(lastBooking.date) < last14Days;
    });

    if (inactiveAttendees.length > 0) {
      warnings.push({
        id: 'attendance_gap',
        title: 'غياب متكرر (أكثر من أسبوعين)',
        desc: `${inactiveAttendees.length} طلاب لم يحضروا أي حصة منذ 14 يوماً. قد يكون هناك سبب للغياب.`,
        type: 'warning',
        data: inactiveAttendees,
        category: 'warning'
      });
    }

    // 4. Revenue Insights - Enrollment Optimization
    const courseTypeStats: Record<string, number> = {};
    students.forEach(s => {
      const type = s.course_type || 'غير محدد';
      courseTypeStats[type] = (courseTypeStats[type] || 0) + 1;
    });

    const topCourse = Object.entries(courseTypeStats).sort((a, b) => b[1] - a[1])[0];
    if (topCourse) {
      suggestions.push({
        id: 'course_optimization',
        title: `توسعة دورات ${topCourse[0]}`,
        desc: `تحظى دورات "${topCourse[0]}" بأعلى إقبال (${topCourse[1]} طالب). فكر في فتح شعب جديدة لزيادة الدخل.`,
        icon: PieChart,
        color: 'text-purple-600 bg-purple-50',
        category: 'suggestion'
      });
    }

    // 5. New Features Upsell
    suggestions.push({
      id: 'subscription_migration',
      title: 'التحويل لنظام الحصص (Auto-Billing)',
      desc: 'الطلاب الذين يدفعون مبالغ ثابتة قد يفضلون نظام الحصص (Credit). هذا يحسن التدفق المالي المسبق.',
      icon: DollarSign,
      color: 'text-amber-600 bg-amber-50',
      category: 'suggestion'
    });

    // 6. Trainer Utilization & Rewards
    const activeTrainers = trainers.filter(t => t.status !== 'غير نشط');
    activeTrainers.forEach(trainer => {
      const assignedStudents = students.filter(s => s.assigned_coach_id === trainer.id).length;
      if (assignedStudents > 15) {
        suggestions.push({
          id: `trainer_reward_${trainer.id}`,
          title: `مكافأة للكابتن ${trainer.name}`,
          desc: `يقوم الكابتن ${trainer.name} بتدريب ${assignedStudents} طالب. تقديراً لجهوده، نوصي بصرف مكافأة أداء.`,
          icon: Gift,
          color: 'text-rose-600 bg-rose-50',
          category: 'suggestion'
        });
      } else if (assignedStudents < 5 && students.length > 20) {
        suggestions.push({
          id: `trainer_load_${trainer.id}`,
          title: `توزيع طلاب للكابتن ${trainer.name}`,
          desc: `لدى الكابتن ${trainer.name} عدد قليل من الطلاب (${assignedStudents}). يمكن تحويل طلاب جدد إليه لتخفيف الضغط عن الآخرين.`,
          icon: Users,
          color: 'text-blue-600 bg-blue-50',
          category: 'suggestion'
        });
      }
    });

    return { warnings, suggestions };
  }, [students, payments, bookings, trainers]);

  const renderDetailContent = () => {
    if (!selectedInsight) return null;

    switch (selectedInsight.id) {
      case 'birthdays':
        return (
          <div className="space-y-4 font-['Cairo']">
            <p className="text-sm text-slate-500 mb-4">احتفل مع أبطالك الصغار وعزز علاقتك بالأهالي:</p>
            <div className="space-y-3">
              {selectedInsight.data?.map((student: Student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600">
                      <Gift size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                      <p className="text-xs text-slate-500">{student.birth_date ? format(new Date(student.birth_date), 'dd MMMM', { locale: ar }) : ''}</p>
                    </div>
                  </div>
                  <a 
                    href={createWhatsAppLink(student.parent_phone || student.phone || '', whatsappTemplates.birthday(student.full_name!))}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    <MessageCircle size={14} />
                    تهنئة
                  </a>
                </div>
              ))}
            </div>
          </div>
        );

      case 'low_credits':
        return (
          <div className="space-y-4 font-['Cairo']">
            <p className="text-sm text-slate-500 mb-4">هؤلاء الطلاب يفضلون نظام الحصص ولكن رصيدهم شارف على الانتهاء:</p>
            <div className="space-y-3">
              {selectedInsight.data?.map((student: Student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/20">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                    <p className="text-xs text-rose-600 font-bold">باقي: {student.remaining_sessions || 0} حصص</p>
                  </div>
                  <a 
                    href={createWhatsAppLink(student.parent_phone || student.phone || '', `مرحباً، نود تذكيركم بأن رصيد حصص ${student.full_name} في الأكاديمية قارب على الانتهاء (المتبقي ${student.remaining_sessions} حصص). بإمكانكم التجديد في الموعد القادم.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    <MessageCircle size={14} />
                    تنبيه التجديد
                  </a>
                </div>
              ))}
            </div>
          </div>
        );

      case 'attendance_gap':
        return (
          <div className="space-y-4 font-['Cairo']">
            <p className="text-sm text-slate-500 mb-4">توقف هؤلاء الطلاب عن الحضور منذ أكثر من 14 يوماً. المتابعة الشخصية تمنع الانسحاب:</p>
            <div className="space-y-3">
              {selectedInsight.data?.map((student: Student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/20">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                    <p className="text-xs text-orange-600">غائب لفترة طويلة</p>
                  </div>
                  <a 
                    href={createWhatsAppLink(student.parent_phone || student.phone || '', `مرحباً، لاحظنا غياب ${student.full_name} عن التدريبات مؤخراً. نأمل أن يكون المانع خيراً، ونحن بانتظار عودته للمسبح!`)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    <UserX size={14} />
                    اطمئنان
                  </a>
                </div>
              ))}
            </div>
          </div>
        );

      case 'course_optimization':
        return (
          <div className="space-y-4 font-['Cairo']">
            <h5 className="font-black text-slate-900 dark:text-white">تحليل الطلب على الدورات</h5>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              بناءً على البيانات، نوصي بالإجراءات التالية لزيادة الدخل:
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/10">
                <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                <p className="text-xs font-medium leading-relaxed">
                  فتح مجموعة جديدة (Group) في أوقات الذروة لهذه الدورة لجذب الطلاب القادمين من قائمة الانتظار.
                </p>
              </li>
              <li className="flex gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/10">
                <div className="shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
                <p className="text-xs font-medium leading-relaxed">
                  رفع سعر الإشتراك الشهري لهذه الفئة بنسبة 5-10% نظراً لارتفاع الطلب، مع عرض "باقة سنوية" مخفضة.
                </p>
              </li>
            </ul>
          </div>
        );

      case 'subscription_migration':
        return (
          <div className="space-y-4 font-['Cairo']">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl">
              <h5 className="font-bold text-amber-900 dark:text-amber-400 mb-2">لماذا نظام الحصص؟</h5>
              <ul className="text-xs space-y-2 text-amber-800 dark:text-amber-500 list-disc pr-4">
                <li>تحصيل المال مسبقاً يحسن السيولة النقدية (Cash Flow).</li>
                <li>تجنب خسارة المال في أيام العطل أو غياب الطالب غير المبرر.</li>
                <li>سهولة في إدارة الحضور والغياب تقنياً.</li>
              </ul>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">مقترح التنفيذ:</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              قم بتقديم "عرض تحويل" للطلاب الحاليين: باقة 10 حصص بسعر 12 حصة، لتشجيعهم على تجربة النظام الجديد.
            </p>
          </div>
        );

      default:
        return <p className="text-slate-600 font-['Cairo']">{selectedInsight.desc}</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Lightbulb size={20} />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">رؤية واقتراحات Sharks الذكية</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alerts & Warnings */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={16} />
            تنبيهات مبكرة
          </h4>
          <div className="space-y-3">
            {insights.warnings.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm italic">
                لا توجد تنبيهات حالياً. كل شيء يسير بشكل ممتاز! ✨
              </div>
            ) : (
              insights.warnings.map((w) => (
                <div 
                  key={w.id} 
                  onClick={() => setSelectedInsight(w)}
                  className={`p-4 rounded-2xl border flex gap-4 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer group shadow-sm hover:shadow-md ${
                    w.type === 'warning' 
                      ? 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/10 dark:border-rose-900/20 dark:text-rose-400' 
                      : 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900/20 dark:text-blue-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    w.type === 'warning' ? 'bg-rose-200/50 dark:bg-rose-900/40' : 'bg-blue-200/50 dark:bg-blue-900/40'
                  }`}>
                    {w.type === 'warning' ? <AlertCircle size={20} className="group-hover:rotate-12 transition-transform" /> : <Calendar size={20} className="group-hover:rotate-12 transition-transform" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                       <p className="font-bold text-sm">{w.title}</p>
                       <ChevronLeft size={16} className="opacity-40 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                    <p className="text-xs opacity-80 font-medium leading-relaxed">{w.desc}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Strategies & Suggestions */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={16} />
            اقتراحات زيادة الدخل
          </h4>
          <div className="space-y-3">
            {insights.suggestions.map((s) => (
              <div 
                key={s.id} 
                onClick={() => setSelectedInsight(s)}
                className="group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-95 cursor-pointer transition-all flex gap-4"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${s.color}`}>
                  <s.icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-black text-slate-900 dark:text-slate-100 text-sm">{s.title}</p>
                    <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
        title={selectedInsight?.title || 'التفاصيل'}
        size="md"
      >
        {renderDetailContent()}
      </Modal>
    </div>
  );
}
