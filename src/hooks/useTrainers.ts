import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainersService } from '../services/firebaseService';
import { Coach } from '../types';

export const useTrainers = () => {
  return useQuery<Coach[]>({
    queryKey: ['trainers'],
    queryFn: trainersService.getAll
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
