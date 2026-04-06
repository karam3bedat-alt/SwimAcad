import React from 'react';
import { cn } from '../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ children, className, title, subtitle }: CardProps) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-slate-100">
          {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isUp: boolean;
  };
  color: 'blue' | 'green' | 'orange' | 'purple';
}

export function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
          {trend && (
            <p className={cn(
              "text-xs font-medium mt-2 flex items-center gap-1",
              trend.isUp ? "text-emerald-600" : "text-rose-600"
            )}>
              <span>{trend.isUp ? '↑' : '↓'}</span>
              {trend.value}
              <span className="text-slate-400 font-normal">مقارنة بالشهر الماضي</span>
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colors[color])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
