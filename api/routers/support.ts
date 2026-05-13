import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";

export const supportRouter = createRouter({
  ask: publicQuery
    .input(
      z.object({
        question: z.string().min(1).max(1000),
        language: z.string().default("en"),
      })
    )
    .mutation(async ({ input }) => {
      // ── REAL: Replace with API call to your AI model ──
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

      const replies: Record<string, string[]> = {
        entry: [
          "The Entry level is the price where the AI recommends opening your position. Always wait for price to reach or come very close to this level before executing. Don't chase entries.",
          "الدخول هو سعر الفتح الموصى به. انتظر وصول السعر لهذا المستوى أو قريب منه قبل التنفيذ.",
        ],
        "stop loss": [
          "Stop Loss (SL) is your safety net. If price moves against you and hits SL, the trade closes automatically to limit your loss. Never move SL further away after entry — this is the #1 mistake traders make.",
          "وقف الخسارة هو شبكة الأمان. إذا تحرك السعر ضدك وضرب الستوب، يغلق الصفقة تلقائياً. لا تحرك الستوب بعيداً أبداً بعد الدخول.",
        ],
        "take profit": [
          "Take Profit targets (TP1/TP2/TP3) are your profit goals. Our strategy: take 50% profit at TP1, move SL to breakeven, let the rest run to TP2/TP3. This locks in gains while keeping upside.",
          "أهداف الربح (TP1/TP2/TP3) هي أهدافك. استراتيجيتنا: خذ 50% ربح عند TP1، حرك الستوب لنقطة التعادل، دع الباقي يجري.",
        ],
        risk: [
          "We recommend risking only 1.5% of your account per trade. Use the Lot Size calculator in the analysis panel. With $1,000 account, that's $15 risk per trade. With $10,000, that's $150.",
          "نوصي بمخاطرة 1.5% فقط من رصيدك في كل صفقة. استخدم حاسبة حجم العقد.",
        ],
        lot: [
          "Lot size depends on your account balance and risk percentage. The analysis panel shows exact lot sizes for $1K, $5K, and $10K accounts. Follow these precisely.",
          "حجم العقد يعتمد على رصيدك ونسبة المخاطرة. لوحة التحليل تظهر الأحجام الدقيقة.",
        ],
        confidence: [
          "AI Confidence (78-98%) reflects how many technical factors align. Higher = more confluence. We recommend only taking trades with 80%+ confidence for best results.",
          "نسبة الثقة تعكس عدد العوامل التقنية المتطابقة. ننصح بالصفقات فوق 80%.",
        ],
        payment: [
          "To subscribe, select a plan and click 'Pay with USDT (TRC20)'. Scan the QR code or copy the wallet address. After sending, share your TXID with our support team for activation.",
          "للاشتراك، اختر خطة واضغط 'Pay with USDT'. امسح QR أو انسخ العنوان. أرسل TXID لفريق الدعم للتفعيل.",
        ],
        usdt: [
          "We accept USDT on TRC20 (Tron) network only. Wallet: TYLqLhbtJSAaPZbibEZ1JtHfAD2ZJ71qHA. Double-check the network — sending on wrong chain = lost funds.",
          "نقبل USDT على شبكة TRC20 فقط. تأكد من الشبكة — الإرسال على شبكة خاطئة = فقدان الأموال.",
        ],
        refund: [
          "We offer a 30-day money-back guarantee. Not satisfied? Contact us within 30 days for a full refund — no questions asked.",
          "نقدم ضمان استرداد 30 يوم. غير راضٟ تواصل معنا خلال 30 يوم لاسترداد كامل.",
        ],
        gold: [
          "XAU/USD (Gold) is one of our best assets. AI Gold signals achieve a 68% win rate on Day Trading strategy with 1:3 average Risk:Reward. Perfect for both new and experienced traders.",
          "الذهب من أفضل أصولنا. إشارات الذهب تحقق 68% نسبة فوز.",
        ],
        crypto: [
          "BTC/USD and ETH/USD signals are available with Smart Money and Breakout strategies. Crypto markets run 24/7 so signals update around the clock.",
          "إشارات البتكوين والإيثيريوم متاحة باستراتيجيات Smart Money وBreakout. الأسواق تعمل 24/7.",
        ],
        timeframe: [
          "Choose timeframe based on your schedule: Scalping (1-15m) for active traders at their screens, Day Trading (15m-1H) for part-time traders, Swing (1H-Daily) for busy professionals who check charts 1-2 times per day.",
          "اختر الإطار الزمني حسب جدولك: Scalping للمتداولين النشطين، Day Trading للجزئيين، Swing للمحترفين المشغولين.",
        ],
      };

      const lower = input.question.toLowerCase();
      for (const [key, answers] of Object.entries(replies)) {
        if (lower.includes(key)) {
          const isArabic = input.language === "ar" || /[\u0600-\u06FF]/.test(input.question);
          return { reply: isArabic && answers[1] ? answers[1] : answers[0] };
        }
      }

      // Default
      const isArabic = input.language === "ar" || /[\u0600-\u06FF]/.test(input.question);
      return {
        reply: isArabic
          ? "أنا هنا للمساعدة! اسألني عن: مستويات الدخول، وقف الخسارة، أهداف الربح، إدارة المخاطرة، الدفع، أو استراتيجيات التداول."
          : "I'm here to help! Ask me about: entry levels, stop loss, take profit, risk management, payment methods, or trading strategies.",
      };
    }),
});
