import React, { useState } from 'react';
import { Modal } from './Modal';
import { Student } from '../types';
import { useStudentEvaluations, useAddStudentEvaluation } from '../hooks/useStudents';
import { useAuth } from '../AuthContext';
import { Loader2, Plus, Calendar, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

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
  const { data: evaluations = [], isLoading } = useStudentEvaluations(student?.id || '');
  const addEvaluationMutation = useAddStudentEvaluation(student?.id || '');
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [skills, setSkills] = useState({
    swimming: 5,
    stamina: 5,
    technique: 5,
    behavior: 5
  });

  if (!student) return null;

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


