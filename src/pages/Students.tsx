import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Phone, User as UserIcon, Wallet, Loader2, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { apiFetch, cn } from '../lib/utils';
import { Student } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../lib/ToastContext';

export default function Students() {
  const { showToast, hideToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('الكل');
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, paymentsData] = await Promise.all([
        apiFetch('getStudents'),
        apiFetch('getPayments')
      ]);

      if (Array.isArray(studentsData)) {
        setStudents(studentsData);
        
        const newBalances: Record<number, number> = {};
        studentsData.forEach(student => {
          const studentPayments = Array.isArray(paymentsData) ? paymentsData.filter(p => Number(p.student_id) === Number(student.id)) : [];
          const totalPaid = studentPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          newBalances[student.id] = totalPaid;
        });
        setBalances(newBalances);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الطلاب');
      showToast(err.message || 'فشل تحميل بيانات الطلاب', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const toastId = showToast('جاري إضافة الطالب...', 'loading');
    try {
      setLoading(true);
      await apiFetch('addStudent', {
        method: 'POST',
        body: JSON.stringify({
          action: 'addStudent',
          // Snake case
          full_name: data.full_name,
          parent_name: data.parent_name,
          parent_phone: data.phone,
          medical_notes: data.medical_notes,
          // Camel case
          fullName: data.full_name,
          parentName: data.parent_name,
          parentPhone: data.phone,
          medicalNotes: data.medical_notes,
          // Common fields
          age: data.age,
          level: data.level,
          phone: data.phone
        }),
      });
      hideToast(toastId);
      showToast('تمت إضافة الطالب بنجاح', 'success');
      setIsModalOpen(false);
      // Wait a bit for Google Sheets to update
      setTimeout(fetchData, 1500);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل إضافة الطالب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const toastId = showToast('جاري تحديث بيانات الطالب...', 'loading');
    try {
      setLoading(true);
      await apiFetch('editStudent', {
        method: 'POST',
        body: JSON.stringify({
          action: 'editStudent',
          id: selectedStudent.id,
          full_name: data.full_name,
          parent_name: data.parent_name,
          parent_phone: data.phone,
          medical_notes: data.medical_notes,
          age: data.age,
          level: data.level,
          phone: data.phone
        }),
      });
      hideToast(toastId);
      showToast('تم تحديث بيانات الطالب بنجاح', 'success');
      setIsEditModalOpen(false);
      setTimeout(fetchData, 1500);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل تحديث بيانات الطالب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    
    const toastId = showToast('جاري حذف الطالب...', 'loading');
    try {
      setLoading(true);
      await apiFetch('deleteStudent', {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteStudent',
          id: selectedStudent.id
        }),
      });
      hideToast(toastId);
      showToast('تم حذف الطالب بنجاح', 'success');
      setIsDeleteModalOpen(false);
      setTimeout(fetchData, 1500);
    } catch (err: any) {
      hideToast(toastId);
      showToast(err.message || 'فشل حذف الطالب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (s.phone || s.parent_phone)?.includes(searchTerm);
    const matchesLevel = filterLevel === 'الكل' || s.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  if (loading && students.length === 0) {
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
          <h2 className="text-2xl font-bold text-slate-900">إدارة الطلاب</h2>
          <p className="text-slate-500">عرض وإدارة جميع الطلاب المسجلين في الأكاديمية.</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          <span>إضافة طالب جديد</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو رقم الهاتف..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select 
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-slate-50 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px]"
          >
            <option value="الكل">جميع المستويات</option>
            <option value="مبتدئ">مبتدئ</option>
            <option value="متوسط">متوسط</option>
            <option value="متقدم">متقدم</option>
            <option value="احترافي">احترافي</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الطالب</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">المستوى</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">ولي الأمر</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">إجمالي المدفوع</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">تاريخ التسجيل</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {student.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{student.full_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={12} /> {student.phone || student.parent_phone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    student.level === 'مبتدئ' && "bg-blue-50 text-blue-600",
                    student.level === 'متوسط' && "bg-emerald-50 text-emerald-600",
                    student.level === 'متقدم' && "bg-orange-50 text-orange-600",
                    student.level === 'احترافي' && "bg-purple-50 text-purple-600",
                  )}>
                    {student.level}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-700">{student.parent_name}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                    <Wallet size={14} />
                    <span>{balances[student.id] || 0} ر.س</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-500">
                    {student.registration_date ? new Date(student.registration_date).toLocaleDateString('ar-EG') : '-'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && !loading && (
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
            <label className="text-sm font-bold text-slate-700">الاسم الكامل</label>
            <input 
              name="full_name" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">العمر</label>
            <input 
              name="age" 
              type="number"
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">المستوى</label>
            <select 
              name="level" 
              defaultValue="مبتدئ"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="مبتدئ">مبتدئ</option>
              <option value="متوسط">متوسط</option>
              <option value="متقدم">متقدم</option>
              <option value="احترافي">احترافي</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">اسم ولي الأمر</label>
            <input 
              name="parent_name" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">رقم الهاتف</label>
            <input 
              name="phone" 
              required 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700">ملاحظات طبية</label>
            <textarea 
              name="medical_notes" 
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'إضافة الطالب'}
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
              <label className="text-sm font-bold text-slate-700">الاسم الكامل</label>
              <input 
                name="full_name" 
                defaultValue={selectedStudent.full_name}
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">العمر</label>
              <input 
                name="age" 
                type="number"
                defaultValue={selectedStudent.age}
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المستوى</label>
              <select 
                name="level" 
                defaultValue={selectedStudent.level}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="مبتدئ">مبتدئ</option>
                <option value="متوسط">متوسط</option>
                <option value="متقدم">متقدم</option>
                <option value="احترافي">احترافي</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">اسم ولي الأمر</label>
              <input 
                name="parent_name" 
                defaultValue={selectedStudent.parent_name}
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">رقم الهاتف</label>
              <input 
                name="phone" 
                defaultValue={selectedStudent.phone || selectedStudent.parent_phone}
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">ملاحظات طبية</label>
              <textarea 
                name="medical_notes" 
                defaultValue={selectedStudent.medical_notes}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'تحديث البيانات'}
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
          <p className="text-slate-600">
            هل أنت متأكد من رغبتك في حذف الطالب <span className="font-bold text-slate-900">{selectedStudent?.full_name}</span>؟
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد الحذف'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
