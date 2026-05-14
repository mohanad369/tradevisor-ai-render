import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  Shield, LogOut, Users, BarChart3, Settings, CreditCard, CheckCircle, XCircle,
  Mail, Key, Ban, RefreshCw, Copy, ChevronDown, ChevronUp, Trash2, Menu, X,
  TrendingUp, Clock, Gift, Crown, ImageIcon, ExternalLink, UserPlus
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { trpc } from '@/lib/trpc'
import {
  getStats, getSubscribers, revokeSubscriber, reactivateSubscriber,
  renewSubscriber, getAvailableCode, assignCode, addSubscriber,
  initCodes, permanentlyDeleteSubscriber, type Subscriber,
  initMonthlyCodes, getAvailableMonthlyCode, assignMonthlyCode,
  replaceAllMonthlyCodes, getMonthlyCodesStats,
  initYearlyCodes, getAvailableYearlyCode, assignYearlyCode,
  replaceAllYearlyCodes, getYearlyCodesStats
} from '@/lib/vipSystem'
import { allowUnsafeLocalFallbacks } from '@/lib/runtime'

const ADMIN_EMAIL = "mohanadmaria777@gmail.com"
const ADMIN_PASSWORD = "Tradevisor2026!"
const PENDING_KEY = "tradevisor_pending_users"
const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "")

type AdminGrantResponse =
  | { success: true; email: string; code: string; expires: string; reused?: boolean }
  | { error: string }

// ─── Fallback: check if tRPC backend is available ───
let trpcAvailable = true
function checkTrpcError(err: any) {
  const msg = err?.message || ""
  if (msg.includes("Unexpected token") || msg.includes("DOCTYPE") || msg.includes("Failed to fetch") || msg.includes("JSON")) {
    trpcAvailable = false
    return true
  }
  return false
}

