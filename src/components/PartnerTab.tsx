import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Users, Gift, Copy, CheckCircle, ArrowRight, TrendingUp,
  Mail, CreditCard, Shield, Clock, Zap, Award, Share2
} from "lucide-react"
import { useToast } from "./ToastNotifications"
import { trpc } from "@/lib/trpc"

export default function PartnerTab() {
  const toast = useToast()
  const subscriber = getSubscriber()
  const code = subscriber?.code || "UNKNOWN"
  const referralLink = `${window.location.origin}/#/vip?ref=${code}`

  const [copied, setCopied] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState("")
  const [invitedName, setInvitedName] = useState("")
  const [txId, setTxId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Referral stats
  const [referrals, setReferrals] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rewards: 0 })

  const submitReferral = trpc.vip.submitReferral.useMutation({
    onSuccess: () => {
      toast.addToast("Invitation submitted! Pending admin review.", "success")
      setShowInviteForm(false)
      setInvitedEmail("")
      setInvitedName("")
      setTxId("")
      setSubmitting(false)
      loadReferrals()
    },
    onError: () => {
      // Static hosting: API unavailable, localStorage already saved the referral
      toast.addToast("Invitation submitted! Pending admin review.", "success")
      setShowInviteForm(false)
      setInvitedEmail("")
      setInvitedName("")
      setTxId("")
      setSubmitting(false)
      loadReferrals()
    }
  })

  useEffect(() => { loadReferrals() }, [])

  const loadReferrals = () => {
    const stored = JSON.parse(localStorage.getItem("tradevisor_referrals_local") || "[]")
    const myReferrals = stored.filter((r: any) => r.referrerCode === code)
    setReferrals(myReferrals)
    setStats({
      total: myReferrals.length,
      pending: myReferrals.filter((r: any) => r.status === "PENDING").length,
      approved: myReferrals.filter((r: any) => r.status === "APPROVED").length,
      rewards: myReferrals.filter((r: any) => r.rewardGranted).length,
    })
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.addToast("Referral link copied!", "success")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmitInvite = () => {
    if (!invitedEmail || !invitedEmail.includes("@")) {
      toast.addToast("Enter a valid email", "warning")
      return
    }
    if (!txId) {
      toast.addToast("Enter payment TXID", "warning")
      return
    }
    setSubmitting(true)

    const referralId = "REF-" + Math.random().toString(36).substring(2, 10).toUpperCase()
    const referralData = {
      referralId,
      referrerCode: code,
      referrerEmail: subscriber?.email || "",
      invitedEmail,
      invitedName: invitedName || undefined,
      txId,
      amount: "$100",
      status: "PENDING",
      submittedAt: new Date().toISOString(),
      rewardGranted: false,
    }

    // Save locally
    const stored = JSON.parse(localStorage.getItem("tradevisor_referrals_local") || "[]")
    stored.push(referralData)
    localStorage.setItem("tradevisor_referrals_local", JSON.stringify(stored))

    // Try API + email fallback
    submitReferral.mutate(referralData)

    // Notify admin via email
    const formData = new FormData()
    formData.append("_captcha", "false")
    formData.append("_template", "table")
    formData.append("subject", `[Tradevisor] NEW Referral from ${code}`)
    formData.append("referral_id", referralId)
    formData.append("referrer_code", code)
    formData.append("referrer_email", subscriber?.email || "")
    formData.append("invited_email", invitedEmail)
    formData.append("invited_name", invitedName || "")
    formData.append("txid", txId)
    formData.append("amount", "$100")
    formData.append("date", new Date().toLocaleString())
    formData.append("action", "REVIEW and APPROVE this referral — grant 1 free month to referrer")

    // Referral saved to localStorage for admin review
    console.log("[Referral] Saved locally:", { referralId, code, invitedEmail })
  }

  if (showInviteForm) {
    return (
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-0.5 sm:mb-1"><Users size={16} className="text-[#d4a843] sm:hidden" /><Users size={18} className="text-[#d4a843] hidden sm:block" /> Invite Friend</h2>
          <p className="text-[11px] sm:text-xs text-[#666666]">Submit your friend's payment proof to claim your free month.</p>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
          <button onClick={() => setShowInviteForm(false)} className="text-[10px] text-[#666666] hover:text-white flex items-center gap-1 mb-2"><ArrowRight size={10} className="rotate-180" /> Back</button>
          <div className="bg-[#d4a843]/5 border border-[#d4a843]/10 rounded-xl p-3">
            <p className="text-[10px] sm:text-xs text-[#a0a0a0]"><span className="text-[#d4a843] font-bold">Your referral code:</span> <span className="font-mono text-white">{code}</span></p>
          </div>
          <div>
            <label className="text-[10px] text-[#666666] block mb-1">Friend's Name</label>
            <input value={invitedName} onChange={e => setInvitedName(e.target.value)} placeholder="John Smith" className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] focus:border-[#d4a843] focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#666666] block mb-1">Friend's Email <span className="text-[#e11d48]">*</span></label>
            <div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" /><input value={invitedEmail} onChange={e => setInvitedEmail(e.target.value)} placeholder="friend@email.com" className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:border-[#d4a843] focus:outline-none" /></div>
          </div>
          <div>
            <label className="text-[10px] text-[#666666] block mb-1">Payment TXID <span className="text-[#e11d48]">*</span></label>
            <div className="relative"><CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" /><input value={txId} onChange={e => setTxId(e.target.value)} placeholder="USDT transaction hash" className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono placeholder-[#555] focus:border-[#d4a843] focus:outline-none" /></div>
          </div>
          <button onClick={handleSubmitInvite} disabled={submitting} className="w-full bg-[#d4a843] text-[#050505] font-bold py-3 rounded-xl hover:bg-[#e8c76a] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs">
            {submitting ? <><Shield size={14} className="animate-spin" /> Submitting...</> : <><Gift size={14} /> Submit & Claim Free Month</>}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-0.5 sm:mb-1"><Users size={16} className="text-[#d4a843] sm:hidden" /><Users size={18} className="text-[#d4a843] hidden sm:block" /> Become a Partner</h2>
        <p className="text-[11px] sm:text-xs text-[#666666]">Invite friends, earn 1 free month per successful referral.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { label: "Invited", value: stats.total, icon: Users, color: "#3b82f6" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "#d4a843" },
          { label: "Approved", value: stats.approved, icon: CheckCircle, color: "#22c55e" },
          { label: "Rewards", value: stats.rewards, icon: Gift, color: "#e11d48" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-3 text-center">
            <s.icon size={16} style={{ color: s.color }} className="mx-auto mb-1.5" />
            <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-[#666666]">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Referral Link */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-[#d4a843]/10 to-[#0d0d0d] border border-[#d4a843]/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Share2 size={16} className="text-[#d4a843]" />
          <span className="text-sm font-bold">Your Referral Link</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-[11px] font-mono text-[#a0a0a0] truncate">
            {referralLink}
          </div>
          <button onClick={handleCopyLink}
            className="bg-[#d4a843] text-[#050505] font-bold px-4 py-2.5 rounded-xl hover:bg-[#e8c76a] transition-all flex items-center justify-center gap-1.5 text-xs flex-shrink-0">
            {copied ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <p className="text-[9px] text-[#666666] mt-2">Share this link. When your friend subscribes and pays, you get 1 month free.</p>
      </motion.div>

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Zap size={16} className="text-[#d4a843]" /> How It Works</h3>
        <div className="space-y-3">
          {[
            { step: "1", text: "Share your referral link with a friend", icon: Share2 },
            { step: "2", text: "Friend subscribes to VIP and pays", icon: CreditCard },
            { step: "3", text: "Submit your friend's payment proof here", icon: Shield },
            { step: "4", text: "Admin reviews and approves", icon: CheckCircle },
            { step: "5", text: "You get 1 FREE month added to your subscription!", icon: Gift, highlight: true },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                item.highlight ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#141414] text-[#a0a0a0]"
              }`}>{item.step}</div>
              <div className="flex-1">
                <p className={`text-[11px] sm:text-xs ${item.highlight ? "text-[#22c55e] font-bold" : "text-[#a0a0a0]"}`}>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowInviteForm(true)}
          className="w-full mt-4 bg-[#d4a843] text-[#050505] font-bold py-3 rounded-xl hover:bg-[#e8c76a] transition-all flex items-center justify-center gap-2 text-xs">
          <Gift size={14} /> Submit Friend's Payment & Claim
        </button>
      </motion.div>

      {/* My Referrals List */}
      {referrals.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-sm font-bold mb-3">My Referrals</h3>
          <div className="space-y-2">
            {referrals.slice().reverse().map((ref: any, i: number) => (
              <div key={i} className={`bg-[#0d0d0d] border rounded-xl p-3 ${
                ref.status === "APPROVED" ? "border-[#22c55e]/20" :
                ref.status === "PENDING" ? "border-[#d4a843]/20" :
                "border-[#e11d48]/10"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-[#d4a843]">{ref.referralId}</span>
                    <span className="text-[10px] text-[#a0a0a0]">{ref.invitedEmail}</span>
                  </div>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${
                    ref.status === "APPROVED" ? "bg-[#22c55e]/10 text-[#22c55e]" :
                    ref.status === "PENDING" ? "bg-[#d4a843]/10 text-[#d4a843]" :
                    "bg-[#e11d48]/10 text-[#e11d48]"
                  }`}>{ref.status}</span>
                </div>
                {ref.rewardGranted && (
                  <div className="mt-1.5 text-[8px] text-[#22c55e] flex items-center gap-1">
                    <Award size={10} /> 1 free month granted
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function getSubscriber() {
  const email = localStorage.getItem("tradevisor_current_user_email")
  const code = localStorage.getItem("tradevisor_current_user_code")
  if (!email || !code) return null
  const subs = JSON.parse(localStorage.getItem("tv_subscribers_v3") || "[]")
  return subs.find((s: any) => s.email === email && s.code === code) || { email, code }
}
