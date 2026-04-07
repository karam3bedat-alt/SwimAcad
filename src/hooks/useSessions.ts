import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsService } from '../services/firebaseService';
import { Session } from '../types';

export const useSessions = () => {
  return useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: sessionsService.getAll
  });
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => sessionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });
};
