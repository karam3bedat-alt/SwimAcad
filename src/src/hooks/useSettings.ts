import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/firebaseService';
import { AppSettings } from '../types';

export const useSettings = () => {
  return useQuery<AppSettings | null>({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => settingsService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });
};
