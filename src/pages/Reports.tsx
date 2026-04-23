import React, { useState } from 'react';
import { FileDown, BarChart3, Users, CreditCard, Clock, Calendar, Search } from 'lucide-react';
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
    generateDetailedFinancialReport(filteredPayments, students);
  };

  const handleExportCoachAttendance = () => {
    generateCoachAttendancePDF(filteredCoachAttendance);
  };

  const handleExportStudents = () => {
    exportToExcel(filteredStudents, 'تقرير_الطلاب_المصفى');
  };

  const handleExportPayments = () => {
    exportToExcel(filteredPayments, 'تقرير_المدفوعات_المصفى');
  };

  const handleExportAttendance = () => {
    exportToExcel(filteredBookings, 'تقرير_الحضور_المصفى');
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
            <button 
              onClick={handleExportCoachAttendance}
              className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors text-sm"
            >
              <FileDown size={18} />
              تصدير تقرير الحضور (PDF)
            </button>
          </div>
        </Card>
      </div>

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
