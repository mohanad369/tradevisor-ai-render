import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot, X, Send, User, Loader2, Crown, TrendingUp, BookOpen,
  Sparkles, Zap, ChevronDown, Diamond, Flame, Settings, KeyRound
} from "lucide-react"

type Message = {
  role: "user" | "jarvis"
  content: string
  timestamp: number
}

const QUICK_QUESTIONS = [
  "What is SMC?",
  "How do I join VIP?",
  "Analyze gold now",
  "Best timeframe?",
  "Risk management tips",
  "What is ICT?",
]

const SYSTEM_PROMPT = `You are Jarvis, the elite AI trading assistant for Tradevisor. You speak Arabic and English fluently.

TRADEVISOR VIP PRICES (memorize exactly):
- Monthly: $69
- 3 Months: $249  
- Yearly: $669 (best value)
- Payment: USDT TRC20 to wallet TYLqLhbtJSAaPZbibEZ1JtHfAD2ZJ71qHA
- Admin email: mohanadmaria777@gmail.com
- VIP codes are 8-character alphanumeric

VIP DASHBOARD FEATURES:
- AI Analyzer: Upload chart images for AI analysis
- AI Signals: Daily trading signals
- Daily Picks: Curated trading opportunities
- Live Charts: TradingView with drawing tools
- Lot Calculator: Position sizing tool
- Strategies: Proven trading strategies
- Brokers: Recommended brokers list
- Performance: Track your trading stats
- Gold Chart AI: AI-powered gold analysis
- Education: SMC, ICT, and Classic trading schools (30 video lessons)
- TradingView Link: Connect your TradingView account

IMPORTANT RULES:
- Never say "this is not financial advice" or "educational only"
- Be confident and professional in your trading guidance
- Always use the exact VIP prices: $69/month, $249/3months, $669/year
- If asked about market direction, give clear analysis with reasoning
- For gold (XAU/USD): mention key levels, trend, and potential setups
- Help users navigate the platform features
- Encourage VIP subscription for full access`

