import { useQuery } from '@tanstack/react-query';
import { studentsService, trainersService, sessionsService, paymentsService } from '../services/firebaseService';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [students, trainers, sessions, payments] = await Promise.all([
        studentsService.getAll(),
        trainersService.getAll(),
        sessionsService.getAll(),
        paymentsService.getAll()
      ]);

      // حساب الإيرادات الكلية
      const totalRevenue = (payments as any[]).reduce((sum, payment) => sum + (payment.amount || 0), 0);

      return {
        studentsCount: students.length,
        trainersCount: trainers.length,
        sessionsCount: sessions.length,
        totalRevenue,
        recentPayments: payments.slice(0, 5)
      };
    },
    staleTime: 2 * 60 * 1000 // 2 دقيقة
  });
};
