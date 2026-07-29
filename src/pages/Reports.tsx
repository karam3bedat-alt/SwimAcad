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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
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

  // Dynamic Forecasting Simulation States
  const [forecastScenario, setForecastScenario] = useState<'realistic' | 'optimistic' | 'pessimistic' | 'custom'>('realistic');
  const [churnRate, setChurnRate] = useState(5);
  const [growthRate, setGrowthRate] = useState(10);
  const [recoveryRate, setRecoveryRate] = useState(80);
  const [priceChange, setPriceChange] = useState(0);

  // Auto-update parameters when scenario changes
  const handleScenarioChange = (scenario: 'realistic' | 'optimistic' | 'pessimistic' | 'custom') => {
    setForecastScenario(scenario);
    if (scenario === 'realistic') {
      setChurnRate(5);
      setGrowthRate(10);
      setRecoveryRate(80);
      setPriceChange(0);
    } else if (scenario === 'optimistic') {
      setChurnRate(2);
      setGrowthRate(20);
      setRecoveryRate(95);
      setPriceChange(5);
    } else if (scenario === 'pessimistic') {
      setChurnRate(12);
      setGrowthRate(2);
      setRecoveryRate(50);
      setPriceChange(-5);
    }
  };

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

  // Average monthly product sales estimation from actual transactions
  const avgMonthlyProductSales = useMemo(() => {
    if (transactions.length === 0) return 1500;
    const dates = transactions.map(t => new Date(t.date).getTime());
    if (dates.length === 0) return 1500;
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const diffMonths = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24 * 30.4)));
    const totalProductRev = transactions.reduce((sum: number, tx: any) => {
      const prodSum = (tx.items || []).filter((i: any) => i.type === 'product').reduce((s: number, i: any) => s + (i.total || 0), 0);
      return sum + prodSum;
    }, 0);
    return Math.round(totalProductRev / diffMonths) || 1500;
  }, [transactions]);

  // Advanced financial indicators and forecasting
  const advancedFinancials = useMemo(() => {
    const activeStudentsList = students.filter(s => s.status === 'نشط');
    
    // MRR (Monthly Recurring Revenue)
    const mrr = activeStudentsList.reduce((sum, s) => {
      const fee = s.custom_fee || (s.course_type ? currentPrices[s.course_type] : null) || 600;
      return sum + (Number(fee) || 600);
    }, 0);

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // ARPU (Average Revenue Per User)
    const arpu = activeStudentsList.length > 0 ? Math.round(mrr / activeStudentsList.length) : 0;

    // Student Lifetime Value (LTV) estimation (assuming average retention of 8 months based on current active trends)
    const estimatedRetentionMonths = 8;
    const ltv = arpu * estimatedRetentionMonths;

    // Churn rate from historical data: percentage of inactive students out of total historical students
    const totalStudents = students.length;
    const inactiveCount = students.filter(s => s.status === 'غير نشط').length;
    const historicalChurnRate = totalStudents > 0 ? Math.round((inactiveCount / totalStudents) * 100) : 0;

    // Build the 6-month predictive forecast
    const overdueAmount = forecastingData.totals.overdue;
    const forecast: Array<{
      monthName: string;
      mrr: number;
      newSignupRevenue: number;
      churnLoss: number;
      overdueRecovery: number;
      productSales: number;
      totalProjected: number;
      cumulativeIncome: number;
    }> = [];

    let currentMRR = mrr;
    let cumulative = 0;

    const nextMonths = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() + idx);
      return d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    });

    nextMonths.forEach((monthName, idx) => {
      // growth gain in terms of revenue
      const newSignupRevenue = Math.round(currentMRR * (growthRate / 100) * (1 + priceChange / 100));
      // churn loss in terms of revenue
      const churnLoss = Math.round(currentMRR * (churnRate / 100));
      // Overdue is recovered in the first month based on the recovery rate
      const overdueRecovery = idx === 0 ? Math.round(overdueAmount * (recoveryRate / 100)) : 0;
      // Product sales
      const productSales = avgMonthlyProductSales;

      // Project MRR for the next month
      const projectedMRR = currentMRR + newSignupRevenue - churnLoss;
      const totalProjected = projectedMRR + overdueRecovery + productSales;
      cumulative += totalProjected;

      forecast.push({
        monthName,
        mrr: Math.round(currentMRR),
        newSignupRevenue,
        churnLoss,
        overdueRecovery,
        productSales,
        totalProjected,
        cumulativeIncome: cumulative
      });

      currentMRR = projectedMRR;
    });

    return {
      mrr,
      arr,
      arpu,
      ltv,
      historicalChurnRate,
      forecast
    };
  }, [students, currentPrices, growthRate, churnRate, recoveryRate, priceChange, forecastingData.totals.overdue, avgMonthlyProductSales]);

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
    
    // Filter students: keep those who either registered in the selected range, OR have at least one payment in the selected range
    const relevantStudents = students.filter(student => {
      const hasPayment = filteredPayments.some(p => p.student_id === student.id);
      
      let registeredInPeriod = false;
      if (student.registration_date) {
        const date = new Date(student.registration_date);
        if (isCustomRange && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          registeredInPeriod = date >= start && date <= end;
        } else {
          const monthMatch = selectedMonth ? (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth : true;
          const yearMatch = selectedYear ? date.getFullYear().toString() === selectedYear : true;
          registeredInPeriod = monthMatch && yearMatch;
        }
      }
      
      return hasPayment || (registeredInPeriod && student.status !== 'غير نشط');
    });
    
    generateDetailedFinancialReport(filteredPayments, relevantStudents, reportMonth);
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
      'الحالة': s.status || 'غير نشط'
    }));
    exportToExcel(data, 'تقرير_الطلاب_المفصل');
  };

  const handleExportPayments = () => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || 'كل الأشهر';
    let reportMonth = selectedMonth ? `${monthLabel} ${selectedYear}` : 'تقرير عام';
    
    if (isCustomRange && customStartDate && customEndDate) {
      reportMonth = `من ${customStartDate} إلى ${customEndDate}`;
    }
    
    // Filter students: keep those who either registered in the selected range, OR have at least one payment in the selected range
    const relevantStudents = students.filter(student => {
      const hasPayment = filteredPayments.some(p => p.student_id === student.id);
      
      let registeredInPeriod = false;
      if (student.registration_date) {
        const date = new Date(student.registration_date);
        if (isCustomRange && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          registeredInPeriod = date >= start && date <= end;
        } else {
          const monthMatch = selectedMonth ? (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth : true;
          const yearMatch = selectedYear ? date.getFullYear().toString() === selectedYear : true;
          registeredInPeriod = monthMatch && yearMatch;
        }
      }
      
      return hasPayment || (registeredInPeriod && student.status !== 'غير نشط');
    });
    
    // Group payments by student to provide a detailed summary per student as requested
    const reportData = relevantStudents.map(student => {
      // Ignore product payments from monthly subscription payment figures
      const studentPayments = filteredPayments.filter(p => p.student_id === student.id && p.course_type !== 'منتجات');
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
        'حالة الطالب': student.status || 'غير نشط'
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

          {/* Section: Advanced Dynamic Forecasting Simulator */}
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-blue-600 animate-pulse" size={20} />
                  <span>محاكي نمذجة الأرباح والتنبؤ التفاعلي</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  قم باختيار أحد السيناريوهات المالية الجاهزة أو عدل المتغيرات يدوياً لدراسة توقعات الدخل والأرباح الصافية للأكاديمية على مدار الـ 6 أشهر القادمة.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'realistic', name: 'السيناريو الواقعي' },
                  { id: 'optimistic', name: 'السيناريو المتفائل 🚀' },
                  { id: 'pessimistic', name: 'السيناريو المتحفظ ⚠️' },
                  { id: 'custom', name: 'سيناريو مخصص 🛠️' }
                ].map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleScenarioChange(sc.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      forecastScenario === sc.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none font-extrabold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Dynamic Sliders */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-5">
                <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">ضبط المتغيرات الافتراضية</h4>
                
                <div className="space-y-4">
                  {/* Slider 1: Growth Rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">معدل نمو المشتركين الجدد شهرياً:</span>
                      <span className="font-mono font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">+{growthRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={growthRate}
                      disabled={forecastScenario !== 'custom'}
                      onChange={(e) => setGrowthRate(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>ثبات (0%)</span>
                      <span>نمو قوي (50%)</span>
                    </div>
                  </div>

                  {/* Slider 2: Churn Rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">معدل انسحاب/تسرب الطلاب شهرياً (Churn):</span>
                      <span className={`font-mono font-black px-2 py-0.5 rounded-md ${churnRate > 8 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'}`}>{churnRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={churnRate}
                      disabled={forecastScenario !== 'custom'}
                      onChange={(e) => setChurnRate(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>رائع (0%)</span>
                      <span>مرتفع جداً (30%)</span>
                    </div>
                  </div>

                  {/* Slider 3: Recovery Rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">معدل تحصيل المتأخرات والذمم (الشهر الأول):</span>
                      <span className="font-mono font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">{recoveryRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={recoveryRate}
                      disabled={forecastScenario !== 'custom'}
                      onChange={(e) => setRecoveryRate(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>شطب الديون (0%)</span>
                      <span>تحصيل كامل (100%)</span>
                    </div>
                  </div>

                  {/* Slider 4: Price adjustment */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">تعديل متوسط قيمة الاشتراك (الأسعار):</span>
                      <span className={`font-mono font-black px-2 py-0.5 rounded-md ${priceChange >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>{priceChange >= 0 ? `+${priceChange}` : priceChange}%</span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="50"
                      step="5"
                      value={priceChange}
                      disabled={forecastScenario !== 'custom'}
                      onChange={(e) => setPriceChange(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>خصم 20%-</span>
                      <span>زيادة 50%+</span>
                    </div>
                  </div>
                </div>

                {forecastScenario !== 'custom' && (
                  <p className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-2 rounded-lg text-center font-bold">
                    * قم باختيار "سيناريو مخصص 🛠️" بالأعلى للتحكم الكامل في المتغيرات بحرية تامة.
                  </p>
                )}
              </div>

              {/* Advanced Indicators (SaaS-like financial index) */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">مؤشرات الصحة والأداء المالي للأكاديمية</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-bold">الإيراد المتكرر الشهري (MRR)</p>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-1">{advancedFinancials.mrr.toLocaleString()} ₪</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-bold">الإيراد السنوي المتوقع (ARR)</p>
                      <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-1">{advancedFinancials.arr.toLocaleString()} ₪</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-bold">متوسط دخل البطل (ARPU)</p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">{advancedFinancials.arpu.toLocaleString()} ₪/شهرياً</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-bold">القيمة الحياتية للبطل (LTV)</p>
                      <p className="text-base font-black text-purple-600 dark:text-purple-400 mt-1">{advancedFinancials.ltv.toLocaleString()} ₪</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                    <span className="text-slate-400 block font-bold">معدل الانسحاب التاريخي:</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-300 text-xs mt-0.5 block">{advancedFinancials.historicalChurnRate}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">مبيعات منتجات تقديرية:</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-300 text-xs mt-0.5 block">{avgMonthlyProductSales.toLocaleString()} ₪/شهرياً</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Charts: Projection area chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-950 dark:text-white">منحنى الدخل الإجمالي المخطط (6 أشهر)</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">يوضح المخطط الدخل المتوقع لكل شهر مضافاً له تحصيل المتأخرات ومبيعات المنتجات مقابل الدخل التراكمي المجمع.</p>
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />الدخل الشهري المتوقع</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />الدخل التراكمي المجمع</span>
                  </div>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={advancedFinancials.forecast}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                      <XAxis 
                        dataKey="monthName" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10 }} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${(value || 0).toLocaleString()} ₪`]}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#1e293b',
                          color: '#fff'
                        }}
                      />
                      <Area type="monotone" dataKey="totalProjected" name="الدخل المالي الإجمالي المتوقع" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="cumulativeIncome" name="الدخل التراكمي المجمع" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Strategic Advisor Box */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">المرشد المالي ومستشار الأكاديمية الذكي</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    تحليل فوري لقوة النموذج المالي بناءً على المدخلات المحددة للسيناريو الحالي:
                  </p>

                  <div className="space-y-3.5">
                    {/* Churn check */}
                    <div className="flex gap-3 text-xs leading-relaxed">
                      <span className="text-lg shrink-0">
                        {churnRate <= 4 ? '🌸' : (churnRate <= 8 ? '💡' : '⚠️')}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-white">إدارة الاحتفاظ بالطلاب (Retention)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {churnRate <= 4 
                            ? 'معدل تسرب ممتاز ومستقر للغاية! الطلاب يحبون الأكاديمية ويجدون فائدة مستمرة.' 
                            : (churnRate <= 8 
                              ? 'معدل تسرب طبيعي ومقبول. يوصى بتقديم استبيان رضا شهري دوري للأهالي.' 
                              : 'معدل تسرب مقلق! تذكر أن الحفاظ على بطل حالي يكلّف 5 مرات أقل من جلب بطل جديد.')}
                        </p>
                      </div>
                    </div>

                    {/* Growth check */}
                    <div className="flex gap-3 text-xs leading-relaxed">
                      <span className="text-lg shrink-0">
                        {growthRate >= 15 ? '🚀' : (growthRate >= 7 ? '📈' : '🛑')}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-white">خطط استقطاب الأبطال (Growth)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {growthRate >= 15 
                            ? 'نمو صاروخي وتوسع رائع! خطط للتوسع التشغيلي وتجهيز كادر مساعد فوراً تفادياً لتكدس التدريب.' 
                            : (growthRate >= 7 
                              ? 'معدل نمو صحي ومستدام. الأكاديمية تكتسب سمعة جيدة تدريجياً في المنطقة.' 
                              : 'النمو متواضع وبحاجة لتنشيط. يوصى بعمل إعلانات ممولة محلية أو إطلاق مسابقة إحالة للأصدقاء.')}
                        </p>
                      </div>
                    </div>

                    {/* Debt check */}
                    <div className="flex gap-3 text-xs leading-relaxed">
                      <span className="text-lg shrink-0">
                        {recoveryRate >= 80 ? '💵' : '💡'}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-white">كفاءة تحصيل المديونيات</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {recoveryRate >= 80 
                            ? 'معدل تحصيل رائع. استمر في استخدام تذكيرات الواتساب لضمان التجديد في الموعد.' 
                            : 'كفاءة تحصيل ديون متدنية. فكر بتقديم تسييل مريح (مثل خصم بسيط لمن يدفع الاشتراك السنوي أو الربعي سلفاً).'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 text-[10px] text-slate-400 italic">
                  * تعتمد النصائح على أفضل ممارسات إدارة وتطوير الأكاديميات الرياضية ومراكز التدريب التنافسية للأطفال.
                </div>
              </div>
            </div>

            {/* New: Detailed forecasting table breakdown by month */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">الجدول المجدول للأرقام المتوقعة شهرياً</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">استعراض دقيق لمصادر وتفاصيل الدخل الشهري التقديري الناتج عن محاكاة النموذج الحالي.</p>
              </div>
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-850">
                      <th className="p-3">الفترة الزمنية</th>
                      <th className="p-3">رأس المال المشترك المستفتح (MRR)</th>
                      <th className="p-3 text-emerald-600">المشتركين الجدد (+)</th>
                      <th className="p-3 text-rose-500">انسحابات متوقعة (-)</th>
                      <th className="p-3 text-indigo-500">متحصلات الذمم (+)</th>
                      <th className="p-3 text-purple-500">مبيعات المنتجات التقديرية (+)</th>
                      <th className="p-3 font-extrabold text-slate-900 dark:text-white">الدخل الإجمالي المتوقع</th>
                      <th className="p-3 font-extrabold text-slate-900 dark:text-white">التدفق التراكمي الكلي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium text-slate-600 dark:text-slate-300">
                    {advancedFinancials.forecast.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white">{f.monthName}</td>
                        <td className="p-3 font-mono">{f.mrr.toLocaleString()} ₪</td>
                        <td className="p-3 font-mono text-emerald-600 font-bold">+{f.newSignupRevenue.toLocaleString()} ₪</td>
                        <td className="p-3 font-mono text-rose-500 font-bold">-{f.churnLoss.toLocaleString()} ₪</td>
                        <td className="p-3 font-mono text-indigo-500">{f.overdueRecovery > 0 ? `+${f.overdueRecovery.toLocaleString()} ₪` : '-'}</td>
                        <td className="p-3 font-mono text-purple-500">+{f.productSales.toLocaleString()} ₪</td>
                        <td className="p-3 font-mono font-black text-blue-600 dark:text-blue-400">{f.totalProjected.toLocaleString()} ₪</td>
                        <td className="p-3 font-mono font-black text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-900/10">{f.cumulativeIncome.toLocaleString()} ₪</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
