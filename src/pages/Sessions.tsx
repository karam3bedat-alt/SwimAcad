import React, { useState } from 'react';
import { Plus, Clock, Users as UsersIcon, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { Session } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../lib/ToastContext';
import { useSessions, useDeleteSession, useAddSession } from '../hooks/useSessions';
import { useStudents } from '../hooks/useStudents';
import { useTrainers } from '../hooks/useTrainers';
import { useAddBooking } from '../hooks/useBookings';
import { useAuth } from '../AuthContext';

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function Sessions() {
  const { showToast, hideToast } = useToast();
  const { data: sessions = [], isLoading: isLoadingSessions, error: sessionsError } = useSessions();
  const { data: students = [], isLoading: isLoadingStudents } = useStudents();
  
  const { data: trainers = [] } = useTrainers();
  const { isAdmin } = useAuth();
  
  const deleteSessionMutation = useDeleteSession();
  const addSessionMutation = useAddSession();
  const addBookingMutation = useAddBooking();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const handleSessionDelete = async () => {
    if (!selectedSession) return;
    
    const toastId = showToast('جاري حذف الحصة...', 'loading');
    try {
      await deleteSessionMutation.mutateAsync(selectedSession.id);
      hideToast(toastId);
      showToast('تم حذف الحصة بنجاح', 'success');
      setIsDeleteModalOpen(false);
      setSelectedSession(null);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل حذف الحصة', 'error');
    }
  };

  const handleBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSession) return;

    const formData = new FormData(e.currentTarget);
    const studentId = formData.get('student_id') as string;
    const student = students?.find(s => s.id === studentId);

    const toastId = showToast('جاري تنفيذ الحجز...', 'loading');
    try {
      await addBookingMutation.mutateAsync({
        student_id: studentId,
        student_name: student?.full_name || '',
        session_id: selectedSession.id,
        session_day: selectedSession.day,
        session_time: `${selectedSession.start_time} - ${selectedSession.end_time}`,
        coach_name: selectedSession.coach_name || selectedSession.trainer_name || '',
        date: new Date().toISOString().split('T')[0], // Default to today
        status: 'محجوز'
      });
      hideToast(toastId);
      showToast('تم الحجز بنجاح', 'success');
      setIsModalOpen(false);
      setSelectedSession(null);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل الحجز', 'error');
    }
  };

  const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const coachName = formData.get('coach_name') as string;
    const coach = trainers.find(t => t.name === coachName);
    
    const toastId = showToast('جاري إضافة الحصة...', 'loading');
    try {
      await addSessionMutation.mutateAsync({
        day: formData.get('day') as any,
        start_time: formData.get('start_time') as string,
        end_time: formData.get('end_time') as string,
        coach_id: coach?.id || '',
        coach_name: coachName,
        max_capacity: Number(formData.get('max_capacity')),
        required_level: formData.get('required_level') as string,
      });
      hideToast(toastId);
      showToast('تمت إضافة الحصة بنجاح', 'success');
      setIsAddModalOpen(false);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل إضافة الحصة', 'error');
    }
  };

  const isLoading = isLoadingSessions || isLoadingStudents;

  if (isLoading && (!sessions || sessions.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">جاري تحميل الجدول...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">جدولة الحصص</h2>
          <p className="text-slate-500">تنظيم الجدول الأسبوعي وحجز الطلاب في الحصص.</p>
        </div>
        {isAdmin() && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            <Plus size={20} />
            إضافة حصة جديدة
          </button>
        )}
      </div>

      {sessionsError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{(sessionsError as any).message || 'فشل تحميل الحصص'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS.map((day) => (
          <div key={day} className="space-y-4">
            <div className="bg-blue-600 text-white p-3 rounded-xl text-center font-bold shadow-sm">
              {day}
            </div>
            <div className="space-y-3">
              {(sessions || []).filter(s => s.day === day).map((session) => (
                <div key={session.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">
                      {session.required_level}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setSelectedSession(session); setIsModalOpen(true); }}
                        className="text-blue-600 hover:text-blue-700 text-xs font-bold"
                      >
                        حجز
                      </button>
                      <button 
                        onClick={() => { setSelectedSession(session); setIsDeleteModalOpen(true); }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="حذف الحصة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{session.coach_name || session.trainer_name}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Clock size={12} />
                      <span>{session.start_time} - {session.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <UsersIcon size={12} />
                      <span>السعة: {session.max_capacity}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(sessions || []).filter(s => s.day === day).length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center text-slate-300 text-xs italic text-center px-2">
                  لا يوجد حصص مبرمجة
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="إضافة حصة جديدة"
      >
        <form onSubmit={handleAddSession} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">اليوم</label>
              <select 
                name="day" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المستوى المطلوب</label>
              <select 
                name="required_level" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="مبتدئ">مبتدئ</option>
                <option value="متوسط">متوسط</option>
                <option value="متقدم">متقدم</option>
                <option value="فريق ناشئين">فريق ناشئين</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">وقت البدء</label>
              <input 
                type="time" 
                name="start_time" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">وقت الانتهاء</label>
              <input 
                type="time" 
                name="end_time" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المدرب</label>
              <select 
                name="coach_name" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">اختر المدرب</option>
                {trainers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">السعة القصوى</label>
              <input 
                type="number" 
                name="max_capacity" 
                min="1" 
                defaultValue="10"
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit"
              disabled={addSessionMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {addSessionMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'إضافة الحصة'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`حجز طالب في حصة ${selectedSession?.day}`}
      >
        <form onSubmit={handleBooking} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">اختر الطالب</label>
            <select 
              name="student_id" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الطالب</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-xl space-y-2">
            <p className="text-sm text-blue-800 font-bold">تفاصيل الحصة:</p>
            <p className="text-xs text-blue-600">اليوم: {selectedSession?.day}</p>
            <p className="text-xs text-blue-600">الوقت: {selectedSession?.start_time} - {selectedSession?.end_time}</p>
            <p className="text-xs text-blue-600">المدرب: {selectedSession?.coach_name || selectedSession?.trainer_name}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit"
              disabled={addBookingMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {addBookingMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد الحجز'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="تأكيد حذف الحصة"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            هل أنت متأكد من رغبتك في حذف الحصة المقررة يوم <span className="font-bold text-slate-900">{selectedSession?.day}</span> في تمام الساعة <span className="font-bold text-slate-900">{selectedSession?.start_time}</span>؟
            هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSessionDelete}
              disabled={deleteSessionMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {deleteSessionMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد الحذف'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
