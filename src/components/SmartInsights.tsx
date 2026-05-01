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
  ChevronLeft
} from 'lucide-react';
import { Student, Payment } from '../types';
import { useI18n } from '../lib/LanguageContext';
import { format, isSameDay, addDays, isWithinInterval, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Modal } from './Modal';
import { createWhatsAppLink, whatsappTemplates } from '../utils/whatsapp';

interface InsightItem {
  id: string;
  title: string;
  desc: string;
  type?: 'warning' | 'info';
  icon?: any;
  color?: string;
  data?: any[];
  category: 'warning' | 'suggestion';
}

interface SmartInsightsProps {
  students: Student[];
  payments: Payment[];
}

export function SmartInsights({ students, payments }: SmartInsightsProps) {
  const { t, language } = useI18n();
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(null);

  const insights = useMemo(() => {
    const warnings: InsightItem[] = [];
    const suggestions: InsightItem[] = [];

    const today = new Date();
    const nextWeek = addDays(today, 7);

    // 1. Birthdays
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
        desc: `لديك ${upcomingBirthdays.length} طلاب سيحتفلون بأعياد ميلادهم هذا الأسبوع.`,
        type: 'info',
        data: upcomingBirthdays,
        category: 'warning'
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
        id: 'dormant',
        title: 'طلاب لم يجددوا الاشتراك',
        desc: `هناك ${dormantStudents.length} طلاب لم يتم تسجيل دفعات لهم منذ أكثر من شهر. قد يحتاجون إلى تذكير.`,
        type: 'warning',
        data: dormantStudents,
        category: 'warning'
      });
    }

    // 3. Family Discounts (Income Retention Suggestion)
    const familyGroups: Record<string, Student[]> = {};
    students.forEach(s => {
      const phone = s.parent_phone || s.phone;
      // Extract what might be a "Family Name" (last word of full name)
      const names = s.full_name?.trim().split(' ') || [];
      const lastName = names.length > 1 ? names[names.length - 1] : '';
      const parentName = s.parent_name?.trim() || '';
      
      // Create a unique key based on Phone, Parent Name, and semi-inferred Family Name
      // Normalizing to lowercase/trimmed to improve matching
      const key = `${phone}_${parentName.toLowerCase()}_${lastName.toLowerCase()}`.replace(/\s+/g, '');
      
      if (phone && parentName) {
        if (!familyGroups[key]) familyGroups[key] = [];
        familyGroups[key].push(s);
      }
    });

    const families = Object.values(familyGroups).filter(g => g.length > 1);
    if (families.length > 0) {
      suggestions.push({
        id: 'family_discount',
        title: 'تفعيل خصومات عائلية',
        desc: `وجدنا ${families.length} عائلات لديها أكثر من طفل. عرض خصم عائلي يحسن الاستمرارية.`,
        icon: Users,
        color: 'text-blue-600 bg-blue-50',
        data: families,
        category: 'suggestion'
      });
    }

    // 4. Private Lessons Upsell (Revenue growth)
    const beginners = students.filter(s => s.level === 'مبتدئ' || s.level === 'Level 1');
    if (beginners.length > 5) {
      suggestions.push({
        id: 'private_lessons',
        title: 'عرض حصص خاصة للمبتدئين',
        desc: `لديك ${beginners.length} طلاب في المستوى المبتدئ. تقديم حصص (Private) يزيد الدخل.`,
        icon: TrendingUp,
        color: 'text-emerald-600 bg-emerald-50',
        data: beginners,
        category: 'suggestion'
      });
    }

    // 5. Special Occasion Marketing
    if (today.getMonth() === 4 || today.getMonth() === 5) { // May/June - Summer prep
      suggestions.push({
        id: 'summer_campaign',
        title: 'حملة الصيف المبكرة',
        desc: 'اقترب فصل الصيف! ابدأ حملة تسويقية للدورات المكثفة لجذب مشتركين جدد.',
        icon: Zap,
        color: 'text-amber-600 bg-amber-50',
        category: 'suggestion'
      });
    }

    return { warnings, suggestions };
  }, [students, payments]);

  const renderDetailContent = () => {
    if (!selectedInsight) return null;

    switch (selectedInsight.id) {
      case 'birthdays':
        return (
          <div className="space-y-4">
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

      case 'dormant':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">هؤلاء الطلاب انقطعوا عن الدفع منذ فترة، تواصل معهم للاطمئنان عليهم:</p>
            <div className="space-y-3">
              {selectedInsight.data?.map((student: Student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                    <p className="text-xs text-slate-500">{student.phone || student.parent_phone}</p>
                  </div>
                  <a 
                    href={createWhatsAppLink(student.parent_phone || student.phone || '', `مرحباً، نود الاطمئنان على استمرار ${student.full_name} معنا في الأكاديمية. هل لديكم أي استفسارات؟`)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    <MessageCircle size={14} />
                    متابعة
                  </a>
                </div>
              ))}
            </div>
          </div>
        );

      case 'family_discount':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">العائلات التي لديها أكثر من طفل هي كنز للأكاديمية. خصم 10% للطفل الثاني يحفزهم على البقاء:</p>
            <div className="space-y-3">
              {selectedInsight.data?.map((family: Student[], idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-blue-600 text-sm">عائلة: {family[0].parent_name || 'ولي أمر'}</p>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{family.length} أطفال</span>
                  </div>
                  <div className="space-y-1">
                    {family.map(s => (
                      <p key={s.id} className="text-xs text-slate-600 dark:text-slate-400">• {s.full_name}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'private_lessons':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">طلاب المستوى المبتدئ والتمهيدي يستفيدون بشكل أسرع من الحصص الفردية. يمكنك تقديم باقة من 4 حصص خاصة بسعر مميز:</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {selectedInsight.data?.map((student: Student) => (
                <div key={student.id} className="text-xs font-bold text-slate-700 dark:text-slate-300 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  {student.full_name} ({student.level})
                </div>
              ))}
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-100">
              💡 نصيحة: التواصل مع الأهالي هاتفياً لهذه العروض يحقق نتائج أفضل من الرسائل النصية.
            </div>
          </div>
        );

      default:
        return <p className="text-slate-600">{selectedInsight.desc}</p>;
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
