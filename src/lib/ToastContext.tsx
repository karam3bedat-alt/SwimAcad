import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { cn } from './utils';

type ToastType = 'success' | 'error' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => string;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    if (type !== 'loading') {
      setTimeout(() => {
        hideToast(id);
      }, 4000);
    }
    
    return id;
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border min-w-[300px] animate-in slide-in-from-left-full duration-300",
              toast.type === 'success' && "bg-emerald-50 border-emerald-100 text-emerald-800",
              toast.type === 'error' && "bg-rose-50 border-rose-100 text-rose-800",
              toast.type === 'loading' && "bg-blue-50 border-blue-100 text-blue-800"
            )}
          >
            {toast.type === 'success' && <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />}
            {toast.type === 'error' && <AlertCircle className="text-rose-500 shrink-0" size={20} />}
            {toast.type === 'loading' && <Loader2 className="text-blue-500 animate-spin shrink-0" size={20} />}
            
            <p className="text-sm font-bold flex-1">{toast.message}</p>
            
            <button 
              onClick={() => hideToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
