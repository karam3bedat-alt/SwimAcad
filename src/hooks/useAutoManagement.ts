import { useEffect, useRef } from 'react';
import { useStudents, useUpdateStudent } from './useStudents';
import { isBefore, parseISO } from 'date-fns';

export const useAutoManagement = () => {
  const { data: students = [] } = useStudents();
  const updateStudent = useUpdateStudent();
  const ranRef = useRef(false);

  useEffect(() => {
    // Only run this check once per session/reload to avoid infinite loops or heavy writes
    if (ranRef.current || students.length === 0 || updateStudent.isPending) return;

    const today = new Date();
    const studentsToUpdate = students.filter(s => {
      if (s.status === 'غير نشط') return false; // Already inactive
      if (!s.subscription_end_date) return false; // No end date
      
      try {
        const endDate = parseISO(s.subscription_end_date);
        return isBefore(endDate, today);
      } catch (e) {
        return false;
      }
    });

    if (studentsToUpdate.length > 0) {
      console.log(`Auto-Management: Found ${studentsToUpdate.length} expired students to deactivate`);
      ranRef.current = true;
      
      // Update them one by one or in batch if you have a batch service
      // For simplicity and to reuse hooks, we do them sequentially
      studentsToUpdate.forEach(student => {
        updateStudent.mutate({
          id: student.id,
          data: { status: 'غير نشط' }
        });
      });
    } else {
      ranRef.current = true;
    }
  }, [students, updateStudent]);
};
