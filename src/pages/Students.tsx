import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Phone, Wallet, Loader2, AlertCircle, Edit2, Trash2, Download, MessageCircle, Award, RefreshCw, UserPlus, ClipboardList, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Student } from '../types';
import { Modal } from '../components/Modal';
import { toast } from 'react-hot-toast';
import { useStudents, useAddStudent, useUpdateStudent, useDeleteStudent } from '../hooks/useStudents';
import { usePayments } from '../hooks/usePayments';
import { generateStudentsPDF, generateCertificatePDF } from '../services/pdfService';
import { createWhatsAppLink, whatsappTemplates } from '../utils/whatsapp';
import { BroadcastWhatsApp } from '../components/BroadcastWhatsApp';
import { useSettings } from '../hooks/useSettings';
import { DEFAULT_COURSE_PRICES, PaymentConfig } from '../services/paymentService';

import { useI18n } from '../lib/LanguageContext';
import { useAuth } from '../AuthContext';

import { RenewalModal } from '../components/RenewalModal';
import { StudentEvaluationsModal, StudentMediaModal } from '../components/StudentCoachFeatures';

export default function Students() {
  const { t, language } = useI18n();
  const { data: students = [], isLoading: isLoadingStudents, error: studentsError } = useStudents();
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments();
  const { data: appSettings } = useSettings();
  
  const currentPrices = (appSettings?.payment_config as PaymentConfig)?.coursePrices || DEFAULT_COURSE_PRICES;
  const courseTypes = Object.entries(currentPrices).map(([name, price]) => ({ name, price: price as number }));
  
  const addStudentMutation = useAddStudent();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState(t('all_levels'));
  const [filterCourse, setFilterCourse] = useState('جميع الدورات');

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
          course_type: (formData.get('course_type') as string) || '',
          birth_date: (formData.get('birth_date') as string) || '',
          custom_fee: formData.get('custom_fee') ? Number(formData.get('custom_fee')) : null,
          loyalty_points: Number(formData.get('loyalty_points')) || 0,
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
            level: (formData.get('level') as any) || 'مبتدئ',
            course_type: (formData.get('course_type') as string) || '',
            birth_date: (formData.get('birth_date') as string) || '',
            custom_fee: formData.get('custom_fee') ? Number(formData.get('custom_fee')) : null,
            loyalty_points: Number(formData.get('loyalty_points')) || 0
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

  const { user, isAdmin, isCoach } = useAuth();
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  const filteredStudents = (students || []).filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (s.phone || s.parent_phone)?.includes(searchTerm);
    const matchesLevel = filterLevel === t('all_levels') || s.level === filterLevel;
    const matchesCourse = filterCourse === 'جميع الدورات' || s.course_type === filterCourse;
    const matchesCoach = viewMode === 'all' || s.assigned_coach_id === user?.uid;
    return matchesSearch && matchesLevel && matchesCourse && matchesCoach;
  });

  const handleAssignToMe = async (student: Student) => {
    const toastId = toast.loading('جاري تعيين الطالب...');
    try {
      await updateStudentMutation.mutateAsync({
        id: student.id,
        data: {
          assigned_coach_id: user?.uid
        }
      });
      toast.success('تم تعيين الطالب لك بنجاح', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'فشل تعيين الطالب', { id: toastId });
    }
  };

  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  React.useEffect(() => {
    if (isCoach()) {
      setViewMode('mine');
    }
  }, [isCoach]);

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
        const amount = student.custom_fee || currentPrices[student.course_type as keyof typeof DEFAULT_COURSE_PRICES] || 600;
        message = whatsappTemplates.paymentReminder(student.full_name, amount, 'الحالي');
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

  const ActionButtons = ({ student, isMobile = false }: { student: Student, isMobile?: boolean }) => (
    <div className={cn("flex items-center gap-1", isMobile && "flex-wrap")}>
      {isCoach() && student.assigned_coach_id !== user?.uid && (
        <button 
          onClick={() => handleAssignToMe(student)}
          className={cn(
            "p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors",
            isMobile && "bg-blue-50 px-3 py-1 text-xs font-bold flex items-center gap-1"
          )}
          title="تعييني كمدرب"
        >
          <UserPlus size={16} />
          {isMobile && <span>تعيين لي</span>}
        </button>
      )}
      {isCoach() && student.assigned_coach_id === user?.uid && (
        <>
          <button 
            onClick={() => {
              setSelectedStudent(student);
              setIsEvaluationModalOpen(true);
            }}
            className={cn(
              "p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors",
              isMobile && "bg-purple-50 px-3 py-1 text-xs font-bold flex items-center gap-1"
            )}
            title="تقييم الطالب"
          >
            <ClipboardList size={16} />
            {isMobile && <span>تقييم</span>}
          </button>
          <button 
            onClick={() => {
              setSelectedStudent(student);
              setIsMediaModalOpen(true);
            }}
            className={cn(
              "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors",
              isMobile && "bg-indigo-50 px-3 py-1 text-xs font-bold flex items-center gap-1"
            )}
            title="ميديا الطالب"
          >
            <ImageIcon size={16} />
            {isMobile && <span>ميديا</span>}
          </button>
        </>
      )}
      {(isAdmin() || (isCoach() && student.assigned_coach_id === user?.uid)) && (
        <button 
          onClick={() => {
            setSelectedStudent(student);
            setIsRenewalModalOpen(true);
          }}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors font-bold text-xs border border-blue-200 dark:border-blue-700 hover:bg-blue-100",
            !isMobile && "shadow-sm"
          )}
          title="تجديد الاشتراك"
        >
          <RefreshCw size={14} />
          <span>{t('renew')}</span>
        </button>
      )}
      <button 
        onClick={() => generateCertificatePDF(student)}
        className="flex items-center gap-1 px-3 py-1.5 text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded-lg transition-colors font-bold text-xs border border-amber-200 dark:border-amber-700 hover:bg-amber-100"
        title={t('generate_certificate')}
      >
        <Award size={14} />
        <span>{t('certificate')}</span>
      </button>
      <button 
        onClick={() => handleWhatsAppClick(student, 'welcome')}
        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
        title="رسالة ترحيب"
      >
        <MessageCircle size={16} />
      </button>
      <button 
        onClick={() => {
          setSelectedStudent(student);
          setIsEditModalOpen(true);
        }}
        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        title="تعديل"
      >
        <Edit2 size={16} />
      </button>
      <button 
        onClick={() => {
          setSelectedStudent(student);
          setIsDeleteModalOpen(true);
        }}
        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
        title="حذف"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const isLoading = isLoadingStudents || isLoadingPayments;

  if (isLoading && (!students || students.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-500 font-medium">{t('loading_data')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('students')}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t('all_students')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <MessageCircle size={20} />
            <span>{t('broadcast_messages')}</span>
          </button>
          <button 
            onClick={() => generateStudentsPDF(filteredStudents)}
            disabled={filteredStudents.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <Download size={20} />
            <span>{t('export_pdf')}</span>
          </button>
          <button 
            onClick={() => { setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            <span>{t('add_new_student')}</span>
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
        {isCoach() && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                viewMode === 'all' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              جميع الطلاب
            </button>
            <button
              onClick={() => setViewMode('mine')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                viewMode === 'mine' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              طلابي
            </button>
          </div>
        )}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('search')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-200"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:min-w-[140px] dark:text-slate-200"
            >
              <option value={t('all_levels')}>{t('all_levels')}</option>
              <option value={t('beginner')}>{t('beginner')}</option>
              <option value={t('intermediate')}>{t('intermediate')}</option>
              <option value={t('advanced')}>{t('advanced')}</option>
              <option value={t('professional')}>{t('professional')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <select 
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:min-w-[140px] dark:text-slate-200"
            >
              <option value="جميع الدورات">جميع الدورات</option>
              {courseTypes.map(course => (
                <option key={course.name} value={course.name}>{course.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-right" dir="rtl">
        {/* Table View - Hidden on Mobile/Small Tablets */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('students')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('course_type')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 font-['Cairo']">{t('parent_name')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 font-['Cairo']">{t('loyalty_points')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 font-['Cairo']">{t('total_paid')}</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 font-['Cairo']">تاريخ التسجيل</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
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
                      student.course_type === 'دورة تعليمية' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      student.course_type === 'دورة تدريبية' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      student.course_type === 'فريق ناشئين' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                      "bg-slate-50 text-slate-600 border border-slate-100"
                    )}>
                      {student.course_type || 'غير محدد'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{student.level}</p>
                  </td>
                  <td className="px-6 py-4 font-['Cairo']">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{student.parent_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                      <Award size={14} />
                      <span>{student.loyalty_points || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <Wallet size={14} />
                      <span>{balances[student.id!] || 0} ₪</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-['Cairo']">
                      {student.registration_date ? new Date(student.registration_date).toLocaleDateString('ar-EG') : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <ActionButtons student={student} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card View - Visible on Mobile/Tablets */}
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredStudents.map((student) => (
            <div key={student.id} className="p-4 space-y-4 bg-white dark:bg-slate-900 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {student.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{student.full_name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 text-right" dir="ltr">
                      {student.phone || student.parent_phone} <Phone size={12} />
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                  student.status === 'نشط' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {student.status || 'نشط'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">{t('course_type')}</p>
                  <p className={cn(
                    "font-bold text-xs truncate",
                    student.course_type === 'دورة تعليمية' ? "text-blue-600" :
                    student.course_type === 'دورة تدريبية' ? "text-emerald-600" :
                    student.course_type === 'فريق ناشئين' ? "text-purple-600" :
                    "text-slate-700 dark:text-slate-200"
                  )}>
                    {student.course_type || 'غير محدد'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">{t('level')}</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{student.level}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">{t('loyalty_points')}</p>
                  <p className="font-bold text-amber-600">{student.loyalty_points || 0}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">{t('total_paid')}</p>
                  <p className="font-bold text-emerald-600">{balances[student.id!] || 0} ₪</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <ActionButtons student={student} isMobile />
              </div>
            </div>
          ))}
        </div>
        {filteredStudents.length === 0 && !isLoading && (
          <div className="p-12 text-center text-slate-500 italic">
            لا يوجد طلاب مسجلين حالياً.
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={t('add_new_student')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('full_name')}</label>
            <input 
              name="full_name" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('age')}</label>
            <input 
              name="age" 
              type="number"
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('course_type')}</label>
            <select 
              name="course_type" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            >
              {courseTypes.map(course => (
                <option key={course.name} value={course.name}>{course.name} ({course.price} ₪)</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('custom_fee')}</label>
            <input 
              name="custom_fee" 
              type="number"
              placeholder={language === 'ar' ? 'اتركه فارغاً للسعر التلقائي' : 'השאר ריק למחיר ברירת מחדל'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('level')}</label>
            <select 
              name="level" 
              defaultValue="مبتدئ"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            >
              <option value="مبتدئ">{t('beginner')}</option>
              <option value="متوسط">{t('intermediate')}</option>
              <option value="متقدم">{t('advanced')}</option>
              <option value="احترافي">{t('professional')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('birth_date')}</label>
            <input 
              name="birth_date" 
              type="date"
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('parent_name')}</label>
            <input 
              name="parent_name" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('phone')}</label>
            <input 
              name="phone" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('loyalty_points')}</label>
            <input 
              name="loyalty_points" 
              type="number"
              defaultValue={0}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('medical_notes')}</label>
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
              {t('cancel')}
            </button>
            <button 
              type="submit"
              disabled={addStudentMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {addStudentMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={t('edit_student_data')}
        size="lg"
      >
        {selectedStudent && (
          <form onSubmit={handleEdit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('full_name')}</label>
              <input 
                name="full_name" 
                defaultValue={selectedStudent.full_name}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('age')}</label>
              <input 
                name="age" 
                type="number"
                defaultValue={selectedStudent.age}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('course_type')}</label>
              <select 
                name="course_type" 
                defaultValue={selectedStudent.course_type}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              >
                {courseTypes.map(course => (
                  <option key={course.name} value={course.name}>{course.name} ({course.price} ₪)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('custom_fee')}</label>
              <input 
                name="custom_fee" 
                type="number"
                defaultValue={selectedStudent.custom_fee}
                placeholder={language === 'ar' ? 'اتركه فارغاً للسعر التلقائي' : 'השאר ריק למחיר ברירת מחדל'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('level')}</label>
              <select 
                name="level" 
                defaultValue={selectedStudent.level}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              >
                <option value="مبتدئ">{t('beginner')}</option>
                <option value="متوسط">{t('intermediate')}</option>
                <option value="متقدم">{t('advanced')}</option>
                <option value="احترافي">{t('professional')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('birth_date')}</label>
              <input 
                name="birth_date" 
                type="date"
                defaultValue={selectedStudent.birth_date}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('parent_name')}</label>
              <input 
                name="parent_name" 
                defaultValue={selectedStudent.parent_name}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('phone')}</label>
              <input 
                name="phone" 
                defaultValue={selectedStudent.phone || selectedStudent.parent_phone}
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('loyalty_points')}</label>
              <input 
                name="loyalty_points" 
                type="number"
                defaultValue={selectedStudent.loyalty_points || 0}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('medical_notes')}</label>
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
                {t('cancel')}
              </button>
              <button 
                type="submit"
                disabled={updateStudentMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {updateStudentMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : t('update_data')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title={t('confirm_delete')}
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            {t('confirm_delete_student')} <span className="font-bold text-slate-900 dark:text-slate-100">{selectedStudent?.full_name}</span>
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={handleDelete}
              disabled={deleteStudentMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {deleteStudentMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : t('confirm_delete')}
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

      {selectedStudent && (
        <>
          <RenewalModal
            isOpen={isRenewalModalOpen}
            onClose={() => {
              setIsRenewalModalOpen(false);
              setSelectedStudent(null);
            }}
            student={selectedStudent}
          />
          <StudentEvaluationsModal
            isOpen={isEvaluationModalOpen}
            onClose={() => {
              setIsEvaluationModalOpen(false);
              setSelectedStudent(null);
            }}
            student={selectedStudent}
          />
          <StudentMediaModal
            isOpen={isMediaModalOpen}
            onClose={() => {
              setIsMediaModalOpen(false);
              setSelectedStudent(null);
            }}
            student={selectedStudent}
          />
        </>
      )}
    </div>
  );
}
