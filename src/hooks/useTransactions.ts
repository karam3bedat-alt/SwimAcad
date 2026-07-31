import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsService } from '../services/firebaseService';
import { Transaction } from '../types';
import { toast } from 'react-hot-toast';

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: transactionsService.getAll
  });
};

export const useAddTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Transaction, 'id'>) => transactionsService.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] }); // Because loyalty points or remaining sessions might change
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Because stock changed
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); // Because revenue counts may update
      toast.success('تمت العملية بنجاح');
    }
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) =>
      transactionsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('تم تحديث العملية بنجاح');
    }
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('تم حذف العملية بنجاح');
    }
  });
};
