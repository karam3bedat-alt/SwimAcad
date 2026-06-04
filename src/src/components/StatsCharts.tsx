import React, { useMemo } from 'react';
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
import { useStudents } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { Loader2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const StatsCharts: React.FC = () => {
  const { data: students, isLoading: isLoadingStudents } = useStudents();
  const { data: payments, isLoading: isLoadingPayments } = usePayments();

  // Level Statistics
  const levelStats = useMemo(() => {
    if (!students) return [];
    const stats: Record<string, number> = {};
    students.forEach(s => {
      const level = s.level || 'غير محدد';
      stats[level] = (stats[level] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [students]);

  // Monthly Revenue
  const monthlyRevenue = useMemo(() => {
    if (!payments) return [];
    const stats: Record<string, number> = {};
    
    // Last 6 months
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return d.toLocaleDateString('ar-EG', { month: 'long' });
    }).reverse();

    payments.forEach(p => {
      if (!p.date) return;
      const date = new Date(p.date);
      const monthName = date.toLocaleDateString('ar-EG', { month: 'long' });
      if (months.includes(monthName)) {
        stats[monthName] = (stats[monthName] || 0) + (Number(p.amount) || 0);
      }
    });

    return months.map(month => ({
      month,
      amount: stats[month] || 0
    }));
  }, [payments]);

  if (isLoadingStudents || isLoadingPayments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      {/* Level Distribution Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">توزيع الطلاب حسب المستوى</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={levelStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {levelStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  color: 'var(--tooltip-color, #000)'
                }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">الإيرادات الشهرية (آخر 6 أشهر)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
              />
              <Tooltip 
                formatter={(value: number) => [`${(value || 0).toLocaleString()} ₪`, 'الإيرادات']}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  color: 'var(--tooltip-color, #000)'
                }}
                labelStyle={{ fontFamily: 'Cairo', fontWeight: 'bold' }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsCharts;
