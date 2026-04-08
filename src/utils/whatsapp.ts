/**
 * WhatsApp Utility Functions
 */

// Format phone number (remove leading zero and add country code)
export const formatPhoneNumber = (phone: string) => {
  // Remove everything except digits
  let clean = phone.replace(/\D/g, '');
  
  // If starts with 0, remove it and add Israel code (972)
  if (clean.startsWith('0')) {
    clean = '972' + clean.substring(1);
  }
  // If it doesn't start with 972, add it
  else if (!clean.startsWith('972')) {
    clean = '972' + clean;
  }
  
  return clean;
};

// Create WhatsApp link
export const createWhatsAppLink = (phone: string, message: string) => {
  const formattedPhone = formatPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

// WhatsApp Message Templates
export const whatsappTemplates = {
  // Welcome message for new student
  welcome: (studentName: string) => 
    `مرحباً،\n\n` +
    `تم تسجيل ابنكم/ابنتكم *${studentName}* بنجاح في أكاديمية السباحة 🏊‍♂️\n\n` +
    `نتمنى له/لها التوفيق والتعلم السريع.\n\n` +
    `للاستفسار: 0500000000`,

  // Session reminder
  sessionReminder: (studentName: string, day: string, time: string) => 
    `تذكير 🔔\n\n` +
    `حصة *${studentName}* غداً إن شاء الله\n` +
    `📅 اليوم: ${day}\n` +
    `⏰ الوقت: ${time}\n\n` +
    `يرجى الحضور قبل ١٥ دقيقة 🏊‍♂️`,

  // Payment reminder
  paymentReminder: (studentName: string, amount: number, month: string) => 
    `مرحباً،\n\n` +
    `نود تذكيركم بمستحقات اشتراك *${studentName}* للشهر ${month} بمبلغ ${amount} ريال.\n\n` +
    `للدفع: [رابط الدفع]\n\n` +
    `شكراً لتعاونكم 🙏`,

  // General announcement
  generalAnnouncement: (message: string) => 
    `إعلان هام 📢\n\n` +
    `${message}\n\n` +
    `أكاديمية السباحة 🏊‍♂️`
};
