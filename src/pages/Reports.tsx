import React, { useState, useMemo } from 'react';
import { 
  FileDown, 
  BarChart3, 
  Users, 
  CreditCard, 
  Clock, 
  Calendar, 
  Search, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart,
  Percent,
  Tag,
  Coins,
  Ticket,
  Sparkles,
  MessageCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { exportToExcel } from '../lib/utils';
import { Card } from '../components/Card';
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { useTransactions } from '../hooks/useTransactions';
import { useBookings } from '../hooks/useBookings';
import { useCoachAttendance } from '../hooks/useTrainers';
import { useSettings } from '../hooks/useSettings';
import { DEFAULT_COURSE_PRICES } from '../services/paymentService';
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
  const { data: transactions = [] } = useTransactions();
  const { data: bookings = [] } = useBookings();
  const { data: coachAttendance = [] } = useCoachAttendance();

  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Custom Tabs for Advanced Financial Management
  const [activeReportTab, setActiveReportTab] = useState<'general' | 'forecasting' | 'coupons'>('general');
  const [forecastingFilter, setForecastingFilter] = useState<'all' | 'overdue' | 'next30' | 'next60' | 'next90'>('all');
  const [forecastingSearch, setForecastingSearch] = useState('');

  const { data: appSettings } = useSettings();
  const currentPrices = useMemo(() => {
    return (appSettings?.payment_config as any)?.coursePrices || DEFAULT_COURSE_PRICES;
  }, [appSettings]);

  // Future Cash Flow Projections Memo
  const forecastingData = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'نشط');
    const today = new Date();
    
    let overdueCount = 0;
    let overdueRevenue = 0;
    let next30Count = 0;
    let next30Revenue = 0;
    let next60Count = 0;
    let next60Revenue = 0;
    let next90Count = 0;
    let next90Revenue = 0;

    const studentList: Array<{
      id: string;
      name: string;
      dueDate: Date;
      fee: number;
      phone: string;
      courseType: string;
      bucket: 'overdue' | 'next30' | 'next60' | 'next90' | 'later';
    }> = [];

    activeStudents.forEach(student => {
      let dueDate = new Date();
      if (student.subscription_end_date) {
        dueDate = new Date(student.subscription_end_date);
      } else if (student.registration_date) {
        const regDate = new Date(student.registration_date);
        regDate.setMonth(regDate.getMonth() + 1);
        dueDate = regDate;
      } else {
        dueDate.setDate(dueDate.getDate() + 7);
      }

      const rawFee = student.custom_fee || (student.course_type ? currentPrices[student.course_type] : null) || 600;
      const fee = Number(rawFee) || 600;

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let bucket: 'overdue' | 'next30' | 'next60' | 'next90' | 'later' = 'later';

      if (diffDays < 0) {
        bucket = 'overdue';
        overdueCount++;
        overdueRevenue += fee;
      } else if (diffDays <= 30) {
        bucket = 'next30';
        next30Count++;
        next30Revenue += fee;
      } else if (diffDays <= 60) {
        bucket = 'next60';
        next60Count++;
        next60Revenue += fee;
      } else if (diffDays <= 90) {
        bucket = 'next90';
        next90Count++;
        next90Revenue += fee;
      }

      studentList.push({
        id: student.id,
        name: student.full_name,
        dueDate,
        fee,
        phone: student.phone || student.parent_phone || '',
        courseType: student.course_type || 'باقة عامة',
        bucket
      });
    });

    studentList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const chartData = [
      { name: 'متأخرات', amount: overdueRevenue, count: overdueCount },
      { name: 'خلال ٣٠ يوم', amount: next30Revenue, count: next30Count },
      { name: 'من ٣٠ إلى ٦٠ يوم', amount: next60Revenue, count: next60Count },
      { name: 'من ٦٠ إلى ٩٠ يوم', amount: next90Revenue, count: next90Count }
    ];

    return {
      chartData,
      totals: {
        overdue: overdueRevenue,
        next30: next30Revenue,
        next60: next60Revenue,
        next90: overdueRevenue + next30Revenue + next60Revenue + next90Revenue,
        totalActiveCount: activeStudents.length,
        dueSoonCount: overdueCount + next30Count
      },
      studentList
    };
  }, [students, currentPrices]);

  // Coupons and Loyalty Points Analytics Memo
  const AVAILABLE_PROMO_CODES = useMemo(() => [
    { code: 'WELCOME10', type: 'percent', value: 10, label: 'خصم ترحيبي ١٠%' },
    { code: 'VIP20', type: 'percent', value: 20, label: 'خصم كبار العملاء ٢٠%' },
    { code: 'KARAM50', type: 'fixed', value: 50, label: 'كوبون مطور الأكاديمية كرم كرم - ٥٠ شيكل' },
    { code: 'ACADEMY100', type: 'fixed', value: 100, label: 'منحة الأكاديمية الخاصة - ١٠٠ شيكل' }
  ], []);

  const couponAnalytics = useMemo(() => {
    let totalDiscountAmount = 0;
    let totalRegularDiscounts = 0;
    let pointsDiscountValue = 0;
    let pointsUseCount = 0;

    const couponUsageStats: Record<string, { count: number; totalSaved: number; label: string }> = {
      'WELCOME10': { count: 0, totalSaved: 0, label: 'خصم ترحيبي ١٠%' },
      'VIP20': { count: 0, totalSaved: 0, label: 'خصم كبار العملاء ٢٠%' },
      'KARAM50': { count: 0, totalSaved: 0, label: 'كوبون كرم كرم (٥٠ ₪)' },
      'ACADEMY100': { count: 0, totalSaved: 0, label: 'منحة الأكاديمية (١٠٠ ₪)' }
    };

    const couponTransactions: Array<{
      id: string;
      studentName: string;
      date: string;
      couponCode: string;
      couponLabel: string;
      savedAmount: number;
      finalAmount: number;
    }> = [];

    transactions.forEach((tx: any) => {
      if (tx.loyalty_points_used && tx.loyalty_points_used > 0) {
        pointsUseCount++;
        pointsDiscountValue += tx.loyalty_points_used;
      }

      if (tx.items) {
        tx.items.forEach((item: any) => {
          if (item.type === 'subscription') {
            let matchedPromo = AVAILABLE_PROMO_CODES.find(p => item.name.includes(p.code));
            
            if (matchedPromo) {
              let savedPrice = 0;
              if (matchedPromo.type === 'percent') {
                const originalCalculatedPrice = item.price / (1 - matchedPromo.value / 100);
                savedPrice = Math.round(originalCalculatedPrice - item.price);
              } else {
                savedPrice = matchedPromo.value;
              }

              totalDiscountAmount += savedPrice;
              if (couponUsageStats[matchedPromo.code]) {
                couponUsageStats[matchedPromo.code].count++;
                couponUsageStats[matchedPromo.code].totalSaved += savedPrice;
              }

              couponTransactions.push({
                id: tx.id,
                studentName: tx.student_name,
                date: tx.date,
                couponCode: matchedPromo.code,
                couponLabel: matchedPromo.label,
                savedAmount: savedPrice,
                finalAmount: tx.total_amount
              });
            }

            if (item.name.includes('باقة ٣ أشهر') || item.name.includes('باقة 3 أشهر')) {
              totalRegularDiscounts += Math.round((item.price / 0.9) * 0.1);
            } else if (item.name.includes('باقة ٦ أشهر') || item.name.includes('باقة 6 أشهر')) {
              totalRegularDiscounts += Math.round((item.price / 0.85) * 0.15);
            } else if (item.name.includes('باقة ١٢ أشهر') || item.name.includes('باقة 12 أشهر')) {
              totalRegularDiscounts += Math.round((item.price / 0.75) * 0.25);
            }
          }
        });
      }
    });

    const chartData = Object.entries(couponUsageStats).map(([code, stats]) => ({
      name: stats.label,
      code,
      count: stats.count,
      totalSaved: stats.totalSaved
    })).filter(item => item.count > 0);

    const emptyFiller = Object.entries(couponUsageStats).map(([code, stats]) => ({
      name: stats.label,
      code,
      count: stats.count,
      totalSaved: stats.totalSaved
    }));

    return {
      totalDiscountAmount,
      totalRegularDiscounts,
      pointsDiscountValue,
      pointsUseCount,
      chartData: chartData.length > 0 ? chartData : emptyFiller,
      couponTransactions: couponTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [transactions, AVAILABLE_PROMO_CODES]);

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
      
      if (isCustomRange && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      }

      const monthMatch = selectedMonth ? (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth : true;
      const yearMatch = selectedYear ? date.getFullYear().toString() === selectedYear : true;
      
      return monthMatch && yearMatch;
    });
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (!student.registration_date) {
        // Do not include students without a registration date in timed calculations/statistics
        return !selectedMonth && !isCustomRange;
      }
      const date = new Date(student.registration_date);
      
      if (isCustomRange && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      }

      const monthMatch = selectedMonth ? (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth : true;
      const yearMatch = selectedYear ? date.getFullYear().toString() === selectedYear : true;
      
      return monthMatch && yearMatch;
    });
  }, [students, isCustomRange, customStartDate, customEndDate, selectedMonth, selectedYear]);

  const filteredPayments = filterData(payments);
  const filteredTransactions = filterData(transactions);
  const filteredBookings = filterData(bookings);
  const filteredCoachAttendance = filterData(coachAttendance);

  const handleExportDetailedFinancial = () => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';
    let reportMonth = selectedMonth ? `${monthLabel} ${selectedYear}` : 'تقرير عام';
    
    if (isCustomRange && customStartDate && customEndDate) {
      reportMonth = `من ${customStartDate} إلى ${customEndDate}`;
    }
    
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
    let reportMonth = selectedMonth ? `${monthLabel} ${selectedYear}` : 'تقرير عام';
    
    if (isCustomRange && customStartDate && customEndDate) {
      reportMonth = `من ${customStartDate} إلى ${customEndDate}`;
    }
    
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

  const handleExportProductSales = () => {
    const data = filteredTransactions.flatMap(t => 
      t.items.filter(i => i.type === 'product').map(i => ({
        'التاريخ': new Date(t.date).toLocaleDateString('ar-EG'),
        'اسم الطالب': t.student_name,
        'المنتج': i.name,
        'الكمية': i.quantity,
        'السعر الفردي': i.price,
        'الإجمالي': i.total,
        'طريقة الدفع': t.method
      }))
    );
    exportToExcel(data, 'تقرير_مبيعات_المنتجات');
  };

  const productStats = useMemo(() => {
    const stats: { [name: string]: { quantity: number, total: number } } = {};
    filteredTransactions.forEach(t => {
      if (t.items) {
        t.items.forEach(item => {
          if (item.type === 'product') {
            if (!stats[item.name]) stats[item.name] = { quantity: 0, total: 0 };
            stats[item.name].quantity += item.quantity;
            stats[item.name].total += item.total;
          }
        });
      }
    });
    return Object.entries(stats)
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredTransactions]);

  const revenueSplit = useMemo(() => {
    let subs = 0;
    let prods = 0;
    filteredTransactions.forEach(t => {
      if (t.items) {
        t.items.forEach(item => {
          if (item.type === 'subscription') subs += item.total;
          else if (item.type === 'product') prods += item.total;
        });
      }
    });
    // Add legacy payments to subs
    filteredPayments.forEach(p => {
       subs += (Number(p.amount) || 0);
    });
    return { subs, prods };
  }, [filteredTransactions, filteredPayments]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">التقارير والإدارة المالية المتقدمة</h2>
          <p className="text-sm text-slate-500">مراقبة الأداء المالي للأكاديمية وتوقع التدفقات النقدية وتحليلات الكوبونات والخصومات.</p>
        </div>
      </div>

      {/* Advanced Tabs Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveReportTab('general')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'general'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={15} />
          <span>التقارير العامة والإحصائيات</span>
        </button>
        <button
          onClick={() => setActiveReportTab('forecasting')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'forecasting'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays size={15} />
          <span>توقعات التدفقات النقدية المستقبلية (Cash Flow)</span>
        </button>
        <button
          onClick={() => setActiveReportTab('coupons')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'coupons'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Tag size={15} />
          <span>لوحة تحليلات الكوبونات والخصومات</span>
        </button>
      </div>

      {/* VIEW 1: General Reports & Stats */}
      {activeReportTab === 'general' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">الفلترة الزمنية للتقارير العامة</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setIsCustomRange(!isCustomRange)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isCustomRange 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {isCustomRange ? 'إلغاء التاريخ المخصص' : 'تاريخ مخصص'}
              </button>

              {!isCustomRange ? (
                <>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Calendar size={18} className="text-slate-400" />
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      <option value="">كل الأشهر</option>
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Search size={18} className="text-slate-400" />
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold">من</span>
                    <input 
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold">إلى</span>
                    <input 
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <Users size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">تقرير الطلاب</h3>
                <p className="text-xs text-slate-500 mb-6 font-bold">إجمالي المصفى: {filteredStudents.length}</p>
                <div className="w-full space-y-2">
                  <button 
                    onClick={() => generateStudentsPDF(filteredStudents)}
                    className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors text-sm cursor-pointer"
                  >
                    <FileDown size={16} />
                    تصدير PDF
                  </button>
                  <button 
                    onClick={handleExportStudents}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs cursor-pointer"
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">التقرير المالي</h3>
                <p className="text-xs text-emerald-600 mb-6 font-bold">
                  الإيرادات: {filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString()} ₪
                </p>
                <div className="w-full space-y-2">
                  <button 
                    onClick={handleExportDetailedFinancial}
                    className="w-full bg-emerald-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors text-sm cursor-pointer"
                  >
                    <FileDown size={16} />
                    تقرير مالي تفصيلي
                  </button>
                  <button 
                    onClick={handleExportPayments}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs cursor-pointer"
                  >
                    <FileDown size={14} />
                    تصدير Excel الإيرادات
                  </button>
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <ShoppingCart size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">مبيعات المنتجات</h3>
                <p className="text-xs text-purple-600 mb-6 font-bold">
                  إجمالي المبيعات: {revenueSplit.prods.toLocaleString()} ₪
                </p>
                <div className="w-full space-y-2">
                  <button 
                    onClick={handleExportProductSales}
                    className="w-full bg-purple-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors text-sm cursor-pointer"
                  >
                    <FileDown size={16} />
                    تصدير مبيعات المنتجات
                  </button>
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
                  <Clock size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">حضور الطلاب</h3>
                <p className="text-sm text-slate-500 mb-6">سجل حضور وغياب الطلاب المصفى.</p>
                <div className="w-full space-y-2">
                  <button 
                    onClick={() => generateAttendancePDF(filteredBookings)}
                    className="w-full bg-orange-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors text-sm cursor-pointer"
                  >
                    <FileDown size={16} />
                    تصدير PDF
                  </button>
                  <button 
                    onClick={handleExportAttendance}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs cursor-pointer"
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">حضور المدربين</h3>
                <p className="text-sm text-slate-500 mb-6">تقرير مفصل بحضور وغياب المدربين.</p>
                <div className="w-full space-y-2">
                  <button 
                    onClick={handleExportCoachAttendance}
                    className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
                  >
                    <FileDown size={18} />
                    تصدير PDF
                  </button>
                  <button 
                    onClick={handleExportCoachAttendanceExcel}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs cursor-pointer"
                  >
                    <FileDown size={14} />
                    تصدير Excel
                  </button>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 dark:border-slate-800 pt-8">
            <Card title="مبيعات المنتجات الأكثر طلباً">
              <div className="space-y-4">
                {productStats.map(([name, stats], index) => (
                  <div key={name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{stats.quantity} قطعة تم بيعها</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-blue-100 dark:text-blue-400">{stats.total.toLocaleString()} ₪</p>
                    </div>
                  </div>
                ))}
                {productStats.length === 0 && (
                  <div className="py-12 text-center text-slate-400 opacity-50 italic text-sm">
                    لا يوجد بيانات مبيعات منتجات في هذه الفترة.
                  </div>
                )}
              </div>
            </Card>

            <Card title="توزيع دخل الأكاديمية">
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl">
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-600/70 mb-1">إيرادات الاشتراكات</p>
                    <p className="text-2xl font-black text-blue-900 dark:text-white">{revenueSplit.subs.toLocaleString()} ₪</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-blue-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">
                      {revenueSplit.subs + revenueSplit.prods > 0 
                      ? ((revenueSplit.subs / (revenueSplit.subs + revenueSplit.prods)) * 100).toFixed(1)
                      : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl">
                  <div className="text-right">
                    <p className="text-xs font-bold text-purple-600/70 mb-1">إيرادات المنتجات</p>
                    <p className="text-2xl font-black text-purple-900 dark:text-white">{revenueSplit.prods.toLocaleString()} ₪</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-purple-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">
                      {revenueSplit.subs + revenueSplit.prods > 0 
                      ? ((revenueSplit.prods / (revenueSplit.subs + revenueSplit.prods)) * 100).toFixed(1)
                      : 0}%
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 dark:bg-slate-950 rounded-2xl flex justify-between items-center">
                   <span className="text-xs font-bold text-slate-400">إجمالي الدخل الموحد:</span>
                   <span className="text-lg font-black text-white">{(revenueSplit.subs + revenueSplit.prods).toLocaleString()} ₪</span>
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
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-bold mb-1">الطلاب الجدد</p>
                <p className="text-2xl font-black text-blue-600">{filteredStudents.length}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-bold mb-1">إجمالي الحضور</p>
                <p className="text-2xl font-black text-orange-600">{filteredBookings.filter(b => b.status === 'حاضر').length}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-bold mb-1">الدفعات المستلمة</p>
                <p className="text-2xl font-black text-emerald-600">{filteredPayments.length}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-bold mb-1">ساعات عمل المدربين</p>
                <p className="text-2xl font-black text-indigo-600">
                  {(filteredCoachAttendance.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60).toFixed(1)} س
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: Cash Flow Forecasting */}
      {activeReportTab === 'forecasting' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-3xl border border-rose-100 dark:border-rose-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <span className="text-[10px] text-rose-500 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">تعدى فترة صلاحيته</span>
              </div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ذمم ومستحقات متأخرة (طلاب نشطين)</h4>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{forecastingData.totals.overdue.toLocaleString()} ₪</p>
              <p className="text-[10px] text-rose-500 font-semibold mt-1.5">مترتبة على طلاب نشطين مستمرين بالتدريب</p>
            </div>

            <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
                  <Clock size={20} />
                </div>
                <span className="text-[10px] text-blue-500 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">استحقاق قريب</span>
              </div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المتوقع تحصيله (الـ ٣٠ يوماً القادمة)</h4>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{forecastingData.totals.next30.toLocaleString()} ₪</p>
              <p className="text-[10px] text-blue-500 font-semibold mt-1.5">من الاشتراكات المقرر تجديدها هذا الشهر</p>
            </div>

            <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
                  <CalendarDays size={20} />
                </div>
                <span className="text-[10px] text-indigo-500 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">أفق متوسط</span>
              </div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المتوقع تحصيله (من ٣١ إلى ٦٠ يوماً)</h4>
              <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{forecastingData.totals.next60.toLocaleString()} ₪</p>
              <p className="text-[10px] text-indigo-500 font-semibold mt-1.5">موارد مالية مجدولة للاستحقاق التلقائي</p>
            </div>

            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
                  <Coins size={20} />
                </div>
                <span className="text-[10px] text-emerald-500 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">إجمالي تراكمي</span>
              </div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">التدفق المتوقع (إجمالي الـ ٩٠ يوماً)</h4>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{forecastingData.totals.next90.toLocaleString()} ₪</p>
              <p className="text-[10px] text-emerald-500 font-semibold mt-1.5">المجموع الكلي المضمون نظرياً لمستحقات النشطين</p>
            </div>
          </div>

          {/* Forecasting Visual Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">رسم بياني لتوقعات التدفقات النقدية القادمة</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastingData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${(value || 0).toLocaleString()} ₪`, 'التدفق المالي المتوقع']}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#1e293b',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={45}>
                      {forecastingData.chartData.map((entry, index) => {
                        const colors = ['#f43f5e', '#3b82f6', '#6366f1', '#10b981'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-blue-500" />
                  <span>التحليل الذكي للتدفق</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  بناءً على الطلاب النشطين المسجلين حالياً والذين يمتلكون اشتراكاً شهرياً مستمراً، يتم تتبع تواريخ التجديد وتقدير التدفق المالي كالتالي:
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>متأخرات في التجديد:</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">{forecastingData.studentList.filter(s => s.bucket === 'overdue').length} بطل</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>المستحق قريباً (30 يوم):</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">{forecastingData.studentList.filter(s => s.bucket === 'next30').length} بطل</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span>استحقاق متوسط (30-60 يوم):</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">{forecastingData.studentList.filter(s => s.bucket === 'next60').length} بطل</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  * تعتمد الحسابات على فرضية التزام الطلاب النشطين بتجديد باقاتهم المعتادة عند نهايتها.
                </p>
              </div>
            </div>
          </div>

          {/* Tables and whatsapp triggers */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">قائمة تواريخ التجديد والاتصال الوقائي للنشطين</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">يمكنك استخدام زر الاتصال السريع لإرسال تذكير فوري ورسمي لمطالبة أولياء الأمور بالتجديد المالي عبر الواتساب ببساطة.</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5">
                  <input 
                    type="text" 
                    placeholder="بحث سريع عن بطل..." 
                    value={forecastingSearch}
                    onChange={(e) => setForecastingSearch(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-xs"
                  />
                </div>
                
                <select
                  value={forecastingFilter}
                  onChange={(e: any) => setForecastingFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs px-3 py-1.5 select-none"
                >
                  <option value="all">كل الاستحقاقات</option>
                  <option value="overdue">متأخرين وبحاجة لتسوية ⚠️</option>
                  <option value="next30">خلال الـ ٣٠ يوماً القادمة 🔵</option>
                  <option value="next60">خلال الفترة المتوسطة (٣٠-٦٠ يوم) 🟣</option>
                  <option value="next90">خلال الفترة البعيدة (٦٠-٩٠ يوم) 🟢</option>
                </select>
              </div>
            </div>

            {/* Table layout */}
            <div className="overflow-x-auto">
              {(() => {
                const filteredList = forecastingData.studentList.filter(s => {
                  const matchesSearch = s.name.includes(forecastingSearch) || s.phone.includes(forecastingSearch);
                  const matchesFilter = forecastingFilter === 'all' ? true : s.bucket === forecastingFilter;
                  return matchesSearch && matchesFilter;
                });

                return (
                  <>
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold text-[11px] border-b border-slate-100 dark:border-slate-800">
                          <th className="p-4">اسم الطالب</th>
                          <th className="p-4">الاشتراك المستهدف</th>
                          <th className="p-4">تاريخ انتهاء الفاعلية</th>
                          <th className="p-4">القيمة المستحقة (₪)</th>
                          <th className="p-4">مؤشر الحالة والمهلة الزرقاء</th>
                          <th className="p-4 text-left">تذكير فوري (WhatsApp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                        {filteredList.map((s) => {
                          const today = new Date();
                          const diffTime = s.dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          let statusBadge = null;
                          if (diffDays < 0) {
                            statusBadge = (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 font-bold text-[10px]">
                                <AlertTriangle size={12} />
                                <span>متأخر منذ {Math.abs(diffDays)} يوم</span>
                              </span>
                            );
                          } else if (diffDays === 0) {
                            statusBadge = (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 font-bold text-[10px]">
                                <Clock size={12} />
                                <span>يستحق اليوم</span>
                              </span>
                            );
                          } else {
                            statusBadge = (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold text-[10px]">
                                <CheckCircle2 size={12} />
                                <span>مستحق غداً (متبقي {diffDays} يوم)</span>
                              </span>
                            );
                          }

                          // WhatsApp Template Creator
                          const reminderText = `مرحباً ولي أمر البطل الجميل ${s.name} 🌸\nنود التكرم بتذكيركم بقرب موعد تجديد الاشتراك الشهري الخاص به في الأكاديمية بقيمة *${s.fee} شيكل*.\n\nتاريخ تسوية الاشتراك: *${s.dueDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}*.\n\nنسعد باستمرار بطلنا معنا لمواصلة مسيرة التميز والإنجاز والتطور المبدع 🏊‍♂️✨`;
                          const whatsappUrl = `https://wa.me/${s.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(reminderText)}`;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="p-4">
                                <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                                <span className="text-[10px] text-slate-400">{s.phone ? `هاتف: ${s.phone}` : 'لا يوجد هاتف مسجل'}</span>
                              </td>
                              <td className="p-4 text-slate-500">{s.courseType}</td>
                              <td className="p-4 font-bold font-mono">
                                {s.dueDate.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                              </td>
                              <td className="p-4 font-black text-slate-900 dark:text-white italic">{s.fee} ₪</td>
                              <td className="p-4">{statusBadge}</td>
                              <td className="p-4 text-left">
                                {s.phone ? (
                                  <a 
                                    href={whatsappUrl}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold transition-transform hover:scale-105"
                                  >
                                    <MessageCircle size={14} />
                                    <span>إرسال إشعار تذكير</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-[10px] font-bold italic">رقم الهاتف مفقود</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredList.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-slate-400 font-bold opacity-60">
                              مذهل! لا يوجد طلاب مستحقين يطابقون هذه الفئة والبحث المختار حالياً.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Coupons and Discounts Analytics */}
      {activeReportTab === 'coupons' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-3xl border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
                  <Tag size={20} />
                </div>
                <span className="text-[10px] text-amber-600 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">كوبونات ترويجية</span>
              </div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">الخصومات بقيمة الكوبونات المركبة</h4>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{couponAnalytics.totalDiscountAmount.toLocaleString()} ₪</p>
              <p className="text-[10px] text-amber-500 font-semibold mt-1.5">أثر الكوبونات الترويجية (VIP20, WELCOME10, الخ..)</p>
            </div>

            <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
                  <Percent size={20} />
                </div>
                <span className="text-[10px] text-blue-500 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">خصومات المدد والمد والجزر</span>
              </div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">خصومات الباقات الطويلة (٣/٦/١٢ أشهر)</h4>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{couponAnalytics.totalRegularDiscounts.toLocaleString()} ₪</p>
              <p className="text-[10px] text-blue-500 font-semibold mt-1.5">متحصلات تشجيعية لمنع انقطاع المتدربين</p>
            </div>

            <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <span className="text-[10px] text-indigo-500 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">نقاط تسويقية</span>
              </div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تسييل هدايا برنامج الولاء (النقاط النقية)</h4>
              <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{couponAnalytics.pointsDiscountValue.toLocaleString()} ₪</p>
              <p className="text-[10px] text-indigo-500 font-semibold mt-1.5">مستحقات مستبدلة عن {couponAnalytics.pointsUseCount} عملية سحب نقاط</p>
            </div>

            <div className="p-10 bg-emerald-600 text-white rounded-3xl shadow-lg shadow-emerald-200 flex flex-col justify-center">
              <h4 className="text-xs font-semibold text-emerald-100 mb-1">إجمالي الفوائد والخصومات المالية الممنوحة</h4>
              <p className="text-3xl font-extrabold">{(couponAnalytics.totalDiscountAmount + couponAnalytics.totalRegularDiscounts + couponAnalytics.pointsDiscountValue).toLocaleString()} ₪</p>
              <p className="text-[10px] text-emerald-200 mt-2 font-bold">كل التشكيلات شاملة الكوبونات، حوافز الفترات، والولاء المباشر</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Box: Promos lists */}
            <Card title="استعراض الكوبونات الترويجية المتاحة كرم كرم">
              <div className="space-y-4">
                {AVAILABLE_PROMO_CODES.map((promo) => {
                  const usage = couponAnalytics.chartData.find(u => u.code === promo.code);
                  const times = usage ? usage.count : 0;
                  const totalDiscounted = usage ? usage.totalSaved : 0;

                  return (
                    <div key={promo.code} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 font-mono font-bold text-xs bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg">{promo.code}</span>
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block font-bold">قيمة الخصم</span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {promo.type === 'percent' ? `${promo.value}%` : `${promo.value} ₪`}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">{promo.label}</p>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>تم تفعيله: <strong className="text-slate-800 dark:text-slate-200 font-black">{times} مرة</strong></span>
                        <span>إجمالي التوفير للطلاب: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{totalDiscounted} ₪</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Right Box: Coupon statistics chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">توزيع توفير الكوبونات (بالشيكل ₪)</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">مخطط لتقييم أي من الكوبونات الترويجية الأكثر فعالية في جذب وجلب وتخفيض التكلفة على متدربينا.</p>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={couponAnalytics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                      <XAxis 
                        dataKey="code" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${(value || 0).toLocaleString()} ₪`, 'المبلغ الموفر للطلاب']}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#1e293b',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="totalSaved" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={35} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Table list of transactions that used coupon codes */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">جدول تفصيلي بالمعاملات المالية المخفضة (كوبونات)</h4>
              <p className="text-xs text-slate-500 mt-1">سجل بكل بطل استخدم رمزاً ترويجياً أو كوبون خصم لإدارة الحوافز بكامل الأركان.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold text-[11px] border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4">اسم الطالب</th>
                    <th className="p-4">تاريخ المعاملة</th>
                    <th className="p-4">نوع الكوبون ومواصفاته</th>
                    <th className="p-4">القيمة المالية للكوبون (₪)</th>
                    <th className="p-4">إجمالي المقبوض بعد الخصم (₪)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {couponAnalytics.couponTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{tx.studentName}</td>
                      <td className="p-4 font-mono">{new Date(tx.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 font-bold text-[10px]">
                          <Ticket size={12} />
                          <span>{tx.couponLabel} ({tx.couponCode})</span>
                        </span>
                      </td>
                      <td className="p-4 font-black text-emerald-600 font-mono">-{tx.savedAmount} ₪</td>
                      <td className="p-4 font-black text-slate-900 dark:text-white italic">{tx.finalAmount} ₪</td>
                    </tr>
                  ))}
                  {couponAnalytics.couponTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 font-bold opacity-60">
                        لا يوجد مبيعات ترويجية بكوبونات بعد في فترة التتبع هذه.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
