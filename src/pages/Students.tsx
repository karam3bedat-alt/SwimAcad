import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Phone, Wallet, Loader2, AlertCircle, Edit2, Trash2, Download, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Student } from '../types';
import { Modal } from '../components/Modal';
import { toast } from 'react-hot-toast';
import { useStudents, useAddStudent, useUpdateStudent, useDeleteStudent } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { generateStudentsPDF } from '../services/pdfService';
import { createWhatsAppLink, whatsappTemplates } from '../utils/whatsapp';
import { BroadcastWhatsApp } from '../components/BroadcastWhatsApp';

export default function Students() {
  const { data: students = [], isLoading: isLoadingStudents, error: studentsError } = useStudents();
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments();
  
  const addStudentMutation = useAddStudent();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('الكل');

  const balances = useMemo(() => {
    const newBalances: Record<string, number> = {};
    (students || []).forEach(student => {
      const studentPayments = (payments || []).filter(p => p.student_id === student.id);
      const totalPaid = studentPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      newBalances[student.id] = totalPaid;
    });
    return newBalances;
  }, [students, payments]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const toastId = toast.loading('جاري إضافة الطالب...');
    try {
      await addStudentMutation.mutateAsync({
        full_name: (formData.get('full_name') as string) || '',
        parent_name: (formData.get('parent_name') as string) || '',
        phone: (formData.get('phone') as string) || '',
        medical_notes: (formData.get('medical_notes') as string) || '',
        age: Number(formData.get('age')),
        level: (formData.get('level') as any) || 'مبتدئ',
        registration_date: new Date().toISOString()
      });
      toast.success('تمت إضافة الطالب بنجاح', { id: toastId });
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة الطالب', { id: toastId });
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    const formData = new FormData(e.currentTarget);

    const toastId = toast.loading('جاري تحديث بيانات الطالب...');
    try {
      await updateStudentMutation.mutateAsync({
        id: selectedStudent.id,
        data: {
          full_name: (formData.get('full_name') as string) || '',
          parent_name: (formData.get('parent_name') as string) || '',
          phone: (formData.get('phone') as string) || '',
          medical_notes: (formData.get('medical_notes') as string) || '',
          age: Number(formData.get('age')),
          level: (formData.get('level') as any) || 'مبتدئ'
        }
      });
      toast.success('تم تحديث بيانات الطالب بنجاح', { id: toastId });
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث بيانات الطالب', { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    
    const toastId = toast.loading('جاري حذف الطالب...');
    try {
      await deleteStudentMutation.mutateAsync(selectedStudent.id);
      toast.success('تم حذف الطالب بنجاح', { id: toastId });
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف الطالب', { id: toastId });
    }
  };

  const filteredStudents = (students || []).filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (s.phone || s.parent_phone)?.includes(searchTerm);
    const matchesLevel = filterLevel === 'الكل' || s.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleWhatsAppClick = (student: Student, type: string) => {
    let message = '';
    const phone = student.phone || student.parent_phone;
    if (!phone) {
      toast.error('رقم الهاتف غير متوفر');
      return;
    }
    
    switch(type) {
      case 'welcome':
        message = whatsappTemplates.welcome(student.full_name);
        break;
      case 'reminder':
        message = whatsappTemplates.sessionReminder(student.full_name, 'غداً', '4:00 مساءً');
        break;
      case 'payment':
        message = whatsappTemplates.paymentReminder(student.full_name, 500, 'الحالي');
        break;
      case 'custom':
        const customMsg = prompt('اكتب رسالتك:');
        if (customMsg) message = customMsg;
        else return;
        break;
      default:
        message = 'مرحباً،';
    }
    
    const link = createWhatsAppLink(phone, message);
    window.open(link, '_blank');
  };

  const isLoading = isLoadingStudents || isLoadingPayments;

  if (isLoading && (!students || students.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">جاري تحميل الطلاب...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">إدارة الطلاب</h2>
          <p className="text-slate-500 dark:text-slate-400">عرض وإدارة جميع الطلاب المسجلين في الأكاديمية.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <MessageCircle size={20} />
            <span>رسائل جماعية</span>
          </button>
          <button 
            onClick={() => generateStudentsPDF(filteredStudents)}
            disabled={filteredStudents.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <Download size={20} />
            <span>تصدير PDF</span>
          </button>
          <button 
            onClick={() => { setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            <span>إضافة طالب جديد</span>
          </button>
        </div>
      </div>

      {studentsError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{(studentsError as any).message || 'فشل تحميل بيانات الطلاب'}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو رقم الهاتف..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select 
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px] dark:text-slate-200"
          >
            <option value="الكل">جميع المستويات</option>
            <option value="مبتدئ">مبتدئ</option>
            <option value="متوسط">متوسط</option>
            <option value="متقدم">متقدم</option>
            <option value="احترافي">احترافي</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الطالب</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">المستوى</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">ولي الأمر</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">إجمالي المدفوع</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">تاريخ التسجيل</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {student.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Phone size={12} /> {student.phone || student.parent_phone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    student.level === 'مبتدئ' && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                    student.level === 'متوسط' && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
                    student.level === 'متقدم' && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
                    student.level === 'احترافي' && "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
                  )}>
                    {student.level}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{student.parent_name}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <Wallet size={14} />
                    <span>{balances[student.id] || 0} ر.س</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {student.registration_date ? new Date(student.registration_date).toLocaleDateString('ar-EG') : '-'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleWhatsAppClick(student, 'welcome')}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                        title="رسالة ترحيب"
                      >
                        <MessageCircle size={14} />
                      </button>
                      <button 
                        onClick={() => handleWhatsAppClick(student, 'custom')}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                        title="رسالة مخصصة"
                      >
                        <Phone size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && !isLoading && (
          <div className="p-12 text-center text-slate-500 italic">
            لا يوجد طلاب مسجلين حالياً.
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="إضافة طالب جديد"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الاسم الكامل</label>
            <input 
              name="full_name" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">العمر</label>
            <input 
              name="age" 
              type="number"
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">المستوى</label>
            <select 
              name="level" 
              defaultValue="مبتدئ"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            >
              <option value="مبتدئ">مبتدئ</option>
              <option value="متوسط">متوسط</option>
              <option value="متقدم">متقدم</option>
              <option value="احترافي">احترافي</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم ولي الأمر</label>
            <input 
              name="parent_name" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم الهاتف</label>
            <input 
              name="phone" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">ملاحظات طبية</label>
            <textarea 
              name="medical_notes" 
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit"
              disabled={addStudentMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {addStudentMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'إضافة الطالب'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="تعديل بيانات الطالب"
        size="lg"
      >
        {selectedStudent && (
          <form onSubmit={handleEdit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">الاسم الكامل</label>
              <input 
                name="full_name" 
                defaultValue={selectedStudent.full_name}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">العمر</label>
              <input 
                name="age" 
                type="number"
                defaultValue={selectedStudent.age}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">المستوى</label>
              <select 
                name="level" 
                defaultValue={selectedStudent.level}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              >
                <option value="مبتدئ">مبتدئ</option>
                <option value="متوسط">متوسط</option>
                <option value="متقدم">متقدم</option>
                <option value="احترافي">احترافي</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم ولي الأمر</label>
              <input 
                name="parent_name" 
                defaultValue={selectedStudent.parent_name}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم الهاتف</label>
              <input 
                name="phone" 
                defaultValue={selectedStudent.phone || selectedStudent.parent_phone}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">ملاحظات طبية</label>
              <textarea 
                name="medical_notes" 
                defaultValue={selectedStudent.medical_notes}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button 
                type="submit"
                disabled={updateStudentMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {updateStudentMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'تحديث البيانات'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="تأكيد الحذف"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            هل أنت متأكد من رغبتك في حذف الطالب <span className="font-bold text-slate-900 dark:text-slate-100">{selectedStudent?.full_name}</span>؟
            هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleDelete}
              disabled={deleteStudentMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {deleteStudentMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد الحذف'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="إرسال رسائل جماعية"
        size="lg"
      >
        <BroadcastWhatsApp students={students} />
      </Modal>
    </div>
  );
}
