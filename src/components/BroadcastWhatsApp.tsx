import React, { useState } from 'react';
import { Send, MessageCircle, Loader2 } from 'lucide-react';
import { createWhatsAppLink, whatsappTemplates } from '../utils/whatsapp';
import { Student } from '../types';

interface BroadcastWhatsAppProps {
  students: Student[];
}

export const BroadcastWhatsApp: React.FC<BroadcastWhatsAppProps> = ({ students }) => {
  const [selectedLevel, setSelectedLevel] = useState('الكل');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const filteredStudents = students.filter(s => 
    selectedLevel === 'الكل' || s.level === selectedLevel
  );

  const handleBroadcast = async () => {
    if (!message.trim()) {
      alert('اكتب رسالة أولاً');
      return;
    }

    setSending(true);
    let count = 0;

    // Open WhatsApp windows one by one with a delay to avoid blocking
    for (const student of filteredStudents) {
      const phone = student.phone || student.parent_phone;
      if (phone) {
        const link = createWhatsAppLink(phone, message);
        window.open(link, '_blank');
        count++;
        
        // Delay 2 seconds between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setSending(false);
    alert(`تم فتح ${count} محادثة واتساب`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <MessageCircle className="text-emerald-500" />
        إرسال رسائل واتساب جماعية
      </h2>

      <div className="space-y-4">
        {/* Level Selection */}
        <div>
          <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">المستوى:</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
          >
            <option value="الكل">جميع المستويات</option>
            <option value="مبتدئ">مبتدئ</option>
            <option value="متوسط">متوسط</option>
            <option value="متقدم">متقدم</option>
            <option value="احترافي">احترافي</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            عدد المستلمين: {filteredStudents.length} ولي أمر
          </p>
        </div>

        {/* Templates */}
        <div>
          <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">قوالب سريعة:</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMessage(whatsappTemplates.generalAnnouncement('تم تغيير موعد الحصة القادمة إلى الساعة 5 مساءً'))}
              className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              تغيير موعد
            </button>
            <button
              onClick={() => setMessage(whatsappTemplates.generalAnnouncement('تذكير: غداً إجازة رسمية، لا توجد حصص'))}
              className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              إعلان إجازة
            </button>
            <button
              onClick={() => setMessage(whatsappTemplates.generalAnnouncement('تم فتح التسجيل للمستوى المتقدم، يرجى التواصل للحجز'))}
              className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              فتح تسجيل
            </button>
          </div>
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">الرسالة:</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
            placeholder="اكتب رسالتك هنا..."
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleBroadcast}
          disabled={sending || filteredStudents.length === 0}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-100 dark:shadow-none transition-all"
        >
          {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          {sending ? 'جاري الفتح...' : `إرسال إلى ${filteredStudents.length} شخص`}
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          سيتم فتح محادثات واتساب واحدة تلو الأخرى مع تأخير بسيط لتجنب الحظر
        </p>
      </div>
    </div>
  );
};
