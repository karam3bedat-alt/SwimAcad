import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '../services/firebaseService';
import { Student } from '../types';

// Hook لجلب الطلاب
export const useStudents = () => {
  return useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: studentsService.getAll
  });
};

// Hook لإضافة طالب
export const useAddStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (studentData: Omit<Student, 'id'>) => studentsService.add(studentData),
    onSuccess: () => {
      // إعادة جلب قائمة الطلاب بعد الإضافة
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });
};

// Hook لتحديث طالب
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => studentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });
};

// Hook لحذف طالب
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => studentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });
};
