/**
 * Payment Service - Handles payment message generation and fee calculation
 */

export const DEFAULT_COURSE_PRICES = {
  'دورات عادية مع مواصلات فوق ال ٥ سنوات': 800,
  'دورات عادية بدون مواصلات فوق ال ٥ سنوات': 600,
  'دورات عادية مع مواصلات فوق ال ٥ سنوات (زبائن صيف)': 700,
  'دورات عادية بدون مواصلات فوق ال ٥ سنوات (زبائن صيف)': 500,
  'دورات نساء (بدون مواصلات)': 600,
  'دورات رجال (بدون مواصلات)': 600,
  'دورات خاصة لجميع الأعمار': 1300
};

export interface PaymentConfig {
  method: string;
  bitPhone: string;
  payboxPhone: string;
  bankAccount: string;
  bankName: string;
  academyName: string;
  academyPhone: string;
  coursePrices: Record<string, number>;
}

export const PAYMENT_CONFIG: PaymentConfig = {
  method: import.meta.env.VITE_PAYMENT_METHOD || 'manual',
  bitPhone: import.meta.env.VITE_BIT_PHONE || '052-5526570',
  payboxPhone: import.meta.env.VITE_PAYBOX_PHONE || '052-7883716',
  bankAccount: import.meta.env.VITE_BANK_ACCOUNT || '12-345-678999',
  bankName: import.meta.env.VITE_BANK_NAME || 'بنك لئومي',
  academyName: import.meta.env.VITE_ACADEMY_NAME || 'Sharks Olympic Academy',
  academyPhone: import.meta.env.VITE_ACADEMY_PHONE || '052-5526570',
  coursePrices: DEFAULT_COURSE_PRICES
};

export type PaymentMessageType = 'due' | 'overdue' | 'reminder' | 'confirmed';

// Generate comprehensive payment message in Arabic
export const generatePaymentMessage = (studentData: any, amount: number, month: string, type: PaymentMessageType = 'due', customConfig?: any) => {
  const config = customConfig || PAYMENT_CONFIG;
  const { bitPhone, payboxPhone, bankAccount, bankName, academyName, academyPhone } = config;
  
  const templates: Record<PaymentMessageType, string> = {
    due: `مرحباً ${studentData.parent_name || 'ولي الأمر العزيز'} 👋

💰 دفعة اشتراك ${studentData.full_name} لشهر ${month}
المبلغ: *${amount} ₪*

خيارات الدفع المتاحة:

1️⃣ *Bit (بيط):*
   افتح تطبيق Bit
   أرسل إلى: ${bitPhone}
   المبلغ: ${amount} ₪
   الملاحظة: ${studentData.full_name} - ${month}

2️⃣ *PayBox (بي بوكس):*
   أرسل إلى: ${payboxPhone}
   المبلغ: ${amount} ₪

3️⃣ *تحويل بنكي:*
   البنك: ${bankName}
   رقم الحساب: ${bankAccount}
   الاسم: ${academyName}

4️⃣ *نقدي:*
   الدفع في مكتب الأكاديمية

⚠️ *هام:* بعد إتمام الدفع، يرجى إرسال صورة من الإيصال للتأكيد.

للاستفسارات: ${academyPhone}

شكراً لتعاونكم 🙏
🏊‍♂️ ${academyName}`,

    overdue: `⚠️ *تنبيه: دفعة متأخرة*

مرحباً ${studentData.parent_name || 'ولي الأمر العزيز'}،

لم يتم استلام دفعة ${studentData.full_name} لشهر ${month} حتى الآن.

💰 المبلغ: *${amount} ₪*
⏰ يرجى السداد في أقرب وقت ممكن

للدفع السريع:
📱 Bit: ${bitPhone}
💳 PayBox: ${payboxPhone}
🏦 البنك: ${bankAccount}

للاستفسارات: ${academyPhone}

🏊‍♂️ ${academyName}`,

    reminder: `🔔 *تذكير بالدفع*

مرحباً ${studentData.parent_name || 'ولي الأمر العزيز'}،

تذكير لطيف بالدفعة الشهرية لـ ${studentData.full_name}.

💰 المبلغ: *${amount} ₪*
📅 الشهر: ${month}

للدفع السهل والسريع عبر Bit:
${bitPhone}

شكراً لكم! 🙏
🏊‍♂️ ${academyName}`,

    confirmed: `✅ *تأكيد استلام الدفع*

مرحباً ${studentData.parent_name || 'ولي الأمر العزيز'}،

تم استلام مبلغ الاشتراك بنجاح!

📋 تفاصيل الدفعة:
• الطالب: ${studentData.full_name}
• الشهر: ${month}
• المبلغ: ${amount} ₪
• رقم الإيصال: ${studentData.receiptNumber || 'N/A'}
• التاريخ: ${new Date().toLocaleDateString('ar-EG')}

شكراً جزيلاً لتعاونكم! 🙏

🏊‍♂️ ${academyName}`
  };

  return templates[type] || templates.due;
};

// Generate Payment QR Code (for display in academy)
export const generatePaymentQR = (amount: number, description: string) => {
  const { bitPhone } = PAYMENT_CONFIG;
  // Bit QR format (simplified for example)
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=bit://${bitPhone}?amount=${amount}&desc=${encodeURIComponent(description)}`;
};

// Calculate monthly fee based on course type
export const calculateMonthlyFee = (courseType: string, customPrices?: Record<string, number>) => {
  const prices = customPrices || DEFAULT_COURSE_PRICES;
  return prices[courseType as keyof typeof DEFAULT_COURSE_PRICES] || prices['دورات عادية بدون مواصلات فوق ال ٥ سنوات'] || 600;
};

// Format amount
export const formatAmount = (amount: number) => {
  return `${amount.toLocaleString()} ₪`;
};

// Calculate days overdue
export const calculateDaysOverdue = (dueDate: string | Date) => {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};
