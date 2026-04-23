import React from 'react';
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
  ArrowRight
} from 'lucide-react';
import { useTrainer, useCoachAttendance } from '../hooks/useTrainers';
import { useStudents } from '../hooks/useStudents';
import { useI18n } from '../lib/LanguageContext';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { StarRating } from '../components/StudentCoachFeatures';

export default function CoachProfile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: coach, isLoading: isLoadingCoach } = useTrainer(id!);
  const { data: attendance = [] } = useCoachAttendance(id);
  const { data: students = [] } = useStudents();

  const assignedStudents = students.filter(s => s.assigned_coach_id === id);

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
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">{coach.name || coach.trainer_name}</h1>
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
                  <p className="text-[10px] text-slate-400 font-bold">الراتب الشهري</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{coach.salary ? `${coach.salary} ₪` : 'غير محدد'}</p>
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

          {/* Stats Overview */}
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
                <p className="text-3xl font-black">{attendance.length}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase">سجل حضور</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
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

          {/* Attendance History Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-emerald-600" />
                سجل الحضور الأخير للمدرب
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest font-['Cairo']">التاريخ</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest font-['Cairo']">وقت الدخول</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest font-['Cairo']">وقت الخروج</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest font-['Cairo']">المدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {attendance.slice(0, 5).map(record => (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm whitespace-nowrap">{record.date}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold text-sm">
                        {record.check_in ? format(new Date(record.check_in), 'HH:mm') : '--:--'}
                      </td>
                      <td className="px-6 py-4 text-rose-600 font-bold text-sm">
                        {record.check_out ? format(new Date(record.check_out), 'HH:mm') : '--:--'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600">
                          {record.duration_minutes ? `${record.duration_minutes} دقيقة` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                        لا توجد سجلات حضور مسجلة لهذا المدرب.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
