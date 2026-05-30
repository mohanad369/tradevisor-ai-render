import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot, X, Send, User, Loader2, Sparkles, ChevronDown, MessageCircle,
} from "lucide-react"
import { trpc } from "@/lib/trpc"

type Message = {
  role: "user" | "jarvis"
  content: string
  timestamp: number
}

// Live support — direct Telegram link to the owner.
const TELEGRAM_SUPPORT = "https://t.me/Mohanad_333"

// Per-conversation limit: a visitor can chat for ~2 minutes, after which
// Jarvis hands them off to live support. We also cap the message count
// so the owner's API cost per conversation stays predictable.
const CONVERSATION_LIMIT_MS = 2 * 60 * 1000
const MAX_USER_MESSAGES = 12

const QUICK_QUESTIONS = [
  "What is SMC?",
  "How do I join VIP?",
  "Analyze gold now",
  "Best timeframe?",
  "Risk management tips",
  "What is ICT?",
]

const WELCOME_MESSAGE =
  "👋 Hi! I'm Jarvis, your TradeVisor AI assistant.\n\n" +
  "I can help you with:\n" +
  "• Trading concepts — SMC, ICT, price action\n" +
  "• Gold (XAU/USD) analysis & key levels\n" +
  "• VIP plans and how to subscribe\n" +
  "• Using the dashboard & platform features\n\n" +
  "Ask me anything — in any language. 🌍"

export default function Jarvis() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "jarvis", content: WELCOME_MESSAGE, timestamp: Date.now() },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  // Conversation clock — starts on the first user message.
  const conversationStart = useRef<number | null>(null)
  const userMsgCount = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const chat = trpc.jarvis.chat.useMutation()

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300) }, [isOpen])

  // Once the conversation starts, end it after the time limit.
  useEffect(() => {
    if (conversationStart.current === null || limitReached) return
    const elapsed = Date.now() - conversationStart.current
    const remaining = CONVERSATION_LIMIT_MS - elapsed
    if (remaining <= 0) { endConversation(); return }
    const t = setTimeout(() => endConversation(), remaining)
    return () => clearTimeout(t)
  }, [messages, limitReached])

  const endConversation = () => {
    if (limitReached) return
    setLimitReached(true)
    setMessages(prev => [...prev, {
      role: "jarvis",
      timestamp: Date.now(),
      content:
        "⏳ This is the end of the free chat session.\n\n" +
        "For more help, talk directly with our live support team on Telegram — " +
        "they'll answer you personally. Just tap the button below. 👇",
    }])
  }

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading || limitReached) return

    // Start the conversation clock on the first user message.
    if (conversationStart.current === null) conversationStart.current = Date.now()
    userMsgCount.current += 1

    const userMsg: Message = { role: "user", content: text.trim(), timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    setIsTyping(true)

    try {
      // Send recent turns as context. Map our "jarvis" role to "assistant".
      const history = messages
        .filter(m => m.content !== WELCOME_MESSAGE)
        .slice(-8)
        .map(m => ({
          role: (m.role === "jarvis" ? "assistant" : "user") as "assistant" | "user",
          content: m.content,
        }))

      const res = await chat.mutateAsync({ message: text.trim(), history })
      const reply = res.ok && res.reply ? res.reply : getFallbackReply(text.trim())

      // Small natural delay before showing the reply.
      const delay = Math.min(reply.length * 6, 900)
      await new Promise(r => setTimeout(r, delay))

      setMessages(prev => [...prev, { role: "jarvis", content: reply, timestamp: Date.now() }])
    } catch {
      setMessages(prev => [...prev, {
        role: "jarvis", content: getFallbackReply(text.trim()), timestamp: Date.now(),
      }])
    } finally {
      setLoading(false)
      setIsTyping(false)
      // End the conversation if the message cap is hit.
      if (userMsgCount.current >= MAX_USER_MESSAGES) {
        setTimeout(() => endConversation(), 600)
      }
    }
  }

  // Offline / error fallback — keeps Jarvis useful if the server is down.
  const getFallbackReply = (query: string): string => {
    const q = query.toLowerCase()
    if (/مرحبا|سلام|هاي|اهلا|hey|hello|hi|bonjour/.test(q)) {
      return "👋 Hi! Ask me about trading concepts, gold analysis, or VIP plans."
    }
    if (/vip|اشتراك|اشترك|سعر|price|cost|abonn/.test(q)) {
      return "TradeVisor VIP plans:\n• Two weeks: $33 (5 AI analyses per day)\n• Monthly: $69\n• 3 Months: $249\n• Yearly: $669 (best value)\n\nPayment: USDT TRC20. Open the VIP page to subscribe."
    }
    if (/gold|ذهب|xau|or\b/.test(q)) {
      return "For XAU/USD (gold): watch the London & New York sessions, use 15m for entries and 1H for trend. The VIP Gold tools and the Gold Flow Agent give live analysis."
    }
    if (/smc|smart money/.test(q)) {
      return "SMC (Smart Money Concepts): order blocks, fair value gaps, liquidity sweeps, break of structure. The VIP Education center has full SMC lessons."
    }
    if (/ict|inner circle/.test(q)) {
      return "ICT (Inner Circle Trader): killzones, order blocks, fair value gaps, liquidity pools. Full ICT lessons are in the VIP Education center."
    }
    return "I'm having trouble reaching the server right now. Please try again in a moment — or contact live support on Telegram."
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
                <span className="text-sm font-bold">Jarvis AI</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
                  <span className="text-[9px] text-[#22c55e]">Online</span>
                  {isTyping && <span className="text-[9px] text-[#666666] ml-1">typing...</span>}
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[#666666] hover:text-white">
                <ChevronDown size={18} />
              </button>
            </div>

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

              {/* Live support handoff — shown once the limit is reached */}
              {limitReached && (
                <motion.a
                  href={TELEGRAM_SUPPORT}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 bg-[#229ED9] text-white text-xs font-bold py-3 rounded-xl hover:bg-[#2ba9e0] transition-all"
                >
                  <MessageCircle size={15} />
                  Contact Live Support on Telegram
                </motion.a>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 2 && !limitReached && (
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
              {limitReached ? (
                <a href={TELEGRAM_SUPPORT} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#229ED9] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#2ba9e0] transition-all">
                  <MessageCircle size={14} /> Continue on Telegram
                </a>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Ask me anything..."
                    disabled={loading}
                    className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#555] focus:border-[#d4a843]/30 focus:outline-none disabled:opacity-50"
                  />
                  <button onClick={() => handleSend()} disabled={loading || !input.trim()}
                    className="w-9 h-9 rounded-xl bg-[#d4a843] text-[#050505] flex items-center justify-center hover:bg-[#e8c76a] transition-all disabled:opacity-50 flex-shrink-0">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
