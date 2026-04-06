import React, { useEffect, useState } from 'react';
import { FileDown, BarChart3, Users, CreditCard, Clock } from 'lucide-react';
import { apiFetch, exportToExcel } from '../lib/utils';
import { Card } from '../components/Card';

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    apiFetch('getStudents').then(setStudents);
    apiFetch('getPayments').then(setPayments);
    apiFetch('getBookings').then(setBookings);
  }, []);

  const handleExportStudents = () => {
    exportToExcel(students, 'تقرير_الطلاب');
  };

  const handleExportPayments = () => {
    exportToExcel(payments, 'تقرير_المدفوعات');
  };

  const handleExportAttendance = () => {
    exportToExcel(bookings, 'تقرير_الحضور');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">التقارير والإحصائيات</h2>
        <p className="text-slate-500">استخراج البيانات وتحليل أداء الأكاديمية.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">تقرير الطلاب</h3>
            <p className="text-sm text-slate-500 mb-6">قائمة كاملة بجميع الطلاب المسجلين وبياناتهم.</p>
            <button 
              onClick={handleExportStudents}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <FileDown size={18} />
              تصدير Excel
            </button>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">تقرير الإيرادات</h3>
            <p className="text-sm text-slate-500 mb-6">سجل المدفوعات والتحصيلات المالية الشهرية.</p>
            <button 
              onClick={handleExportPayments}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <FileDown size={18} />
              تصدير Excel
            </button>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <Clock size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">تقرير الحضور</h3>
            <p className="text-sm text-slate-500 mb-6">سجل حضور وغياب الطلاب في جميع الحصص.</p>
            <button 
              onClick={handleExportAttendance}
              className="w-full bg-orange-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors"
            >
              <FileDown size={18} />
              تصدير Excel
            </button>
          </div>
        </Card>
      </div>

      <Card title="ملخص الأداء السنوي">
        <div className="flex items-center justify-center h-64 text-slate-400 italic">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
            <p>الرسوم البيانية التفصيلية ستظهر هنا عند توفر بيانات كافية.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
