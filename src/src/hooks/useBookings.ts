import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '../services/firebaseService';
import { Booking } from '../types';

export const useBookings = () => {
  return useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: bookingsService.getAll
  });
};

export const useAddBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bookingData: Omit<Booking, 'id'>) => bookingsService.add(bookingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bookingsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

export const useDeleteBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => bookingsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};
