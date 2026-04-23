import { createWhatsAppLink } from '../utils/whatsapp';

// Notification Types
export const NotificationTypes = {
  PAYMENT_DUE: 'payment_due',        // Payment due
  PAYMENT_OVERDUE: 'payment_overdue', // Payment overdue
  PAYMENT_CONFIRMED: 'payment_confirmed', // Payment confirmed
  SESSION_REMINDER: 'session_reminder',   // Session reminder
  WELCOME: 'welcome',                    // Welcome
  ABSENCE_NOTICE: 'absence_notice',       // Absence notice
  CUSTOM: 'custom'                       // Custom
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

interface TemplateData {
  parentName: string;
  studentName: string;
  amount: number;
  month: string;
  dueDate?: string;
  daysOverdue?: number;
  paymentLink?: string;
  receiptNumber?: string;
  day?: string;
  date?: string;
  time?: string;
  level?: string;
  trainer?: string;
  message?: string;
}

// Smart Message Templates
export const messageTemplates: Record<NotificationType, (data: TemplateData) => { subject: string; message: string; urgency: 'low' | 'normal' | 'high'; sendBeforeDays: number | null }> = {
  [NotificationTypes.PAYMENT_DUE]: (data) => ({
    subject: 'تذكير بالدفع',
    message: `مرحباً ${data.parentName} 👋\n\n` +
      `نود تذكيركم بدفع اشتراك ${data.studentName} للشهر الحالي (${data.month}).\n\n` +
      `💰 المبلغ المستحق: *${data.amount} شيكل*\n` +
      `📅 تاريخ الاستحقاق: ${data.dueDate}\n\n` +
      `للدفع السريع:\n${data.paymentLink}\n\n` +
      `شكراً لتعاونكم 🙏\n` +
      `Sharks Olympic Academy 🏊‍♂️`,
    urgency: 'normal',
    sendBeforeDays: 3
  }),

  [NotificationTypes.PAYMENT_OVERDUE]: (data) => ({
    subject: 'تنبيه: دفعة متأخرة',
    message: `مرحباً ${data.parentName} ⚠️\n\n` +
      `نلفت انتباهكم أن دفع اشتراك ${data.studentName} للشهر ${data.month} *متأخر*.\n\n` +
      `💰 المبلغ المستحق: *${data.amount} شيكل*\n` +
      `⏰ أيام التأخير: ${data.daysOverdue} يوم\n\n` +
      `للدفع الفوري:\n${data.paymentLink}\n\n` +
      `للاستفسار: 052-5526570\n\n` +
      `مع خالص التقدير،\n` +
      `إدارة الأكاديمية 🏊‍♂️`,
    urgency: 'high',
    sendBeforeDays: 0
  }),

  [NotificationTypes.PAYMENT_CONFIRMED]: (data) => ({
    subject: 'تأكيد الدفع',
    message: `مرحباً ${data.parentName} ✅\n\n` +
      `تم استلام دفع اشتراك ${data.studentName} بنجاح.\n\n` +
      `💰 المبلغ المدفوع: *${data.amount} شيكل*\n` +
      `📅 الشهر: ${data.month}\n` +
      `🧾 رقم الإيصال: ${data.receiptNumber}\n\n` +
      `شكراً لثقتكم بنا 🙏\n` +
      `Sharks Olympic Academy 🏊‍♂️`,
    urgency: 'low',
    sendBeforeDays: null
  }),

  [NotificationTypes.SESSION_REMINDER]: (data) => ({
    subject: 'تذكير بالحصة غداً',
    message: `تذكير 🔔\n\n` +
      `حصة ${data.studentName} غداً إن شاء الله:\n` +
      `📅 ${data.day} - ${data.date}\n` +
      `⏰ ${data.time}\n` +
      `🏊‍♂️ المستوى: ${data.level}\n` +
      `👨‍🏫 المدرب: ${data.trainer}\n\n` +
      `يرجى الحضور قبل ١٥ دقيقة مع:\n` +
      `• ملابس السباحة\n` +
      `• منشفة\n` +
      `• كاب الشمس\n\n` +
      `بالتوفيق! 🏆`,
    urgency: 'normal',
    sendBeforeDays: 1
  }),

  [NotificationTypes.WELCOME]: (data) => ({
    subject: 'ترحيب',
    message: `مرحباً ${data.parentName} 👋\n\n` +
      `تم تسجيل ${data.studentName} بنجاح في Sharks Olympic Academy.\n\n` +
      `نتمنى لكم تجربة ممتعة!`,
    urgency: 'normal',
    sendBeforeDays: null
  }),

  [NotificationTypes.ABSENCE_NOTICE]: (data) => ({
    subject: 'تنبيه غياب متكرر',
    message: `مرحباً ${data.parentName} 👋\n\n` +
      `نلفت انتباهكم إلى غياب ${data.studentName} عن الحصص لعدة مرات متتالية.\n\n` +
      `نود الاطمئنان عليه والتأكد من استمراريته في التدريبات.\n\n` +
      `يرجى التواصل معنا في حال وجود أي استفسار.\n\n` +
      `Sharks Olympic Academy 🏊‍♂️`,
    urgency: 'high',
    sendBeforeDays: null
  }),

  [NotificationTypes.CUSTOM]: (data) => ({
    subject: 'رسالة مخصصة',
    message: data.message || '',
    urgency: 'normal',
    sendBeforeDays: null
  })
};

// Generate Mock Payment Link
export const generateMockPaymentLink = (studentId: string, amount: number, month: string) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/payment?student=${studentId}&amount=${amount}&month=${month}`;
};
