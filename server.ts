import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/insights/generate", async (req, res) => {
    let attempts = 0;
    const maxAttempts = 2;
    const { dataSummary, targetDate } = req.body;

    const generateFallbackInsights = () => {
      const insights = [];
      const { totalStudents, activeStudents, inactiveStudents, expiredStudents = [], lowCreditStudents = [], pendingPayments = [], birthdays = [] } = dataSummary;
      const targetDateObj = new Date(targetDate || new Date());

      // 1. Birthdays
      if (birthdays.length > 0) {
        const names = birthdays.slice(0, 3).map((b: any) => b.name).join('، ');
        insights.push({
          id: 'fb_birthdays',
          title: 'أعياد ميلاد هذا الشهر',
          desc: `هناك ${birthdays.length} طلاب لديهم أعياد ميلاد، منهم: ${names}. تواصل معهم لتقوية الولاء.`,
          type: 'success',
          category: 'suggestion',
          metadata: { items: birthdays }
        });
      }

      // 2. Critical Attendance/Subscription Warnings
      if (expiredStudents.length > 0) {
        const names = expiredStudents.slice(0, 3).map((s: any) => s.name).join('، ');
        insights.push({
          id: 'fb_expired',
          title: 'تنبيه: اشتراكات منتهية',
          desc: `هناك ${expiredStudents.length} طلاب انتهت اشتراكاتهم، منهم: ${names}. يرجى المتابعة الفورية للتجديد.`,
          type: 'warning',
          category: 'warning',
          metadata: { items: expiredStudents }
        });
      }

      if (lowCreditStudents.length > 0) {
        const names = lowCreditStudents.slice(0, 3).map((s: any) => s.name).join('، ');
        insights.push({
          id: 'fb_low_credit',
          title: 'أرصدة حصص منخفضة',
          desc: `يوجد ${lowCreditStudents.length} طلاب برصيد حصتين أو أقل، منهم: ${names}. ذكرهم بالتعبئة قبل نفاذ الرصيد.`,
          type: 'info',
          category: 'warning',
          metadata: { items: lowCreditStudents }
        });
      }

      if (pendingPayments.length > 0) {
        const names = pendingPayments.slice(0, 3).map((p: any) => p.studentName).join('، ');
        const totalDue = pendingPayments.reduce((sum: number, p: any) => sum + p.amountDue, 0);
        insights.push({
          id: 'fb_pending_payments',
          title: 'دفعات مالية غير مكتملة',
          desc: `هناك ${pendingPayments.length} دفعات معلقة بقيمة إجمالية ${totalDue} د.أ. تشمل: ${names}.`,
          type: 'warning',
          category: 'warning',
          metadata: { items: pendingPayments }
        });
      }

      const inactivityRate = totalStudents > 0 ? (inactiveStudents / totalStudents) * 100 : 0;
      if (inactivityRate > 30) {
        insights.push({
          id: 'fb_inactivity',
          title: 'ارتفاع معدل الانقطاع',
          desc: `نسبة الطلاب غير النشطين هي ${inactivityRate.toFixed(1)}%. نقترح إرسال رسائل استقصائية لمعرفة السبب وتحفيزهم.`,
          type: 'info',
          category: 'suggestion'
        });
      }

      insights.push({
        id: 'fb_growth_tip',
        title: 'فرصة نمو وتوسع',
        desc: 'نوصي بتحليل أوقات الذروة لفتح شعب جديدة وزيادة الدخل في الساعات الأكثر طلباً.',
        type: 'success',
        category: 'suggestion'
      });

      return { insights };
    };

    const tryGenerate = async (): Promise<void> => {
      try {
        const prompt = `
          بصفتك محلل أعمال ذكي لأكاديمية تعليم سباحة تسمى Sharks، قم بتحليل البيانات التالية للفترة المستهدفة (${targetDate || 'اليوم'}) وتقديم 4-6 رؤى واقتراحات استراتيجية.
          
          البيانات المتاحة (تشمل قوائم مفصلة):
          ${JSON.stringify(dataSummary, null, 2)}
          
          المهام المطلوبة باللغة العربية (هام جداً ذكر الأسماء والبيانات التفصيلية):
          1. سرد أسماء الطلاب الذين انتهت اشتراكاتهم (Expired Students) وأثر ذلك.
          2. تفصيل الدفعات غير المكتملة أو المعلقة (Pending Payments) مع ذكر أسماء الطلاب والمبالغ المتبقية.
          3. تحليل أعياد ميلاد الطلاب هذا الشهر (Birthdays) وذكر بعض الأسماء لتشجيع التواصل.
          4. رصد نقص أرصدة الحصص (Low Credit) بذكر أسماء الطلاب.
          5. اقتراح فرص لزيادة الدخل استناداً لتوزيع الطلاب والدورات.

          قواعد هامة:
          - يجب أن يكون الوصف (desc) غنياً بالتفاصيل والأسماء (مثل: "الطالب أحمد لديه دفعة معلقة بقيمة 50 دينار").
          - اجعل الرد شخصياً ومهنياً وموجهاً لمدير الأكاديمية.

          يجب أن يكون الرد بتنسيق JSON حصرياً كالتالي وبدون أي نص إضافي:
          {
            "insights": [
              {
                "id": "string",
                "title": "string",
                "desc": "string",
                "type": "info" | "warning" | "success",
                "category": "warning" | "suggestion",
                "metadata": { "items": [{ "name": "string", "detail": "string" }] }
              }
            ]
          }
        `;

        const modelName = attempts === 0 ? "gemini-1.5-flash" : "gemini-2.0-flash-exp";
        
        const response = await (ai as any).models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json"
          }
        }).catch(async (err: any) => {
          const nextModel = modelName === "gemini-1.5-flash" ? "gemini-2.0-flash" : "gemini-1.5-flash";
          return await (ai as any).models.generateContent({
            model: nextModel,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json"
            }
          });
        });

        let text = response.text || "";
        if (text.includes("```json")) text = text.split("```json")[1].split("```")[0];
        else if (text.includes("```")) text = text.split("```")[1].split("```")[0];

        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) text = text.substring(start, end + 1);

        const result = JSON.parse(text || '{"insights": []}');
        res.json(result);
      } catch (error: any) {
        attempts++;
        const errorMsg = error.message || String(error);
        const isQuotaError = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED");
        
        if (isQuotaError || attempts >= maxAttempts) {
          res.json(generateFallbackInsights());
          return;
        }

        const isRetryable = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || error instanceof SyntaxError;

        if (attempts < maxAttempts && isRetryable) {
          await new Promise(r => setTimeout(r, 2000 * attempts));
          return tryGenerate();
        }
        
        res.json(generateFallbackInsights());
      }
    };

    await tryGenerate();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
