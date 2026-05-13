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
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const courseTypes = useMemo(() => {
    const prices = (appSettings?.payment_config as PaymentConfig)?.coursePrices || {};
    const typeNames = Object.keys(prices);
    if (typeNames.length === 0) {
      return ['دورة سباحة عامة', 'دورة نساء', 'دورة مع مواصلات'];
    }
    return typeNames;
  }, [appSettings]);

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
      coach_ids: selectedCoachIds,
      coach_id: selectedCoachIds[0] || '', // Maintain compatibility
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
          const courseCoaches = trainers.filter(t => 
            course.coach_ids?.includes(t.id) || (course.coach_id === t.id)
          );
          
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
                {courseCoaches.length > 0 && (
                  <div className="flex items-start gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase mb-1">المدربون:</p>
                      <div className="flex flex-wrap gap-1">
                        {courseCoaches.map(c => (
                          <span key={c.id} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                            {c.name || c.trainer_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCourse(course);
                    setSelectedCoachIds(course.coach_ids || (course.coach_id ? [course.coach_id] : []));
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
              <div className="space-y-2 col-span-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">المدربون المسؤولون</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl max-h-[150px] overflow-y-auto">
                  {trainers.map(t => {
                    const isSelected = selectedCoachIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCoachIds(selectedCoachIds.filter(id => id !== t.id));
                          } else {
                            setSelectedCoachIds([...selectedCoachIds, t.id]);
                          }
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[10px] font-bold border transition-all text-center",
                          isSelected 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {t.name || t.trainer_name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
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
            const startDate = parseISO(viewingCourse.start_date);
            const endDate = parseISO(viewingCourse.end_date);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return <div className="p-8 text-center text-rose-500 font-bold">خطأ في تواريخ الدورة. يرجى تعديل الدورة وتصحيح التواريخ.</div>;
            }

            // Payments in this period
            const periodPayments = payments.filter(p => {
              if (!p.date) return false;
              const pDate = parseISO(p.date);
              if (isNaN(pDate.getTime())) return false;
              
              const inPeriod = isWithinInterval(pDate, { start: startDate, end: endDate });
              const student = students.find(s => s.id === p.student_id);
              const matchesType = viewingCourse.course_type === 'الكل' || student?.course_type === viewingCourse.course_type;
              return inPeriod && matchesType;
            });

            const totalRevenue = periodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const netProfit = totalRevenue - (viewingCourse.estimated_cost || 0);
            const payerCount = new Set(periodPayments.map(p => p.student_id)).size;
            
            const enrolledStudents = students.filter(s => {
              // Only count active students with valid subscriptions
              const isStatusActive = s.status !== 'غير نشط';
              const isSubActive = !s.subscription_end_date || new Date(s.subscription_end_date) >= new Date();
              if (!isStatusActive || !isSubActive) return false;

              const isExplicitlyEnrolled = s.course_id === viewingCourse.id;
              if (isExplicitlyEnrolled) return true;

              const rDateStr = s.registration_date;
              if (!rDateStr) return false;
              
              const registrationDate = parseISO(rDateStr);
              if (isNaN(registrationDate.getTime())) return false;

              const isWithinPeriod = isWithinInterval(registrationDate, { start: startDate, end: endDate });
              const matchesType = viewingCourse.course_type === 'الكل' || s.course_type === viewingCourse.course_type;
              
              return isWithinPeriod && matchesType;
            });

            const courseBookings = bookings.filter(b => {
               if (!b.date) return false;
               const bDate = parseISO(b.date);
               if (isNaN(bDate.getTime())) return false;

               const inPeriod = isWithinInterval(bDate, { start: startDate, end: endDate });
               const student = students.find(s => s.id === b.student_id);
               const matchesType = viewingCourse.course_type === 'الكل' || student?.course_type === viewingCourse.course_type;
               return inPeriod && matchesType;
            });

            const participatingTrainers = trainers.filter(t => 
               courseBookings.some(b => b.coach_name === t.name || b.trainer_name === t.trainer_name || b.coach_name === t.trainer_name) || 
               viewingCourse.coach_ids?.includes(t.id) || 
               t.id === viewingCourse.coach_id
            );

            const filteredEnrolledStudents = enrolledStudents.filter(s => {
              const matchesSearch = s.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                                   s.phone.includes(studentSearchQuery);
              
              const studentPaymentsInPeriod = periodPayments.filter(p => p.student_id === s.id);
              const totalPaid = studentPaymentsInPeriod.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
              const isPaid = totalPaid > 0;

              if (paymentFilter === 'paid') return matchesSearch && isPaid;
              if (paymentFilter === 'unpaid') return matchesSearch && !isPaid;
              return matchesSearch;
            });

            const collectionEfficiency = enrolledStudents.length > 0 ? (payerCount / enrolledStudents.length) * 100 : 0;
            const avgAttendance = courseBookings.length > 0 ? (courseBookings.filter(b => b.status === 'حضر').length / courseBookings.length) * 100 : 0;
            const periodProgress = isWithinInterval(new Date(), { start: startDate, end: endDate }) ? ( (new Date().getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()) ) * 100 : (new Date() > endDate ? 100 : 0);

            return (
            <div className="space-y-8 font-['Cairo'] text-right" dir="rtl">
              {/* Financial Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">
                    <TrendingUp size={10} /> إجمالي المحصل
                  </p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{totalRevenue.toLocaleString()} ₪</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 shadow-sm">
                  <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase mb-1 flex items-center gap-1">
                    <Calculator size={10} /> التكاليف المقدرة
                  </p>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300">{viewingCourse.estimated_cost.toLocaleString()} ₪</p>
                </div>
                <div className={cn(
                  "p-4 rounded-2xl border shadow-sm",
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
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                   <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1 flex items-center gap-1">
                     <Calculator size={10} /> نقطة التعادل
                   </p>
                   <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                     {Math.ceil((viewingCourse.estimated_cost || 0) / (totalRevenue / (payerCount || 1) || 1))} طالب
                   </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">نسبة التغطية</p>
                  <p className={cn(
                    "text-xl font-black",
                    (totalRevenue / (viewingCourse.estimated_cost || 1)) >= 1 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {Math.round((totalRevenue / (viewingCourse.estimated_cost || 1)) * 100)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Students Section with Smart Search */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Search size={18} className="text-blue-600" />
                      البحث الذكي في الدورة
                    </h4>
                    
                    <div className="flex gap-2">
                       <div className="relative flex-1">
                         <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                         <input
                          type="text"
                          placeholder="ابحث عن طالب باسمه أو هاتفه..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl py-2 pr-10 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600"
                         />
                       </div>
                       <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value as any)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-2 py-2 text-[10px] font-black outline-none"
                       >
                         <option value="all">الكل</option>
                         <option value="paid">مسدد</option>
                         <option value="unpaid">غير مسدد</option>
                       </select>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="max-h-[400px] overflow-y-auto">
                      {filteredEnrolledStudents.length > 0 ? (
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase">
                            <tr>
                              <th className="p-4">الطالب</th>
                              <th className="p-4 text-center">أهم البيانات</th>
                              <th className="p-4 text-center">حالة الدفع</th>
                              <th className="p-4 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredEnrolledStudents.map(student => {
                              const studentBookings = courseBookings.filter(b => b.student_id === student.id);
                              const presentCount = studentBookings.filter(b => b.status === 'حضر').length;
                              
                              const studentPaymentsInPeriod = periodPayments.filter(p => p.student_id === student.id);
                              const totalPaid = studentPaymentsInPeriod.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                              const isPaid = totalPaid > 0;

                              return (
                                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-4 font-bold">
                                    {student.full_name}
                                    <span className="block text-[10px] text-slate-400 font-bold">{student.level}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">حضور: {presentCount} جلسات</span>
                                      <span className="text-[9px] font-bold text-slate-400">{student.phone}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    {isPaid ? (
                                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center justify-center gap-1">
                                        <CheckCircle2 size={10} /> تم الدفع ({totalPaid}₪)
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">غير مسدد</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedProfileStudent(student);
                                        setIsProfileModalOpen(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    >
                                      <ExternalLink size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-12 text-center text-slate-400">
                          <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-bold">لا توجد نتائج مطابقة للبحث</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trainers & Analytics Section */}
                <div className="space-y-6">
                  {/* Detailed Analytics */}
                  <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Calculator size={14} /> التحليل الذكي للدورة
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <span className="text-[10px] font-bold text-slate-400">معدل الإيراد / طالب</span>
                         <p className="text-lg font-black">{Math.round(totalRevenue / (enrolledStudents.length || 1))} ₪</p>
                         <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                           <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (totalRevenue / (enrolledStudents.length || 1) / 500) * 100)}%` }} />
                         </div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] font-bold text-slate-400">كفاءة التحصيل</span>
                         <p className="text-lg font-black">{Math.round(collectionEfficiency)}%</p>
                         <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                           <div className="bg-blue-500 h-full" style={{ width: `${collectionEfficiency}%` }} />
                         </div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] font-bold text-slate-400">نسبة تقدم المدة</span>
                         <p className="text-lg font-black">{Math.round(periodProgress)}%</p>
                         <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                           <div className="bg-amber-500 h-full" style={{ width: `${periodProgress}%` }} />
                         </div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] font-bold text-slate-400">متوسط الحضور</span>
                         <p className="text-lg font-black">{Math.round(avgAttendance)}%</p>
                         <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                           <div className="bg-purple-500 h-full" style={{ width: `${avgAttendance}%` }} />
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Trainers Summary */}
                  <div className="space-y-3">
                    <h5 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                       <Users size={18} className="text-indigo-600" />
                       المدربون المسؤولون
                    </h5>
                    <div className="grid grid-cols-1 gap-2">
                       {participatingTrainers.length > 0 ? participatingTrainers.map(t => (
                         <div key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                               {t.name.charAt(0)}
                             </div>
                             <div>
                               <p className="text-sm font-bold">{t.name}</p>
                               <p className="text-[9px] text-slate-400 font-bold">{t.specialty}</p>
                             </div>
                           </div>
                           <div className="text-left">
                             <span className="text-[10px] font-black text-indigo-600">{t.loyalty_points || 0} نقطة</span>
                           </div>
                         </div>
                       )) : <p className="text-xs text-slate-400 italic">لا يوجد مدربون مسجلون حالياً.</p>}
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                    <h5 className="text-sm font-black text-indigo-900 dark:text-indigo-200 mb-2">إحصائيات المدة</h5>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">من:</span>
                        <span className="font-black text-slate-700 dark:text-slate-200">{format(startDate, 'dd/MM/yyyy')}</span>
                        <span className="font-bold text-slate-500">إلى:</span>
                        <span className="font-black text-slate-700 dark:text-slate-200">{format(endDate, 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">الحالة الزمنية:</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                          new Date() < startDate ? "bg-amber-100 text-amber-600" :
                          new Date() > endDate ? "bg-slate-100 text-slate-600" :
                          "bg-emerald-100 text-emerald-600"
                        )}>
                          {new Date() < startDate ? 'قيد الانتظار' : new Date() > endDate ? 'منتهية' : 'جارية حالياً'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
