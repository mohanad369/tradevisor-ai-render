// ─── Lead Capture — Newsletter / VIP Waiting List ───
import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, CheckCircle, Zap, ArrowRight } from "lucide-react"

interface Props {
  variant?: "inline" | "card"
}

export default function LeadCapture({ variant = "card" }: Props) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes("@")) return
    setLoading(true)
    // Save to localStorage (replace with API later)
    const leads = JSON.parse(localStorage.getItem("tradevisor_leads") || "[]")
    leads.push({ email, date: new Date().toISOString(), source: "newsletter" })
    localStorage.setItem("tradevisor_leads", JSON.stringify(leads))
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 500)
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={submitted}
          className="flex-1 min-w-0 bg-[#141414] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-[#555] focus:border-[#d4a843] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || submitted}
          className="px-3 py-2 bg-[#d4a843] text-[#050505] text-xs font-bold rounded-lg hover:bg-[#e8c76a] transition-all disabled:opacity-50 flex-shrink-0"
        >
          {submitted ? <CheckCircle size={14} /> : loading ? "..." : "Join"}
        </button>
      </form>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-gradient-to-br from-[#0d0d0d] to-[#141414] border border-[#d4a843]/20 rounded-2xl p-5 sm:p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a843]/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#d4a843]/10 flex items-center justify-center">
            <Zap size={16} className="text-[#d4a843]" />
          </div>
          <span className="text-xs font-bold text-[#d4a843]">VIP Early Access</span>
        </div>

        <h3 className="text-sm sm:text-base font-bold mb-1">Get Trading Signals First</h3>
        <p className="text-[10px] sm:text-xs text-[#a0a0a0] mb-4 leading-relaxed">
          Join our exclusive list and receive AI-powered trading signals, market analysis, and early access to new features.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email..."
                required
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-3 text-xs text-white placeholder-[#555] focus:border-[#d4a843] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#d4a843] text-[#050505] font-bold py-3 px-5 rounded-xl hover:bg-[#e8c76a] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs flex-shrink-0"
            >
              {loading ? "Joining..." : <><span>Join Now</span><ArrowRight size={12} /></>}
            </button>
          </form>
        ) : (
          <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-4 text-center">
            <CheckCircle size={20} className="text-[#22c55e] mx-auto mb-1" />
            <p className="text-xs text-[#22c55e] font-bold">You're on the list!</p>
            <p className="text-[10px] text-[#a0a0a0] mt-0.5">Check your email for confirmation.</p>
          </div>
        )}

        <p className="text-[8px] text-[#666666] mt-3 text-center">
          No spam. Unsubscribe anytime. Your data is protected.
        </p>
      </div>
    </motion.div>
  )
}
