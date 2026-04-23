import { auth, db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  runTransaction,
  increment,
  serverTimestamp,
  where,
  getDoc
} from 'firebase/firestore';

import { Student, Coach, Session, Booking, Payment, AppSettings, CoachAttendance, StudentEvaluation, StudentMedia } from '../types';

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
  async update(id: string, data: any): Promise<void> {
    const path = `students/${id}`;
    try {
      const docRef = doc(db, 'students', id);
      const updateData: any = { ...data };
      
      // If data is not using FieldValue, we can clean it, but usually we should just pass it
      // if it's a partial update.
      if (!updateData.updatedAt) {
        updateData.updatedAt = new Date().toISOString();
      }

      await updateDoc(docRef, updateData);
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
  
  async getById(id: string): Promise<Coach | null> {
    const path = `trainers/${id}`;
    try {
      const docRef = doc(db, 'trainers', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as Coach;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
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
  },

  async awardLoyaltyPoints(coachId: string, points: number): Promise<void> {
    const docRef = doc(db, 'trainers', coachId);
    try {
      await updateDoc(docRef, {
        loyalty_points: increment(points),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainers/${coachId}/loyalty_points`);
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
  },

  async add(sessionData: Omit<Session, 'id'>): Promise<Session> {
    const path = 'sessions';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...sessionData,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, ...sessionData } as Session;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
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
      
      let createdPayment: Payment | null = null;
      
      await runTransaction(db, async (transaction) => {
        // 1. PERFORM ALL READS FIRST
        let studentDoc = null;
        let studentRef = null;
        if (paymentData.student_id) {
          studentRef = doc(db, 'students', paymentData.student_id);
          studentDoc = await transaction.get(studentRef);
        }

        // 2. PERFORM ALL WRITES SECOND
        const paymentRef = doc(collection(db, 'payments'));
        const date = new Date().toISOString();
        const paymentRecord = {
          ...paymentData,
          date,
          createdAt: date
        };
        
        transaction.set(paymentRef, paymentRecord);

        // Update loyalty points if student exists
        if (studentDoc?.exists()) {
          const student = studentDoc.data() as Student;
          const currentPoints = student.loyalty_points || 0;
          
          // Rule: 10 points per payment, use 100 for discount
          let pointsChange = 10;
          if (currentPoints >= 100) {
            pointsChange = -90; // -100 (used) + 10 (earned)
          }
          
          transaction.update(studentRef!, {
            loyalty_points: increment(pointsChange),
            updatedAt: new Date().toISOString()
          });
        }
        
        createdPayment = { id: paymentRef.id, ...paymentRecord } as Payment;
      });
      
      return createdPayment!;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async update(id: string, data: Partial<Payment>): Promise<void> {
    const path = `payments/${id}`;
    try {
      const docRef = doc(db, 'payments', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
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

// خدمة حضور المدربين
export const coachAttendanceService = {
  async getAll(coachId?: string): Promise<CoachAttendance[]> {
    const path = 'coach_attendance';
    try {
      let q;
      if (coachId) {
        q = query(collection(db, path), where('coach_id', '==', coachId), orderBy('date', 'desc'));
      } else {
        q = query(collection(db, path), orderBy('date', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      } as CoachAttendance));
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        console.warn('Firestore Permission Denied (Handled): ', path);
        return [];
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async checkIn(coachId: string, coachName: string): Promise<CoachAttendance> {
    const path = 'coach_attendance';
    try {
      const today = new Date().toISOString().split('T')[0];
      const checkInTime = new Date().toISOString();
      
      const attendanceData: Omit<CoachAttendance, 'id'> = {
        coach_id: coachId,
        coach_name: coachName,
        date: today,
        check_in: checkInTime,
        status: 'حاضر'
      };

      const docRef = await addDoc(collection(db, path), attendanceData);
      return { id: docRef.id, ...attendanceData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async checkOut(id: string, coachId: string): Promise<void> {
    const path = `coach_attendance/${id}`;
    try {
      const { runTransaction, increment } = await import('firebase/firestore');
      const docRef = doc(db, 'coach_attendance', id);
      const coachRef = doc(db, 'trainers', coachId);
      
      await runTransaction(db, async (transaction) => {
        const attendanceDoc = await transaction.get(docRef);
        if (!attendanceDoc.exists()) throw new Error('سجل الحضور غير موجود');
        
        const data = attendanceDoc.data() as CoachAttendance;
        const checkOutTime = new Date().toISOString();
        const duration = Math.round((new Date(checkOutTime).getTime() - new Date(data.check_in).getTime()) / (1000 * 60));
        
        transaction.update(docRef, {
          check_out: checkOutTime,
          duration_minutes: duration
        });

        // Award loyalty points to coach (e.g., 10 points per session)
        transaction.update(coachRef, {
          loyalty_points: increment(10),
          updatedAt: new Date().toISOString()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
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

export const studentMediaService = {
  async getAll(studentId: string): Promise<StudentMedia[]> {
    try {
      const q = query(
        collection(db, 'student_media'),
        where('student_id', '==', studentId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentMedia[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `student_media/${studentId}`);
      return [];
    }
  },
  async add(data: Omit<StudentMedia, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'student_media'), data);
      
      // Award 5 loyalty points for coach
      if (data.coach_id) {
        await trainersService.awardLoyaltyPoints(data.coach_id, 5);
      }

      // Award 5 loyalty points for student
      if (data.student_id) {
        await studentsService.update(data.student_id, {
          loyalty_points: increment(5)
        });
      }
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'student_media');
      throw error;
    }
  }
};

export const studentEvaluationsService = {
  async getAll(studentId: string): Promise<StudentEvaluation[]> {
    try {
      const q = query(
        collection(db, 'student_evaluations'),
        where('student_id', '==', studentId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentEvaluation[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `student_evaluations/${studentId}`);
      return [];
    }
  },
  async add(data: Omit<StudentEvaluation, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'student_evaluations'), data);
      
      // Award 10 loyalty points for coach for detailed evaluation
      if (data.coach_id) {
        await trainersService.awardLoyaltyPoints(data.coach_id, 10);
      }

      // Award 10 loyalty points for student
      if (data.student_id) {
        await studentsService.update(data.student_id, {
          loyalty_points: increment(10)
        });
      }
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'student_evaluations');
      throw error;
    }
  }
};
