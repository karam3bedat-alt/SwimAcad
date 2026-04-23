import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService, studentMediaService, studentEvaluationsService } from '../services/firebaseService';
import { Student, StudentMedia, StudentEvaluation } from '../types';

// ... (previous hooks)

// Hook لتاريخ ميديا الطالب
export const useStudentMedia = (studentId: string) => {
  return useQuery<StudentMedia[]>({
    queryKey: ['student_media', studentId],
    queryFn: () => studentMediaService.getAll(studentId),
    enabled: !!studentId
  });
};

export const useAddStudentMedia = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StudentMedia, 'id'>) => studentMediaService.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_media', studentId] });
    }
  });
};

// Hook لتقييمات الطالب
export const useStudentEvaluations = (studentId: string) => {
  return useQuery<StudentEvaluation[]>({
    queryKey: ['student_evaluations', studentId],
    queryFn: () => studentEvaluationsService.getAll(studentId),
    enabled: !!studentId
  });
};

export const useAddStudentEvaluation = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StudentEvaluation, 'id'>) => studentEvaluationsService.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_evaluations', studentId] });
    }
  });
};

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
