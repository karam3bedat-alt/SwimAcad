import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Calendar, 
  Users, 
  DollarSign, 
  Trash2, 
  Edit2, 
  Layout, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  TrendingDown,
  TrendingUp,
  Search,
  Calculator,
  ExternalLink
} from 'lucide-react';
import { useCourses, useAddCourse, useUpdateCourse, useDeleteCourse } from '../hooks/useCourses';
import { useTrainers } from '../hooks/useTrainers';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useSettings } from '../hooks/useSettings';
import { useBookings } from '../hooks/useBookings';
import { Modal } from '../components/Modal';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { useToast } from '../lib/ToastContext';
import { cn } from '../lib/utils';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { CourseCycle, PaymentConfig, Student } from '../types';

export default function Courses() {
  const { data: courses = [], isLoading } = useCourses();
  const { data: trainers = [] } = useTrainers();
  const { data: students = [] } = useStudents();
  const { data: payments = [] } = usePayments();
  const { data: bookings = [] } = useBookings();
  const { data: appSettings } = useSettings();
  const addCourseMutation = useAddCourse();
  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();
  const { showToast, hideToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseCycle | null>(null);
  const [viewingCourse, setViewingCourse] = useState<CourseCycle | null>(null);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<Student | null>(null);

  // Form State for Monthly Review
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [tempCourseType, setTempCourseType] = useState('');
  const [currentCost, setCurrentCost] = useState<number>(0);

  const courseTypes = useMemo(() => {
    const prices = (appSettings?.payment_config as PaymentConfig)?.coursePrices || {};
    const typeNames = Object.keys(prices);
    if (typeNames.length === 0) {
      return ['دورة سباحة عامة', 'دورة نساء', 'دورة مع مواصلات'];
    }
    return typeNames;
  }, [appSettings]);

  const monthlyReview = useMemo(() => {
    if (!tempStartDate || !tempEndDate) return null;
    
    try {
      const start = parseISO(tempStartDate);
      const end = parseISO(tempEndDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

      const studentsInType = students.filter(s => !tempCourseType || tempCourseType === 'الكل' || s.course_type === tempCourseType);
      
      const relevantPayments = payments.filter(p => {
        if (!p.date) return false;
        const pDate = parseISO(p.date);
        if (isNaN(pDate.getTime())) return false;
        return isWithinInterval(pDate, { start, end });
      });

      const totalRevenue = relevantPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const uniqueStudents = new Set(relevantPayments.map(p => p.student_id)).size;
      const profit = totalRevenue - (currentCost || 0);

      return {
        revenue: totalRevenue,
        activeStudents: uniqueStudents,
        totalStudentsInLevel: studentsInType.length,
        profit,
        status: profit >= 0 ? 'ربح' : 'خسارة'
      };
    } catch (e) {
      console.error("Monthly review calculation error:", e);
      return null;
    }
  }, [tempStartDate, tempEndDate, tempCourseType, students, payments, currentCost]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const toastId = showToast(selectedCourse ? 'جاري التعديل...' : 'جاري الإضافة...', 'loading');

    const courseData: Omit<CourseCycle, 'id'> = {
      name: formData.get('name') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      estimated_cost: Number(formData.get('estimated_cost')),
      course_type: formData.get('course_type') as string,
      coach_id: (formData.get('coach_id') as string) || '',
      description: (formData.get('description') as string) || '',
      status: formData.get('status') as any || 'قادم'
    };

    try {
      if (selectedCourse) {
        await updateCourseMutation.mutateAsync({ id: selectedCourse.id, data: courseData });
        showToast('تم تعديل الدورة بنجاح', 'success');
      } else {
        await addCourseMutation.mutateAsync(courseData);
        showToast('تم إضافة الدورة بنجاح', 'success');
      }
      hideToast(toastId);
      setIsModalOpen(false);
      setSelectedCourse(null);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'حدث خطأ ما', 'error');
    }
  };

  const handleDelete = async (course: CourseCycle) => {
    const hasStudents = students.some(s => s.course_id === course.id);
    if (hasStudents) {
      showToast('لا يمكن حذف الدورة لوجود طلاب مسجلين بها', 'error');
      return;
    }

    if (window.confirm('هل أنت متأكد من حذف هذه الدورة؟')) {
      const toastId = showToast('جاري الحذف...', 'loading');
      try {
        await deleteCourseMutation.mutateAsync(course.id);
        showToast('تم الحذف بنجاح', 'success');
      } catch (err: any) {
        showToast(err.message || 'فشل الحذف', 'error');
      } finally {
        hideToast(toastId);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-['Cairo'] text-right" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">نظام الدورات</h1>
          <p className="text-slate-500 font-bold">إدارة الدورات التدريبية والتحليل المالي للربح والخسارة</p>
        </div>
        <button
          onClick={() => {
            setSelectedCourse(null);
            setIsModalOpen(true);
            setTempStartDate('');
            setTempEndDate('');
            setTempCourseType('');
            setCurrentCost(0);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          دورة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => {
          const courseStudents = students.filter(s => s.course_id === course.id);
          const coach = trainers.find(t => t.id === course.coach_id);
          
          return (
            <div 
              key={course.id} 
              onClick={() => {
                setViewingCourse(course);
                setIsViewModalOpen(true);
              }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-blue-600 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <Layout size={24} />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  course.status === 'نشط' ? "bg-emerald-100 text-emerald-700" :
                  course.status === 'مكتمل' ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"
                )}>
                  {course.status}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{course.name}</h3>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded text-[10px] font-black whitespace-nowrap">{course.course_type}</span>
              </div>
              <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[2.5rem]">{course.description || 'لا يوجد وصف مضاف لهذه الدورة'}</p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                  <Calendar size={16} className="text-blue-500" />
                  <span>{course.start_date} إلى {course.end_date}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                  <Users size={16} className="text-indigo-500" />
                  <span>{courseStudents.length} طلاب مسجلين</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                  <Calculator size={16} className="text-amber-500" />
                  <span>التكاليف المقدرة: {course.estimated_cost} ₪</span>
                </div>
                {coach && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>المدرب: {coach.name || coach.trainer_name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCourse(course);
                    setTempStartDate(course.start_date);
                    setTempEndDate(course.end_date);
                    setTempCourseType(course.course_type);
                    setCurrentCost(course.estimated_cost || 0);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  تعديل
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(course);
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {courses.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <Layout size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">لا توجد دورات مضافة حالياً</p>
            <button
               onClick={() => setIsModalOpen(true)}
               className="mt-4 text-blue-600 font-black text-sm"
            >
              ابدأ بإضافة أول دورة الآن
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCourse ? 'تعديل بيانات الدورة' : 'إضافة دورة جديدة'}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-['Cairo'] text-right" dir="rtl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">اسم الدورة</label>
              <input
                name="name"
                required
                defaultValue={selectedCourse?.name}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="مثال: دورة السباحة للمبتدئين - صيف 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">تاريخ البدء</label>
                <input
                  name="start_date"
                  type="date"
                  required
                  defaultValue={selectedCourse?.start_date}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">تاريخ الانتهاء</label>
                <input
                  name="end_date"
                  type="date"
                  required
                  defaultValue={selectedCourse?.end_date}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">التكاليف المقدرة (₪)</label>
                <input
                  name="estimated_cost"
                  type="number"
                  required
                  defaultValue={selectedCourse?.estimated_cost}
                  onChange={(e) => setCurrentCost(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="التكلفة التشغيلية للدورة"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">تصنيف الدورة</label>
                <select
                  name="course_type"
                  required
                  defaultValue={selectedCourse?.course_type}
                  onChange={(e) => setTempCourseType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">اختر التصنيف</option>
                  <option value="الكل">عام (جميع الأنواع)</option>
                  {courseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">المدرب</label>
                <select
                  name="coach_id"
                  defaultValue={selectedCourse?.coach_id}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">اختر مدرباً (اختياري)</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.trainer_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">حالة الدورة</label>
                <select
                  name="status"
                  required
                  defaultValue={selectedCourse?.status || 'قادم'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="نشط">نشط</option>
                  <option value="قادم">قادم</option>
                  <option value="مكتمل">مكتمل</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">الوصف</label>
              <textarea
                name="description"
                defaultValue={selectedCourse?.description}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                placeholder="تفاصيل إضافية عن الدورة..."
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={addCourseMutation.isPending || updateCourseMutation.isPending}
                className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {selectedCourse ? 'حفظ التعديلات' : 'إضافة الدورة'}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-4 font-black text-slate-500 hover:text-slate-700 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>

          {/* Monthly System Comparison Side Panel */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/50 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                  <History size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">تحليل الجدوى المالية</h4>
                  <p className="text-[10px] text-slate-500 font-bold">بناءً على التواريخ المحددة (النظام الشهري)</p>
                </div>
              </div>
            </div>

            {!monthlyReview ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <AlertCircle className="text-slate-300 mb-3" size={32} />
                <p className="text-slate-400 text-sm font-bold leading-relaxed">
                  الرجاء إدخال التواريخ وتصنيف الدورة والتكلفة المقدرة لإظهار تحليل الربح والخسارة المتوقع
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">صافي الإيرادات</p>
                    <p className="text-xl font-black text-blue-600">{monthlyReview.revenue.toLocaleString()} ₪</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">النتيجة المتوقعة</p>
                    <p className={cn(
                      "text-xl font-black",
                      monthlyReview.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {monthlyReview.profit.toLocaleString()} ₪
                      <span className="text-[10px] block font-bold">{monthlyReview.status}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">طلاب دفعوا في هذه الفترة</p>
                    <Users size={14} className="text-slate-300" />
                  </div>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{monthlyReview.activeStudents}</p>
                    <p className="text-[10px] text-slate-500 font-bold mb-1.5 whitespace-nowrap">من أصل {monthlyReview.totalStudentsInLevel} طالب مسجل (تصنيف: {tempCourseType || 'عام'})</p>
                  </div>
                </div>

                <div className={cn(
                   "p-4 rounded-2xl border",
                   monthlyReview.profit >= 0 ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300" : 
                   "bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50 text-rose-800 dark:text-rose-300"
                )}>
                  <div className="flex items-start gap-3">
                    {monthlyReview.profit >= 0 ? <TrendingUp size={18} className="mt-1 shrink-0" /> : <TrendingDown size={18} className="mt-1 shrink-0" />}
                    <p className="text-xs leading-relaxed font-bold">
                      {monthlyReview.profit >= 0 
                        ? `بناءً على بيانات النظام الشهري، هذه الدورة رابحة. الإيرادات تغطي التكاليف وتوفر هامش ربح قدره ${monthlyReview.profit} ₪.`
                        : `تنبيه: التكاليف المقدرة أعلى من إيرادات النظام الشهري في هذه الفترة بمقدار ${Math.abs(monthlyReview.profit)} ₪. قد تحتاج لزيادة عدد الطلاب أو تقليل التكاليف.`
                      }
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">توصية النظام</h5>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-bold">نقطة التعادل (طلاب):</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {Math.ceil(currentCost / (monthlyReview.revenue / (monthlyReview.activeStudents || 1) || 1))} طالب
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-bold">نسبة التغطية الحالية:</span>
                    <span className={cn(
                      "font-black",
                      (monthlyReview.revenue / currentCost) >= 1 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {Math.round((monthlyReview.revenue / (currentCost || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* View Course Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`تحليل الدورة: ${viewingCourse?.name}`}
      >
        {viewingCourse && (() => {
          // Calculate Real-time statistics for this course period and type
          try {
            const start = parseISO(viewingCourse.start_date);
            const end = parseISO(viewingCourse.end_date);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
              return <div className="p-8 text-center text-rose-500 font-bold">خطأ في تواريخ الدورة. يرجى تعديل الدورة وتصحيح التواريخ.</div>;
            }

            // Payments in this period
            const periodPayments = payments.filter(p => {
              if (!p.date) return false;
              const pDate = parseISO(p.date);
              if (isNaN(pDate.getTime())) return false;
              
              const inPeriod = isWithinInterval(pDate, { start, end });
              const student = students.find(s => s.id === p.student_id);
              const matchesType = viewingCourse.course_type === 'الكل' || student?.course_type === viewingCourse.course_type;
              return inPeriod && matchesType;
            });

            const totalRevenue = periodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const netProfit = totalRevenue - (viewingCourse.estimated_cost || 0);
            const payerCount = new Set(periodPayments.map(p => p.student_id)).size;
            
            const enrolledStudents = students.filter(s => {
              const isExplicitlyEnrolled = s.course_id === viewingCourse.id;
              const rDateStr = s.registration_date;
              if (!rDateStr) return isExplicitlyEnrolled;
              
              const registrationDate = parseISO(rDateStr);
              if (isNaN(registrationDate.getTime())) return isExplicitlyEnrolled;

              const isWithinPeriod = isWithinInterval(registrationDate, { start, end });
              const matchesType = viewingCourse.course_type === 'الكل' || s.course_type === viewingCourse.course_type;
              
              return isExplicitlyEnrolled || (isWithinPeriod && matchesType);
            });
            
            // Bookings for attendance analysis
            const courseBookings = bookings.filter(b => {
               if (!b.date) return false;
               const bDate = parseISO(b.date);
               if (isNaN(bDate.getTime())) return false;

               const inPeriod = isWithinInterval(bDate, { start, end });
               const student = students.find(s => s.id === b.student_id);
               const matchesType = viewingCourse.course_type === 'الكل' || student?.course_type === viewingCourse.course_type;
               return inPeriod && matchesType;
            });

            const participatingTrainers = trainers.filter(t => 
               courseBookings.some(b => b.coach_name === t.name || b.trainer_name === t.trainer_name || b.coach_name === t.trainer_name) || t.id === viewingCourse.coach_id
            );

            return (
            <div className="space-y-8 font-['Cairo'] text-right" dir="rtl">
              {/* Financial Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">إجمالي المحصل</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{totalRevenue.toLocaleString()} ₪</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                  <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase mb-1">التكاليف المقدرة</p>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300">{viewingCourse.estimated_cost.toLocaleString()} ₪</p>
                </div>
                <div className={cn(
                  "p-4 rounded-2xl border",
                  netProfit >= 0 
                    ? "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50" 
                    : "bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50"
                )}>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">صافي الربح/الخسارة</p>
                  <p className={cn(
                    "text-xl font-black",
                    netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {netProfit.toLocaleString()} ₪
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">طلاب سددوا</p>
                  <p className="text-xl font-black text-slate-700 dark:text-slate-300">{payerCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Students Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Users size={18} className="text-blue-600" />
                      الطلاب المسجلون في الدورة ({enrolledStudents.length})
                    </h4>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="max-h-[400px] overflow-y-auto">
                      {enrolledStudents.length > 0 ? (
                        <table className="w-full text-right">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase">
                            <tr>
                              <th className="p-4">اسم الطالب</th>
                              <th className="p-4 text-center">الحضور</th>
                              <th className="p-4 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {enrolledStudents.map(student => {
                              const studentBookings = courseBookings.filter(b => b.student_id === student.id);
                              const presentCount = studentBookings.filter(b => b.status === 'حضر').length;
                              const absentCount = studentBookings.filter(b => b.status === 'غائب').length;

                              return (
                                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-4 text-sm font-bold">
                                    {student.full_name}
                                    <span className="block text-[10px] text-slate-400 font-bold">{student.phone}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">حضر: {presentCount}</span>
                                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">غاب: {absentCount}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedProfileStudent(student);
                                        setIsProfileModalOpen(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      title="فتح الملف الشخصي"
                                    >
                                      <ExternalLink size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-12 text-center text-slate-400">
                          <Users size={40} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-bold leading-relaxed">
                            لا يوجد طلاب مسجلون مباشرة في هذه الدورة.<br/>
                            <span className="text-[10px] text-slate-400">يظهر التحليل المالي جميع الطلاب من تصنيف "{viewingCourse.course_type}" الذين دفعوا في هذه الفترة.</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trainers & Payments Section */}
                <div className="space-y-8">
                  {/* Participating Trainers */}
                  <div className="space-y-4">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      المدربين المشاركين ({participatingTrainers.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {participatingTrainers.map(trainer => (
                        <div key={trainer.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 font-black">
                            {trainer.name?.charAt(0) || trainer.trainer_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{trainer.name || trainer.trainer_name}</p>
                            <p className="text-[10px] text-slate-500">{trainer.phone || '-'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payments Section */}
                  <div className="space-y-4">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-600" />
                      سجل المدفوعات في الفترة ({periodPayments.length})
                    </h4>
                    
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                      <div className="max-h-[300px] overflow-y-auto">
                        {periodPayments.length > 0 ? (
                          <table className="w-full text-right">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase">
                              <tr>
                                <th className="p-4">اسم الطالب</th>
                                <th className="p-4 text-center">المبلغ</th>
                                <th className="p-4 text-center">التاريخ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                              {periodPayments.map(payment => {
                                const s = students.find(st => st.id === payment.student_id);
                                return (
                                  <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-sm font-bold">{s?.full_name || 'طالب مجهول'}</td>
                                    <td className="p-4 text-center font-black text-emerald-600">{payment.amount} ₪</td>
                                    <td className="p-4 text-center text-[10px] font-bold text-slate-400">
                                      {format(parseISO(payment.date), 'yyyy-MM-dd')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-12 text-center text-slate-400">
                            <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-bold">لم يتم تسجيل أي مدفوعات في هذا النطاق الزمني</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {viewingCourse.description && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                  <h5 className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase mb-3 tracking-widest flex items-center gap-2">
                    <AlertCircle size={14} />
                    ملاحظات الدورة
                  </h5>
                  <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed font-bold">{viewingCourse.description}</p>
                </div>
              )}
            </div>
          );
        } catch (e) {
          console.error("View course stats error:", e);
          return <div className="p-8 text-center text-rose-500 font-bold">حدث خطأ أثناء تحميل إحصائيات الدورة. يرجى التأكد من صحة التواريخ والبيانات.</div>;
        }
      })()}
    </Modal>

      <StudentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfileStudent(null);
        }}
        student={selectedProfileStudent}
      />
    </div>
  );
}
