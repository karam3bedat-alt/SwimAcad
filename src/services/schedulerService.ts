import { messageTemplates, NotificationTypes, generateMockPaymentLink, NotificationType } from './notificationService';
import { createWhatsAppLink } from '../utils/whatsapp';
import { Student, Payment } from '../types';

export interface ScheduledNotification {
  id: string;
  type: NotificationType;
  studentId: string;
  phone: string;
  subject: string;
  message: string;
  urgency: 'low' | 'normal' | 'high';
  createdAt: string;
  status: 'pending' | 'sent';
  amount: number;
  scheduledTime?: Date;
  sentAt?: string;
}

class NotificationScheduler {
  scheduledNotifications: ScheduledNotification[] = [];

  // Calculate overdue payments
  calculateOverduePayments(students: Student[], payments: Payment[], currentMonthName: string, coursePrices?: Record<string, number>) {
    const overdue: { student: Student; daysOverdue: number; amount: number; dueDate: string }[] = [];
    
    // Map month name to number (0-11)
    const monthsMap: Record<string, number> = {
      'يناير': 0, 'فبراير': 1, 'مارس': 2, 'أبريل': 3, 'مايو': 4, 'يونيو': 5,
      'يوليو': 6, 'أغسطس': 7, 'سبتمبر': 8, 'أكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11
    };
    
    const targetMonth = monthsMap[currentMonthName] ?? new Date().getMonth();
    const currentYear = new Date().getFullYear();

    students?.forEach(student => {
      // Check if there's a payment for the target month
      const hasPaid = payments?.some(p => {
        const pDate = new Date(p.date);
        return p.student_id === student.id && 
               p.month === currentMonthName;
      });

      if (!hasPaid) {
        const dueDate = new Date(currentYear, targetMonth, 1); // First of the month
        
        const today = new Date();
        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const amount = student.custom_fee || (coursePrices && coursePrices[student.course_type]) || this.calculateMonthlyFee(student.level);

        overdue.push({
          student,
          daysOverdue: Math.max(0, daysOverdue),
          amount,
          dueDate: dueDate.toLocaleDateString('ar-SA')
        });
      }
    });

    return overdue;
  }

  // Calculate fee based on level
  calculateMonthlyFee(level: string) {
    const fees: Record<string, number> = {
      'مبتدئ': 400,
      'متوسط': 500,
      'متقدم': 600,
      'احترافي': 700
    };
    return fees[level] || 400;
  }

  // Generate automatic payment notifications
  generatePaymentNotifications(overduePayments: { student: Student; daysOverdue: number; amount: number; dueDate: string }[], currentMonth: string): ScheduledNotification[] {
    return overduePayments.map(({ student, daysOverdue, amount, dueDate }) => {
      const type = daysOverdue > 5 
        ? NotificationTypes.PAYMENT_OVERDUE 
        : NotificationTypes.PAYMENT_DUE;

      const template = messageTemplates[type]({
        parentName: student.parent_name || 'ولي الأمر',
        studentName: student.full_name,
        amount,
        month: currentMonth,
        dueDate,
        daysOverdue,
        paymentLink: generateMockPaymentLink(student.id, amount, currentMonth)
      });

      return {
        id: `pay_${student.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        studentId: student.id,
        phone: student.phone || student.parent_phone || '',
        ...template,
        createdAt: new Date().toISOString(),
        status: 'pending',
        amount
      };
    });
  }

  // Detect consecutive absences (more than 2 consecutive)
  detectConsecutiveAbsences(students: Student[], bookings: any[]) {
    const alerts: { student: Student; consecutiveDays: number }[] = [];
    
    students.forEach(student => {
      const studentBookings = bookings
        .filter(b => b.student_id === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Latest first
      
      let consecutiveAbsences = 0;
      for (const booking of studentBookings) {
        if (booking.status === 'غائب') {
          consecutiveAbsences++;
        } else if (booking.status === 'حضر') {
          break; // Streak broken
        }
      }
      
      if (consecutiveAbsences > 2) {
        alerts.push({ student, consecutiveDays: consecutiveAbsences });
      }
    });
    
    return alerts;
  }

  // Generate absence notifications
  generateAbsenceNotifications(absenceAlerts: { student: Student; consecutiveDays: number }[]): ScheduledNotification[] {
    return absenceAlerts.map(({ student, consecutiveDays }) => {
      const template = messageTemplates[NotificationTypes.ABSENCE_NOTICE]({
        parentName: student.parent_name || 'ولي الأمر',
        studentName: student.full_name,
        amount: 0,
        month: '',
      });

      return {
        id: `abs_${student.id}_${Date.now()}`,
        type: NotificationTypes.ABSENCE_NOTICE,
        studentId: student.id,
        phone: student.phone || student.parent_phone || '',
        ...template,
        createdAt: new Date().toISOString(),
        status: 'pending',
        amount: 0
      };
    });
  }

  // Send WhatsApp immediately
  sendWhatsApp(notification: ScheduledNotification) {
    if (!notification.phone) {
      console.error('لا يوجد رقم هاتف');
      return null;
    }

    const link = createWhatsAppLink(notification.phone, notification.message);
    window.open(link, '_blank');
    
    // Update status
    notification.status = 'sent';
    notification.sentAt = new Date().toISOString();
    
    return link;
  }
}

export const scheduler = new NotificationScheduler();
