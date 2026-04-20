import { auth, db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy 
} from 'firebase/firestore';

import { Student, Coach, Session, Booking, Payment, AppSettings } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// خدمة الطلاب
export const studentsService = {
  // جلب جميع الطلاب
  async getAll(): Promise<Student[]> {
    const path = 'students';
    try {
      const q = query(collection(db, path), orderBy('full_name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Student));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // إضافة طالب جديد
  async add(studentData: Omit<Student, 'id'>): Promise<Student> {
    const path = 'students';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...studentData,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, ...studentData } as Student;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  // تحديث طالب
  async update(id: string, data: Partial<Student>): Promise<void> {
    const path = `students/${id}`;
    try {
      const docRef = doc(db, 'students', id);
      // Clean up undefined values
      const cleanData = JSON.parse(JSON.stringify(data));
      await updateDoc(docRef, {
        ...cleanData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // حذف طالب
  async delete(id: string) {
    const path = `students/${id}`;
    try {
      const docRef = doc(db, 'students', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

// خدمة المدربين
export const trainersService = {
  async getAll(): Promise<Coach[]> {
    const path = 'trainers';
    try {
      const q = query(collection(db, path), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Coach));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  
  async add(trainerData: Omit<Coach, 'id'>): Promise<Coach> {
    const path = 'trainers';
    try {
      const docRef = await addDoc(collection(db, path), trainerData);
      return { id: docRef.id, ...trainerData } as Coach;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async update(id: string, data: Partial<Coach>): Promise<void> {
    const path = `trainers/${id}`;
    try {
      const docRef = doc(db, 'trainers', id);
      const cleanData = JSON.parse(JSON.stringify(data));
      await updateDoc(docRef, {
        ...cleanData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async delete(id: string) {
    const path = `trainers/${id}`;
    try {
      const docRef = doc(db, 'trainers', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

// خدمة الحصص
export const sessionsService = {
  async getAll(): Promise<Session[]> {
    const path = 'sessions';
    try {
      const q = query(collection(db, path), orderBy('day'), orderBy('start_time'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Session));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async delete(id: string) {
    const path = `sessions/${id}`;
    try {
      const docRef = doc(db, 'sessions', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

// خدمة الحجوزات
export const bookingsService = {
  async getAll(): Promise<Booking[]> {
    const path = 'bookings';
    try {
      const q = query(collection(db, path), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Booking));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async add(bookingData: Omit<Booking, 'id'>): Promise<Booking> {
    const path = 'bookings';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...bookingData,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, ...bookingData } as Booking;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async updateStatus(id: string, status: string) {
    const path = `bookings/${id}`;
    try {
      const docRef = doc(db, 'bookings', id);
      await updateDoc(docRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async delete(id: string) {
    const path = `bookings/${id}`;
    try {
      const docRef = doc(db, 'bookings', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

// خدمة المدفوعات
export const paymentsService = {
  async getAll(): Promise<Payment[]> {
    const path = 'payments';
    try {
      const q = query(collection(db, path), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async add(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
    const path = 'payments';
    try {
      const { runTransaction, increment } = await import('firebase/firestore');
      
      let finalPayment = { ...paymentData };
      
      await runTransaction(db, async (transaction) => {
        // 1. Add the payment record
        const paymentRef = doc(collection(db, 'payments'));
        transaction.set(paymentRef, {
          ...paymentData,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });

        // 2. Update student loyalty points if student_id exists
        if (paymentData.student_id) {
          const studentRef = doc(db, 'students', paymentData.student_id);
          const studentDoc = await transaction.get(studentRef);
          
          if (studentDoc.exists()) {
            const student = studentDoc.data() as Student;
            const currentPoints = student.loyalty_points || 0;
            
            // If they have 100 points, they've used the discount now?
            // Actually, the user says "after reaching 100 points, they are given a discount for the next month".
            // So if currentPoints >= 100 before this payment, we subtract 100.
            // And then we add 10 for this renewal.
            
            let pointsChange = 10;
            if (currentPoints >= 100) {
              pointsChange = -90; // -100 + 10
            }
            
            transaction.update(studentRef, {
              loyalty_points: increment(pointsChange),
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
      
      return { id: 'transactional', ...finalPayment } as Payment;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async delete(id: string) {
    const path = `payments/${id}`;
    try {
      const docRef = doc(db, 'payments', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

// خدمة الإعدادات
export const settingsService = {
  async getSettings(): Promise<AppSettings | null> {
    const path = 'settings/app_config';
    try {
      const docRef = doc(db, 'settings', 'app_config');
      const snapshot = await getDocs(query(collection(db, 'settings')));
      const configDoc = snapshot.docs.find(d => d.id === 'app_config');
      return configDoc ? (configDoc.data() as AppSettings) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async updateSettings(data: Partial<AppSettings>): Promise<void> {
    const path = 'settings/app_config';
    try {
      const docRef = doc(db, 'settings', 'app_config');
      // Using setDoc with merge: true to create if doesn't exist
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
