import React, { useState } from 'react';
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
import { useTrainer, useCoachAttendance, useUpdateTrainer } from '../hooks/useTrainers';
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
  const updateTrainerMutation = useUpdateTrainer();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white">{coach.name || coach.trainer_name}</h1>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
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
              <div className="bg-amber-50 dark:bg-amber-900/20 px-6 py-3 rounded-2xl flex flex-col items-center">
                <Award size={24} className="text-amber-600 mb-1" />
                <p className="text-2xl font-black text-amber-700">{coach.loyalty_points || 0}</p>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-none">نقاط الولاء</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
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

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 mb-2">نبذة تعريفية</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                {coach.bio || 'لا توجد نبذة تعريفية مضافة لهذا المدرب حالياً.'}
              </p>
            </div>
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} />
              إحصائيات سريعة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-3xl font-black">{assignedStudents.length}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase">طالب متابع</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-3xl font-black">{attendance.filter(r => r.status !== 'غائب').length}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase">أيام الحضور</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Financial File Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">الملف المالي للمدرب</h3>
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
            
            <div className="p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">تفاصيل الحضور المالي</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">التاريخ</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">الدروس</th>
                      <th className="px-4 py-3 font-bold">المستحق</th>
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
                          {record.status !== 'غائب' ? `${(coach.salary || 0) / 30 + (record.lessons_count || 0) * (coach.lesson_rate || 0)}`.split('.')[0] : '0'} ₪
                        </td>
                      </tr>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">لا توجد سجلات لهذا الشهر</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Students Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                الطلاب المسندون للمدرب
              </h3>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
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
                <div className="p-12 text-center text-slate-400 italic text-sm">
                  لا يوجد طلاب مسندون لهذا المدرب.
                </div>
              )}
            </div>
          </div>
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
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
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
              className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