function PaymentProof({ screenshot }: { screenshot?: string }) {
  if (!screenshot) {
    return (
      <div className="bg-[#141414] rounded-lg p-3 col-span-2 border border-[#1f1f1f]">
        <div className="flex items-center gap-2 text-[#666666] text-xs">
          <ImageIcon size={14} />
          No payment screenshot attached
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#141414] rounded-lg p-3 col-span-2 border border-[#d4a843]/20">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-[#d4a843] text-xs font-bold">
          <ImageIcon size={14} />
          Payment Screenshot
        </div>
        <a
          href={screenshot}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#f2a900] hover:text-white flex items-center gap-1 transition-colors"
        >
          Open full size <ExternalLink size={11} />
        </a>
      </div>
      <a href={screenshot} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={screenshot}
          alt="Payment proof"
          className="w-full max-h-64 object-contain rounded-lg border border-[#1f1f1f] bg-black"
        />
      </a>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const { isAuthenticated, login: adminLogin, logout } = useAuth()
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'overview'|'subscribers'|'verifications'|'tradingview'|'monthly'|'yearly'|'referrals'|'settings'>('overview')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [stats, setStats] = useState(getStats())
  const [toast, setToast] = useState<{msg: string; type: string} | null>(null)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [giftEmail, setGiftEmail] = useState("")
  const [giftMonths, setGiftMonths] = useState(1)
  const [giftLoading, setGiftLoading] = useState(false)
  const [giftResult, setGiftResult] = useState<Extract<AdminGrantResponse, { success: true }> | null>(null)

  // TradingView pending requests count
  const tvPendingCount = JSON.parse(localStorage.getItem("tradevisor_tv_notifications") || "[]").filter((r: any) => r.status === "pending").length

  // Referrals
  const [referrals, setReferrals] = useState<any[]>([])
  const pendingReferralsCount = referrals.filter((r: any) => r.status === 'PENDING').length

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ─── tRPC Queries (with localStorage fallback) ───
  const utils = trpc.useUtils()
  const { data: trpcStats } = trpc.vip.getStats.useQuery(undefined, {
    enabled: isAuthenticated && trpcAvailable,
    refetchInterval: 5000,
    retry: false
  })
  const { data: trpcSubs } = trpc.vip.getSubscribers.useQuery(undefined, {
    enabled: isAuthenticated && trpcAvailable,
    refetchInterval: 5000,
    retry: false
  })
  const { data: trpcPayments } = trpc.vip.getPayments.useQuery(undefined, {
    enabled: isAuthenticated && trpcAvailable,
    refetchInterval: 5000,
    retry: false
  })
  const { data: trpcCodes } = trpc.vip.getCodes.useQuery(undefined, {
    enabled: isAuthenticated && trpcAvailable,
    refetchInterval: 5000,
    retry: false
  })
  const { data: trpcReferrals } = trpc.vip.getReferrals.useQuery(undefined, {
    enabled: isAuthenticated && trpcAvailable,
    refetchInterval: 5000,
    retry: false
  })

  // ─── Referral Mutations ───
  const approveReferralMutation = trpc.vip.approveReferral.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showToast(`Referral approved! 1 month added to ${data.referrerEmail}`, 'success')
      } else {
        showToast(data.error || 'Approval failed', 'error')
      }
      invalidateAll()
    },
    onError: (err) => {
      showToast(err.message, 'error')
    }
  })

  const rejectReferralMutation = trpc.vip.rejectReferral.useMutation({
    onSuccess: () => { showToast('Referral rejected.', 'warning'); invalidateAll() },
    onError: (err) => showToast(err.message, 'error')
  })

  const deleteReferralMutation = trpc.vip.deleteReferral.useMutation({
    onSuccess: () => { showToast('Referral deleted.', 'info'); invalidateAll() },
    onError: (err) => showToast(err.message, 'error')
  })

  // ─── tRPC Mutations (with localStorage fallback) ───
  const approveMutation = trpc.vip.approvePayment.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showToast(`Approved! Code ${data.code} sent to ${data.email}`, 'success')
      } else {
        showToast(data.error || 'Approval failed', 'error')
      }
      invalidateAll()
    },
    onError: (err) => {
      if (checkTrpcError(err)) {
        approveLocal(currentApproveOrderId)
      } else {
        showToast(err.message, 'error')
      }
    }
  })

  const [currentApproveOrderId, setCurrentApproveOrderId] = useState("")

  const recheckPaymentMutation = trpc.vip.recheckPayment.useMutation({
    onSuccess: (data) => {
      if (!data.success) {
        showToast(data.error || 'Recheck failed', 'error')
      } else if (data.autoVerified) {
        showToast(`TXID verified! Code ${data.code} activated for ${data.email}`, 'success')
      } else {
        showToast(`Still pending: ${data.reason || 'TXID not confirmed yet'}`, data.retryable ? 'warning' : 'error')
      }
      invalidateAll()
    },
    onError: (err) => showToast(err.message, 'error')
  })

  const rejectMutation = trpc.vip.rejectPayment.useMutation({
    onSuccess: () => { showToast('Payment rejected.', 'warning'); invalidateAll() },
    onError: (err) => {
      if (checkTrpcError(err)) rejectLocal(currentActionOrderId)
      else showToast(err.message, 'error')
    }
  })

  const deletePaymentMutation = trpc.vip.deletePayment.useMutation({
    onSuccess: () => { showToast('Deleted.', 'info'); invalidateAll() },
    onError: (err) => {
      if (checkTrpcError(err)) deletePendingLocal(currentActionOrderId)
      else showToast(err.message, 'error')
    }
  })

  const revokeMutation = trpc.vip.revokeSubscriber.useMutation({
    onSuccess: () => { showToast('Access revoked!', 'warning'); invalidateAll() },
    onError: (err) => {
      if (checkTrpcError(err)) { revokeSubscriberLocal(currentSubId); refreshLocal() }
      else showToast(err.message, 'error')
    }
  })

  const reactivateMutation = trpc.vip.reactivateSubscriber.useMutation({
    onSuccess: () => { showToast('Reactivated!', 'success'); invalidateAll() },
    onError: (err) => {
      if (checkTrpcError(err)) { reactivateSubscriberLocal(currentSubId); refreshLocal() }
      else showToast(err.message, 'error')
    }
  })

  const renewMutation = trpc.vip.renewSubscriber.useMutation({
    onSuccess: () => { showToast('Renewed!', 'success'); invalidateAll() },
    onError: (err) => {
      if (checkTrpcError(err)) { renewSubscriberLocal(currentSubId); refreshLocal() }
      else showToast(err.message, 'error')
    }
  })

  const deleteSubMutation = trpc.vip.deleteSubscriber.useMutation({
    onSuccess: () => { showToast('Subscriber deleted!', 'warning'); invalidateAll() },
    onError: (err) => {
      if (checkTrpcError(err)) { permanentlyDeleteSubscriberLocal(currentSubId); refreshLocal() }
      else showToast(err.message, 'error')
    }
  })

  const replaceCodesMutation = trpc.vip.replaceAllCodes.useMutation({
    onSuccess: (data) => { showToast(`All ${data.count} codes replaced!`, 'warning'); invalidateAll() },
    onError: (err) => {
      if (checkTrpcError(err)) { replaceAllCodesLocal(); refreshLocal() }
      else showToast(err.message, 'error')
    }
  })

  const [currentActionOrderId, setCurrentActionOrderId] = useState("")
  const [currentSubId, setCurrentSubId] = useState("")

  function invalidateAll() {
    utils.vip.getStats.invalidate()
    utils.vip.getPayments.invalidate()
    utils.vip.getSubscribers.invalidate()
    utils.vip.getCodes.invalidate()
    utils.vip.getReferrals.invalidate()
  }

  // ─── Sync tRPC data when available ───
  useEffect(() => {
    if (trpcStats && trpcAvailable) {
      setStats((current) => ({ ...current, ...trpcStats }))
    }
  }, [trpcStats])

  useEffect(() => {
    if (trpcReferrals && trpcAvailable && trpcReferrals.length > 0) {
      setReferrals(trpcReferrals)
    }
  }, [trpcReferrals])

  // ─── Load referrals from localStorage (always load, tRPC overrides when available) ───
  const loadReferralsLocal = () => {
    const stored = JSON.parse(localStorage.getItem("tradevisor_referrals_local") || "[]")
    setReferrals(stored)
  }

  useEffect(() => {
    if (trpcSubs && trpcAvailable) {
      setSubscribers(trpcSubs.map((s: any) => ({
        id: s.subscriberId,
        orderId: s.orderId,
        email: s.email,
        code: s.code,
        plan: s.plan,
        amount: s.amount,
        txId: s.txId,
        status: s.status,
        startDate: s.startDate ? new Date(s.startDate).toISOString() : new Date().toISOString(),
        endDate: s.endDate ? new Date(s.endDate).toISOString() : new Date(Date.now()+30*86400000).toISOString(),
      })))
    }
  }, [trpcSubs])

  useEffect(() => {
    if (trpcPayments && trpcAvailable) {
      setPendingUsers(trpcPayments.map((p: any) => ({
        orderId: p.orderId,
        plan: p.planName,
        amount: p.amount,
        email: p.email,
        txId: p.txId,
        screenshot: p.screenshot || "",
        status: p.status,
        submittedAt: p.submittedAt ? new Date(p.submittedAt).toISOString() : new Date().toISOString(),
        assignedCode: p.assignedCode,
      })))
    }
  }, [trpcPayments])

  // ─── localStorage Refresh ───
  const refreshLocal = () => {
    initCodes()
    setSubscribers(getSubscribers())
    setPendingUsers(JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'))
    setStats(getStats())
    loadReferralsLocal()
  }

  useEffect(() => {
    if (!isAuthenticated) return
    initCodes()
    refreshLocal()
    const interval = setInterval(refreshLocal, 3000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // ─── Load referrals when entering referrals tab ───
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'referrals') return
    loadReferralsLocal()
  }, [isAuthenticated, activeTab])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await adminLogin(password)) {
      showToast('Welcome!', 'success')
    } else {
      showToast('Wrong password!', 'error')
    }
  }

  // ─── APPROVE (localStorage fallback) ───
  const approveLocal = (orderId: string) => {
    const allPending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    const user = allPending.find((u: any) => u.orderId === orderId)
    if (!user) { showToast('User not found!', 'error'); return }
    const code = getAvailableCode()
    if (!code) { showToast('No codes available!', 'error'); return }
    assignCode(code, user.email)
    addSubscriber({ orderId: user.orderId, email: user.email, code, plan: user.plan || user.planName, amount: user.amount, txId: user.txId, status: 'ACTIVE' })
    const logins = JSON.parse(localStorage.getItem('tradevisor_user_logins') || '[]')
    logins.push({ email: user.email, code })
    localStorage.setItem('tradevisor_user_logins', JSON.stringify(logins))
    const updated = allPending.map((u: any) =>
      u.orderId === orderId ? { ...u, status: 'APPROVED', approvedAt: new Date().toISOString(), assignedCode: code } : u
    )
    localStorage.setItem(PENDING_KEY, JSON.stringify(updated))
    refreshLocal()
    showToast(`Approved! Code ${code} sent to ${user.email}`, 'success')
  }

  // ─── REJECT (localStorage fallback) ───
  const rejectLocal = (orderId: string) => {
    const allPending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    const updated = allPending.map((u: any) =>
      u.orderId === orderId ? { ...u, status: 'REJECTED', rejectedAt: new Date().toISOString() } : u
    )
    localStorage.setItem(PENDING_KEY, JSON.stringify(updated))
    refreshLocal()
    showToast('Payment rejected.', 'warning')
  }

  // ─── DELETE PENDING (localStorage fallback) ───
  const deletePendingLocal = (orderId: string) => {
    const allPending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    localStorage.setItem(PENDING_KEY, JSON.stringify(allPending.filter((u: any) => u.orderId !== orderId)))
    refreshLocal()
    showToast('Request deleted.', 'info')
  }

  // ─── REVOKE (localStorage fallback) ───
  const revokeSubscriberLocal = (subId: string) => {
    revokeSubscriber(subId)
  }
  const reactivateSubscriberLocal = (subId: string) => {
    reactivateSubscriber(subId)
  }
  const renewSubscriberLocal = (subId: string) => {
    renewSubscriber(subId)
  }
  const permanentlyDeleteSubscriberLocal = (subId: string) => {
    permanentlyDeleteSubscriber(subId)
  }
  const replaceAllCodesLocal = () => {
    localStorage.removeItem('tv_codes_v3')
    initCodes()
  }

  // ─── Action handlers ───
  const handleApprove = (orderId: string) => {
    setCurrentApproveOrderId(orderId)
    if (!trpcAvailable) { approveLocal(orderId); return }
    approveMutation.mutate({ orderId })
  }

  const handleRecheckPayment = (orderId: string) => {
    if (!trpcAvailable) {
      showToast('Automatic TXID recheck requires the secure server.', 'error')
      return
    }
    recheckPaymentMutation.mutate({ orderId })
  }
  const handleReject = (orderId: string) => {
    if (!confirm('Reject this payment?')) return
    setCurrentActionOrderId(orderId)
    if (!trpcAvailable) { rejectLocal(orderId); return }
    rejectMutation.mutate({ orderId })
  }
  const handleDeletePending = (orderId: string) => {
    if (!confirm('Delete this request?')) return
    setCurrentActionOrderId(orderId)
    if (!trpcAvailable) { deletePendingLocal(orderId); return }
    deletePaymentMutation.mutate({ orderId })
  }
  const handleRevoke = (subId: string) => {
    if (!confirm("Revoke this subscriber's access?")) return
    setCurrentSubId(subId)
    if (!trpcAvailable) { revokeSubscriberLocal(subId); refreshLocal(); showToast('Access revoked!', 'warning'); return }
    revokeMutation.mutate({ subscriberId: subId })
  }
  const handleReactivate = (subId: string) => {
    if (!confirm("Reactivate this subscriber?")) return
    setCurrentSubId(subId)
    if (!trpcAvailable) { reactivateSubscriberLocal(subId); refreshLocal(); showToast('Reactivated!', 'success'); return }
    reactivateMutation.mutate({ subscriberId: subId })
  }
  const handleRenew = (subId: string) => {
    if (!confirm("Renew subscription +1 period?")) return
    setCurrentSubId(subId)
    if (!trpcAvailable) { renewSubscriberLocal(subId); refreshLocal(); showToast('Renewed!', 'success'); return }
    renewMutation.mutate({ subscriberId: subId })
  }
  const handleDeleteSubscriber = (subId: string) => {
    if (!confirm('DELETE this subscriber PERMANENTLY?\n\nThis removes VIP access and frees their code.\n\nCannot be undone!')) return
    setCurrentSubId(subId)
    if (!trpcAvailable) { permanentlyDeleteSubscriberLocal(subId); refreshLocal(); showToast('Subscriber deleted!', 'warning'); return }
    deleteSubMutation.mutate({ subscriberId: subId })
  }
  const handleReplaceAllCodes = () => {
    if (!confirm('DELETE all old codes and create 100 NEW ones?\n\nActive subscribers will LOSE their codes!\n\nThis cannot be undone!')) return
    if (!trpcAvailable) { replaceAllCodesLocal(); refreshLocal(); showToast('All codes replaced!', 'warning'); return }
    replaceCodesMutation.mutate()
  }

  const handleGrantVipGift = async (event: React.FormEvent) => {
    event.preventDefault()
    setGiftResult(null)
    setGiftLoading(true)
    try {
      const apiOrigin = configuredApiOrigin || window.location.origin
      const token = localStorage.getItem("tradevisor_admin_session") || ""
      const response = await fetch(`${apiOrigin}/api/admin/grant-vip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: giftEmail,
          months: giftMonths,
          plan: `Admin Gift ${giftMonths} Month${giftMonths === 1 ? "" : "s"}`,
        }),
      })
      const data = await response.json().catch(() => null) as AdminGrantResponse | null
      if (!response.ok || !data || "error" in data || !data.success) {
        showToast(data && "error" in data ? data.error : "Could not create VIP code", "error")
        return
      }
      setGiftResult(data)
      setGiftEmail("")
      showToast(`VIP code created for ${data.email}`, "success")
      invalidateAll()
    } catch {
      showToast("Secure server is unavailable", "error")
    } finally {
      setGiftLoading(false)
    }
  }

  // ─── Monthly Subscription Codes Handlers ───
  const handleReplaceMonthlyCodes = () => {
    if (!confirm('DELETE all old MONTHLY subscription codes and create 100 NEW ones?\n\nActive subscribers will LOSE their codes!\n\nThis cannot be undone!')) return
    replaceAllMonthlyCodes(100)
    refreshLocal()
    showToast('All monthly subscription codes replaced!', 'warning')
  }

  // ─── Yearly VIP Codes Handlers ───
  const handleReplaceYearlyCodes = () => {
    if (!confirm('DELETE all old YEARLY VIP codes and create 100 NEW ones?\n\nActive subscribers will LOSE their codes!\n\nThis cannot be undone!')) return
    replaceAllYearlyCodes(100)
    refreshLocal()
    showToast('All yearly VIP codes replaced!', 'warning')
  }

  // ─── REFERRAL HANDLERS ───
  const handleApproveReferral = (referralId: string) => {
    if (!confirm('Approve this referral and grant 1 free month to the referrer?')) return
    const stored = JSON.parse(localStorage.getItem("tradevisor_referrals_local") || "[]")
    const updated = stored.map((r: any) => r.referralId === referralId ? { ...r, status: 'APPROVED', approvedAt: new Date().toISOString(), rewardGranted: true, rewardDate: new Date().toISOString() } : r)
    localStorage.setItem("tradevisor_referrals_local", JSON.stringify(updated))
    if (!trpcAvailable) { refreshLocal(); showToast('Referral approved!', 'success'); return }
    approveReferralMutation.mutate({ referralId })
  }
  const handleRejectReferral = (referralId: string) => {
    if (!confirm('Reject this referral?')) return
    const stored = JSON.parse(localStorage.getItem("tradevisor_referrals_local") || "[]")
    const updated = stored.map((r: any) => r.referralId === referralId ? { ...r, status: 'REJECTED' } : r)
    localStorage.setItem("tradevisor_referrals_local", JSON.stringify(updated))
    if (!trpcAvailable) { refreshLocal(); showToast('Referral rejected.', 'warning'); return }
    rejectReferralMutation.mutate({ referralId })
  }
  const handleDeleteReferral = (referralId: string) => {
    if (!confirm('Delete this referral record?')) return
    const stored = JSON.parse(localStorage.getItem("tradevisor_referrals_local") || "[]")
    localStorage.setItem("tradevisor_referrals_local", JSON.stringify(stored.filter((r: any) => r.referralId !== referralId)))
    if (!trpcAvailable) { refreshLocal(); showToast('Referral deleted.', 'info'); return }
    deleteReferralMutation.mutate({ referralId })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copied!', 'success')
  }

  const pendingPayments = (pendingUsers || []).filter((p: any) => p.status === 'PENDING')
  const approvedPayments = (pendingUsers || []).filter((p: any) => p.status === 'APPROVED')
  const rejectedPayments = (pendingUsers || []).filter((p: any) => p.status === 'REJECTED')

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-3 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-[#d4a843]/10 flex items-center justify-center mb-4 mx-auto">
            <Shield size={24} className="text-[#d4a843]" />
          </div>
          <h1 className="text-lg font-bold text-center mb-4">Admin Panel</h1>
          <form onSubmit={login} className="space-y-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-white placeholder-[#666666] focus:border-[#d4a843] focus:outline-none" />
            <button type="submit" className="w-full bg-[#d4a843] text-[#050505] font-bold py-3 rounded-xl hover:bg-[#e8c76a] transition-all">Login</button>
          </form>
          <button onClick={() => navigate('/')} className="w-full text-center text-[#666666] text-xs mt-3 hover:text-[#d4a843]">Back</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl text-xs font-bold shadow-2xl border ${
            toast.type === 'success' ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]' :
            toast.type === 'error' ? 'bg-[#e11d48]/10 border-[#e11d48]/30 text-[#e11d48]' :
            'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]'
          }`}>
          {toast.msg}
        </motion.div>
      )}

      {/* Header */}
      <header className="h-12 sm:h-14 bg-[#0d0d0d] border-b border-[#1f1f1f] px-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden text-[#a0a0a0] hover:text-white p-1 mr-1">
            <Menu size={20} />
          </button>
          <Shield size={16} className="text-[#d4a843]" />
          <span className="font-bold text-sm">Tradevisor Admin</span>
          {!trpcAvailable && <span className="text-[8px] bg-[#e11d48]/20 text-[#e11d48] px-1.5 py-0.5 rounded ml-1">LOCAL</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { refreshLocal(); invalidateAll() }} className="text-[#666666] hover:text-[#d4a843] text-xs flex items-center gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={logout} className="text-[#666666] hover:text-[#e11d48] text-xs flex items-center gap-1">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-56 bg-[#0d0d0d] border-r border-[#1f1f1f] min-h-[calc(100vh-57px)] p-3">
          {[
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'subscribers' as const, label: 'Subscribers', icon: Users },
            { id: 'verifications' as const, label: 'Verifications', icon: CreditCard },
            { id: 'tradingview' as const, label: 'TradingView', icon: TrendingUp },
            { id: 'monthly' as const, label: 'Monthly Subs', icon: Key },
            { id: 'yearly' as const, label: 'VIP Yearly', icon: Crown },
            { id: 'referrals' as const, label: 'Referrals', icon: Gift },
            { id: 'settings' as const, label: 'Settings', icon: Settings },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all mb-1 ${
                activeTab === item.id ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20' : 'text-[#a0a0a0] hover:bg-[#141414]'
              }`}>
              <item.icon size={16} /> {item.label}
              {item.id === 'subscribers' && (stats?.active || 0) > 0 && (
                <span className="ml-auto bg-[#22c55e] text-[#050505] text-[9px] font-bold px-1.5 rounded-full">{stats?.active}</span>
              )}
              {item.id === 'verifications' && pendingPayments.length > 0 && (
                <span className="ml-auto bg-[#e11d48] text-white text-[9px] font-bold px-1.5 rounded-full animate-pulse">
                  {pendingPayments.length}
                </span>
              )}
              {item.id === 'tradingview' && tvPendingCount > 0 && (
                <span className="ml-auto bg-[#d4a843] text-[#050505] text-[9px] font-bold px-1.5 rounded-full animate-pulse">
                  {tvPendingCount}
                </span>
              )}
              {item.id === 'referrals' && pendingReferralsCount > 0 && (
                <span className="ml-auto bg-[#22c55e] text-[#050505] text-[9px] font-bold px-1.5 rounded-full animate-pulse">
                  {pendingReferralsCount}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Mobile Sidebar */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileSidebarOpen(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0d0d0d] border-r border-[#1f1f1f] p-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold flex items-center gap-2"><Shield size={16} className="text-[#d4a843]" /> Admin</span>
                <button onClick={() => setMobileSidebarOpen(false)} className="text-[#666666] hover:text-white"><X size={18} /></button>
              </div>
              {[
                { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
                { id: 'subscribers' as const, label: 'Subscribers', icon: Users },
                { id: 'verifications' as const, label: 'Verifications', icon: CreditCard },
                { id: 'monthly' as const, label: 'Monthly Subs', icon: Key },
                { id: 'referrals' as const, label: 'Referrals', icon: Gift },
                { id: 'settings' as const, label: 'Settings', icon: Settings },
              ].map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1 ${
                    activeTab === item.id ? 'bg-[#d4a843]/10 text-[#d4a843]' : 'text-[#a0a0a0] hover:bg-[#141414]'
                  }`}>
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-6 max-h-[calc(100vh-48px)] sm:max-h-[calc(100vh-57px)] overflow-y-auto">

          {/* ═══════════ OVERVIEW ═══════════ */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-lg font-bold mb-4">Dashboard {!trpcAvailable && <span className="text-[8px] text-[#e11d48]">(Local Mode)</span>}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                <StatCard icon={Users} label="Total Subs" value={stats?.totalSubs ?? 0} color="#3b82f6" />
                <StatCard icon={CheckCircle} label="Active" value={stats?.active ?? 0} color="#22c55e" />
                <StatCard icon={XCircle} label="Expired" value={stats?.expired ?? 0} color="#d4a843" />
                <StatCard icon={Ban} label="Revoked" value={stats?.revoked ?? 0} color="#e11d48" />
                <StatCard icon={Key} label="Monthly Avail" value={stats?.monthlyCodesAvailable ?? 0} color="#8b5cf6" />
                <StatCard icon={Key} label="Monthly Used" value={stats?.monthlyCodesUsed ?? 0} color="#666666" />
                <StatCard icon={Crown} label="VIP Yearly Avail" value={stats?.yearlyCodesAvailable ?? 0} color="#d4a843" />
                <StatCard icon={Crown} label="VIP Yearly Used" value={stats?.yearlyCodesUsed ?? 0} color="#666666" />
              </div>
              {pendingPayments.length > 0 && (
                <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl p-4 mb-4 flex items-center gap-3">
                  <Shield size={18} className="text-[#e11d48] animate-pulse" />
                  <div>
                    <div className="text-sm font-bold text-[#e11d48]">{pendingPayments.length} Pending Approval</div>
                    <button onClick={() => setActiveTab('verifications')} className="text-[10px] text-[#d4a843] hover:text-[#e8c76a]">Go to Verifications &rarr;</button>
                  </div>
                </div>
              )}
              <div className="bg-[#0d0d0d] border border-[#d4a843]/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus size={16} className="text-[#d4a843]" />
                  <div>
                    <h3 className="text-sm font-bold">Create VIP Code</h3>
                    <p className="text-[10px] text-[#666666]">This creates active VIP access immediately. Send the code to the user and tell them to enter it in VIP Access Code, not payment.</p>
                  </div>
                </div>
                <form onSubmit={handleGrantVipGift} className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2">
                  <input
                    type="email"
                    value={giftEmail}
                    onChange={(event) => {
                      setGiftEmail(event.target.value)
                      setGiftResult(null)
                    }}
                    placeholder="friend@email.com"
                    className="bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                  />
                  <select
                    value={giftMonths}
                    onChange={(event) => setGiftMonths(Number(event.target.value))}
                    className="bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#d4a843]"
                  >
                    <option value={1}>1 month</option>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                  </select>
                  <button
                    type="submit"
                    disabled={giftLoading || !giftEmail}
                    className="bg-[#d4a843] text-[#050505] font-bold px-4 py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {giftLoading ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                    Create
                  </button>
                </form>
                {giftResult && (
                  <div className="mt-3 bg-[#141414] border border-[#d4a843]/25 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] text-[#a0a0a0]">VIP code for {giftResult.email}</p>
                      <code className="text-[#d4a843] text-base font-bold tracking-[0.16em]">{giftResult.code}</code>
                      <p className="text-[10px] text-[#666666]">Expires: {new Date(giftResult.expires).toLocaleDateString()}</p>
                      <p className="text-[10px] text-[#22c55e] mt-1">User should open /#/vip and paste this in "I Have an Access Code".</p>
                    </div>
                    <button onClick={() => handleCopy(giftResult.code)} className="w-9 h-9 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] flex items-center justify-center">
                      <Copy size={14} className="text-[#d4a843]" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-bold mb-3">Recent Subscribers</h3>
              <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
                {(subscribers || []).slice().reverse().slice(0, 5).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between text-xs py-2 border-b border-[#1f1f1f] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#d4a843] font-mono text-[9px]">{sub.id.slice(0, 8)}</span>
                      <span className="text-white">{sub.email}</span>
                    </div>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${
                      sub.status === 'ACTIVE' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                      sub.status === 'REVOKED' ? 'bg-[#e11d48]/10 text-[#e11d48]' :
                      'bg-[#d4a843]/10 text-[#d4a843]'
                    }`}>{sub.status}</span>
                  </div>
                ))}
                {(!subscribers || subscribers.length === 0) && <p className="text-[#666666] text-xs text-center py-4">No subscribers yet</p>}
              </div>
            </div>
          )}

          {/* ═══════════ SUBSCRIBERS ═══════════ */}
          {activeTab === 'subscribers' && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-[#d4a843]" /> Subscribers</h2>
              {(!subscribers || subscribers.length === 0) ? (
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-8 text-center">
                  <Users size={24} className="text-[#666666] mx-auto mb-2" />
                  <p className="text-[#666666] text-sm">No subscribers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(subscribers || []).map(sub => {
                    const isExpired = sub.endDate ? new Date() > new Date(sub.endDate) : false
                    const statusColor = sub.status === 'REVOKED' ? '#e11d48' : isExpired ? '#d4a843' : '#22c55e'
                    const statusText = sub.status === 'ACTIVE' && !isExpired ? 'ACTIVE' : sub.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED'
                    const isExpanded = expandedSub === sub.id
                    return (
                      <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#141414] transition-all"
                          onClick={() => setExpandedSub(isExpanded ? null : sub.id)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: statusColor + '15' }}>
                              <span style={{ color: statusColor }} className="text-[10px] font-bold">{sub.code.slice(0, 2)}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{sub.email}</span>
                                <span className="text-[8px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: statusColor + '15', color: statusColor }}>{statusText}</span>
                              </div>
                              <div className="text-[9px] text-[#666666]">{sub.plan} &bull; {sub.amount}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={e => { e.stopPropagation(); handleCopy(sub.code); }} className="text-[#666666] hover:text-[#d4a843] p-1"><Copy size={12} /></button>
                            {isExpanded ? <ChevronUp size={14} className="text-[#666666]" /> : <ChevronDown size={14} className="text-[#666666]" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 border-t border-[#1f1f1f]">
                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                              {[
                                { label: 'Code', value: sub.code, color: '#d4a843' },
                                { label: 'Order', value: sub.orderId, color: '#fff' },
                                { label: 'Start', value: new Date(sub.startDate).toLocaleDateString(), color: '#22c55e' },
                                { label: 'End', value: new Date(sub.endDate).toLocaleDateString(), color: isExpired ? '#e11d48' : '#22c55e' },
                              ].map(item => (
                                <div key={item.label} className="bg-[#141414] rounded-lg p-2">
                                  <div className="text-[#666666] text-[8px]">{item.label}</div>
                                  <div className="text-[10px] font-bold" style={{ color: item.color }}>{item.value}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {(sub.status === 'ACTIVE' && !isExpired) && (
                                <button onClick={() => handleRevoke(sub.id)} className="flex-1 min-w-[80px] px-3 py-2 bg-[#e11d48]/10 border border-[#e11d48]/20 text-[#e11d48] text-[10px] font-bold rounded-lg hover:bg-[#e11d48]/20 transition-all flex items-center justify-center gap-1"><Ban size={10} /> Revoke</button>
                              )}
                              {sub.status === 'REVOKED' && (
                                <button onClick={() => handleReactivate(sub.id)} className="flex-1 min-w-[80px] px-3 py-2 bg-[#d4a843]/10 border border-[#d4a843]/20 text-[#d4a843] text-[10px] font-bold rounded-lg hover:bg-[#d4a843]/20 transition-all flex items-center justify-center gap-1"><CheckCircle size={10} /> Reactivate</button>
                              )}
                              {isExpired && (
                                <button onClick={() => handleRenew(sub.id)} className="flex-1 min-w-[80px] px-3 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-[10px] font-bold rounded-lg hover:bg-[#22c55e]/20 transition-all flex items-center justify-center gap-1"><RefreshCw size={10} /> Renew</button>
                              )}
                              <button onClick={() => handleDeleteSubscriber(sub.id)} className="flex-1 min-w-[80px] px-3 py-2 bg-[#7f1d1d]/20 border border-[#e11d48]/40 text-[#e11d48] text-[10px] font-bold rounded-lg hover:bg-[#e11d48]/30 transition-all flex items-center justify-center gap-1"><Trash2 size={10} /> Delete</button>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ VERIFICATIONS ═══════════ */}
          {activeTab === 'verifications' && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard size={18} className="text-[#d4a843]" /> Verifications</h2>

              {/* PENDING */}
              <h3 className="text-xs font-bold text-[#e11d48] uppercase tracking-wider mb-3">Pending ({pendingPayments.length})</h3>
              {pendingPayments.length === 0 ? (
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center mb-6">
                  <CheckCircle size={24} className="text-[#22c55e] mx-auto mb-2" />
                  <p className="text-[#666666] text-xs">No pending payments!</p>
                </div>
              ) : (
                <div className="space-y-3 mb-8">
                  {pendingPayments.map((user: any) => (
                    <motion.div key={user.orderId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0d0d0d] border border-[#d4a843]/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono text-[#d4a843]">{user.orderId}</span>
                        <span className="text-[8px] bg-[#e11d48]/10 text-[#e11d48] px-2 py-0.5 rounded-full font-bold animate-pulse">PENDING</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-[#141414] rounded-lg p-2"><span className="text-[#666666]">Email: </span><span className="text-white">{user.email}</span></div>
                        <div className="bg-[#141414] rounded-lg p-2"><span className="text-[#666666]">Amount: </span><span className="text-[#f2a900] font-bold">{user.amount}</span></div>
                        <div className="bg-[#141414] rounded-lg p-2"><span className="text-[#666666]">Plan: </span><span className="text-white">{user.plan || user.planName}</span></div>
                        <div className="bg-[#141414] rounded-lg p-2"><span className="text-[#666666]">Submitted: </span><span className="text-white">{user.submittedAt ? new Date(user.submittedAt).toLocaleString() : 'N/A'}</span></div>
                        <div className="bg-[#141414] rounded-lg p-2 col-span-2">
                          <span className="text-[#666666]">TXID: </span><span className="text-[#f2a900] font-mono text-[10px] break-all">{user.txId}</span>
                        </div>
                        <PaymentProof screenshot={user.screenshot} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRecheckPayment(user.orderId)} disabled={recheckPaymentMutation.isPending}
                          className="flex-1 bg-[#d4a843] text-[#050505] text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#e8c76a] transition-all disabled:opacity-60">
                          <RefreshCw size={14} className={recheckPaymentMutation.isPending ? "animate-spin" : ""} /> Recheck TXID
                        </button>
                        <button onClick={() => handleApprove(user.orderId)} className="flex-1 bg-[#22c55e] text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#2dd46a] transition-all">
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button onClick={() => handleReject(user.orderId)} className="flex-1 bg-[#e11d48] text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#f02e5a] transition-all">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* APPROVED */}
              <h3 className="text-xs font-bold text-[#22c55e] uppercase tracking-wider mb-3">Approved</h3>
              {approvedPayments.length === 0 ? (
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center mb-6">
                  <p className="text-[#666666] text-xs">No approved payments.</p>
                </div>
              ) : (
                <div className="space-y-2 mb-8">
                  {approvedPayments.map((user: any) => (
                    <div key={user.orderId} className="bg-[#0d0d0d] border border-[#22c55e]/10 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={14} className="text-[#22c55e]" />
                        <div>
                          <div className="text-xs text-white">{user.email}</div>
                          <div className="text-[8px] text-[#666666]">Code: <span className="text-[#d4a843] font-mono">{user.assignedCode}</span></div>
                        </div>
                      </div>
                      <button onClick={() => handleDeletePending(user.orderId)} className="text-[#666666] hover:text-[#e11d48] p-1"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* REJECTED */}
              <h3 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">Rejected</h3>
              {rejectedPayments.length === 0 ? (
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center">
                  <p className="text-[#666666] text-xs">No rejected payments.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rejectedPayments.map((user: any) => (
                    <div key={user.orderId} className="bg-[#0d0d0d] border border-[#666666]/10 rounded-xl p-3 flex items-center justify-between opacity-50">
                      <div className="flex items-center gap-3">
                        <XCircle size={14} className="text-[#666666]" />
                        <div>
                          <div className="text-xs text-[#666666]">{user.email}</div>
                          <div className="text-[8px] text-[#444444]">{user.orderId}</div>
                        </div>
                      </div>
                      <button onClick={() => handleDeletePending(user.orderId)} className="text-[#444444] hover:text-[#e11d48] p-1"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ MONTHLY SUBSCRIPTION CODES ═══════════ */}
          {activeTab === 'monthly' && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Key size={18} className="text-[#d4a843]" /> Monthly Subscription Codes</h2>
              <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">Monthly Subs Code Pool</div>
                    <div className="text-xs text-[#666666]">{stats?.monthlyCodesAvailable ?? 0} available &bull; {stats?.monthlyCodesUsed ?? 0} used &bull; {stats?.monthlyCodesTotal ?? 100} total</div>
                  </div>
                  <button onClick={handleReplaceMonthlyCodes} className="text-xs bg-[#e11d48]/10 text-[#e11d48] px-3 py-2 rounded-xl hover:bg-[#e11d48]/20 transition-all flex items-center gap-1 font-bold border border-[#e11d48]/20">
                    <Trash2 size={12} /> Replace All
                  </button>
                </div>
                <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
                  <div className="h-full bg-[#d4a843] rounded-full transition-all" style={{ width: `${(stats?.monthlyCodesTotal ?? 0) > 0 ? ((stats?.monthlyCodesUsed ?? 0) / (stats?.monthlyCodesTotal ?? 1)) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {(initMonthlyCodes() || []).map((c: any) => (
                  <div key={c.code} className={`border rounded-lg p-2 text-center ${c.used ? 'border-[#22c55e]/20 bg-[#22c55e]/5' : 'border-[#1f1f1f] bg-[#0d0d0d]'}`}>
                    <div className={`font-mono text-[10px] font-bold ${c.used ? 'text-[#22c55e]' : 'text-[#d4a843]'}`}>{c.code}</div>
                    {c.used && c.assignedTo && (
                      <>
                        <div className="text-[8px] text-[#666666] truncate mt-0.5">{c.assignedTo}</div>
                        <div className="text-[7px] bg-[#d4a843]/10 text-[#d4a843] rounded-full px-1 mt-0.5 inline-block">Monthly</div>
                      </>
                    )}
                    {!c.used && <div className="text-[8px] text-[#666666] mt-0.5">Available</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ VIP YEARLY CODES ═══════════ */}
          {activeTab === 'yearly' && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Crown size={18} className="text-[#d4a843]" /> VIP Yearly Subscription Codes</h2>
              <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">VIP Yearly Code Pool</div>
                    <div className="text-xs text-[#666666]">{stats?.yearlyCodesAvailable ?? 0} available &bull; {stats?.yearlyCodesUsed ?? 0} used &bull; {stats?.yearlyCodesTotal ?? 100} total</div>
                  </div>
                  <button onClick={handleReplaceYearlyCodes} className="text-xs bg-[#e11d48]/10 text-[#e11d48] px-3 py-2 rounded-xl hover:bg-[#e11d48]/20 transition-all flex items-center gap-1 font-bold border border-[#e11d48]/20">
                    <Trash2 size={12} /> Replace All
                  </button>
                </div>
                <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
                  <div className="h-full bg-[#d4a843] rounded-full transition-all" style={{ width: `${(stats?.yearlyCodesTotal ?? 0) > 0 ? ((stats?.yearlyCodesUsed ?? 0) / (stats?.yearlyCodesTotal ?? 1)) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {(initYearlyCodes() || []).map((c: any) => (
                  <div key={c.code} className={`border rounded-lg p-2 text-center ${c.used ? 'border-[#d4a843]/30 bg-[#d4a843]/5' : 'border-[#1f1f1f] bg-[#0d0d0d]'}`}>
                    <div className={`font-mono text-[10px] font-bold ${c.used ? 'text-[#d4a843]' : 'text-[#22c55e]'}`}>{c.code}</div>
                    {c.used && c.assignedTo && (
                      <>
                        <div className="text-[8px] text-[#666666] truncate mt-0.5">{c.assignedTo}</div>
                        <div className="text-[7px] bg-[#d4a843]/20 text-[#d4a843] rounded-full px-1 mt-0.5 inline-block">VIP Yearly</div>
                      </>
                    )}
                    {!c.used && <div className="text-[8px] text-[#666666] mt-0.5">Available</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ TRADINGVIEW REQUESTS ═══════════ */}
          {activeTab === 'tradingview' && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-[#d4a843]" /> TradingView Requests</h2>
              <TradingViewRequestsTab refreshLocal={refreshLocal} showToast={showToast} />
            </div>
          )}

          {/* ═══════════ REFERRALS ═══════════ */}
          {activeTab === 'referrals' && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Gift size={18} className="text-[#d4a843]" /> Referral Management</h2>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard icon={Users} label="Total" value={referrals.length} color="#3b82f6" />
                <StatCard icon={Clock} label="Pending" value={referrals.filter((r: any) => r.status === 'PENDING').length} color="#e11d48" />
                <StatCard icon={CheckCircle} label="Approved" value={referrals.filter((r: any) => r.status === 'APPROVED').length} color="#22c55e" />
                <StatCard icon={Gift} label="Rewards" value={referrals.filter((r: any) => r.rewardGranted).length} color="#d4a843" />
              </div>

              {/* PENDING */}
              <h3 className="text-xs font-bold text-[#e11d48] uppercase tracking-wider mb-3">Pending ({referrals.filter((r: any) => r.status === 'PENDING').length})</h3>
              {referrals.filter((r: any) => r.status === 'PENDING').length === 0 ? (
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center mb-6">
                  <CheckCircle size={24} className="text-[#22c55e] mx-auto mb-2" />
                  <p className="text-[#666666] text-xs">No pending referrals!</p>
                </div>
              ) : (
                <div className="space-y-3 mb-8">
                  {referrals.filter((r: any) => r.status === 'PENDING').map((ref: any) => (
                    <motion.div key={ref.referralId || ref.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0d0d0d] border border-[#d4a843]/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono text-[#d4a843]">{ref.referralId}</span>
                        <span className="text-[8px] bg-[#e11d48]/10 text-[#e11d48] px-2 py-0.5 rounded-full font-bold animate-pulse">PENDING</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-[#141414] rounded-lg p-2">
                          <span className="text-[#666666] text-[8px] block">Referrer</span>
                          <span className="text-white text-[10px] break-all">{ref.referrerEmail}</span>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-2">
                          <span className="text-[#666666] text-[8px] block">Referrer Code</span>
                          <span className="text-[#d4a843] font-mono text-[10px]">{ref.referrerCode}</span>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-2">
                          <span className="text-[#666666] text-[8px] block">Invited Person</span>
                          <span className="text-white text-[10px]">{ref.invitedName || 'N/A'}</span>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-2">
                          <span className="text-[#666666] text-[8px] block">Invited Email</span>
                          <span className="text-white text-[10px] break-all">{ref.invitedEmail}</span>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-2 col-span-2">
                          <span className="text-[#666666] text-[8px] block">TXID</span>
                          <span className="text-[#f2a900] font-mono text-[10px] break-all">{ref.txId || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="bg-[#d4a843]/5 border border-[#d4a843]/10 rounded-lg p-2 mb-3">
                        <p className="text-[9px] text-[#a0a0a0]">
                          <span className="text-[#d4a843] font-bold">Action:</span> Approve to grant 1 free month to referrer ({ref.referrerEmail})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveReferral(ref.referralId)}
                          className="flex-1 bg-[#22c55e] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-[#2dd46a] transition-all">
                          <CheckCircle size={14} /> Approve & Grant
                        </button>
                        <button onClick={() => handleRejectReferral(ref.referralId)}
                          className="flex-1 bg-[#e11d48] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-[#f02e5a] transition-all">
                          <XCircle size={14} /> Reject
                        </button>
                        <button onClick={() => handleDeleteReferral(ref.referralId)}
                          className="px-3 bg-[#141414] text-[#666666] rounded-xl hover:bg-[#1f1f1f] hover:text-[#e11d48] transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* APPROVED */}
              <h3 className="text-xs font-bold text-[#22c55e] uppercase tracking-wider mb-3">Approved ({referrals.filter((r: any) => r.status === 'APPROVED').length})</h3>
              {referrals.filter((r: any) => r.status === 'APPROVED').length === 0 ? (
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center mb-6">
                  <p className="text-[#666666] text-xs">No approved referrals.</p>
                </div>
              ) : (
                <div className="space-y-2 mb-8">
                  {referrals.filter((r: any) => r.status === 'APPROVED').map((ref: any) => (
                    <div key={ref.referralId || ref.id} className="bg-[#0d0d0d] border border-[#22c55e]/10 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={14} className="text-[#22c55e]" />
                        <div>
                          <div className="text-xs text-white">{ref.invitedName || ref.invitedEmail}</div>
                          <div className="text-[8px] text-[#666666]">Referrer: <span className="text-[#d4a843]">{ref.referrerEmail}</span></div>
                          {ref.rewardGranted && <div className="text-[8px] text-[#22c55e] font-bold">Reward Granted</div>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteReferral(ref.referralId)} className="text-[#666666] hover:text-[#e11d48] p-1"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* REJECTED */}
              <h3 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">Rejected ({referrals.filter((r: any) => r.status === 'REJECTED').length})</h3>
              {referrals.filter((r: any) => r.status === 'REJECTED').length === 0 ? (
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center">
                  <p className="text-[#666666] text-xs">No rejected referrals.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.filter((r: any) => r.status === 'REJECTED').map((ref: any) => (
                    <div key={ref.referralId || ref.id} className="bg-[#0d0d0d] border border-[#666666]/10 rounded-xl p-3 flex items-center justify-between opacity-50">
                      <div className="flex items-center gap-3">
                        <XCircle size={14} className="text-[#666666]" />
                        <div>
                          <div className="text-xs text-[#666666]">{ref.invitedName || ref.invitedEmail}</div>
                          <div className="text-[8px] text-[#444444]">Referrer: {ref.referrerEmail}</div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteReferral(ref.referralId)} className="text-[#444444] hover:text-[#e11d48] p-1"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ SETTINGS ═══════════ */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-lg font-bold mb-4">Settings</h2>
              <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 space-y-4 max-w-lg">
                <div>
                  <label className="text-xs text-[#a0a0a0] block mb-2">Admin Password</label>
                  <p className="text-sm text-[#666666] bg-[#141414] border border-[#1f1f1f] rounded-lg px-3 py-2">
                    Stored as a hash. Change it from server configuration before production.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#1f1f1f]">
                  <p className="text-xs text-[#a0a0a0] mb-2">Notification Email</p>
                  <p className="text-sm text-white flex items-center gap-2"><Mail size={14} className="text-[#d4a843]" /> {ADMIN_EMAIL}</p>
                </div>
                <div className="pt-4 border-t border-[#1f1f1f]">
                  <p className="text-xs text-[#e11d48] mb-2">Danger Zone</p>
                  <button disabled={!allowUnsafeLocalFallbacks} onClick={() => { if (confirm('CLEAR ALL DATA?')) {
                    localStorage.removeItem('tv_subscribers_v3');
                    localStorage.removeItem('tv_codes_v3');
                    localStorage.removeItem(PENDING_KEY);
                    localStorage.removeItem('tradevisor_user_logins');
                    initCodes(); refreshLocal(); showToast('All cleared!', 'warning');
                  }}} className="text-xs text-[#e11d48] bg-[#e11d48]/10 border border-[#e11d48]/20 px-3 py-2 rounded-xl hover:bg-[#e11d48]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 size={12} className="inline mr-1" /> Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TradingView Requests Tab
   ═══════════════════════════════════════════ */

function TradingViewRequestsTab({ showToast }: { refreshLocal: any, showToast: any }) {
  const [requests, setRequests] = useState<any[]>([])

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadRequests = () => {
    const notifs = JSON.parse(localStorage.getItem("tradevisor_tv_notifications") || "[]")
    setRequests(notifs)
  }

  const markApproved = (index: number) => {
    const notifs = JSON.parse(localStorage.getItem("tradevisor_tv_notifications") || "[]")
    notifs[index].status = "approved"
    localStorage.setItem("tradevisor_tv_notifications", JSON.stringify(notifs))
    loadRequests()
    showToast("Request marked as approved!", "success")
  }

  const deleteRequest = (index: number) => {
    const notifs = JSON.parse(localStorage.getItem("tradevisor_tv_notifications") || "[]")
    notifs.splice(index, 1)
    localStorage.setItem("tradevisor_tv_notifications", JSON.stringify(notifs))
    loadRequests()
    showToast("Request deleted.", "info")
  }

  const pendingCount = requests.filter((r: any) => r.status === "pending").length

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={12} className="text-[#d4a843]" /><span className="text-[10px] text-[#666666]">Total</span></div>
          <p className="text-xl font-black text-white">{requests.length}</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#e11d48]/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><Clock size={12} className="text-[#e11d48]" /><span className="text-[10px] text-[#666666]">Pending</span></div>
          <p className="text-xl font-black text-[#e11d48]">{pendingCount}</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#22c55e]/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle size={12} className="text-[#22c55e]" /><span className="text-[10px] text-[#666666]">Approved</span></div>
          <p className="text-xl font-black text-[#22c55e]">{requests.length - pendingCount}</p>
        </div>
      </div>

      {/* Pending Requests */}
      <h3 className="text-xs font-bold text-[#e11d48] uppercase tracking-wider mb-3 flex items-center gap-2">
        Pending ({pendingCount})
        {pendingCount > 0 && <span className="w-2 h-2 bg-[#e11d48] rounded-full animate-pulse" />}
      </h3>

      {requests.filter((r: any) => r.status === "pending").length === 0 ? (
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center mb-4">
          <CheckCircle size={24} className="text-[#22c55e] mx-auto mb-2" />
          <p className="text-[#666666] text-xs">No pending requests!</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {requests.map((req: any, i: number) => {
            if (req.status !== "pending") return null
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#0d0d0d] border border-[#d4a843]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-[#d4a843]">TV-{i + 1}</span>
                  <span className="text-[8px] bg-[#e11d48]/10 text-[#e11d48] px-2 py-0.5 rounded-full font-bold animate-pulse">PENDING</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-[#141414] rounded-lg p-2">
                    <span className="text-[#666666] text-[8px] block">TradingView Email</span>
                    <span className="text-white font-mono text-[10px] break-all">{req.tvEmail}</span>
                  </div>
                  <div className="bg-[#141414] rounded-lg p-2">
                    <span className="text-[#666666] text-[8px] block">User Email</span>
                    <span className="text-white text-[10px] break-all">{req.userEmail}</span>
                  </div>
                  <div className="bg-[#141414] rounded-lg p-2">
                    <span className="text-[#666666] text-[8px] block">VIP Code</span>
                    <span className="text-[#d4a843] font-mono text-[10px]">{req.userCode}</span>
                  </div>
                  <div className="bg-[#141414] rounded-lg p-2">
                    <span className="text-[#666666] text-[8px] block">Date</span>
                    <span className="text-white text-[10px]">{new Date(req.date).toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-[#d4a843]/5 border border-[#d4a843]/10 rounded-lg p-2 mb-3">
                  <p className="text-[9px] text-[#a0a0a0]">
                    <span className="text-[#d4a843] font-bold">Action:</span> Go to TradingView → Profile → Invite → Send invite to {req.tvEmail}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => markApproved(i)}
                    className="flex-1 bg-[#22c55e] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-[#2dd46a] transition-all">
                    <CheckCircle size={14} /> Mark Approved
                  </button>
                  <button onClick={() => deleteRequest(i)}
                    className="flex-1 bg-[#e11d48] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-[#f02e5a] transition-all">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Approved */}
      <h3 className="text-xs font-bold text-[#22c55e] uppercase tracking-wider mb-3">Approved</h3>
      {requests.filter((r: any) => r.status === "approved").length === 0 ? (
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-6 text-center">
          <p className="text-[#666666] text-xs">No approved requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req: any, i: number) => {
            if (req.status !== "approved") return null
            return (
              <div key={i} className="bg-[#0d0d0d] border border-[#22c55e]/10 rounded-xl p-3 flex items-center justify-between opacity-70">
                <div className="flex items-center gap-3">
                  <CheckCircle size={14} className="text-[#22c55e]" />
                  <div>
                    <div className="text-xs text-white">{req.tvEmail}</div>
                    <div className="text-[8px] text-[#666666]">{req.userEmail} • {new Date(req.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <button onClick={() => deleteRequest(i)} className="text-[#666666] hover:text-[#e11d48] p-1"><Trash2 size={12} /></button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: color + '10' }}>
          <Icon size={13} style={{ color }} />
        </div>
        <p className="text-[#666666] text-[10px]">{label}</p>
      </div>
      <p className="text-xl font-black" style={{ color }}>{value}</p>
    </div>
  )
}
