import React, { useEffect, useMemo, useState } from 'react';
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
  UserX,
  RefreshCcw,
  Clock,
  Sparkles
} from 'lucide-react';
import { Student, Payment, Booking, Coach } from '../types';
import { useI18n } from '../lib/LanguageContext';
import { format, isSameDay, addDays, isWithinInterval, subDays, parseISO, differenceInHours } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Modal } from './Modal';
import { createWhatsAppLink, whatsappTemplates } from '../utils/whatsapp';
import { insightService, SmartInsight } from '../services/insightService';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface SmartInsightsProps {
  students: Student[];
  payments: Payment[];
  bookings?: Booking[];
  trainers?: Coach[];
}

export function SmartInsights({ students, payments, bookings = [], trainers = [] }: SmartInsightsProps) {
  const { t, language } = useI18n();
  const [selectedInsight, setSelectedInsight] = useState<SmartInsight | null>(null);
  const [dbInsights, setDbInsights] = useState<SmartInsight[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadInsights = async () => {
    try {
      setIsLoading(true);
      const [meta, insights] = await Promise.all([
        insightService.getInsightsMetadata(),
        insightService.getLatestInsights()
      ]);
      
      setLastUpdated(meta?.lastUpdated || null);
      setDbInsights(insights);

      // Only auto-refresh if no insights exist at all
      if (insights.length === 0 && students.length > 0) {
        handleRefresh();
      }
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [students.length]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const newInsights = await insightService.refreshInsights({
        students,
        payments,
        bookings,
        trainers,
        targetDate: new Date(targetDate).toISOString()
      });
      setDbInsights(newInsights || []);
      setLastUpdated(new Date().toISOString());
      toast.success('تم تحديث الرؤى الذكية بنجاح');
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error('فشل تحديث الرؤى. يرجى المحاولة لاحقاً.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const categorizedInsights = useMemo(() => {
    // Deduplicate insights by ID to ensure unique React keys and prevent console errors
    const uniqueInsights = Array.from(
      new Map<string, SmartInsight>(dbInsights.map(i => [i.id, i])).values()
    );

    return {
      warnings: uniqueInsights.filter(i => i.category === 'warning'),
      suggestions: uniqueInsights.filter(i => i.category === 'suggestion')
    };
  }, [dbInsights]);

  const renderIcon = (type: string, id: string) => {
    if (id.includes('birth')) return <Gift size={20} />;
    if (id.includes('attendance')) return <UserX size={20} />;
    if (id.includes('credit') || id.includes('subscription')) return <DollarSign size={20} />;
    if (type === 'warning') return <AlertCircle size={20} />;
    return <Zap size={20} />;
  };

  const renderDetailContent = () => {
    if (!selectedInsight) return null;

    const isBirthday = selectedInsight.id.includes('birth');
    const isSubscription = selectedInsight.id.includes('expired') || selectedInsight.id.includes('credit');

    return (
      <div className="space-y-4 font-['Cairo']">
        <div className={cn(
          "p-4 rounded-2xl border mb-4",
          selectedInsight.type === 'warning' ? "bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/10 dark:border-rose-900/20 dark:text-rose-400" :
          selectedInsight.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/10 dark:border-emerald-900/20 dark:text-emerald-400" :
          "bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900/20 dark:text-blue-400"
        )}>
          <p className="text-sm leading-relaxed font-bold">{selectedInsight.desc}</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <h5 className="font-black text-slate-900 dark:text-white mb-2 text-sm">توصية Sharks:</h5>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
            بناءً على تحليل البيانات المتقدم، يوصيك النظام باتخاذ الإجراءات اللازمة لضمان استمرارية العمل وتحسين رضا العملاء.
          </p>
        </div>

        {selectedInsight.metadata?.items && (
          <div className="space-y-2 mt-4">
            <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">قائمة التفاصيل (اضغط للمراسلة)</h6>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              {selectedInsight.metadata.items.map((item: any, idx: number) => {
                const student = students.find(s => s.full_name === (item.name || item.studentName));
                const phone = student?.phone || student?.parent_phone || '';
                const name = item.name || item.studentName;
                
                const handleItemAction = () => {
                  let message = '';
                  if (selectedInsight.id.includes('birth')) {
                    message = whatsappTemplates.birthday(name);
                  } else if (selectedInsight.id.includes('pending') || selectedInsight.id.includes('credit') || selectedInsight.id.includes('subscription')) {
                    const amount = item.amountDue || item.remaining || 0;
                    const month = item.month || format(new Date(), 'MMMM yyyy', { locale: ar });
                    message = whatsappTemplates.paymentReminder(name, amount, month);
                  } else {
                    message = `مرحباً ${name}، بخصوص: ${selectedInsight.title}\n${selectedInsight.desc}`;
                  }
                  
                  const link = createWhatsAppLink(phone, message);
                  window.open(link, '_blank');
                };

                return (
                  <div 
                    key={idx} 
                    onClick={handleItemAction}
                    className="p-3 border-b border-slate-50 dark:border-slate-800 last:border-none flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 group-hover:scale-110 transition-transform">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">{name}</p>
                        <p className="text-[10px] text-slate-500">{item.detail || item.course || item.date || `المبلغ: ${item.amountDue || item.remaining || ''} ₪`}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageCircle size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action button - remains for general context */}
        {(isBirthday || isSubscription) && (
          <div className="pt-4 flex flex-col gap-3">
             <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">إجراء عام</h6>
             <button
               onClick={() => {
                 const names = selectedInsight.metadata?.items?.map((i: any) => i.name || i.studentName).join(', ') || '';
                 const message = `تذكير بخصوص: ${selectedInsight.title}\n${selectedInsight.desc}`;
                 const link = createWhatsAppLink('', message);
                 window.open(link, '_blank');
               }}
               className="flex items-center justify-center gap-2 w-full p-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all hover:scale-[1.02]"
             >
               <MessageCircle size={20} />
               مراسلة عامة (بدون رقم محدد)
             </button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading && dbInsights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-h-[300px]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold font-['Cairo']">جاري تحليل البيانات وتوليد الرؤى الذكية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-['Cairo']">رؤية واقتراحات Sharks الذكية</h3>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-0.5">
                <Clock size={10} />
                <span>آخر تحديث: {format(new Date(lastUpdated), 'pp - dd/MM/yyyy', { locale: ar })}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Calendar size={16} className="text-slate-400" />
            <input 
              type="date" 
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold focus:outline-none text-slate-700 dark:text-slate-200"
            />
          </div>

          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95",
              isRefreshing 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none"
            )}
          >
            <RefreshCcw size={16} className={cn(isRefreshing && "animate-spin")} />
            تحليل البيانات الآن
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alerts & Warnings */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={14} />
            تنبيهات حرجة ومتابعات
          </h4>
          <div className="space-y-3">
            {categorizedInsights.warnings.length === 0 ? (
              <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-100 dark:border-slate-800 text-slate-400 text-sm font-bold text-center">
                لا توجد تنبيهات حالياً. كل شيء يسير بشكل ممتاز! ✨
              </div>
            ) : (
              categorizedInsights.warnings.map((w) => (
                <div 
                  key={w.id} 
                  onClick={() => setSelectedInsight(w)}
                  className={cn(
                    "p-4 rounded-2xl border flex gap-4 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer group shadow-sm hover:shadow-md",
                    w.type === 'warning' 
                      ? 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/10 dark:border-rose-900/20 dark:text-rose-400' 
                      : 'bg-indigo-50 border-indigo-100 text-indigo-800 dark:bg-indigo-900/10 dark:border-indigo-900/20 dark:text-indigo-400'
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    w.type === 'warning' ? 'bg-rose-200/50 dark:bg-rose-900/40' : 'bg-indigo-200/50 dark:bg-indigo-900/40'
                  )}>
                    {renderIcon(w.type || 'info', w.id)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                       <p className="font-black text-sm">{w.title}</p>
                       <ChevronLeft size={16} className="opacity-40 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                    <p className="text-xs opacity-80 font-bold leading-relaxed line-clamp-1">{w.desc}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Strategies & Suggestions */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={14} />
            مقترحات التحسين والنمو
          </h4>
          <div className="space-y-3">
            {categorizedInsights.suggestions.length === 0 ? (
               <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-100 dark:border-slate-800 text-slate-400 text-sm font-bold text-center">
                 جاري إعداد مقترحات ذكية...
               </div>
            ) : (
              categorizedInsights.suggestions.map((s) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedInsight(s)}
                  className="group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-95 cursor-pointer transition-all flex gap-4"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                    s.type === 'success' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                  )}>
                    {s.type === 'success' ? <TrendingUp size={24} /> : <Lightbulb size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-black text-slate-900 dark:text-slate-100 text-sm">{s.title}</p>
                      <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed line-clamp-2">{s.desc}</p>
                  </div>
                </div>
              ))
            )}
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
