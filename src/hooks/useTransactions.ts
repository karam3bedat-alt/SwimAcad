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
      toast.success('تمت العملية بنجاح');
    }
  });
};
