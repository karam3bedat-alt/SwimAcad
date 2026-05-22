import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Award, 
  Phone, 
  Mail, 
  Calendar, 
  User, 
  Clock, 
  ChevronRight, 
  FileText, 
  TrendingUp,
  MapPin,
  Briefcase,
  DollarSign,
  Activity,
  ArrowRight,
  Edit2,
  PieChart,
  CalendarDays,
  Target,
  Download,
  Loader2,
  BookOpenCheck
} from 'lucide-react';
import { 
  useTrainer, 
  useCoachAttendance, 
  useUpdateTrainer,
  useCoachEvaluations,
  useAddCoachEvaluation,
  useDeleteCoachEvaluation,
  useCoachPayouts,
  useAddCoachPayout 
} from '../hooks/useTrainers';
import { useStudents } from '../hooks/useStudents';
import { useI18n } from '../lib/LanguageContext';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { StarRating } from '../components/StudentCoachFeatures';
import { Modal } from '../components/Modal';
import { useToast } from '../lib/ToastContext';
import { Coach } from '../types';

export default function CoachProfile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showToast, hideToast } = useToast();
  
  const { data: coach, isLoading: isLoadingCoach } = useTrainer(id!);
  const { data: attendance = [] } = useCoachAttendance(id);
  const { data: students = [] } = useStudents();
  
  // New features hooks
  const { data: evaluations = [] } = useCoachEvaluations(id);
  const { data: payouts = [] } = useCoachPayouts(id);

  const updateTrainerMutation = useUpdateTrainer();
  const addEvaluationMutation = useAddCoachEvaluation();
  const deleteEvaluationMutation = useDeleteCoachEvaluation();
  const addPayoutMutation = useAddCoachPayout();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // New features states
  const [profileTab, setProfileTab] = useState<'financial' | 'evals' | 'students'>('financial');
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);

  // Evaluation Form state
  const [evalSkills, setEvalSkills] = useState(5);
  const [evalPunctuality, setEvalPunctuality] = useState(5);
  const [evalCommunication, setEvalCommunication] = useState(5);
  const [evalProfessionalism, setEvalProfessionalism] = useState(5);
  const [evalComments, setEvalComments] = useState('');

  const assignedStudents = students.filter(s => s.assigned_coach_id === id);

  // Financial calculations
  const filteredAttendance = attendance.filter(record => {
    try {
      const date = parseISO(record.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    } catch {
      return false;
    }
  });

  const totalLessons = filteredAttendance.reduce((acc, curr) => acc + (curr.lessons_count || 0), 0);
  const totalDays = filteredAttendance.filter(r => r.status !== 'غائب').length;
  const totalSalary = (coach?.salary || 0) + (totalLessons * (coach?.lesson_rate || 0));

  // Check if current month is settled in payout history
  const activeMonthPayout = payouts.find(p => p.month === selectedMonth && p.year === selectedYear);
  const isMonthSettled = !!activeMonthPayout;

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const toastId = showToast('جاري تحديث البيانات...', 'loading');

    try {
      const data: Partial<Coach> = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        specialty: formData.get('specialty') as string,
        salary: Number(formData.get('salary')) || 0,
        lesson_rate: Number(formData.get('lesson_rate')) || 0,
        bio: formData.get('bio') as string,
        join_date: formData.get('join_date') as string,
        status: formData.get('status') as any
      };

      await updateTrainerMutation.mutateAsync({ id: id!, data });
      hideToast(toastId);
      showToast('تم تحديث البيانات بنجاح', 'success');
      setIsEditModalOpen(false);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل تحديث البيانات', 'error');
    }
  };

  // Generate Coach Auth Login email credentials
  const handleGenerateCredentials = async () => {
    if (!coach) return;
    const domain = 'swimschool.com';
    // Remove space and special chars
    const englishCleanName = (coach.name || coach.trainer_name)
      .trim()
      .replace(/[^\u0621-\u064A\a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();

    // Use a clean fallback handle if empty
    const handle = englishCleanName || `coach_${id?.substring(0, 5)}`;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const login_email = `${handle}${randomSuffix}@${domain}`;
    const login_password = `${Math.floor(100000 + Math.random() * 900000)}`;

    const toastId = showToast('جاري توليد وربط حساب تسجيل الدخول للمدرب...', 'loading');
    try {
      await updateTrainerMutation.mutateAsync({
        id: id!,
        data: {
          login_email,
          login_password,
          auth_uid: `coach_auth_linked_${id}`
        }
      });
      hideToast(toastId);
      showToast('تم إصدار بريد الممر المعتمد للمدرب بنجاح! 🔑', 'success');
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل توليد الحساب', 'error');
    }
  };

  // Settle monthly payments
  const handleSettlePayout = async () => {
    const monthName = new Date(2024, selectedMonth).toLocaleString('ar', { month: 'long' });
    const confirmSettle = window.confirm(`هل أنت متأكد من تسجيل تسوية وصرف راتب شهر ${selectedYear}/${monthName} للمدرب بقيمة إجمالية ${totalSalary} ₪؟`);
    if (!confirmSettle) return;

    const toastId = showToast('جاري تسجيل مستند الصرف والوفاء المالي...', 'loading');
    try {
      await addPayoutMutation.mutateAsync({
        coach_id: id!,
        coach_name: coach?.name || coach?.trainer_name || 'مدرب',
        month: selectedMonth,
        year: selectedYear,
        base_salary_paid: coach?.salary || 0,
        extra_lessons_paid: totalLessons * (coach?.lesson_rate || 0),
        total_paid: totalSalary,
        date_paid: new Date().toISOString().split('T')[0]
      });
      hideToast(toastId);
      showToast('تم ترحيل وصرف مستحقات الشهر للمدرب بنجاح والتوثيق بالسجل! 💸', 'success');
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل تسجيل التسوية المالية', 'error');
    }
  };

  // Create coach evaluation
  const handleAddEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const average_score = parseFloat(((evalSkills + evalPunctuality + evalCommunication + evalProfessionalism) / 4).toFixed(1));

    const toastId = showToast('جاري ترحيل تقييم الأداء والمؤشرات...', 'loading');
    try {
      await addEvaluationMutation.mutateAsync({
        coach_id: id!,
        coach_name: coach?.name || coach?.trainer_name || 'مدرب',
        evaluated_by: 'الإدارة',
        date: new Date().toISOString().split('T')[0],
        metrics: {
          training_skills: evalSkills,
          punctuality: evalPunctuality,
          communication: evalCommunication,
          professionalism: evalProfessionalism
        },
        average_score,
        comments: evalComments
      });
      hideToast(toastId);
      showToast('تم حفظ تقييم مدرب التميز بنجاح! ⭐', 'success');
      setIsEvalModalOpen(false);
      // Reset
      setEvalSkills(5);
      setEvalPunctuality(5);
      setEvalCommunication(5);
      setEvalProfessionalism(5);
      setEvalComments('');
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل ترحيل التقييم', 'error');
    }
  };

  const handleDeleteEvaluation = async (evalId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف تقييم الأداء هذا؟')) return;
    const toastId = showToast('جاري الحذف...', 'loading');
    try {
      await deleteEvaluationMutation.mutateAsync({ id: evalId, coachId: id! });
      hideToast(toastId);
      showToast('تم حذف التقييم بنجاح', 'success');
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل الحذف', 'error');
    }
  };

  // Compute Overall Evaluation Metric average
  const overallEvaluationScore = useMemo(() => {
    if (evaluations.length === 0) return 0;
    const sum = evaluations.reduce((acc, curr) => acc + (curr.average_score || 0), 0);
    return parseFloat((sum / evaluations.length).toFixed(1));
  }, [evaluations]);

  if (isLoadingCoach) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">المدرب غير موجود</p>
        <button 
          onClick={() => navigate('/coaches')}
          className="mt-4 text-blue-600 font-bold hover:underline"
        >
          العودة لقائمة المدربين
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-right" dir="rtl">
      {/* Header / Basic Info */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        <div className="h-32 bg-gradient-to-l from-blue-600 to-indigo-600" />
        <div className="px-8 pb-8">
          <div className="relative -mt-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-right">
              <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-3xl border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center overflow-hidden">
                {coach.photo_url ? (
                  <img src={coach.photo_url} alt={coach.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-300" />
                )}
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white">{coach.name || coach.trainer_name}</h1>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="تعديل المدرب"
                  >
                    <Edit2 size={20} />
                  </button>
                </div>
                <p className="text-blue-600 font-black text-lg">{coach.specialty}</p>
                <div className="flex items-center gap-4 mt-2 justify-center md:justify-start">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <Briefcase size={16} />
                    <span>{coach.status || 'نشط'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <Calendar size={16} />
                    <span>انضم في {coach.join_date || 'غير محدد'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 self-center md:self-end">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-2xl flex flex-col items-center border border-blue-150">
                <p className="text-[10px] font-black text-blue-500 uppercase leading-none tracking-widest mb-1.5">معدل التقييم العام</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-blue-700">{overallEvaluationScore > 0 ? `${overallEvaluationScore} / 5` : 'لا يوجد'}</span>
                  <Award size={20} className="text-amber-500 fill-amber-500" />
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-2xl flex flex-col items-center">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-none mb-1.5">نقاط الولاء</p>
                <p className="text-2xl font-black text-amber-700">{coach.loyalty_points || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-50">
              <Activity size={20} className="text-blue-600" />
              بيانات التواصل والمعلومات
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">رقم الهاتف</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{coach.phone || 'غير متوفر'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">البريد الإلكتروني</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{coach.email || 'غير متوفر'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">الراتب الأساسي</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{coach.salary ? `${coach.salary} ₪` : '0 ₪'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-emerald-600">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-[10px] opacity-70 font-bold">كل درس إضافي</p>
                  <p className="text-sm font-black">{coach.lesson_rate ? `${coach.lesson_rate} ₪` : '0 ₪'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 mb-2">نبذة تعريفية</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                {coach.bio || 'لا توجد نبذة تعريفية مضافة لهذا المدرب حالياً.'}
              </p>
            </div>
          </div>

          {/* Coach Credentials Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-50">
              <span className="text-blue-600 text-lg">🔑</span>
              حساب دخول المدرب بالنظام
            </h3>

            {coach.login_email ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  تم إصدار هذا البريد المخصص للمدرب لرفع وحفظ كشوفات وحضور الطلاب الخاصين به:
                </p>
                <div className="space-y-1 text-left">
                  <div className="text-xs font-bold text-slate-400">البريد الإلكتروني:</div>
                  <div className="text-xs font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 font-bold break-all select-all">
                    {coach.login_email}
                  </div>
                </div>
                <div className="space-y-1 text-left">
                  <div className="text-xs font-bold text-slate-400">كلمة المرور المؤقتة:</div>
                  <div className="text-xs font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 font-bold select-all">
                    {coach.login_password}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`البريد: ${coach.login_email}\nالرمز: ${coach.login_password}`);
                    alert('تم نسخ تفاصيل حساب المدرب لإرسالها له!');
                  }}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold py-2 rounded-xl border border-blue-200 transition-all"
                >
                  نسخ تفاصيل الحساب لإرسالها
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-2">
                <p className="text-slate-400 text-xs text-right leading-relaxed">
                  ⚠️ لم يتم إصدار ايميل أو حساب دخول لهذا المدرب بعد لإدخال كشوفات الطلاب. اضغط لتوليده تلقائياً:
                </p>
                <button
                  onClick={handleGenerateCredentials}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-100 transition-all"
                >
                  إصدار حساب دخول مخصص للمدرب 🔑
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} />
              إحصائيات سريعة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black">{assignedStudents.length}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase">طالب متابع</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black">{attendance.filter(r => r.status !== 'غائب').length}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase">أيام الحضور</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Columns with interactive Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Visual tab selector */}
          <div className="flex border-b border-slate-200 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm gap-2">
            <button
              onClick={() => setProfileTab('financial')}
              className={cn(
                "flex-1 py-3 px-4 font-bold text-xs rounded-xl transition-all",
                profileTab === 'financial' 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              💸 كشوفات الرواتب والتسويات المالية
            </button>
            <button
              onClick={() => setProfileTab('evals')}
              className={cn(
                "flex-1 py-3 px-4 font-bold text-xs rounded-xl transition-all",
                profileTab === 'evals' 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              📋 سجل تقييمات الأداء والتميز التدريبي ({evaluations.length})
            </button>
            <button
              onClick={() => setProfileTab('students')}
              className={cn(
                "flex-1 py-3 px-4 font-bold text-xs rounded-xl transition-all",
                profileTab === 'students' 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              👥 الطلاب المسندون ({assignedStudents.length})
            </button>
          </div>

          {/* TAB 1: Financial view */}
          {profileTab === 'financial' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">جدول احتساب المستحقات الشهرية</h3>
                      <p className="text-xs text-slate-500">حساب المستحقات بناءً على الدروس والحضور</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm font-bold outline-none"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i}>{new Date(2024, i).toLocaleString('ar', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm font-bold outline-none"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">مجموع الدروس</span>
                      <BookOpenCheck size={16} className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{totalLessons}</p>
                    <p className="text-[10px] text-slate-500 mt-1">درس خلال الشهر</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">أيام العمل</span>
                      <CalendarDays size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{totalDays}</p>
                    <p className="text-[10px] text-slate-500 mt-1">يوم حضور فعلي</p>
                  </div>
                  <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-100">
                    <div className="flex items-center justify-between mb-2 text-white/80">
                      <span className="text-[10px] font-bold uppercase">إجمالي المستحقات</span>
                      <DollarSign size={16} />
                    </div>
                    <p className="text-2xl font-black text-white">{totalSalary} ₪</p>
                    <p className="text-[10px] text-white/70 mt-1">إجمالي هذا الشهر</p>
                  </div>
                </div>

                {/* Settle Panel showing whether paid or outstanding */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400">حالة الصرف والوفاء المالي:</div>
                    {isMonthSettled ? (
                      <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        تمت تسوية المستحقات وصرفها كاملة بتاريخ {activeMonthPayout.date_paid}
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-amber-500 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-450 inline-block animate-ping"></span>
                        مستحقات معلقة وبانتظار أمر الصرف والتسوية المعتمد
                      </div>
                    )}
                  </div>

                  {!isMonthSettled && (
                    <button
                      onClick={handleSettlePayout}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-50 transition-all"
                    >
                      <span>💸</span>
                      تسجيل صرف وتسوية المستحقات
                    </button>
                  )}
                </div>
                
                <div className="p-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">تفاصيل سجلات الحضور اليومية المفوترة</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-bold">التاريخ</th>
                          <th className="px-4 py-3 font-bold">الحالة</th>
                          <th className="px-4 py-3 font-bold">الدروس</th>
                          <th className="px-4 py-3 font-bold">المستحق المالي المضاف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAttendance.map(record => (
                          <tr key={record.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{record.date}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                record.status === 'غائب' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                              )}>
                                {record.status === 'غائب' ? 'غائب' : 'حضر'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-black">{record.lessons_count || 0}</td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                              {record.status !== 'غائب' ? `${Math.floor((coach.salary || 0) / 30 + (record.lessons_count || 0) * (coach.lesson_rate || 0))}` : '0'} ₪
                            </td>
                          </tr>
                        ))}
                        {filteredAttendance.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">لا توجد سجلات لهذا الشهر مجدولة</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Historic Payouts ledger list */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2 pb-2 border-b border-slate-50">
                  <span>📂</span>
                  دفتر تسويات رواتب المدرب التاريخي (Historic Settlements Ledger)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                        <th className="p-3">الشهر المستهدف</th>
                        <th className="p-3">الراتب الأساسي المدفوع</th>
                        <th className="p-3">حافز الدروس الإضافية</th>
                        <th className="p-3">المجموع الكلي الموفى</th>
                        <th className="p-3">تاريخ صرف السند المالى</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map(p => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-700">
                            {p.year} / {new Date(2024, p.month).toLocaleString('ar', { month: 'long' })}
                          </td>
                          <td className="p-3 text-slate-600 font-bold">{p.base_salary_paid} ₪</td>
                          <td className="p-3 text-emerald-600 font-bold">+{p.extra_lessons_paid} ₪</td>
                          <td className="p-3 font-black text-rose-600">{p.total_paid} ₪</td>
                          <td className="p-3">
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-extrabold px-2.5 py-1 rounded-lg">
                              🟢 صرف بنجاح {p.date_paid}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {payouts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-300 italic text-xs">
                            لا توجد تسويات مالية أو رواتب تم ترحيلها لهذا المدرب بعد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Performance Evaluations ledger */}
          {profileTab === 'evals' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">سجل تقييمات الأداء والتميز المهني</h3>
                    <p className="text-slate-400 text-xs">رصد تقييم ممارسات التدريب، جودة التواصل، الالتزام بالوقت والاحترافية.</p>
                  </div>
                  <button
                    onClick={() => setIsEvalModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-1"
                  >
                    <span>⭐</span>
                    تسجيل تقييم أداء جديد
                  </button>
                </div>

                {/* Staggered evaluations list */}
                <div className="space-y-4 pt-2">
                  {evaluations.map(e => (
                    <div key={e.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3 relative group">
                      <button
                        onClick={() => handleDeleteEvaluation(e.id)}
                        className="absolute left-4 top-4 text-slate-400 hover:text-rose-600 text-xs font-bold transition-all p-1"
                        title="حذف هذا التقييم"
                      >
                        حذف ×
                      </button>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-blue-600">{e.average_score} / 5</span>
                          <div className="flex gap-0.5" dir="ltr">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <span 
                                key={idx} 
                                className={`text-sm ${idx < Math.round(e.average_score) ? 'text-amber-500' : 'text-slate-250'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-200/80 text-slate-500 font-extrabold px-2.5 py-1 rounded">
                          تاريخ التقييم: {e.date}
                        </span>
                      </div>

                      {/* Detail metrics mapping */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                          <div className="text-[9px] text-slate-400 font-bold">المهارات التدريبية</div>
                          <div className="font-extrabold text-xs text-slate-800">{e.metrics?.training_skills ?? 5}/5</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                          <div className="text-[9px] text-slate-400 font-bold">الالتزام بالوقت</div>
                          <div className="font-extrabold text-xs text-slate-800">{e.metrics?.punctuality ?? 5}/5</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                          <div className="text-[9px] text-slate-400 font-bold">التفاعل والاتصال</div>
                          <div className="font-extrabold text-xs text-slate-800">{e.metrics?.communication ?? 5}/5</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                          <div className="text-[9px] text-slate-400 font-bold">الاحترافية والسلوك</div>
                          <div className="font-extrabold text-xs text-slate-800">{e.metrics?.professionalism ?? 5}/5</div>
                        </div>
                      </div>

                      {e.comments && (
                        <div className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-100 p-2.5 rounded-xl italic">
                          "{e.comments}"
                        </div>
                      )}
                    </div>
                  ))}

                  {evaluations.length === 0 && (
                    <div className="text-center py-12 text-slate-300 italic text-xs">
                      لا يوجد تقييمات أداء مسجلة لهذا المدرب حالياً. اضغط للأعلى لإضافة أول تقييم!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Students list */}
          {profileTab === 'students' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  تفاصيل سجل الطلاب المسندين
                </h3>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold font-mono">
                  {assignedStudents.length} طلاب
                </span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {assignedStudents.length > 0 ? assignedStudents.map(student => (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 font-bold">
                        {student.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{student.full_name}</p>
                        <p className="text-[10px] text-slate-500">{student.level} • {student.course_type}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/students')}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )) : (
                  <div className="p-12 text-center text-slate-400 italic text-xs">
                    لا يوجد طلاب مسندون لهذا المدرب حالياً.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل بيانات المدرب"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">الاسم</label>
              <input 
                name="name" 
                defaultValue={coach.name || coach.trainer_name} 
                required 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">التخصص</label>
              <input 
                name="specialty" 
                defaultValue={coach.specialty} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">رقم الهاتف</label>
              <input 
                name="phone" 
                defaultValue={coach.phone} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">البريد الإلكتروني</label>
              <input 
                name="email" 
                defaultValue={coach.email} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">الراتب الأساسي (₪)</label>
              <input 
                name="salary" 
                type="number"
                defaultValue={coach.salary} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">سعر الدرس الإضافي (₪)</label>
              <input 
                name="lesson_rate" 
                type="number"
                defaultValue={coach.lesson_rate || 0} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">نبذة تعريفية</label>
            <textarea 
              name="bio" 
              defaultValue={coach.bio} 
              rows={3}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600 resize-none font-sans"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button 
              type="submit"
              disabled={updateTrainerMutation.isPending}
              className="flex-1 bg-blue-600 text-white font-black py-3 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {updateTrainerMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
            <button 
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 font-bold"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Evaluation Performance Form Modal */}
      <Modal
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        title="إضافة تقييم أداء جديد للمدرب"
      >
        <form onSubmit={handleAddEvaluation} className="space-y-5 text-right">
          <p className="text-slate-400 text-xs leading-relaxed">
            يرجى تحديد درجة تقييم الأداء من (1 - ضعيف) إلى (5 - ممتاز) لكل مؤشر من مؤشرات ممارسة التدريب:
          </p>

          <div className="space-y-4">
            {/* Metric 1 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">المهارات والقدرات التدريبية الميدانية:</span>
                <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{evalSkills}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={evalSkills}
                onChange={e => setEvalSkills(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Metric 2 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">الالتزام بالوقت وإدارة مواعيد الحصص المائية:</span>
                <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{evalPunctuality}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={evalPunctuality}
                onChange={e => setEvalPunctuality(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Metric 3 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">التفاعل والتواصل والإرشاد مع الطلاب والأهالي:</span>
                <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{evalCommunication}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={evalCommunication}
                onChange={e => setEvalCommunication(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Metric 4 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">السلوك المهني والاحترافية وجوانب السلامة:</span>
                <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{evalProfessionalism}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={evalProfessionalism}
                onChange={e => setEvalProfessionalism(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Written evaluation comments */}
            <div className="space-y-1.5 pt-1.5">
              <label className="text-xs font-bold text-slate-500">توصيات وملاحظات الإدارة الإضافية:</label>
              <textarea
                value={evalComments}
                onChange={e => setEvalComments(e.target.value)}
                placeholder="اكتب أي ملاحظات تتعلق بأداء المدرب، مستوى تقدم طلابه، أو توجيهات لازمة للحفاظ على الجودة التفوق..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600 resize-none text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={addEvaluationMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-2xl shadow-lg transition-all disabled:opacity-50 text-sm"
            >
              {addEvaluationMutation.isPending ? 'جاري الحفظ والترحيل...' : 'حفظ تقييم الأداء المعتمد'}
            </button>
            <button
              type="button"
              onClick={() => setIsEvalModalOpen(false)}
              className="px-5 py-3 text-slate-500 hover:text-slate-700 text-xs font-bold"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
