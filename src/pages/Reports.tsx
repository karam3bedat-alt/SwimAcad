import React, { useState } from 'react';
import { FileDown, BarChart3, Users, CreditCard, Clock, Calendar, Search, DollarSign, TrendingUp } from 'lucide-react';
import { exportToExcel } from '../lib/utils';
import { Card } from '../components/Card';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useBookings } from '../hooks/useBookings';
import { useCoachAttendance } from '../hooks/useTrainers';
import { 
  generateStudentsPDF, 
  generateAttendancePDF, 
  generatePaymentsPDF, 
  generateCoachAttendancePDF,
  generateDetailedFinancialReport 
} from '../services/pdfService';

export default function Reports() {
  const { data: students = [] } = useStudents();
  const { data: payments = [] } = usePayments();
  const { data: bookings = [] } = useBookings();
  const { data: coachAttendance = [] } = useCoachAttendance();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const months = [
    { value: '01', label: 'يناير' },
    { value: '02', label: 'فبراير' },
    { value: '03', label: 'مارس' },
    { value: '04', label: 'أبريل' },
    { value: '05', label: 'مايو' },
    { value: '06', label: 'يونيو' },
    { value: '07', label: 'يوليو' },
    { value: '08', label: 'أغسطس' },
    { value: '09', label: 'سبتمبر' },
    { value: '10', label: 'أكتوبر' },
    { value: '11', label: 'نوفمبر' },
    { value: '12', label: 'ديسمبر' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  const filterData = (data: any[]) => {
    return data.filter(item => {
      if (!item.date && !item.check_in && !item.registration_date) return true;
      const dateStr = item.date || item.check_in || item.registration_date;
      const date = new Date(dateStr);
      
      const monthMatch = selectedMonth ? (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth : true;
      const yearMatch = selectedYear ? date.getFullYear().toString() === selectedYear : true;
      
      return monthMatch && yearMatch;
    });
  };

  const filteredStudents = filterData(students);
  const filteredPayments = filterData(payments);
  const filteredBookings = filterData(bookings);
  const filteredCoachAttendance = filterData(coachAttendance);

  const handleExportDetailedFinancial = () => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';
    const reportMonth = selectedMonth ? `${monthLabel} ${selectedYear}` : 'تقرير عام';
    generateDetailedFinancialReport(filteredPayments, students, reportMonth);
  };

  const handleExportCoachAttendance = () => {
    generateCoachAttendancePDF(filteredCoachAttendance);
  };

  const handleExportCoachAttendanceExcel = () => {
    const data = filteredCoachAttendance.map(a => ({
      'اسم المدرب': a.coach_name,
      'التاريخ': a.date,
      'وقت الدخول': a.check_in ? new Date(a.check_in).toLocaleTimeString('ar-EG') : '-',
      'وقت الخروج': a.check_out ? new Date(a.check_out).toLocaleTimeString('ar-EG') : '-',
      'المدة (بالدقائق)': a.duration_minutes || 0,
      'عدد الدروس': a.lessons_count || 0,
      'الحالة': a.status || 'حاضر'
    }));
    exportToExcel(data, 'تقرير_حضور_المدربين_المفصل');
  };

  const handleExportStudents = () => {
    const data = filteredStudents.map(s => ({
      'الاسم الكامل': s.full_name,
      'العمر': s.age,
      'المستوى': s.level,
      'نوع الدورة': s.course_type || '-',
      'رقم الهاتف': s.phone || '-',
      'رقم هاتف ولي الأمر': s.parent_phone || '-',
      'اسم ولي الأمر': s.parent_name || '-',
      'تاريخ التسجيل': s.registration_date ? new Date(s.registration_date).toLocaleDateString('ar-EG') : '-',
      'ملاحظات طبية': s.medical_notes || 'لا يوجد',
      'الحالة': s.status === 'active' ? 'نشط' : 'غير نشط'
    }));
    exportToExcel(data, 'تقرير_الطلاب_المفصل');
  };

  const handleExportPayments = () => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || 'كل الأشهر';
    const reportMonth = selectedMonth ? `${monthLabel} ${selectedYear}` : 'تقرير عام';
    
    // Group payments by student to provide a detailed summary per student as requested
    const reportData = students.filter(s => s.status !== 'غير نشط').map(student => {
      const studentPayments = filteredPayments.filter(p => p.student_id === student.id);
      const paid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const required = student.custom_fee || 600;
      const remaining = Math.max(0, required - paid);
      
      const dates = studentPayments.map(p => new Date(p.date).toLocaleDateString('ar-EG')).join(', ') || '-';
      const methods = [...new Set(studentPayments.map(p => p.method || 'نقداً'))].join(', ') || '-';
      const types = [...new Set(studentPayments.map(p => p.type || 'إشتراك'))].join(', ') || '-';

      return {
        'اسم الطالب': student.full_name,
        'فترة التقرير': reportMonth,
        'قيمة الاشتراك': `${required} ₪`,
        'إجمالي المدفوع': `${paid} ₪`,
        'المبلغ المتبقي': `${remaining} ₪`,
        'تواريخ الدفع': dates,
        'طرق الدفع': methods,
        'نوع الدفعة': types,
        'رقم الهاتف': student.phone || student.parent_phone || '-',
        'حالة الطالب': student.status === 'نشط' ? 'نشط' : 'غير نشط'
      };
    });

    // Only export students who have a required fee or have made a payment
    const exportableData = reportData.filter(r => 
      parseFloat(r['إجمالي المدفوع']) > 0 || parseFloat(r['قيمة الاشتراك']) > 0
    );

    exportToExcel(exportableData, `التقرير_المالي_التفصيلي_${reportMonth}`);
  };

  const handleExportAttendance = () => {
    const data = filteredBookings.map(b => ({
      'اسم الطالب': b.student_name,
      'اليوم': b.session_day || b.day,
      'الوقت': b.session_time || b.start_time,
      'الحالة': b.status,
      'التاريخ': b.date ? new Date(b.date).toLocaleDateString('ar-EG') : '-',
      'اسم المدرب': b.coach_name || b.trainer_name || '-'
    }));
    exportToExcel(data, 'تقرير_الحضور_المفصل');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">التقارير والإحصائيات</h2>
          <p className="text-slate-500">استخراج البيانات وتحليل أداء الأكاديمية.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-700"
            >
              <option value="">كل الأشهر</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Search size={18} className="text-slate-400" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-700"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">تقرير الطلاب</h3>
            <p className="text-xs text-slate-500 mb-6 font-bold">إجمالي المصفى: {filteredStudents.length}</p>
            <div className="w-full space-y-2">
              <button 
                onClick={() => generateStudentsPDF(filteredStudents)}
                className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors text-sm"
              >
                <FileDown size={16} />
                تصدير PDF
              </button>
              <button 
                onClick={handleExportStudents}
                className="w-full bg-slate-100 text-slate-600 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors text-xs"
              >
                <FileDown size={14} />
                تصدير Excel
              </button>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">التقرير المالي</h3>
            <p className="text-xs text-emerald-600 mb-6 font-bold">
              الإيرادات: {filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString()} ₪
            </p>
            <div className="w-full space-y-2">
              <button 
                onClick={handleExportDetailedFinancial}
                className="w-full bg-emerald-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors text-sm"
              >
                <FileDown size={16} />
                تقرير مالي تفصيلي
              </button>
              <button 
                onClick={handleExportPayments}
                className="w-full bg-slate-100 text-slate-600 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors text-xs"
              >
                <FileDown size={14} />
                تصدير Excel الإيرادات
              </button>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <Clock size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">حضور الطلاب</h3>
            <p className="text-sm text-slate-500 mb-6">سجل حضور وغياب الطلاب المصفى.</p>
            <div className="w-full space-y-2">
              <button 
                onClick={() => generateAttendancePDF(filteredBookings)}
                className="w-full bg-orange-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors text-sm"
              >
                <FileDown size={16} />
                تصدير PDF
              </button>
              <button 
                onClick={handleExportAttendance}
                className="w-full bg-slate-100 text-slate-600 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors text-xs"
              >
                <FileDown size={14} />
                تصدير Excel
              </button>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">حضور المدربين</h3>
            <p className="text-sm text-slate-500 mb-6">تقرير مفصل بحضور وغياب المدربين.</p>
            <div className="w-full space-y-2">
              <button 
                onClick={handleExportCoachAttendance}
                className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors text-sm"
              >
                <FileDown size={18} />
                تصدير PDF
              </button>
              <button 
                onClick={handleExportCoachAttendanceExcel}
                className="w-full bg-slate-100 text-slate-600 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors text-xs"
              >
                <FileDown size={14} />
                تصدير Excel
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="تحليل أداء الأكاديمية (النمو والتراجع)">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(() => {
              const currentMonthInt = selectedMonth ? parseInt(selectedMonth) - 1 : new Date().getMonth();
              const currentYearInt = parseInt(selectedYear);
              
              const prevMonthInt = currentMonthInt === 0 ? 11 : currentMonthInt - 1;
              const prevYearInt = currentMonthInt === 0 ? currentYearInt - 1 : currentYearInt;

              const getRevenue = (m: number, y: number) => payments
                .filter(p => {
                  const d = new Date(p.date);
                  return d.getMonth() === m && d.getFullYear() === y;
                })
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

              const getNewStudents = (m: number, y: number) => students
                .filter(s => {
                  if (!s.registration_date) return false;
                  const d = new Date(s.registration_date);
                  return d.getMonth() === m && d.getFullYear() === y;
                }).length;

              const currRevenue = getRevenue(currentMonthInt, currentYearInt);
              const prevRevenue = getRevenue(prevMonthInt, prevYearInt);
              const revGrowth = prevRevenue === 0 ? 100 : ((currRevenue - prevRevenue) / prevRevenue) * 100;

              const currNew = getNewStudents(currentMonthInt, currentYearInt);
              const prevNew = getNewStudents(prevMonthInt, prevYearInt);
              const studentGrowth = prevNew === 0 ? 100 : ((currNew - prevNew) / prevNew) * 100;

              return (
                <>
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <DollarSign size={20} />
                      </div>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${revGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {revGrowth >= 0 ? '+' : ''}{revGrowth.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">نمو الإيرادات</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{currRevenue.toLocaleString()} ₪</p>
                    <p className="text-[10px] text-slate-400 mt-2">مقارنة بـ {prevRevenue.toLocaleString()} ₪ الشهر الماضي</p>
                  </div>

                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${studentGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {studentGrowth >= 0 ? '+' : ''}{studentGrowth.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">الطلاب الجدد</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{currNew} طالب</p>
                    <p className="text-[10px] text-slate-400 mt-2">مقارنة بـ {prevNew} الشهر الماضي</p>
                  </div>

                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                        <BarChart3 size={20} />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">معدل الاستمرارية</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {((students.filter(s => s.status === 'نشط').length / students.length) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">نسبة الطلاب النشطين حالياً</p>
                  </div>

                  <div className="p-6 bg-blue-600 rounded-3xl shadow-lg shadow-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-white/80 mb-1">صافي الأداء</p>
                    <p className="text-2xl font-black text-white">
                      {revGrowth > 0 && studentGrowth > 0 ? 'تقدم مستمر' : (revGrowth < 0 && studentGrowth < 0 ? 'تراجع ملحوظ' : 'أداء مستقر')}
                    </p>
                    <p className="text-[10px] text-white/60 mt-2">بناءً على معايير الشهر الحالي</p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
             <h4 className="font-bold text-slate-900 dark:text-white mb-4">توصيات لمراقبة الأداء</h4>
             <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span className="w-2 h-2 mt-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span>تراجع أعداد الطلاب الجدد يعني ضرورة مراجعة خطة التسويق أو الإعلانات الممولة.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span className="w-2 h-2 mt-1.5 bg-emerald-500 rounded-full shrink-0" />
                  <span>زيادة الإيرادات مع ثبات أعداد الطلاب تشير إلى نجاح استراتيجية رفع الأسعار أو الدورات الخاصة.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span className="w-2 h-2 mt-1.5 bg-orange-500 rounded-full shrink-0" />
                  <span>انخفاض معدل الاستمرارية يتطلب تحسين جودة التدريب أو بيئة الأكاديمية.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span className="w-2 h-2 mt-1.5 bg-indigo-500 rounded-full shrink-0" />
                  <span>المراقبة الشهرية تمنع الانهيار المفاجئ في الدخل بفضل التدخل المبكر.</span>
                </li>
             </ul>
          </div>
        </div>
      </Card>

      <Card title="ملخص الأداء">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">الطلاب الجدد</p>
            <p className="text-2xl font-black text-blue-600">{filteredStudents.length}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">إجمالي الحضور</p>
            <p className="text-2xl font-black text-orange-600">{filteredBookings.filter(b => b.status === 'حاضر').length}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">الدفعات المستلمة</p>
            <p className="text-2xl font-black text-emerald-600">{filteredPayments.length}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">ساعات عمل المدربين</p>
            <p className="text-2xl font-black text-indigo-600">
              {(filteredCoachAttendance.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60).toFixed(1)} س
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
