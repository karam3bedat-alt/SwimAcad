import { useQuery } from '@tanstack/react-query';
import { studentsService, trainersService, sessionsService, paymentsService, bookingsService } from '../services/firebaseService';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [students, trainers, sessions, payments, bookings] = await Promise.all([
        studentsService.getAll(),
        trainersService.getAll(),
        sessionsService.getAll(),
        paymentsService.getAll(),
        bookingsService.getAll()
      ]);

      // حساب الإيرادات الكلية
      const totalRevenue = (payments as any[]).reduce((sum, payment) => sum + (payment.amount || 0), 0);

      return {
        studentsCount: students.length,
        trainersCount: trainers.length,
        sessionsCount: sessions.length,
        totalRevenue,
        recentPayments: payments.slice(0, 5),
        recentBookings: bookings.slice(0, 20)
      };
    },
    staleTime: 2 * 60 * 1000 // 2 دقيقة
  });
};
