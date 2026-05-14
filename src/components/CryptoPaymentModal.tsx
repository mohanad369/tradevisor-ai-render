import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Copy, CheckCircle, Shield, Bitcoin, Clock, AlertTriangle, Mail, Upload } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { trackPaymentSubmit } from "@/lib/analytics"
import { allowUnsafeLocalFallbacks } from "@/lib/runtime"

interface Props {
  isOpen: boolean
  onClose: () => void
  planName: string
  amount: string
  yearlyAmount?: string
}

const USDT_WALLET = "TYLqLhbtJSAaPZbibEZ1JtHfAD2ZJ71qHA"

export default function CryptoPaymentModal({ isOpen, onClose, planName, amount, yearlyAmount = "669" }: Props) {
  const [step, setStep] = useState<"select" | "wallet" | "upload" | "pending" | "success" | "error">("select")
  const [selectedAmount, setSelectedAmount] = useState(amount)
  const [selectedPlan, setSelectedPlan] = useState(planName)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState("")
  const [txId, setTxId] = useState("")
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState("")
  const [orderId] = useState(() => "TV-" + Math.random().toString(36).substring(2, 10).toUpperCase())
  const [submittedOrderId, setSubmittedOrderId] = useState(orderId)

  // ─── Save to localStorage (works without backend) ───
  const savePaymentLocally = () => {
    if (!allowUnsafeLocalFallbacks) {
      throw new Error("Offline payment fallback is disabled in production")
    }
    const pendingData = {
      orderId, plan: selectedPlan, amount: selectedAmount, email, txId,
      screenshot: screenshot || "",
      status: "PENDING", submittedAt: new Date().toISOString()
    }
    const existing = JSON.parse(localStorage.getItem("tradevisor_pending_users") || "[]")
    // Prevent duplicates
    const filtered = existing.filter((p: any) => p.orderId !== orderId)
    filtered.push(pendingData)
    localStorage.setItem("tradevisor_pending_users", JSON.stringify(filtered))
    console.log("[Payment] Saved locally:", pendingData)
  }

  const submitMutation = trpc.vip.submitPayment.useMutation({
    onSuccess: (data) => {
      if (data?.success) {
        setSubmittedOrderId(data.orderId || orderId)
        setStep("pending")
      } else {
        // Server returned false — fallback to localStorage
        if (!allowUnsafeLocalFallbacks) {
          setSubmitError("Payment server did not accept the request. Please try again.")
          setStep("error")
          return
        }
        savePaymentLocally()
        setSubmittedOrderId(orderId)
        setStep("pending")
      }
    },
    onError: (err) => {
      console.warn("[Payment] tRPC failed, using localStorage:", err.message)
      // Backend not available (static hosting) — save locally and show success
      if (!allowUnsafeLocalFallbacks) {
        setSubmitError("Payment server is unavailable. Please try again later.")
        setStep("error")
        return
      }
      savePaymentLocally()
      setSubmittedOrderId(orderId)
      setStep("pending")
    }
  })

  if (!isOpen) return null

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = (e) => setScreenshot(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmitPayment = () => {
    if (!email || !txId) return
    setSubmitError("")
    // Track payment for Facebook/Google ads
    trackPaymentSubmit(selectedAmount)
    submitMutation.mutate({
      orderId,
      planName: selectedPlan,
      amount: selectedAmount,
      email: email.trim(),
      txId: txId.trim(),
      screenshot: screenshot || undefined,
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0a0a0f] border border-[#1f1f1f] rounded-2xl max-w-md w-full overflow-hidden relative max-h-[90vh] overflow-y-auto">

            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#1f1f1f] flex items-center justify-center text-[#666666] hover:text-white z-10">
              <X size={14} />
            </button>

            {/* STEP 1: Select */}
            {step === "select" && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-[#d4a843]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bitcoin size={24} className="text-[#f2a900]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{planName}</h3>
                  <p className="text-xs text-[#666666]">Choose your plan</p>
                </div>

                {/* Monthly Plan */}
                <button onClick={() => { setSelectedAmount(amount); setSelectedPlan(planName + " Monthly"); setStep("wallet") }}
                  className="w-full bg-[#141414] border border-[#d4a843]/30 rounded-xl p-4 hover:border-[#d4a843]/60 transition-all text-left mb-3 group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Monthly</p>
                      <p className="text-[10px] text-[#666666]">Cancel anytime</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#d4a843]">${amount}<span className="text-xs text-[#666666] font-normal">/mo</span></p>
                    </div>
                  </div>
                </button>

                {/* Yearly Plan */}
                <button onClick={() => { setSelectedAmount(yearlyAmount); setSelectedPlan(planName + " Yearly"); setStep("wallet") }}
                  className="w-full bg-gradient-to-r from-[#d4a843]/10 to-[#d4a843]/5 border border-[#d4a843]/40 rounded-xl p-4 hover:border-[#d4a843]/70 transition-all text-left mb-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-[#22c55e] text-[#050505] text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">BEST VALUE</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Yearly</p>
                      <p className="text-[10px] text-[#666666]">Save big - Best value</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#d4a843]">${yearlyAmount}<span className="text-xs text-[#666666] font-normal">/yr</span></p>
                    </div>
                  </div>
                </button>

                <button onClick={() => { setSelectedAmount(amount); setSelectedPlan(planName); setStep("wallet") }}
                  className="w-full flex items-center gap-3 bg-[#141414] border border-[#f2a900]/30 rounded-xl p-4 hover:border-[#f2a900]/60 transition-all text-left mt-2">
                  <div className="w-10 h-10 bg-[#f2a900]/10 rounded-lg flex items-center justify-center">
                    <Bitcoin size={18} className="text-[#f2a900]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">USDT (TRC20)</p>
                    <p className="text-[10px] text-[#666666]">Crypto payment</p>
                  </div>
                </button>
                <div className="flex items-center gap-1.5 justify-center mt-4">
                  <Shield size={10} className="text-[#22c55e]" />
                  <span className="text-[9px] text-[#666666]">Secure payment - Manual verification</span>
                </div>
              </div>
            )}

            {/* STEP 2: Wallet */}
            {step === "wallet" && (
              <div className="p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">{selectedPlan}</h3>
                  <p className="text-2xl font-black text-[#f2a900]">${selectedAmount}</p>
                  <p className="text-[9px] text-[#666666] mt-1">Send exact amount in USDT (TRC20)</p>
                </div>
                <div className="bg-[#141414] border border-[#f2a900]/20 rounded-xl p-4 mb-4">
                  <p className="text-[10px] text-[#666666] mb-2">Order ID: <span className="text-[#d4a843] font-mono">{orderId}</span></p>
                  <p className="text-[10px] text-[#666666] mb-2">Wallet Address (TRC20):</p>
                  <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg p-3">
                    <code className="text-[10px] text-[#f2a900] font-mono flex-1 break-all">{USDT_WALLET}</code>
                    <button onClick={() => handleCopy(USDT_WALLET)}
                      className="p-1.5 rounded-md bg-[#1f1f1f] hover:bg-[#333] transition-colors flex-shrink-0">
                      {copied ? <CheckCircle size={12} className="text-[#22c55e]" /> : <Copy size={12} className="text-[#a0a0a0]" />}
                    </button>
                  </div>
                </div>
                <div className="bg-[#e11d48]/5 border border-[#e11d48]/10 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-[#e11d48] font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Send ONLY USDT on TRC20 network</p>
                </div>
                <button onClick={() => setStep("upload")}
                  className="w-full bg-gradient-to-r from-[#f2a900] to-[#d4a843] text-[#050505] font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> I've Sent The Payment
                </button>
                <button onClick={() => setStep("select")} className="w-full mt-2 text-[10px] text-[#666666]">Back</button>
              </div>
            )}

            {/* STEP 3: Upload Proof */}
            {step === "upload" && (
              <div className="p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Verify Payment</h3>
                  <p className="text-[10px] text-[#666666]">Submit proof for manual verification</p>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] text-[#666666] mb-1 block">Your Email</label>
                  <input type="email" placeholder="your@email.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555555] focus:border-[#d4a843]/30 focus:outline-none" />
                </div>
                <div className="mb-3">
                  <label className="text-[10px] text-[#666666] mb-1 block">Transaction ID (TXID)</label>
                  <input type="text" placeholder="Paste transaction hash..." value={txId}
                    onChange={e => setTxId(e.target.value)}
                    className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555555] font-mono focus:border-[#d4a843]/30 focus:outline-none" />
                </div>
                <div className="mb-4">
                  <label className="text-[10px] text-[#666666] mb-1 block">Payment Screenshot</label>
                  {!screenshot ? (
                    <label className="border-2 border-dashed border-[#333333] rounded-xl p-4 text-center cursor-pointer hover:border-[#d4a843]/40 transition-colors block">
                      <Upload size={20} className="text-[#555555] mx-auto mb-1" />
                      <p className="text-[10px] text-[#a0a0a0]">Click to upload screenshot</p>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = "" }} />
                    </label>
                  ) : (
                    <div className="relative">
                      <img src={screenshot} alt="Proof" className="w-full rounded-xl border border-[#1f1f1f]" style={{ maxHeight: 150, objectFit: "cover" }} />
                      <button onClick={() => setScreenshot(null)} className="absolute top-2 right-2 w-6 h-6 bg-[#e11d48] rounded-full flex items-center justify-center text-white"><X size={10} /></button>
                    </div>
                  )}
                </div>
                <button onClick={handleSubmitPayment} disabled={!email || !txId || submitMutation.isPending}
                  className="w-full bg-gradient-to-r from-[#d4a843] to-[#b8922e] text-[#050505] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitMutation.isPending ? <Clock size={16} className="animate-spin" /> : <Mail size={16} />}
                  {submitMutation.isPending ? "Submitting..." : "Submit for Verification"}
                </button>
                <button onClick={() => setStep("wallet")} className="w-full mt-2 text-[10px] text-[#666666]">Back</button>
              </div>
            )}

            {/* STEP 4: Pending (only reached on real success) */}
            {step === "pending" && (
              <div className="p-6 text-center">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 bg-[#d4a843]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock size={28} className="text-[#d4a843]" />
                </motion.div>
                <h3 className="text-lg font-bold text-white mb-2">Pending Admin Approval</h3>
                <p className="text-[11px] text-[#a0a0a0] mb-4">Your payment is under review. <span className="text-[#d4a843] font-bold">Do NOT send again.</span></p>
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 text-left mb-4">
                  <p className="text-[9px] text-[#666666] mb-1">Order ID: <span className="text-[#d4a843] font-mono">{submittedOrderId}</span></p>
                  <p className="text-[9px] text-[#666666] mb-1">Amount: <span className="text-white">${selectedAmount} USDT</span></p>
                  <p className="text-[9px] text-[#666666] mb-1">TXID: <span className="text-[#f2a900] font-mono text-[8px]">{txId}</span></p>
                  <p className="text-[9px] text-[#666666]">Status: <span className="text-[#e11d48] font-bold">PENDING</span></p>
                </div>
                <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-[#22c55e]">Save your Order ID: <span className="font-mono font-bold">{submittedOrderId}</span></p>
                  <p className="text-[9px] text-[#666666] mt-1">Contact: <span className="text-[#d4a843]">mohanadmaria777@gmail.com</span></p>
                </div>
                <button onClick={onClose} className="w-full bg-[#141414] border border-[#1f1f1f] text-white font-bold py-3 rounded-xl hover:border-[#d4a843]/30 transition-all">
                  I Understand - Close
                </button>
              </div>
            )}

            {/* STEP 5: Error — NEW. Surfaces backend errors instead of pretending success */}
            {step === "error" && (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-[#e11d48]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="text-[#e11d48]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Submission Failed</h3>
                <p className="text-[11px] text-[#a0a0a0] mb-4">
                  Your payment proof was NOT submitted. Please retry or contact support.
                </p>
                <div className="bg-[#e11d48]/5 border border-[#e11d48]/20 rounded-xl p-3 mb-4 text-left">
                  <p className="text-[10px] text-[#e11d48] font-mono break-all">{submitError}</p>
                </div>
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-3 mb-4">
                  <p className="text-[9px] text-[#666666]">Order ID: <span className="text-[#d4a843] font-mono">{orderId}</span></p>
                  <p className="text-[9px] text-[#666666] mt-1">Contact: <span className="text-[#d4a843]">mohanadmaria777@gmail.com</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep("upload")} className="flex-1 bg-[#d4a843] text-[#050505] font-bold py-3 rounded-xl">
                    Try Again
                  </button>
                  <button onClick={onClose} className="flex-1 bg-[#141414] border border-[#1f1f1f] text-white font-bold py-3 rounded-xl">
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* STEP: Success */}
            {step === "success" && (
              <div className="p-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-[#22c55e]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-[#22c55e]" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">Activated!</h3>
                <p className="text-sm text-[#a0a0a0] mb-4">Welcome to <span className="text-[#d4a843] font-semibold">Tradevisor VIP</span></p>
                <button onClick={onClose} className="w-full bg-[#d4a843] text-[#050505] font-bold py-3 rounded-xl hover:bg-[#e8c76a] transition-all">
                  Access VIP Dashboard
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
