import React, { useEffect, useState } from 'react';
import { StatCard } from '../components/Card';
import { Users, Calendar, CreditCard, Clock, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

const chartData = [
  { name: 'يناير', revenue: 4000, attendance: 80 },
  { name: 'فبراير', revenue: 3000, attendance: 75 },
  { name: 'مارس', revenue: 2000, attendance: 90 },
  { name: 'أبريل', revenue: 2780, attendance: 85 },
  { name: 'مايو', revenue: 1890, attendance: 70 },
  { name: 'يونيو', revenue: 2390, attendance: 95 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTrainers: 0,
    totalPayments: 0,
    todaySessions: 0,
    attendanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [students, trainers, payments, sessions, bookings] = await Promise.all([
          apiFetch('getStudents'),
          apiFetch('getTrainers'),
          apiFetch('getPayments'),
          apiFetch('getSessions'),
          apiFetch('getBookings')
        ]);

        const totalRevenue = Array.isArray(payments) ? payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0;
        const attended = Array.isArray(bookings) ? bookings.filter(b => b.status === 'حضر').length : 0;
        const totalBookings = Array.isArray(bookings) ? bookings.length : 0;

        setStats({
          totalStudents: Array.isArray(students) ? students.length : 0,
          totalTrainers: Array.isArray(trainers) ? trainers.length : 0,
          totalPayments: totalRevenue,
          todaySessions: Array.isArray(sessions) ? sessions.length : 0,
          attendanceRate: totalBookings > 0 ? Math.round((attended / totalBookings) * 100) : 0
        });
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء جلب البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-4 text-red-700">
        <AlertCircle size={24} />
        <p className="font-bold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">لوحة التحكم</h2>
          <p className="text-slate-500">مرحباً بك مجدداً، إليك نظرة سريعة على أداء الأكاديمية.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2">
          <Calendar size={16} />
          {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إجمالي الطلاب" 
          value={stats.totalStudents} 
          icon={<Users size={24} />} 
          trend={{ value: '12%', isUp: true }}
          color="blue"
        />
        <StatCard 
          title="إجمالي المدربين" 
          value={stats.totalTrainers} 
          icon={<Clock size={24} />} 
          trend={{ value: '5%', isUp: true }}
          color="orange"
        />
        <StatCard 
          title="الإيرادات الكلية" 
          value={`${stats.totalPayments} ر.س`} 
          icon={<CreditCard size={24} />} 
          trend={{ value: '8%', isUp: true }}
          color="green"
        />
        <StatCard 
          title="نسبة الحضور" 
          value={`${stats.attendanceRate}%`} 
          icon={<TrendingUp size={24} />} 
          trend={{ value: '3%', isUp: true }}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">الإيرادات الشهرية</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">معدل الحضور</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="attendance" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
