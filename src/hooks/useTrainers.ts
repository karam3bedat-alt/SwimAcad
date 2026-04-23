import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainersService, coachAttendanceService } from '../services/firebaseService';
import { Coach, CoachAttendance } from '../types';
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

export const useCoachCheckOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, coachId }: { id: string, coachId: string }) => 
      coachAttendanceService.checkOut(id, coachId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
    }
  });
};

export const useAddTrainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (trainerData: Omit<Coach, 'id'>) => trainersService.add(trainerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
    }
  });
};

export const useUpdateTrainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coach> }) => trainersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
    }
  });
};

export const useDeleteTrainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => trainersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
    }
  });
};
