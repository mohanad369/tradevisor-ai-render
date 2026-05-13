import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

function getReply(question: string): string {
  const lower = question.toLowerCase();
  const isArabic = /[\u0600-\u06FF]/.test(question);

  const replies: Record<string, [string, string?]> = {
    entry: [
      "The Entry level is the price where the AI recommends opening your position. Always wait for price to reach or come very close to this level before executing. Don't chase entries.",
      "الدخول هو سعر الفتح الموصى به. انتظر وصول السعر لهذا المستوى أو قريب منه قبل التنفيذ.",
    ],
    "stop loss": [
      "Stop Loss (SL) is your safety net. If price moves against you and hits SL, the trade closes automatically to limit your loss. Never move SL further away after entry.",
      "وقف الخسارة هو شبكة الأمان. إذا تحرك السعر ضدك وضرب الستوب، يغلق الصفقة تلقائياً.",
    ],
    sl: [
      "Stop Loss (SL) is your safety net. If price moves against you and hits SL, the trade closes automatically to limit your loss. Never move SL further away after entry.",
      "وقف الخسارة هو شبكة الأمان. إذا تحرك السعر ضدك وضرب الستوب، يغلق الصفقة تلقائياً.",
    ],
    "take profit": [
      "Take Profit targets (TP1/TP2/TP3) are your profit goals. Our strategy: take 50% profit at TP1, move SL to breakeven, let the rest run to TP2/TP3.",
      "أهداف الربح (TP1/TP2/TP3) هي أهدافك. استراتيجيتنا: خذ 50% ربح عند TP1، حرك الستوب لنقطة التعادل.",
    ],
    tp: [
      "Take Profit targets (TP1/TP2/TP3) are your profit goals. Our strategy: take 50% profit at TP1, move SL to breakeven, let the rest run to TP2/TP3.",
      "أهداف الربح (TP1/TP2/TP3) هي أهدافك. استراتيجيتنا: خذ 50% ربح عند TP1، حرك الستوب لنقطة التعادل.",
    ],
    risk: [
      "We recommend risking only 1.5% of your account per trade. Use the Lot Size calculator in the analysis panel.",
      "نوصي بمخاطرة 1.5% فقط من رصيدك في كل صفقة.",
    ],
    lot: [
      "Lot size depends on your account balance and risk percentage. The analysis panel shows exact lot sizes for $1K, $5K, and $10K accounts.",
      "حجم العقد يعتمد على رصيدك ونسبة المخاطرة. لوحة التحليل تظهر الأحجام الدقيقة.",
    ],
    confidence: [
      "AI Confidence (78-98%) reflects how many technical factors align. Higher = more confluence. We recommend only taking trades with 80%+ confidence.",
      "نسبة الثقة تعكس عدد العوامل التقنية المتطابقة. ننصح بالصفقات فوق 80%.",
    ],
    payment: [
      "To subscribe, select a plan and click 'Pay with USDT (TRC20)'. Scan the QR code or copy the wallet address. After sending, share your TXID with our support team.",
      "للاشتراك، اختر خطة واضغط 'Pay with USDT'. امسح QR أو انسخ العنوان. أرسل TXID لفريق الدعم.",
    ],
    usdt: [
      "We accept USDT on TRC20 (Tron) network only. Wallet: TYLqLhbtJSAaPZbibEZ1JtHfAD2ZJ71qHA. Double-check the network!",
      "نقبل USDT على شبكة TRC20 فقط. تأكد من الشبكة!",
    ],
    refund: [
      "We offer a 30-day money-back guarantee. Not satisfied? Contact us within 30 days for a full refund.",
      "نقدم ضمان استرداد 30 يوم. غير راضٟ تواصل معنا.",
    ],
    gold: [
      "XAU/USD (Gold) is one of our best assets. AI Gold signals achieve a 68% win rate on Day Trading with 1:3 average R:R.",
      "الذهب من أفضل أصولنا. إشارات الذهب تحقق 68% نسبة فوز.",
    ],
    crypto: [
      "BTC/USD and ETH/USD signals are available with Smart Money and Breakout strategies. Crypto markets run 24/7.",
      "إشارات البتكوين والإيثيريوم متاحة باستراتيجيات Smart Money وBreakout. الأسواق تعمل 24/7.",
    ],
    timeframe: [
      "Choose timeframe based on your schedule: Scalping (1-15m) for active traders, Day Trading (15m-1H) for part-time, Swing (1H-Daily) for busy professionals.",
      "اختر الإطار الزمني حسب جدولك: Scalping للمتداولين النشطين، Day Trading للجزئيين، Swing للمحترفين.",
    ],
  };

  for (const [key, answers] of Object.entries(replies)) {
    if (lower.includes(key)) {
      return isArabic && answers[1] ? answers[1] : answers[0];
    }
  }

  return isArabic
    ? "أنا هنا للمساعدة! اسألني عن: مستويات الدخول، وقف الخسارة، أهداف الربح، إدارة المخاطرة، الدفع، أو استراتيجيات التداول."
    : "I'm here to help! Ask me about: entry levels, stop loss, take profit, risk management, payment methods, or trading strategies.";
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hello! I'm your Tradevisor AI support agent. Ask me anything about trading signals, chart analysis, or your account." },
  ]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);

  function handleSend() {
    if (!input.trim() || isPending) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setIsPending(true);

    setTimeout(() => {
      const reply = getReply(userMsg);
      setMessages((m) => [...m, { role: "bot", text: reply }]);
      setIsPending(false);
    }, 500 + Math.random() * 500);
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-6 left-6 z-[90] w-14 h-14 bg-[#d4a843] text-[#050505] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(212,168,67,0.4)] hover:scale-110 transition-transform">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} transition={{ duration: 0.3 }} className="fixed bottom-24 left-6 z-[90] w-[340px] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#d4a843] text-[#050505] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Bot size={18} /><span className="font-semibold text-sm">AI Support Agent</span></div>
              <button onClick={() => setOpen(false)} className="hover:opacity-70"><X size={16} /></button>
            </div>
            <div className="h-80 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "bot" ? "bg-[#d4a843]/20" : "bg-[#1f1f1f]"}`}>
                    {msg.role === "bot" ? <Bot size={14} className="text-[#d4a843]" /> : <User size={14} className="text-[#a0a0a0]" />}
                  </div>
                  <div className={`text-xs p-2.5 rounded-xl max-w-[85%] whitespace-pre-line ${msg.role === "bot" ? "bg-[#141414] text-[#a0a0a0]" : "bg-[#d4a843] text-[#050505]"}`}>{msg.text}</div>
                </div>
              ))}
              {isPending && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#d4a843]/20 flex items-center justify-center"><Bot size={14} className="text-[#d4a843]" /></div>
                  <div className="bg-[#141414] text-[#666666] text-xs p-2.5 rounded-xl flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#666666] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#666666] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-1.5 h-1.5 bg-[#666666] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[#1f1f1f] flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask about trading..." className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 py-2 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#d4a843]" />
              <button onClick={handleSend} disabled={isPending} className="w-8 h-8 bg-[#d4a843] rounded-lg flex items-center justify-center text-[#050505] hover:bg-[#e8c76a] transition-colors disabled:opacity-50"><Send size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