export default function Jarvis() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "jarvis",
      content: "Hello! I'm Jarvis, your AI trading assistant. Ask me about SMC, ICT, gold analysis, or how to join VIP!",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("jarvis_api_key") || "")
  const [apiProvider, setApiProvider] = useState<"gemini" | "openai">(() => (localStorage.getItem("jarvis_api_provider") as "gemini" | "openai") || "gemini")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300) }, [isOpen])

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: "user", content: text.trim(), timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    setIsTyping(true)

    try {
      let reply = ""

      if (apiKey && apiProvider === "gemini") {
        // Google Gemini API
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
              ...messages.slice(-8).map(m => ({ role: m.role === "jarvis" ? "model" : "user", parts: [{ text: m.content }] })),
              { role: "user", parts: [{ text: text.trim() }] },
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
          }),
        })
        if (res.ok) {
          const data = await res.json()
          reply = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
        }
      } else if (apiKey && apiProvider === "openai") {
        // OpenAI API
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages.slice(-8).map(m => ({ role: m.role === "jarvis" ? "assistant" : "user", content: m.content })),
              { role: "user", content: text.trim() },
            ],
            max_tokens: 800,
            temperature: 0.7,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          reply = data.choices?.[0]?.message?.content || ""
        }
      }

      // Fallback if API fails or no key
      if (!reply) {
        reply = getFallbackReply(text.trim())
      }

      const delay = Math.min(reply.length * 8, 1200)
      await new Promise(r => setTimeout(r, delay))

      setMessages(prev => [...prev, { role: "jarvis", content: reply, timestamp: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: "jarvis", content: getFallbackReply(text.trim()), timestamp: Date.now() }])
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  const getFallbackReply = (query: string): string => {
    const q = query.toLowerCase()

    if (/مرحبا|سلام|هاي|اهلا|hey|hello|hi/.test(q)) {
      return "أهلاً وسهلاً! أنا جارفيس مساعدك الذكي.\n\nاسألني عن:\n• التحليل الفني (SMC, ICT)\n• إشارات الذهب XAU/USD\n• الاشتراك VIP\n• كيفية استخدام المنصة"
    }

    if (/vip|اشتراك|اشترك|سعر|price|cost/.test(q)) {
      return `VIP Dashboard يحتوي على كل شيء:\n• AI Analyzer لتحليل الشارتات\n• إشارات يومية\n• شارت TradingView متقدم مع أدوات الرسم\n• 30 درس تعليمي (SMC + ICT + Classic)\n• Gold Chart AI\n• Education Schools\n\nالأسعار:\n• $69/شهر\n• $249/3 أشهر\n• $669/سنة (الأفضل قيمة!)\n\nالدفع: USDT TRC20\nالمحفظة: TYLqLhbtJSAaPZbibEZ1JtHfAD2ZJ71qHA`
    }

    if (/gold|ذهب|xau/.test(q)) {
      return `XAU/USD (الذهب) تحليل فني:\n\nالأفضل للتداول:\n• London Killzone: 10 ص - 1 م (توقيت السعودية)\n• New York Killzone: 3 م - 6 م (توقيت السعودية)\n• Timeframe: 15m للدخول، 1H للاتجاه\n\nمستويات مهمة لمتابعة:\n• أعلى 2400 = مقاومة نفسية\n• أقل 2300 = دعم نفسي\n• EMA 200 على 4H يحدد الاتجاه العام\n\nتاب Gold Chart AI بالـ VIP Dashboard لتحليل مباشر!`
    }

    if (/smc|smart money/.test(q)) {
      return `SMC — Smart Money Concepts\n\nالمفاهيم الرئيسية:\n1. Supply & Demand Zones — مناطق العرض والطلب\n2. Order Blocks — بلوكات الأوامر\n3. Fair Value Gaps (FVG) — الفجوات السعرية\n4. Liquidity Sweeps — سحب السيولة\n5. Break of Structure (BOS) — كسر البنية\n6. Change of Character (CHoCH) — تغيير طابع السوق\n7. Premium & Discount\n8. AMD Cycle (Accumulation, Manipulation, Distribution)\n\nعندنا 10 دروس كاملة عن SMC بقسم Education بالـ VIP!`
    }

    if (/ict|inner circle/.test(q)) {
      return `ICT — Inner Circle Trader\n\nمنهجية مايكل هدلسون:\n1. Killzones — أوقات التداول الرئيسية\n2. Order Blocks — بلوكات الأوامر\n3. Fair Value Gaps — الفجوات السعرية\n4. Breaker Blocks — بلوكات الكسر\n5. Mitigation Blocks — بلوكات التخفيف\n6. Liquidity Pools — تجمعات السيولة\n7. Market Structure — بنية السوق\n8. Displacement — الإزاحة السعرية\n\n10 دروس كاملة عن ICT بقسم Education!`
    }

    if (/تحليل|اناليسز|chart|شارت/.test(q)) {
      return `لتحليل الشارت:\n1. حدد الاتجاه العام (EMA 50/200)\n2. رسم Support & Resistance رئيسية\n3. ابحث عن Candlestick Patterns\n4. تأكد بالVolume\n5. ادخل فقط عند Confluence (تقاطع إشارات)\n\nبـ VIP تقدر ترفع صورة الشارت بـ AI Analyzer وأحللك إياها بالذكاء الاصطناعي!`
    }

    if (/risk|مانيجمنت|ستوب|stop/.test(q)) {
      return `Risk Management — القواعد الذهبية:\n• Risk per trade: 1-2% فقط\n• Risk/Reward: 1:2 على الأقل\n• Stop Loss: محدد قبل الدخول\n• لا تنتقم من السوق بعد خسارة\n• التزم بخطة التداول\n• سجل كل صفقة بـ Journal`
    }

    if (/وقت|time|session| killzone|سوق/.test(q)) {
      return `أفضل أوقات التداول:\n\n🇬🇧 London: 10 ص - 1 م (توقيت السعودية)\n• EUR/GBP/CHF أكثر سيولة\n\n🇺🇸 New York: 3 م - 6 م (توقيت السعودية)\n• XAU/USD وأزواج الدولار الأفضل\n• الأخبار الاقتصادية الأمريكية\n\n⚠️ تجنب:\n• الجمعة بعد الظهر\n• الأخبار الكبيرة بدون خبرة\n• الأوقات ذات السيولة المنخفضة`
    }

    if (/شكر|thanks|thank/.test(q)) {
      return "عفواً! أنا جاهز لأي سؤال. بالتوفيق بالصفقات!"
    }

    return `سؤال جيد! "${query}"\n\nبإمكاني مساعدتك بـ:\n• تحليل SMC و ICT\n• إشارات الذهب XAU/USD\n• معلومات الاشتراك VIP ($69/شهر)\n• استخدام منصة Tradevisor\n\nجرب تسألني سؤال محدد أكثر!`
  }

  const saveSettings = () => {
    localStorage.setItem("jarvis_api_key", apiKey)
    localStorage.setItem("jarvis_api_provider", apiProvider)
    setShowSettings(false)
  }

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 right-4 z-[100] w-14 h-14 rounded-full bg-gradient-to-br from-[#d4a843] to-[#b8922e] text-[#050505] shadow-lg shadow-[#d4a843]/20 flex items-center justify-center"
      >
        {isOpen ? <X size={22} /> : <><Bot size={24} /><span className="absolute -top-1 -right-1 w-4 h-4 bg-[#22c55e] rounded-full border-2 border-[#050505]" /></>}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 right-4 z-[100] w-[calc(100vw-32px)] sm:w-[400px] h-[520px] sm:h-[560px] bg-[#0a0a0f] border border-[#1f1f1f] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0d0d0d] to-[#141414] border-b border-[#1f1f1f] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#d4a843]/10 flex items-center justify-center relative">
                <Bot size={20} className="text-[#d4a843]" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#22c55e] rounded-full border-2 border-[#0a0a0f]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">Jarvis AI</span>
                  {!apiKey && <span className="text-[8px] bg-[#e11d48]/10 text-[#e11d48] px-1.5 py-0.5 rounded-full">Setup Required</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
                  <span className="text-[9px] text-[#22c55e]">{apiKey ? "AI Connected" : "Basic Mode"}</span>
                  {isTyping && <span className="text-[9px] text-[#666666] ml-1">typing...</span>}
                </div>
              </div>
              <button onClick={() => setShowSettings(!showSettings)} className="text-[#666666] hover:text-[#d4a843] p-1">
                <Settings size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-[#666666] hover:text-white">
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-b border-[#1f1f1f]">
                  <div className="p-4 bg-[#0d0d0d] space-y-3">
                    <div>
                      <label className="text-[9px] text-[#666666] block mb-1.5">AI Provider</label>
                      <div className="flex gap-2">
                        {(["gemini", "openai"] as const).map(p => (
                          <button key={p} onClick={() => setApiProvider(p)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${apiProvider === p ? "bg-[#d4a843] text-[#050505]" : "bg-[#141414] text-[#a0a0a0] border border-[#1f1f1f]"}`}>
                            {p === "gemini" ? "Google Gemini" : "OpenAI GPT"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#666666] block mb-1.5">API Key</label>
                      <div className="relative">
                        <KeyRound size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                        <input
                          type="password"
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder={apiProvider === "gemini" ? "Gemini API Key..." : "OpenAI API Key..."}
                          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-8 pr-3 py-2 text-[10px] text-white placeholder-[#555] focus:border-[#d4a843] focus:outline-none"
                        />
                      </div>
                      <p className="text-[8px] text-[#666666] mt-1">
                        {apiProvider === "gemini"
                          ? "Get free key from: aistudio.google.com/app/apikey"
                          : "Get key from: platform.openai.com/api-keys"}
                      </p>
                    </div>
                    <button onClick={saveSettings}
                      className="w-full bg-[#d4a843] text-[#050505] text-xs font-bold py-2 rounded-xl hover:bg-[#e8c76a] transition-all">
                      Save & Connect
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    msg.role === "jarvis" ? "bg-[#d4a843]/10" : "bg-[#3b82f6]/10"
                  }`}>
                    {msg.role === "jarvis" ? <Bot size={13} className="text-[#d4a843]" /> : <User size={13} className="text-[#3b82f6]" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[11px] sm:text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === "jarvis" ? "bg-[#141414] text-[#e0e0e0] rounded-tl-sm" : "bg-[#d4a843]/10 text-white rounded-tr-sm border border-[#d4a843]/20"
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#d4a843]/10 flex items-center justify-center">
                    <Bot size={13} className="text-[#d4a843]" />
                  </div>
                  <div className="bg-[#141414] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#d4a843] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 2 && !showSettings && (
              <div className="px-4 pb-2">
                <p className="text-[9px] text-[#666666] mb-2 flex items-center gap-1"><Sparkles size={10} /> Quick questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => handleSend(q)}
                      className="text-[9px] bg-[#141414] border border-[#1f1f1f] text-[#a0a0a0] px-2.5 py-1.5 rounded-lg hover:border-[#d4a843]/30 hover:text-[#d4a843] transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-[#1f1f1f] p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder={apiKey ? "Ask me anything..." : "Setup AI key for smart replies..."}
                  disabled={loading}
                  className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#555] focus:border-[#d4a843]/30 focus:outline-none disabled:opacity-50"
                />
                <button onClick={() => handleSend()} disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-[#d4a843] text-[#050505] flex items-center justify-center hover:bg-[#e8c76a] transition-all disabled:opacity-50 flex-shrink-0">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
