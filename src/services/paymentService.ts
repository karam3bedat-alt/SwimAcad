/**
 * Payment Service - Handles payment message generation and fee calculation
 */

export const PAYMENT_CONFIG = {
  method: import.meta.env.VITE_PAYMENT_METHOD || 'manual',
  bitPhone: import.meta.env.VITE_BIT_PHONE || '050-0000000',
  payboxPhone: import.meta.env.VITE_PAYBOX_PHONE || '050-0000000',
  bankAccount: import.meta.env.VITE_BANK_ACCOUNT || '12-345-678999',
  bankName: import.meta.env.VITE_BANK_NAME || 'بنك لئومي',
  academyName: import.meta.env.VITE_ACADEMY_NAME || 'أكاديمية السباحة',
  academyPhone: import.meta.env.VITE_ACADEMY_PHONE || '050-0000000'
};

export type PaymentMessageType = 'due' | 'overdue' | 'reminder' | 'confirmed';

// Generate comprehensive payment message in Arabic
export const generatePaymentMessage = (studentData: any, amount: number, month: string, type: PaymentMessageType = 'due', customConfig?: any) => {
  const config = customConfig || PAYMENT_CONFIG;
  const { bitPhone, payboxPhone, bankAccount, bankName, academyName, academyPhone } = config;
  
  const templates: Record<PaymentMessageType, string> = {
    due: `مرحباً ${studentData.parent_name || 'ولي الأمر العزيز'} 👋

💰 دفعة اشتراك ${studentData.full_name} لشهر ${month}
المبلغ: *${amount} ر.س*

خيارات الدفع المتاحة:

1️⃣ *Bit (بيط):*
   افتح تطبيق Bit
   أرسل إلى: ${bitPhone}
   المبلغ: ${amount} ر.س
   الملاحظة: ${studentData.full_name} - ${month}

2️⃣ *PayBox (بي بوكس):*
   أرسل إلى: ${payboxPhone}
   المبلغ: ${amount} ر.س

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

💰 المبلغ: *${amount} ر.س*
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

💰 المبلغ: *${amount} ر.س*
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
• المبلغ: ${amount} ر.س
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

// Calculate monthly fee based on level
export const calculateMonthlyFee = (level: string) => {
  const fees: Record<string, number> = {
    'مبتدئ': 250,
    'متوسط': 350,
    'متقدم': 450,
    'احترافي': 550
  };
  return fees[level] || 300;
};

// Format amount
export const formatAmount = (amount: number) => {
  return `${amount.toLocaleString()} ر.س`;
};

// Calculate days overdue
export const calculateDaysOverdue = (dueDate: string | Date) => {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};
