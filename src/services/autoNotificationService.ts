import { generatePaymentMessage, calculateMonthlyFee } from './paymentService';
import { createWhatsAppLink } from '../utils/whatsapp';
import { Student, Payment } from '../types';

export interface ScheduledNotification {
  id: string;
  type: 'reminder' | 'overdue';
  studentId: string;
  studentName: string;
  parentPhone: string;
  amount: number;
  month: string;
  scheduledDate: string;
  status: 'scheduled' | 'pending' | 'sent';
  message: string;
  urgency?: 'high' | 'medium' | 'low';
  sentAt?: string;
}

class AutoNotificationService {
  scheduledNotifications: ScheduledNotification[] = [];
  notificationHistory: ScheduledNotification[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.scheduledNotifications = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
      this.notificationHistory = JSON.parse(localStorage.getItem('notification_history') || '[]');
    }
  }

  // Schedule an automatic reminder
  scheduleReminder(student: Student, amount: number, month: string, daysBefore = 3, customConfig?: any) {
    const dueDate = new Date();
    dueDate.setDate(1); // First of the month
    
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(dueDate.getDate() - daysBefore);

    const notification: ScheduledNotification = {
      id: `remind_${student.id}_${month}_${Date.now()}`,
      type: 'reminder',
      studentId: student.id,
      studentName: student.full_name,
      parentPhone: student.phone || student.parent_phone || '',
      amount,
      month,
      scheduledDate: reminderDate.toISOString(),
      status: 'scheduled',
      message: generatePaymentMessage(student, amount, month, 'reminder', customConfig)
    };

    this.scheduledNotifications.push(notification);
    this.saveToStorage();
    
    return notification;
  }

  // Schedule an overdue alert
  scheduleOverdueAlert(student: Student, amount: number, month: string, daysOverdue: number, customConfig?: any) {
    const notification: ScheduledNotification = {
      id: `overdue_${student.id}_${month}_${Date.now()}`,
      type: 'overdue',
      studentId: student.id,
      studentName: student.full_name,
      parentPhone: student.phone || student.parent_phone || '',
      amount,
      month,
      scheduledDate: new Date().toISOString(),
      status: 'pending',
      urgency: daysOverdue > 7 ? 'high' : 'medium',
      message: generatePaymentMessage(student, amount, month, 'overdue', customConfig)
    };

    this.scheduledNotifications.push(notification);
    this.saveToStorage();
    
    return notification;
  }

  // Check and send due notifications
  checkAndSend() {
    const now = new Date();
    const dueNotifications = this.scheduledNotifications.filter(n => {
      const scheduled = new Date(n.scheduledDate);
      return n.status === 'scheduled' && scheduled <= now;
    });

    dueNotifications.forEach((notification, index) => {
      setTimeout(() => {
        this.sendNotification(notification);
      }, index * 5000); // 5 seconds delay between messages
    });

    return dueNotifications.length;
  }

  // Send a notification
  sendNotification(notification: ScheduledNotification) {
    if (!notification.parentPhone) {
      console.error('لا يوجد رقم هاتف');
      return;
    }

    const link = createWhatsAppLink(notification.parentPhone, notification.message);
    window.open(link, '_blank');

    // Update status
    notification.status = 'sent';
    notification.sentAt = new Date().toISOString();
    
    // Add to history
    this.notificationHistory.push({
      ...notification,
      sentAt: new Date().toISOString()
    });
    
    // Remove from scheduled if it was there
    this.scheduledNotifications = this.scheduledNotifications.filter(n => n.id !== notification.id);
    
    this.saveToStorage();
  }

  // Generate monthly notifications for current month
  generateMonthlyNotifications(students: Student[], payments: Payment[], month: string, customConfig?: any) {
    const notifications: ScheduledNotification[] = [];
    
    students?.forEach(student => {
      const hasPaid = payments?.some(p => {
        if (!p || !p.date) return false;
        const pDate = new Date(p.date);
        return p.student_id === student.id && 
               (pDate?.toLocaleString('ar-EG', { month: 'long', year: 'numeric' }) === month || p.month === month);
      });

      if (!hasPaid) {
        const amount = calculateMonthlyFee(student.level);
        const dueDate = new Date();
        dueDate.setDate(1);
        
        const today = new Date();
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue > 5) {
          // Overdue alert
          notifications.push(this.scheduleOverdueAlert(student, amount, month, daysOverdue, customConfig));
        } else if (daysOverdue >= -3) {
          // Reminder before due date
          notifications.push(this.scheduleReminder(student, amount, month, 3, customConfig));
        }
      }
    });

    return notifications;
  }

  saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scheduled_notifications', JSON.stringify(this.scheduledNotifications));
      localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory));
    }
  }

  getStats() {
    return {
      scheduled: this.scheduledNotifications.filter(n => n.status === 'scheduled').length,
      sent: this.notificationHistory.length,
      pending: this.scheduledNotifications.filter(n => n.status === 'pending').length
    };
  }
}

export const autoNotifier = new AutoNotificationService();
