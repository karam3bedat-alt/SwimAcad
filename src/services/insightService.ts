import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  orderBy, 
  limit, 
  Timestamp, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Student, Payment, Booking, Coach } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface SmartInsight {
  id: string;
  title: string;
  desc: string;
  type?: 'warning' | 'info' | 'success';
  category: 'warning' | 'suggestion';
  createdAt: string;
  metadata?: any;
}

const INSIGHTS_COLLECTION = 'insights';
const METADATA_DOC = 'settings/insights_metadata';

export const insightService = {
  async getInsightsMetadata() {
    const docRef = doc(db, METADATA_DOC);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  },

  async getLatestInsights(): Promise<SmartInsight[]> {
    const q = query(collection(db, INSIGHTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...doc.data() } as SmartInsight));
  },

  async refreshInsights(data: {
    students: Student[];
    payments: Payment[];
    bookings: Booking[];
    trainers: Coach[];
    targetDate?: string;
  }) {
    // 1. Prepare data summary
    const today = data.targetDate ? new Date(data.targetDate) : new Date();
    const studentsInType: Record<string, number> = {};
    data.students.forEach(s => {
      const type = s.course_type || 'Other';
      studentsInType[type] = (studentsInType[type] || 0) + 1;
    });

    const summary = {
      targetDate: today.toISOString(),
      totalStudents: data.students.length,
      activeStudents: data.students.filter(s => s.status === 'نشط').length,
      inactiveStudents: data.students.filter(s => s.status === 'غير نشط').length,
      expiredStudents: data.students.filter(s => s.subscription_end_date && new Date(s.subscription_end_date) < today).map(s => ({ 
        name: s.full_name, 
        date: s.subscription_end_date 
      })),
      lowCreditStudents: data.students.filter(s => s.subscription_model === 'credit' && (s.remaining_sessions || 0) <= 2).map(s => ({
        name: s.full_name,
        remaining: s.remaining_sessions
      })),
      pendingPayments: (() => {
        const groups: Record<string, { total: number, required: number, name: string, course: string, month: string }> = {};
        const targetMonth = format(today, 'MMMM yyyy', { locale: ar });
        
        data.payments.forEach(p => {
          if (!p.student_id) return;
          const key = `${p.student_id}_${p.month || 'all'}`;
          if (!groups[key]) {
            groups[key] = { 
              total: 0, 
              required: 0, 
              name: p.student_name || 'Unknown', 
              course: p.course_type || '-',
              month: p.month || 'Other'
            };
          }
          groups[key].total += (p.amount || 0);
          groups[key].required = Math.max(groups[key].required, p.required_amount || 0);
        });

        // Filter for payments that are either for the target month or still pending from previous months
        return Object.values(groups)
          .filter(g => {
            const isFullyPaid = g.total >= (g.required * 0.99); // Use the 1% threshold
            const isTargetMonth = g.month.includes(targetMonth) || g.month === 'all';
            return !isFullyPaid && (isTargetMonth || g.total > 0); // Only return pending if it's the target month or a partial payment from before
          })
          .map(g => ({
            studentName: g.name,
            amountDue: Math.max(0, g.required - g.total),
            course: g.course,
            month: g.month
          }));
      })(),
      totalPaymentsAmount: data.payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      courseDistribution: studentsInType,
      trainersCount: data.trainers.length,
      bookingsCount: data.bookings.length,
      birthdays: data.students.filter(s => {
        if (!s.birth_date) return false;
        const bDate = new Date(s.birth_date);
        return bDate.getMonth() === today.getMonth();
      }).map(s => ({ name: s.full_name, day: new Date(s.birth_date!).getDate() }))
    };

    // 2. Call Gemini API via Proxy
    const response = await fetch('/api/insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataSummary: summary, targetDate: today.toISOString() })
    });

    if (!response.ok) throw new Error('Failed to generate insights');
    const { insights } = await response.json();

    // 3. Save to Firestore
    const batch = writeBatch(db);
    
    // Clear old insights first (optional, but requested daily fresh look)
    const oldInsights = await getDocs(collection(db, INSIGHTS_COLLECTION));
    oldInsights.forEach(d => batch.delete(d.ref));

    // Add new ones
    insights.forEach((insight: any) => {
      const docRef = doc(db, INSIGHTS_COLLECTION, insight.id);
      batch.set(docRef, {
        ...insight,
        createdAt: new Date().toISOString()
      });
    });

    // Update metadata
    const metaRef = doc(db, METADATA_DOC);
    batch.set(metaRef, { lastUpdated: new Date().toISOString() }, { merge: true });

    await batch.commit();
    return insights;
  }
};
