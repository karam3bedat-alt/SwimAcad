import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserRound, 
  CalendarDays, 
  BookOpenCheck, 
  CreditCard, 
  BarChart3,
  Waves,
  ClipboardCheck,
  LogOut
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../AuthContext';
import { useToast } from '../lib/ToastContext';

const menuItems = [
  { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard, roles: ['admin', 'coach'] },
  { name: 'إدارة الطلاب', path: '/students', icon: Users, roles: ['admin'] },
  { name: 'المدربون', path: '/coaches', icon: UserRound, roles: ['admin'] },
  { name: 'جدولة الحصص', path: '/sessions', icon: CalendarDays, roles: ['admin'] },
  { name: 'الحجوزات', path: '/bookings', icon: BookOpenCheck, roles: ['admin', 'coach'] },
  { name: 'الحضور والغياب', path: '/attendance', icon: ClipboardCheck, roles: ['admin', 'coach'] },
  { name: 'المدفوعات', path: '/payments', icon: CreditCard, roles: ['admin'] },
  { name: 'التقارير', path: '/reports', icon: BarChart3, roles: ['admin'] },
];

export function Sidebar() {
  const { role, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('تم تسجيل الخروج بنجاح', 'success');
      navigate('/login');
    } catch (err: any) {
      showToast('فشل تسجيل الخروج', 'error');
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(role || '') || role === 'admin'
  );

  return (
    <aside className="w-64 bg-white border-l border-slate-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <Waves size={24} />
        </div>
        <h1 className="text-xl font-bold text-blue-900">أكاديمية السباحة</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-blue-50 text-blue-700 font-semibold' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}
            `}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-100 space-y-4">
        {user && (
          <div className="px-4 py-2">
            <p className="text-xs text-slate-400 font-bold mb-1">المستخدم الحالي:</p>
            <p className="text-sm text-slate-700 font-bold truncate">{user.email}</p>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{role === 'admin' ? 'مدير النظام' : 'مدرب'}</p>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-rose-600 hover:bg-rose-50 transition-all duration-200 font-bold"
        >
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
        <div className="p-4 bg-blue-600 rounded-xl text-white text-sm">
          <p className="font-semibold">نظام الإدارة v1.0</p>
          <p className="opacity-80">تم التطوير بكل حب</p>
        </div>
      </div>
    </aside>
  );
}
