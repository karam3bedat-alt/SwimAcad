import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useToast } from '../lib/ToastContext';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const { showToast, hideToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const toastId = showToast(isLogin ? 'جاري تسجيل الدخول...' : 'جاري إنشاء الحساب...', 'loading');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('تم تسجيل الدخول بنجاح', 'success');
      } else {
        if (password.length < 6) {
          throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        }
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('تم إنشاء الحساب بنجاح', 'success');
      }
      hideToast(toastId);
    } catch (err: any) {
      hideToast(toastId);
      let errorMessage = 'حدث خطأ ما';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'هذا البريد الإلكتروني مستخدم بالفعل';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'البريد الإلكتروني غير صالح';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'كلمة المرور ضعيفة جداً';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-200 mb-4">
            {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-slate-500">
            {isLogin ? 'أهلاً بك مجدداً في أكاديمية السباحة' : 'انضم إلينا كمدرب في الأكاديمية'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">البريد الإلكتروني</label>
            <input 
              name="email" 
              type="email" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="example@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">كلمة المرور</label>
            <input 
              name="password" 
              type="password" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'دخول' : 'إنشاء حساب')}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
          </button>
        </div>
      </div>
    </div>
  );
}
