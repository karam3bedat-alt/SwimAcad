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

import { Student, Coach, Session, Booking, Payment, AppSettings, CoachAttendance, StudentEvaluation, StudentMedia, Product, Transaction, TransactionItem } from '../types';

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

export const logLoyaltyPoints = async (studentId: string, points: number, reason: string, type: 'earned' | 'spent') => {
  try {
    const logRef = collection(db, 'students', studentId, 'points_history');
    await addDoc(logRef, {
      points,
      reason,
      type,
      date: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging points:', error);
  }
};

export const calculateTier = (lifetimePoints: number): 'برونزي' | 'فضي' | 'ذهبي' => {
  if (lifetimePoints >= 1501) return 'ذهبي';
  if (lifetimePoints >= 501) return 'فضي';
  return 'برونزي';
};

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

export function cleanFirestoreData(data: any) {
  // Remove undefined values which are not allowed in Firestore
  // JSON stringify/parse is a simple way to remove undefined in deeply nested objects
  // but it also removes class instances like Date (converts to string)
  // For Firestore, we usually want to keep standard types but remove undefined.
  if (data === null || typeof data !== 'object') return data;
  
  const result: any = Array.isArray(data) ? [] : {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        result[key] = cleanFirestoreData(value);
      } else {
        result[key] = value;
      }
    }
  });
  
  return result;
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
      const cleaned = cleanFirestoreData(studentData);
      const docRef = await addDoc(collection(db, path), {
        ...cleaned,
        current_points: 50, // 50 welcome points
        lifetime_points: 50,
        loyalty_tier: 'برونزي',
        createdAt: new Date().toISOString()
      });
      
      await logLoyaltyPoints(docRef.id, 50, 'نقاط ترحيبية للتسجيل الجديد', 'earned');

      return { id: docRef.id, ...studentData, current_points: 50, lifetime_points: 50, loyalty_tier: 'برونزي' } as Student;
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
      const cleaned = cleanFirestoreData(data);
      const updateData: any = { ...cleaned };
      
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
      const cleaned = cleanFirestoreData(trainerData);
      const docRef = await addDoc(collection(db, path), cleaned);
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
      const cleaned = cleanFirestoreData(data);
      await updateDoc(docRef, {
        ...cleaned,
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
      const cleaned = cleanFirestoreData(sessionData);
      const docRef = await addDoc(collection(db, path), {
        ...cleaned,
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
      const cleaned = cleanFirestoreData(bookingData);
      const docRef = await addDoc(collection(db, path), {
        ...cleaned,
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
      const bookingSnap = await getDoc(docRef);
      const bookingData = bookingSnap.data() as Booking;

      await runTransaction(db, async (transaction) => {
        transaction.update(docRef, { status });

        // If attended, award points
        if (status === 'حضر' && bookingData.status !== 'حضر') {
          const studentRef = doc(db, 'students', bookingData.student_id);
          const studentSnap = await transaction.get(studentRef);
          
          if (studentSnap.exists()) {
            const student = studentSnap.data() as Student;
            const pointsEarned = 5; // Attendance point
            
            // Check for streak (8 sessions)
            // This is simplified here, but in a real app would check previous 7 bookings
            
            const newLifetime = (student.lifetime_points || 0) + pointsEarned;
            const newTier = calculateTier(newLifetime);

            transaction.update(studentRef, {
              current_points: increment(pointsEarned),
              lifetime_points: increment(pointsEarned),
              loyalty_tier: newTier,
              updatedAt: new Date().toISOString()
            });

            // Log History
            const logRef = doc(collection(db, 'students', bookingData.student_id, 'points_history'));
            transaction.set(logRef, {
              points: pointsEarned,
              reason: 'حضور حصة تدريبية',
              type: 'earned',
              date: new Date().toISOString()
            });
          }
        }
      });
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
        const paymentRecord = cleanFirestoreData({
          ...paymentData,
          date,
          createdAt: date
        });
        
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
      const cleaned = cleanFirestoreData(data);
      await updateDoc(docRef, {
        ...cleaned,
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

      const cleaned = cleanFirestoreData(attendanceData);
      const docRef = await addDoc(collection(db, path), cleaned);
      return { id: docRef.id, ...attendanceData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async markAbsent(coachId: string, coachName: string): Promise<CoachAttendance> {
    const path = 'coach_attendance';
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceData: Omit<CoachAttendance, 'id'> = {
        coach_id: coachId,
        coach_name: coachName,
        date: today,
        check_in: new Date().toISOString(),
        status: 'غائب'
      };

      const cleaned = cleanFirestoreData(attendanceData);
      const docRef = await addDoc(collection(db, path), cleaned);
      return { id: docRef.id, ...attendanceData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async checkOut(id: string, coachId: string, lessonsCount?: number): Promise<void> {
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
          duration_minutes: duration,
          lessons_count: lessonsCount || 0
        });

        // Award loyalty points to coach (e.g., 10 points per checkout + 10 points per lesson)
        const totalPoints = 10 + (lessonsCount ? lessonsCount * 10 : 0);
        transaction.update(coachRef, {
          loyalty_points: increment(totalPoints),
          updatedAt: new Date().toISOString()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  async addManual(data: Omit<CoachAttendance, 'id'>): Promise<string> {
    const path = 'coach_attendance';
    try {
      const cleaned = cleanFirestoreData(data);
      const docRef = await addDoc(collection(db, path), {
        ...cleaned,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
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
      const cleaned = cleanFirestoreData(data);
      await setDoc(docRef, cleaned, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};

// خدمة المنتجات والمخزون
export const productsService = {
  async getAll(): Promise<Product[]> {
    const path = 'products';
    try {
      const q = query(collection(db, path), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async add(productData: Omit<Product, 'id'>): Promise<Product> {
    const path = 'products';
    try {
      const cleaned = cleanFirestoreData(productData);
      const docRef = await addDoc(collection(db, path), {
        ...cleaned,
        createdAt: new Date().toISOString()
      });
      return { id: docRef.id, ...productData } as Product;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async update(id: string, data: Partial<Product>): Promise<void> {
    const path = `products/${id}`;
    try {
      const docRef = doc(db, 'products', id);
      const cleaned = cleanFirestoreData(data);
      await updateDoc(docRef, {
        ...cleaned,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async delete(id: string) {
    const path = `products/${id}`;
    try {
      const docRef = doc(db, 'products', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

// خدمة المعاملات الشاملة
export const transactionsService = {
  async getAll(): Promise<Transaction[]> {
    const path = 'transactions';
    try {
      const q = query(collection(db, path), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async add(transactionData: Omit<Transaction, 'id'>): Promise<Transaction> {
    const path = 'transactions';
    try {
      const { runTransaction, increment } = await import('firebase/firestore');
      
      let createdTransaction: Transaction | null = null;
      
      await runTransaction(db, async (txn) => {
        // 1. PERFORM ALL READS
        let studentDoc = null;
        let studentRef = null;
        if (transactionData.student_id) {
          studentRef = doc(db, 'students', transactionData.student_id);
          studentDoc = await txn.get(studentRef);
        }

        // Get products to check/update stock
        const productItems = transactionData.items.filter(item => item.type === 'product');
        const productRefs = productItems.map(item => ({
          ref: doc(db, 'products', item.id),
          quantity: item.quantity
        }));

        for (const p of productRefs) {
          const pDoc = await txn.get(p.ref);
          if (!pDoc.exists()) throw new Error(`المنتج غير موجود`);
          const product = pDoc.data() as Product;
          if (product.stock < p.quantity) {
            throw new Error(`المخزون غير كافٍ للمنتج: ${product.name}`);
          }
        }

        // 2. PERFORM ALL WRITES
        const transRef = doc(collection(db, 'transactions'));
        const date = new Date().toISOString();
        const transactionRecord = cleanFirestoreData({
          ...transactionData,
          date,
          createdAt: date
        });
        
        txn.set(transRef, transactionRecord);

        // Update Stock
        for (const p of productRefs) {
          txn.update(p.ref, {
            stock: increment(-p.quantity),
            updatedAt: new Date().toISOString()
          });
        }

        // Update Student Loyalty Points
        if (studentDoc?.exists()) {
          const student = studentDoc.data() as Student;
          
          // Logic for points:
          // 1. Subscription points: 10 points per 10 currency spent (1:1 ratio effectively for currency units)
          // Actually user said: 10 points per 10 units = 1 point per 1 unit.
          // 2. Product points: 1 point per 1 unit.
          // 3. Early renewal: 25 points if renewed 3 days early.
          
          const subscriptionTotal = transactionData.items
            .filter(i => i.type === 'subscription')
            .reduce((sum, i) => sum + i.total, 0);
          
          const productTotal = transactionData.items
            .filter(i => i.type === 'product')
            .reduce((sum, i) => sum + i.total, 0);

          let pointsEarned = Math.floor(subscriptionTotal) + Math.floor(productTotal);

          // Check early renewal (simplified: if student has end_date and now < end_date - 3 days)
          if (student.subscription_end_date) {
            const endDate = new Date(student.subscription_end_date);
            const now = new Date();
            const threeDaysBefore = new Date(endDate);
            threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
            
            if (now < threeDaysBefore) {
              pointsEarned += 25; // Early renewal bonus
            }
          }

          let pointsChange = pointsEarned;
          if (transactionData.loyalty_points_used && transactionData.loyalty_points_used > 0) {
            pointsChange = pointsEarned - transactionData.loyalty_points_used;
          }
          
          const newLifetimePoints = (student.lifetime_points || 0) + pointsEarned;
          const newTier = calculateTier(newLifetimePoints);

          txn.update(studentRef!, {
            current_points: increment(pointsChange),
            lifetime_points: increment(pointsEarned),
            loyalty_tier: newTier,
            updatedAt: new Date().toISOString()
          });

          // Record earned points in transaction
          txn.update(transRef, { loyalty_points_earned: pointsEarned });

          // Log History
          const logRef = doc(collection(db, 'students', transactionData.student_id, 'points_history'));
          txn.set(logRef, {
            points: pointsEarned,
            reason: 'عملية شراء وتجديد',
            type: 'earned',
            date: new Date().toISOString()
          });

          if (transactionData.loyalty_points_used && transactionData.loyalty_points_used > 0) {
            const spendRef = doc(collection(db, 'students', transactionData.student_id, 'points_history'));
            txn.set(spendRef, {
              points: transactionData.loyalty_points_used,
              reason: 'استبدال مكافأة',
              type: 'spent',
              date: new Date().toISOString()
            });
          }
        }
        
        createdTransaction = { id: transRef.id, ...transactionRecord } as Transaction;
      });
      
      return createdTransaction!;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
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
      const cleaned = cleanFirestoreData(data);
      const docRef = await addDoc(collection(db, 'student_media'), cleaned);
      
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
      const cleaned = cleanFirestoreData(data);
      const docRef = await addDoc(collection(db, 'student_evaluations'), cleaned);
      
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
