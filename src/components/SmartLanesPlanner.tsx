import React, { useState, useMemo } from 'react';
import { useBookings } from '../hooks/useBookings';
import { useStudents } from '../hooks/useStudents';
import { useTrainers } from '../hooks/useTrainers';
import { useUpdateSession } from '../hooks/useSessions';
import { Session, Student, Coach, Booking } from '../types';
import { ChevronRight, ShieldAlert, Award, Star, Loader2, Save, Undo2, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SmartLanesPlannerProps {
  sessions: Session[];
}

const LANES = [1, 2, 3, 4, 5];
const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function SmartLanesPlanner({ sessions }: SmartLanesPlannerProps) {
  const { data: bookings = [], isLoading: isLoadingBookings } = useBookings();
  const { data: students = [], isLoading: isLoadingStudents } = useStudents();
  const { data: trainers = [], isLoading: isLoadingTrainers } = useTrainers();
  const updateSessionMutation = useUpdateSession();

  // Helper to get today's day of week in Arabic
  const getTodayArabicDay = () => {
    const today = new Date().getDay(); // 0 Sunday, 6 Saturday
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[today];
  };

  const [selectedDay, setSelectedDay] = useState(getTodayArabicDay());
  const [selectedSessionId, setSelectedSessionId] = useState('');

  // Local state for assignments during editing
  // Maps targetSessionId -> { studentLanes: Record<studentId, laneNumber>, trainerLanes: Record<trainerId, laneNumber> }
  const [localStudentLanes, setLocalStudentLanes] = useState<Record<string, number>>({});
  const [localTrainerLanes, setLocalTrainerLanes] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Filter sessions for selected day
  const filteredSessions = useMemo(() => {
    return (sessions || []).filter(s => s.day === selectedDay);
  }, [sessions, selectedDay]);

  // Handle session selection swap
  const activeSession = useMemo(() => {
    const current = filteredSessions.find(s => s.id === selectedSessionId) || filteredSessions[0] || null;
    if (current && current.id !== selectedSessionId) {
      // Auto select first session
      setSelectedSessionId(current.id);
    }
    return current;
  }, [filteredSessions, selectedSessionId]);

  // Sync database state to local modification state when activeSession changes
  React.useEffect(() => {
    if (activeSession) {
      setLocalStudentLanes(activeSession.lane_assignments || {});
      setLocalTrainerLanes(activeSession.coach_lane_assignments || {});
      setIsDirty(false);
    } else {
      setLocalStudentLanes({});
      setLocalTrainerLanes({});
      setIsDirty(false);
    }
  }, [activeSession]);

  // Filter bookings for active session
  const activeBookings = useMemo(() => {
    if (!activeSession) return [];
    return (bookings || []).filter(b => b.session_id === activeSession.id && b.status !== 'ملغي');
  }, [bookings, activeSession]);

  // Get student objects of active bookings
  const sessionStudents = useMemo(() => {
    return activeBookings.map(booking => {
      const studentObj = students.find(s => s.id === booking.student_id);
      return studentObj || { id: booking.student_id, full_name: booking.student_name || 'طالب مجهول', level: 'مبتدئ' } as Student;
    });
  }, [activeBookings, students]);

  // Get trainers assigned to active session
  const sessionTrainers = useMemo(() => {
    if (!activeSession) return [];
    // Can match by coach_id, coach_ids array or trainer_name
    const activeTrainersList: Coach[] = [];
    if (activeSession.coach_id) {
      const mainCoach = trainers.find(t => t.id === activeSession.coach_id);
      if (mainCoach) activeTrainersList.push(mainCoach);
    }
    if (activeSession.coach_ids) {
      activeSession.coach_ids.forEach(cid => {
        if (!activeTrainersList.some(t => t.id === cid)) {
          const c = trainers.find(t => t.id === cid);
          if (c) activeTrainersList.push(c);
        }
      });
    }
    // Fallback if no full objects found
    if (activeTrainersList.length === 0 && (activeSession.coach_name || activeSession.trainer_name)) {
      activeTrainersList.push({
        id: activeSession.coach_id || 'main_coach',
        name: activeSession.coach_name || activeSession.trainer_name || '',
        specialty: activeSession.required_level || '',
        phone: '',
        status: 'نشط'
      } as Coach);
    }
    return activeTrainersList;
  }, [activeSession, trainers]);

  // Unassigned lists for UI dropdown allocations
  const unassignedStudents = useMemo(() => {
    return sessionStudents.filter(s => !localStudentLanes[s.id]);
  }, [sessionStudents, localStudentLanes]);

  const unassignedTrainers = useMemo(() => {
    return sessionTrainers.filter(t => !localTrainerLanes[t.id]);
  }, [sessionTrainers, localTrainerLanes]);

  // Assign a student to a specific lane
  const assignStudentToLane = (studentId: string, lane: number) => {
    setLocalStudentLanes(prev => ({ ...prev, [studentId]: lane }));
    setIsDirty(true);
  };

  // Assign a trainer to a specific lane
  const assignTrainerToLane = (trainerId: string, lane: number) => {
    setLocalTrainerLanes(prev => ({ ...prev, [trainerId]: lane }));
    setIsDirty(true);
  };

  // Remove student from lane
  const removeStudentFromLane = (studentId: string) => {
    setLocalStudentLanes(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setIsDirty(true);
  };

  // Remove trainer from lane
  const removeTrainerFromLane = (trainerId: string) => {
    setLocalTrainerLanes(prev => {
      const next = { ...prev };
      delete next[trainerId];
      return next;
    });
    setIsDirty(true);
  };

  // Reset local state to last saved database state
  const handleReset = () => {
    if (activeSession) {
      setLocalStudentLanes(activeSession.lane_assignments || {});
      setLocalTrainerLanes(activeSession.coach_lane_assignments || {});
      setIsDirty(false);
      toast.success('تمت إعادة تعيين التعديلات');
    }
  };

  // Save allocations to Database
  const handleSaveChanges = async () => {
    if (!activeSession) return;
    const loaderId = toast.loading('جاري حفظ توزيع الممرات المائية...');
    try {
      await updateSessionMutation.mutateAsync({
        id: activeSession.id,
        data: {
          lane_assignments: localStudentLanes,
          coach_lane_assignments: localTrainerLanes
        }
      });
      setIsDirty(false);
      toast.success('تم حفظ وتوزيع الحارات بنجاح !', { id: loaderId });
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ وتحديث الحارات', { id: loaderId });
    }
  };

  // Calculate stats for each Lane
  const laneLanesData = useMemo(() => {
    return LANES.map(lane => {
      const laneSwimmers = sessionStudents.filter(s => localStudentLanes[s.id] === lane);
      const laneCoaches = sessionTrainers.filter(t => localTrainerLanes[t.id] === lane);
      
      // Smart recommendation level check
      // Checks if beginners and advanced levels are combined in the same lane
      const levels = laneSwimmers.map(s => s.level);
      const hasBeginners = levels.includes('مبتدئ');
      const hasAdvanced = levels.some(lvl => lvl === 'متقدم' || lvl === 'فريق ناشئين');
      const isMixedAlert = hasBeginners && hasAdvanced;

      return {
        lane,
        swimmers: laneSwimmers,
        coaches: laneCoaches,
        isMixedAlert,
        capacityRatio: (laneSwimmers.length / 5) * 100 // recommended max 5 swimmers per lane
      };
    });
  }, [LANES, sessionStudents, sessionTrainers, localStudentLanes, localTrainerLanes]);

  const isLoading = isLoadingBookings || isLoadingStudents || isLoadingTrainers;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-slate-500 font-medium text-sm">جاري تحليل الممرات وحجوزات الطلاب المائية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">منسّق الممرات الذكي للمسبح</h3>
            <p className="text-slate-400 text-xs">توزيع الطلاب والمدربين على المسارات لمنع الازدحام والحفاظ على معايير السلامة.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Day selection */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDay === day 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="bg-slate-50/50 p-12 text-center rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
          <p className="text-slate-400 text-sm font-semibold">لا توجد حصص سباحة مجدولة ليوم {selectedDay}</p>
          <p className="text-slate-300 text-xs">يرجى الذهاب لتبويب جدول التمارين لإضافة حصة جديدة في هذا اليوم.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Side Session Selector */}
          <div className="lg:col-span-1 space-y-4">
            <h4 className="font-bold text-slate-700 text-sm px-1">حصص يوم {selectedDay}:</h4>
            <div className="space-y-2.5">
              {filteredSessions.map(session => {
                const isActive = session.id === selectedSessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-right p-4 rounded-2xl border transition-all flex flex-col gap-2 ${
                      isActive 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-50' 
                        : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {session.required_level}
                      </span>
                      <span className={`text-[10px] font-medium ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {session.start_time} - {session.end_time}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm tracking-tight">{session.coach_name || session.trainer_name}</h5>
                    <div className={`text-[11px] flex items-center gap-1 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                      <span>سعة الطلاب:</span>
                      <strong className={isActive ? 'text-white' : 'text-slate-700'}>
                        {bookings.filter(b => b.session_id === session.id && b.status !== 'ملغي').length}
                      </strong>
                      <span>/</span>
                      <span>{session.max_capacity}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Allocation Panel - Leftover List */}
            {activeSession && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs">غير موزعين بالحارات:</h4>
                  <span className="text-[10px] bg-slate-200/75 text-slate-600 px-2 py-0.5 rounded font-bold">
                    {unassignedStudents.length + unassignedTrainers.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {unassignedTrainers.map(t => (
                    <div key={t.id} className="bg-amber-50 border border-amber-250 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-amber-800">{t.name}</span>
                        <span className="text-[10px] text-amber-600">مدرب الحصة</span>
                      </div>
                      <select
                        onChange={(e) => assignTrainerToLane(t.id, Number(e.target.value))}
                        defaultValue=""
                        className="text-[11px] bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="" disabled>تنسيب لحارة</option>
                        {LANES.map(l => <option key={l} value={l}>الممر {l}</option>)}
                      </select>
                    </div>
                  ))}

                  {unassignedStudents.map(s => (
                    <div key={s.id} className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{s.full_name}</span>
                        <span className="text-[10px] text-blue-500 font-medium">مستوى: {s.level}</span>
                      </div>
                      <select
                        onChange={(e) => assignStudentToLane(s.id, Number(e.target.value))}
                        defaultValue=""
                        className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
                      >
                        <option value="" disabled>تنسيب لحارة</option>
                        {LANES.map(l => <option key={l} value={l}>الممر {l}</option>)}
                      </select>
                    </div>
                  ))}

                  {unassignedStudents.length === 0 && unassignedTrainers.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      تم تصنيف الجميع بنجاح!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Swim Pool Lanes visual board */}
          <div className="lg:col-span-3 space-y-4">
            {activeSession ? (
              <>
                {/* Actions bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-lg">مخطط الحارات المائية للحصة</h4>
                    {isDirty && (
                      <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded animate-pulse">
                        يوجد تعديلات غير محفوظة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <button
                        onClick={handleReset}
                        className="text-slate-500 hover:text-slate-700 border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Undo2 size={14} />
                        إلغاء
                      </button>
                    )}
                    <button
                      onClick={handleSaveChanges}
                      disabled={!isDirty}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        isDirty 
                          ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Save size={14} />
                      حفظ توزيع المسارات
                    </button>
                  </div>
                </div>

                {/* Pool deck layout card list */}
                <div className="space-y-4">
                  {laneLanesData.map(({ lane, swimmers, coaches, isMixedAlert, capacityRatio }) => (
                    <div 
                      key={lane} 
                      className="bg-white rounded-2xl border border-slate-200/95 overflow-hidden shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 hover:border-blue-200 transition-colors"
                    >
                      {/* Lane Header Banner */}
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white font-bold flex flex-col justify-between items-center md:w-[130px] shrink-0 text-center gap-2">
                        <span className="text-[10px] uppercase text-blue-100 tracking-wider">الممر الرياضي</span>
                        <div className="space-y-0.5">
                          <div className="text-xl">حارة {lane}</div>
                          <div className="text-[10px] text-blue-50/80 font-normal">Lane {lane}</div>
                        </div>
                        <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                          {swimmers.length} سباحين
                        </div>
                      </div>

                      {/* Lane swimmers and coaches container */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Lane coaches list */}
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-amber-600 font-extrabold block mb-2">
                              أطقم تدريب الممر ({coaches.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {coaches.map(t => (
                                <div key={t.id} className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                  <span>{t.name}</span>
                                  <button 
                                    onClick={() => removeTrainerFromLane(t.id)}
                                    className="text-amber-500 hover:text-rose-600 text-[10px] font-semibold"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {coaches.length === 0 && (
                                <div className="text-[11px] text-slate-400 italic py-1">
                                  لا يوجد مدرب مخصص للحارة
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Swimmers list */}
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-blue-600 font-extrabold block mb-2">
                              سباحي الحارة الموزعين ({swimmers.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 flex-1 align-start">
                              {swimmers.map(s => (
                                <div 
                                  key={s.id} 
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                                    s.level === 'مبتدئ' 
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                                      : s.level === 'متوسط' 
                                        ? 'bg-blue-50 text-blue-900 border-blue-200' 
                                        : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                  }`}
                                >
                                  <span>{s.full_name}</span>
                                  <span className="text-[9px] scale-95 opacity-70">({s.level})</span>
                                  <button 
                                    onClick={() => removeStudentFromLane(s.id)}
                                    className="text-slate-400 hover:text-rose-600 text-xs font-bold"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {swimmers.length === 0 && (
                                <span className="text-[11px] text-slate-400 italic py-1">
                                  الممر فارغ، اسحب أو اختر طلاباً لتوزيعهم هنا
                                </span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Lane bottom stats and intelligent advice */}
                        <div className="pt-3 border-t border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          
                          {/* Recommended density bar */}
                          <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-[300px]">
                            <span className="text-[10px] text-slate-400 font-bold shrink-0">تحريص الكثافة:</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  swimmers.length > 5 
                                    ? 'bg-rose-500' 
                                    : swimmers.length === 5 
                                      ? 'bg-amber-500' 
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(capacityRatio, 100)}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold shrink-0 ${
                              swimmers.length > 5 ? 'text-rose-600' : 'text-slate-500'
                            }`}>
                              {swimmers.length}/5 طلاب
                            </span>
                          </div>

                          {/* Advisory Intelligent Alert */}
                          {isMixedAlert && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 flex-1 md:max-w-[450px]">
                              <ShieldAlert size={14} className="shrink-0 text-rose-500" />
                              <span>
                                <strong>تنبيه تصادم المسار الذكي:</strong> يوجد مبتدئين مع متقدمين بنفس الحارة. يفضل إعادة توجيههم لمنع تصادم السرعات!
                              </span>
                            </div>
                          )}

                          {swimmers.length > 5 && (
                            <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5">
                              <ShieldAlert size={14} className="shrink-0 text-amber-500" />
                              <span>الممر مزدحم فوق الكثافة المثالية المريحة (5 سباحين).</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[400px] border border-slate-200 bg-white rounded-3xl flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-2">
                <ChevronRight className="animate-pulse text-blue-300 mb-2" size={32} />
                <p className="font-bold text-slate-500 text-sm">حدد حصة سباحة معينة من القائمة الجانبية لتعديل الحارات</p>
                <p className="text-slate-300 text-xs text-center max-w-[280px]">يمكنك تتبع توزيع كل ممر مائي بدقة وحل مشكلات التوافقية بشكل لحظي.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
