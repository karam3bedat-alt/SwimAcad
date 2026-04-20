import React, { useMemo } from 'react';
import { 
  Lightbulb, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Zap,
  ArrowUpRight,
  Gift
} from 'lucide-react';
import { Student, Payment } from '../types';
import { useI18n } from '../lib/LanguageContext';
import { format, isSameDay, addDays, isWithinInterval, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SmartInsightsProps {
  students: Student[];
  payments: Payment[];
}

export function SmartInsights({ students, payments }: SmartInsightsProps) {
  const { t, language } = useI18n();

  const insights = useMemo(() => {
    const warnings: { title: string; desc: string; type: 'warning' | 'info' }[] = [];
    const suggestions: { title: string; desc: string; icon: any; color: string }[] = [];

    const today = new Date();
    const nextWeek = addDays(today, 7);

    // 1. Birthdays
    const upcomingBirthdays = students.filter(s => {
      if (!s.birth_date) return false;
      const bDate = new Date(s.birth_date);
      const bThisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      return isWithinInterval(bThisYear, { start: today, end: nextWeek });
    });

    if (upcomingBirthdays.length > 0) {
      warnings.push({
        title: 'أعياد ميلاد قادمة',
        desc: `لديك ${upcomingBirthdays.length} طلاب سيحتفلون بأعياد ميلادهم هذا الأسبوع.`,
        type: 'info'
      });
    }

    // 2. Unpaid / Dormant Students
    const last35Days = subDays(today, 35);
    const dormantStudents = students.filter(s => {
      const studentPayments = payments.filter(p => p.student_id === s.id);
      if (studentPayments.length === 0) return true;
      const lastPayment = new Date(studentPayments[0].date);
      return lastPayment < last35Days;
    });

    if (dormantStudents.length > 0) {
      warnings.push({
        title: 'طلاب لم يجددوا الاشتراك',
        desc: `هناك ${dormantStudents.length} طلاب لم يتم تسجيل دفعات لهم منذ شهر.`,
        type: 'warning'
      });
    }

    // 3. Family Discounts (Income Retention Suggestion)
    const phoneGroups: Record<string, Student[]> = {};
    students.forEach(s => {
      const p = s.phone || s.parent_phone;
      if (p) {
        if (!phoneGroups[p]) phoneGroups[p] = [];
        phoneGroups[p].push(s);
      }
    });

    const families = Object.values(phoneGroups).filter(g => g.length > 1);
    if (families.length > 0) {
      suggestions.push({
        title: 'تفعيل خصومات عائلية',
        desc: `وجدنا ${families.length} عائلات لديها أكثر من طفل. عرض خصم عائلي يزيد من ولاء العملاء.`,
        icon: Users,
        color: 'text-blue-600 bg-blue-50'
      });
    }

    // 4. Private Lessons Upsell (Revenue growth)
    const beginners = students.filter(s => s.level === 'مبتدئ');
    if (beginners.length > 5) {
      suggestions.push({
        title: 'عرض حصص خاصة للمبتدئين',
        desc: `لديك ${beginners.length} طلاب في المستوى المبتدئ. تقديم حصص خاصة (Private) قد يزيد الدخل بنسبة 30%.`,
        icon: TrendingUp,
        color: 'text-emerald-600 bg-emerald-50'
      });
    }

    // 5. Special Occasion Marketing
    if (today.getMonth() === 4 || today.getMonth() === 5) { // May/June - Summer prep
      suggestions.push({
        title: 'حملة الصيف المبكرة',
        desc: 'اقترب فصل الصيف! ابدأ حملة تسويقية للدورات المكثفة لجذب مشتركين جدد.',
        icon: Zap,
        color: 'text-amber-600 bg-amber-50'
      });
    }

    return { warnings, suggestions };
  }, [students, payments]);

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
              insights.warnings.map((w, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl border flex gap-4 transition-all hover:scale-[1.02] cursor-default ${
                    w.type === 'warning' 
                      ? 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/10 dark:border-rose-900/20 dark:text-rose-400' 
                      : 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900/20 dark:text-blue-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    w.type === 'warning' ? 'bg-rose-200/50 dark:bg-rose-900/40' : 'bg-blue-200/50 dark:bg-blue-900/40'
                  }`}>
                    {w.type === 'warning' ? <AlertCircle size={20} /> : <Calendar size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-1">{w.title}</p>
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
            {insights.suggestions.map((s, i) => (
              <div key={i} className="group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex gap-4">
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
    </div>
  );
}
