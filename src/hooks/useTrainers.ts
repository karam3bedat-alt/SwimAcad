import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainersService, coachAttendanceService, coachEvaluationsService, coachPayoutsService } from '../services/firebaseService';
import { Coach, CoachAttendance, CoachEvaluation, CoachPayout } from '../types';
import { useAuth } from '../AuthContext';

export const useTrainers = () => {
  return useQuery<Coach[]>({
    queryKey: ['trainers'],
    queryFn: trainersService.getAll
  });
};

export const useTrainer = (id: string) => {
  return useQuery<Coach | null>({
    queryKey: ['trainers', id],
    queryFn: () => trainersService.getById(id),
    enabled: !!id
  });
};

export const useCoachAttendance = (coachId?: string) => {
  const { isAdmin, isCoach, user, loading } = useAuth();
  
  const isEnabled = !loading && !!user && (
    isAdmin() || 
    (isCoach() && !!coachId && coachId === user?.uid)
  );

  return useQuery<CoachAttendance[]>({
    queryKey: ['coachAttendance', coachId],
    queryFn: () => coachAttendanceService.getAll(coachId),
    enabled: isEnabled
  });
};

export const useCoachCheckIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ coachId, coachName }: { coachId: string, coachName: string }) => 
      coachAttendanceService.checkIn(coachId, coachName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAttendance'] });
    }
  });
};

export const useCoachMarkAbsent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ coachId, coachName }: { coachId: string, coachName: string }) => 
      coachAttendanceService.markAbsent(coachId, coachName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAttendance'] });
    }
  });
};

export const useCoachCheckOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, coachId, lessonsCount }: { id: string, coachId: string, lessonsCount?: number }) => 
      coachAttendanceService.checkOut(id, coachId, lessonsCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
    }
  });
};

export const useAddCoachAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CoachAttendance, 'id'>) => coachAttendanceService.addManual(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAttendance'] });
    }
  });
};

export const useAddTrainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (trainerData: Omit<Coach, 'id'>) => trainersService.add(trainerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

export const useUpdateTrainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coach> }) => trainersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

export const useDeleteTrainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => trainersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};

// خطافات التقييم للمدربين
export const useCoachEvaluations = (coachId?: string) => {
  return useQuery<CoachEvaluation[]>({
    queryKey: ['coachEvaluations', coachId],
    queryFn: () => coachId ? coachEvaluationsService.getByCoachId(coachId) : coachEvaluationsService.getAll(),
    enabled: true
  });
};

export const useAddCoachEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CoachEvaluation, 'id'>) => coachEvaluationsService.add(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coachEvaluations', variables.coach_id] });
      queryClient.invalidateQueries({ queryKey: ['coachEvaluations'] });
    }
  });
};

export const useDeleteCoachEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, coachId }: { id: string; coachId: string }) => coachEvaluationsService.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coachEvaluations', variables.coachId] });
      queryClient.invalidateQueries({ queryKey: ['coachEvaluations'] });
    }
  });
};

// خطافات مدفوعات المدربين
export const useCoachPayouts = (coachId?: string) => {
  return useQuery<CoachPayout[]>({
    queryKey: ['coachPayouts', coachId],
    queryFn: () => coachId ? coachPayoutsService.getByCoachId(coachId) : coachPayoutsService.getAll(),
    enabled: true
  });
};

export const useAddCoachPayout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CoachPayout, 'id'>) => coachPayoutsService.add(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coachPayouts', variables.coach_id] });
      queryClient.invalidateQueries({ queryKey: ['coachPayouts'] });
    }
  });
};
