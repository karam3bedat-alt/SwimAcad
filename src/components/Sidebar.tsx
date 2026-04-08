import React, { useState } from 'react';
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
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Search,
  Bell
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../AuthContext';
import { useToast } from '../lib/ToastContext';
import { useTheme } from '../context/ThemeContext';

const menuItems = [
  { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard, roles: ['admin', 'coach'] },
  { name: 'إدارة الطلاب', path: '/students', icon: Users, roles: ['admin', 'coach'] },
  { name: 'المدربون', path: '/coaches', icon: UserRound, roles: ['admin'] },
  { name: 'جدولة الحصص', path: '/sessions', icon: CalendarDays, roles: ['admin'] },
  { name: 'الحجوزات', path: '/bookings', icon: BookOpenCheck, roles: ['admin', 'coach'] },
  { name: 'الحضور والغياب', path: '/attendance', icon: ClipboardCheck, roles: ['admin', 'coach'] },
  { name: 'المدفوعات', path: '/payments', icon: CreditCard, roles: ['admin'] },
  { name: 'الإشعارات', path: '/notifications', icon: Bell, roles: ['admin'] },
  { name: 'التقارير', path: '/reports', icon: BarChart3, roles: ['admin'] },
];

export function Sidebar() {
  const { role, user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { isDark, toggleDark } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-lg transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Waves size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900 dark:text-blue-400">🏊 SwimAcad</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">نظام إدارة الأكاديمية</p>
            </div>
          </div>
          <button 
            onClick={toggleDark}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-yellow-400 transition-colors lg:hidden"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="relative w-full mb-4 lg:hidden">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث سريع..." 
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-200"
          />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-100 dark:shadow-none' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'}
            `}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        {user && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.displayName || user.email?.split('@')[0]}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{role === 'admin' ? 'مدير النظام' : 'مدرب'}</p>
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200 font-bold"
        >
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-40 transition-colors">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Waves className="text-blue-600" size={24} />
          <span className="font-bold text-blue-900 dark:text-blue-400">SwimAcad</span>
        </div>
        <button 
          onClick={toggleDark}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-yellow-400 transition-colors"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-64 animate-in slide-in-from-right duration-300">
            <SidebarContent />
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute left-4 top-4 p-2 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
