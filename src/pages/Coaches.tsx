import React, { useState } from 'react';
import { Award, Phone, Activity, Loader2, AlertCircle, Plus, Trash2, Edit2 } from 'lucide-react';
import { Coach } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../lib/ToastContext';
import { useTrainers, useAddTrainer, useUpdateTrainer, useDeleteTrainer } from '../hooks/useTrainers';

export default function Coaches() {
  const { showToast, hideToast } = useToast();
  const { data: coaches = [], isLoading, error } = useTrainers();
  
  const addTrainerMutation = useAddTrainer();
  const updateTrainerMutation = useUpdateTrainer();
  const deleteTrainerMutation = useDeleteTrainer();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isEdit = isEditModalOpen && selectedCoach;
    
    const toastId = showToast(isEdit ? 'جاري تحديث بيانات المدرب...' : 'جاري إضافة المدرب...', 'loading');
    try {
      const trainerData = {
        name: (formData.get('name') as string) || '',
        trainer_name: (formData.get('name') as string) || '',
        phone: (formData.get('phone') as string) || '',
        specialty: (formData.get('specialty') as string) || '',
        status: (isEdit ? selectedCoach.status : 'نشط') as 'نشط' | 'غير نشط'
      };

      if (isEdit) {
        await updateTrainerMutation.mutateAsync({ id: selectedCoach.id, data: trainerData });
      } else {
        await addTrainerMutation.mutateAsync(trainerData);
      }

      hideToast(toastId);
      showToast(isEdit ? 'تم تحديث بيانات المدرب بنجاح' : 'تمت إضافة المدرب بنجاح', 'success');
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedCoach(null);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || (isEdit ? 'فشل تحديث بيانات المدرب' : 'فشل إضافة المدرب'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedCoach) return;
    
    const toastId = showToast('جاري حذف المدرب...', 'loading');
    try {
      await deleteTrainerMutation.mutateAsync(selectedCoach.id);
      hideToast(toastId);
      showToast('تم حذف المدرب بنجاح', 'success');
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل حذف المدرب', 'error');
    }
  };

  if (isLoading && (!coaches || coaches.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">جاري تحميل المدربين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">المدربون</h2>
          <p className="text-slate-500">عرض طاقم التدريب وتخصصاتهم.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          <span>إضافة مدرب جديد</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{(error as any).message || 'فشل تحميل بيانات المدربين'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coaches.map((coach) => (
          <div key={coach.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                  <Award size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{coach.name || coach.trainer_name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{coach.specialty || 'مدرب سباحة'}</p>
                </div>
              </div>
                <div className="flex flex-col items-end gap-2">
                <div className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                  {coach.status || 'نشط'}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setSelectedCoach(coach);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="تعديل المدرب"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedCoach(coach);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="حذف المدرب"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400" />
                <span>{coach.phone || 'غير متوفر'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Activity size={16} className="text-slate-400" />
                <span>متخصص في تدريب جميع المستويات</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {coaches.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 italic">
          لا يوجد مدربون مسجلون حالياً.
        </div>
      )}

      <Modal 
        isOpen={isModalOpen || isEditModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCoach(null);
        }} 
        title={isEditModalOpen ? "تعديل بيانات المدرب" : "إضافة مدرب جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الاسم الكامل</label>
            <input 
              name="name" 
              required 
              defaultValue={selectedCoach?.name || selectedCoach?.trainer_name || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">رقم الهاتف</label>
            <input 
              name="phone" 
              required 
              defaultValue={selectedCoach?.phone || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">التخصص</label>
            <input 
              name="specialty" 
              placeholder="مثال: سباحة فراشة، تدريب أطفال"
              required 
              defaultValue={selectedCoach?.specialty || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => {
                setIsModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedCoach(null);
              }}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit"
              disabled={addTrainerMutation.isPending || updateTrainerMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {(addTrainerMutation.isPending || updateTrainerMutation.isPending) ? <Loader2 className="animate-spin" size={20} /> : (isEditModalOpen ? 'تحديث البيانات' : 'إضافة المدرب')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="تأكيد حذف المدرب"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            هل أنت متأكد من رغبتك في حذف المدرب <span className="font-bold text-slate-900">{selectedCoach?.name || selectedCoach?.trainer_name}</span>؟
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
              onClick={handleDelete}
              disabled={deleteTrainerMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {deleteTrainerMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد الحذف'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
