import React from 'react';
import { Bell, Search, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../context/ThemeContext';

import { NotificationCenter } from './NotificationCenter';

export function Navbar() {
  const { user, role } = useAuth();
  const { isDark, toggleDark } = useTheme();

  return (
    <header className="hidden lg:flex h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 items-center justify-between sticky top-0 z-10 transition-colors">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث عن طالب، مدرب..." 
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-200"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button 
          onClick={toggleDark}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-yellow-400 transition-colors"
          title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <NotificationCenter />
        
        <div className="flex items-center gap-3 border-r pr-6 border-slate-200 dark:border-slate-800">
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{role === 'admin' ? 'المدير العام' : 'مدرب'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
