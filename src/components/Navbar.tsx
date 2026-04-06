import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useAuth } from '../AuthContext';

export function Navbar() {
  const { user, role } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث عن طالب، مدرب..." 
            className="w-full bg-slate-50 border-none rounded-lg py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button className="relative text-slate-500 hover:text-blue-600 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 border-r pr-6 border-slate-200">
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">{role === 'admin' ? 'المدير العام' : 'مدرب'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
