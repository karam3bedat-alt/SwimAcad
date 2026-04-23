import React, { useState } from 'react';
import { Modal } from './Modal';
import { Student } from '../types';
import { useStudentEvaluations, useAddStudentEvaluation, useStudentMedia, useAddStudentMedia } from '../hooks/useStudents';
import { useAuth } from '../AuthContext';
import { Loader2, Plus, Calendar, Star, FileText, Play, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  readOnly?: boolean;
  size?: number;
}

export function StarRating({ value, onChange, max = 5, readOnly = false, size = 20 }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[...Array(max)].map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHover(starValue)}
            onMouseLeave={() => !readOnly && setHover(0)}
            className={cn(
              "transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
              (hover || value) >= starValue ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"
            )}
          >
            <Star size={size} />
          </button>
        );
      })}
    </div>
  );
}

interface StudentEvaluationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

export function StudentEvaluationsModal({ isOpen, onClose, student }: StudentEvaluationsModalProps) {
  const { data: evaluations = [], isLoading } = useStudentEvaluations(student.id);
  const addEvaluationMutation = useAddStudentEvaluation(student.id);
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [skills, setSkills] = useState({
    swimming: 5,
    stamina: 5,
    technique: 5,
    behavior: 5
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const total_score = Math.round((skills.swimming + skills.stamina + skills.technique + skills.behavior) / 4);
      await addEvaluationMutation.mutateAsync({
        student_id: student.id,
        coach_id: user?.uid || '',
        coach_name: user?.displayName || 'مدرب',
        date: new Date().toISOString(),
        skills,
        total_score,
        comments: formData.get('comments') as string
      });
      toast.success('تمت إضافة التقييم بنجاح وحصلت على 5 نقاط ولاء');
      setIsAdding(false);
      setSkills({ swimming: 5, stamina: 5, technique: 5, behavior: 5 });
    } catch (err) {
      toast.error('فشل إضافة التقييم');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تقييمات الطالب: ${student.full_name}`} size="lg">
      <div className="space-y-6 font-['Cairo']">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">سجل التقييمات السابقة</p>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            <Plus size={16} />
            <span>إضافة تقييم جديد</span>
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-900 dark:text-blue-300">مهارات السباحة</label>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-center">
                  <StarRating 
                    value={skills.swimming} 
                    onChange={(v) => setSkills(s => ({ ...s, swimming: v }))} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-900 dark:text-blue-300">قوة التحمل</label>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-center">
                  <StarRating 
                    value={skills.stamina} 
                    onChange={(v) => setSkills(s => ({ ...s, stamina: v }))} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-900 dark:text-blue-300">التقنية والأداء</label>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-center">
                  <StarRating 
                    value={skills.technique} 
                    onChange={(v) => setSkills(s => ({ ...s, technique: v }))} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-900 dark:text-blue-300">السلوك والانضباط</label>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl flex justify-center">
                  <StarRating 
                    value={skills.behavior} 
                    onChange={(v) => setSkills(s => ({ ...s, behavior: v }))} 
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-900 dark:text-blue-300">الملاحظات والتعليقات</label>
              <textarea name="comments" rows={3} required className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-2 px-4 shadow-sm outline-none ring-1 ring-blue-100 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-slate-500">إلغاء</button>
              <button type="submit" disabled={addEvaluationMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">حفظ التقييم</button>
            </div>
          </form>
        )}

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : evaluations.length === 0 ? (
            <p className="text-center text-slate-400 py-8 italic font-['Cairo']">لا توجد تقييمات سابقة.</p>
          ) : (
            evaluations.map(ev => (
              <div key={ev.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3 font-['Cairo']">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar size={14} />
                    <span>{format(new Date(ev.date), 'yyyy-MM-dd')}</span>
                    <span>•</span>
                    <span>{ev.coach_name}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                    <StarRating value={ev.total_score || 0} readOnly size={14} />
                    <span className="text-xs font-bold text-amber-700 ml-1">
                      {ev.total_score || 0} / 5
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{ev.comments}</p>
                <div className="flex gap-4">
                  <div className="flex flex-col text-center">
                    <span className="text-[10px] text-slate-400">سباحة</span>
                    <StarRating value={ev.skills.swimming} readOnly size={10} />
                  </div>
                  <div className="flex flex-col text-center">
                    <span className="text-[10px] text-slate-400">تحمل</span>
                    <StarRating value={ev.skills.stamina} readOnly size={10} />
                  </div>
                  <div className="flex flex-col text-center">
                    <span className="text-[10px] text-slate-400">تقنية</span>
                    <StarRating value={ev.skills.technique} readOnly size={10} />
                  </div>
                  <div className="flex flex-col text-center">
                    <span className="text-[10px] text-slate-400">سلوك</span>
                    <StarRating value={ev.skills.behavior} readOnly size={10} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

interface StudentMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

export function StudentMediaModal({ isOpen, onClose, student }: StudentMediaModalProps) {
  const { data: media = [], isLoading } = useStudentMedia(student.id);
  const addMediaMutation = useAddStudentMedia(student.id);
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!file) {
      toast.error('يرجى اختيار ملف');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('جاري رفع الملف...');
    
    try {
      const storageRef = ref(storage, `student_media/${student.id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addMediaMutation.mutateAsync({
        student_id: student.id,
        coach_id: user?.uid || '',
        url: downloadURL,
        type: (formData.get('type') as 'image' | 'video') || (file.type.startsWith('video') ? 'video' : 'image'),
        description: formData.get('description') as string,
        date: new Date().toISOString()
      });
      toast.success('تمت إضافة الميديا بنجاح وحصلت على 5 نقاط ولاء', { id: toastId });
      setIsAdding(false);
      setFile(null);
    } catch (err) {
      toast.error('فشل رفع الميديا', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ميديا الطالب: ${student.full_name}`} size="lg">
      <div className="space-y-6 font-['Cairo']">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">الصور والفيديوهات</p>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            <Plus size={16} />
            <span>إضافة ميديا</span>
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">النوع</label>
                <select name="type" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-2 px-4 shadow-sm outline-none ring-1 ring-indigo-100 focus:ring-2 focus:ring-indigo-500">
                  <option value="image">صورة</option>
                  <option value="video">فيديو</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">الوصف</label>
                <input name="description" type="text" required placeholder="مثال: تدريب مهارات" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-2 px-4 shadow-sm outline-none ring-1 ring-indigo-100 focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">اختيار الملف</label>
              <input 
                type="file" 
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required 
                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-2 px-4 shadow-sm outline-none ring-1 ring-indigo-100 focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-slate-500">إلغاء</button>
              <button type="submit" disabled={isUploading || addMediaMutation.isPending} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center gap-2">
                {isUploading && <Loader2 size={16} className="animate-spin" />}
                حفظ
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 font-['Cairo']">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : media.length === 0 ? (
            <p className="col-span-full text-center text-slate-400 py-8 italic font-['Cairo']">لا توجد ميديا مسجلة.</p>
          ) : (
            media.map(m => (
              <div key={m.id} className="relative group bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 transition-transform hover:scale-[1.02]">
                {m.type === 'image' ? (
                  <img src={m.url} alt={m.description} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-4">
                    <Play size={32} />
                    <span className="text-[10px] mt-2 truncate w-full text-center">{m.description}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                  <div className="flex flex-col items-center text-center">
                    {m.type === 'image' ? <ImageIcon className="text-white mb-2" size={24} /> : <Play className="text-white mb-2" size={24} />}
                    <span className="text-white text-xs font-bold">{m.description}</span>
                    <button 
                      onClick={() => window.open(m.url, '_blank')}
                      className="mt-3 text-[10px] bg-white text-slate-900 px-3 py-1 rounded-full font-bold"
                    >
                      فتح الرابط
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
