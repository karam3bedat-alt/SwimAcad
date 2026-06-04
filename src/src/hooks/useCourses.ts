import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { CourseCycle } from '../types';
import { cleanFirestoreData } from '../services/firebaseService';

const COLLECTION_NAME = 'courses';

export function useCourses() {
  return useQuery({
    queryKey: [COLLECTION_NAME],
    queryFn: async () => {
      const q = query(collection(db, COLLECTION_NAME), orderBy('start_date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseCycle));
    }
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: [COLLECTION_NAME, id],
    queryFn: async () => {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Course not found');
      return { id: docSnap.id, ...docSnap.data() } as CourseCycle;
    },
    enabled: !!id
  });
}

export function useAddCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (course: Omit<CourseCycle, 'id'>) => {
      const cleaned = cleanFirestoreData(course);
      const docRef = await addDoc(collection(db, COLLECTION_NAME), cleaned);
      return { id: docRef.id, ...course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_NAME] });
    }
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CourseCycle> }) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      const cleaned = cleanFirestoreData(data);
      await updateDoc(docRef, cleaned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_NAME] });
    }
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_NAME] });
    }
  });
}
