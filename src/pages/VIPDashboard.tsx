import { useState, useEffect, useRef, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Lock, Key, AlertTriangle, Crown, ArrowRight, LogOut,
  Brain, BarChart3, TrendingUp, Target, Shield,
  Layers, Activity, Zap, X,
  Upload, Camera, DollarSign, Sparkles, Loader2, Crosshair, Send,
  Briefcase, Calculator, Building2, Settings,
  ChevronDown, Clock, CheckCircle2, Star, Globe,
  Mail, Copy, Wallet, ExternalLink, Percent,
  ArrowDownRight, Info,
  Hash, GraduationCap, User,
  CheckCircle, XCircle, Trophy, TrendingDown as TrendDown, Users,
  PieChart, LineChart, Gauge, ChevronUp, ChevronLeft, ChevronRight,
  Menu, Bot
} from "lucide-react"
import { useNavigate } from "react-router"
import { trpc } from "@/lib/trpc"
import { trackVIPLogin, trackVIPSubscribe, trackPaymentSubmit, trackPageView } from "@/lib/analytics"
import { checkSubscriberAccess, getSubscribers } from "@/lib/vipSystem"
import { analyzeChartClientSide, type AnalysisResult } from "@/lib/analyzer"
import VIP2GoldChartAI from "@/addons/vip2/components/VIP2GoldChartAI"
import GoldFlowAgent from "@/components/GoldFlowAgent"
import EducationTab from "@/components/EducationTab"
import PartnerTab from "@/components/PartnerTab"
import Jarvis from "@/components/Jarvis"
import { getCachedPrice } from "@/lib/goldapi"
import { getMetalsPrices } from "@/lib/metals"
import { getAssetMarketPair, formatAssetPrice } from "@/lib/assetMarket"
import { fetchMarketQuote } from "@/lib/marketPrices"
import { strategies, assets } from "@/data/strategies"
import type { Strategy, Asset } from "@/data/strategies"
import { ToastProvider, useToast } from "@/components/ToastNotifications"
import CryptoPaymentModal from "@/components/CryptoPaymentModal"
import { allowUnsafeLocalFallbacks } from "@/lib/runtime"
import AIAgentsWorkflow from "@/sections/AIAgentsWorkflow"
import LanguageToggle from "@/components/LanguageToggle"
import AgentAnalysisFlow from "@/components/AgentAnalysisFlow"
import ScalpingAnalyzerTab from "@/components/ScalpingAnalyzerTab"
import GoldStrategyTab from "@/components/GoldStrategyTab"
import { useLanguage, type Language } from "@/lib/language"

/* ═══════════════════════════════════════════
   VIP Dashboard — Mobile-First Responsive
   ═══════════════════════════════════════════ */

export default function VIPDashboard() {
  return (
    <ToastProvider>
      <VIPDashboardInner />
    </ToastProvider>
  )
}

function getDeviceId(): string {
  let id = localStorage.getItem("tradevisor_device_id")
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
    localStorage.setItem("tradevisor_device_id", id)
  }
  return id
}

function VIPDashboardInner() {
  const navigate = useNavigate()
  const [enteredOTP, setEnteredOTP] = useState("")
  const [otpError, setOtpError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [sessionBlocked, setSessionBlocked] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const toast = useToast()
  const deviceId = getDeviceId()

  const savedEmail = localStorage.getItem("tradevisor_current_user_email")
  const savedCode = localStorage.getItem("tradevisor_current_user_code")
  const savedSessionToken = localStorage.getItem("tradevisor_session_token")
  const { data: serverSession, isLoading: sessionLoading } = trpc.vip.verifySession.useQuery(
    { sessionToken: savedSessionToken || "", deviceId },
    { enabled: Boolean(savedSessionToken), retry: false }
  )
  const serverSubscriber = serverSession?.valid ? serverSession.subscriber : null
  const isLoggedIn = Boolean(serverSubscriber) || Boolean(savedEmail && savedCode && checkSubscriberAccess(savedEmail, savedCode))

  const loginMutation = trpc.vip.login.useMutation({
    onSuccess: (data) => {
      setVerifying(false)
      if (data.success && data.sessionToken && data.subscriber) {
        localStorage.setItem("tradevisor_session_token", data.sessionToken)
        localStorage.setItem("tradevisor_current_user_email", data.subscriber.email)
        localStorage.setItem("tradevisor_current_user_code", data.subscriber.code)
        toast.addToast("Access granted! Welcome to VIP.", "success")
        setTimeout(() => window.location.reload(), 500)
      } else if (data.blocked) {
        setSessionBlocked(true)
        setOtpError(data.error || "Account active on another device.")
        toast.addToast(data.error || "Account active on another device.", "error")
      } else {
        // Backend returned false — try localStorage fallback
        verifyLocalFallback()
      }
    },
    onError: (err) => {
      console.warn("[login] tRPC failed, using localStorage fallback:", err.message)
      verifyLocalFallback()
    }
  })

  // Verify code format (8 chars, alphanumeric, 1+ letter, 1+ digit)
  const isValidCodeFormat = (code: string): boolean => {
    if (!code || code.length < 6 || code.length > 12) return false
    const hasLetter = /[A-Z]/.test(code)
    const hasDigit = /[0-9]/.test(code)
    const validChars = /^[A-Z0-9]+$/.test(code)
    return hasLetter && hasDigit && validChars
  }

  // ─── Fallback: verify code from localStorage when tRPC backend is not available
  // Also allow ANY valid-format code — so it works from any browser/device
  const verifyLocalFallback = () => {
    setVerifying(false)
    if (!allowUnsafeLocalFallbacks) {
      setOtpError("VIP verification requires the secure server. Please try again later.")
      toast.addToast("Secure VIP verification is currently unavailable.", "error")
      return
    }
    const code = enteredOTP.toUpperCase().trim()

    // 1. Search in subscribers (this browser's localStorage)
    const subs = getSubscribers()
    let sub = subs.find(s => s.code === code && (s.status === 'ACTIVE' || s.status === 'EXPIRED'))

    // 2. Check codes pool
    if (!sub) {
      const codes = JSON.parse(localStorage.getItem('tv_codes_v3') || '[]')
      const codeEntry = codes.find((c: any) => c.code === code)
      if (codeEntry && codeEntry.used && codeEntry.assignedTo) {
        sub = subs.find(s => s.email === codeEntry.assignedTo && (s.status === 'ACTIVE' || s.status === 'EXPIRED'))
      }
    }

    if (sub && new Date(sub.endDate) > new Date()) {
      localStorage.setItem("tradevisor_current_user_email", sub.email)
      localStorage.setItem("tradevisor_current_user_code", sub.code)
      toast.addToast("Access granted! Welcome to VIP.", "success")
      setTimeout(() => window.location.reload(), 500)
      return
    }

    // 3. Check user_logins
    const logins = JSON.parse(localStorage.getItem("tradevisor_user_logins") || "[]")
    const match = logins.find((u: any) => u.code === code)
    if (match && checkSubscriberAccess(match.email, match.code)) {
      localStorage.setItem("tradevisor_current_user_email", match.email)
      localStorage.setItem("tradevisor_current_user_code", match.code)
      toast.addToast("Access granted! Welcome to VIP.", "success")
      setTimeout(() => window.location.reload(), 500)
      return
    }

    // 4. Check pending users
    const pending = JSON.parse(localStorage.getItem("tradevisor_pending_users") || "[]")
    const approved = pending.find((p: any) => p.assignedCode === code && p.status === 'APPROVED')
    if (approved && approved.email) {
      localStorage.setItem("tradevisor_current_user_email", approved.email)
      localStorage.setItem("tradevisor_current_user_code", code)
      toast.addToast("Access granted! Welcome to VIP.", "success")
      setTimeout(() => window.location.reload(), 500)
      return
    }

    setOtpError("Invalid or expired code. Contact admin.")
    toast.addToast("Invalid or expired access code.", "error")
  }

  // ─── Force entry: kill any existing session and login fresh
  const handleForceEntry = () => {
    setSessionBlocked(false)
    setOtpError("")
    const code = enteredOTP.toUpperCase().trim()
    setVerifying(true)

    localStorage.removeItem("tradevisor_session_token")
    localStorage.removeItem("tradevisor_current_user_email")
    localStorage.removeItem("tradevisor_current_user_code")

    redeemVipCode(code, true)
  }

  const redeemVipCode = async (code: string, force = false) => {
    loginMutation.mutate({ code, deviceId, force })
  }

  const verifyOTP = () => {
    setOtpError("")
    setSessionBlocked(false)
    if (!enteredOTP || enteredOTP.length < 6) {
      setOtpError("Enter a valid access code")
      toast.addToast("Please enter a valid access code", "warning")
      return
    }
    setVerifying(true)
    redeemVipCode(enteredOTP.toUpperCase().trim())
  }

  if (serverSubscriber) {
    return <VIPDashboardFull email={serverSubscriber.email} code={serverSubscriber.code} initialSubscriber={serverSubscriber} />
  }

  if (isLoggedIn) {
    return <VIPDashboardFull email={savedEmail!} code={savedCode!} />
  }

  if (savedSessionToken && sessionLoading) {
    return (
      <div className="vip-shell min-h-screen bg-[#050505] text-white flex items-center justify-center px-3">
        <div className="flex items-center gap-3 text-[#d4a843] text-sm">
          <Loader2 size={18} className="animate-spin" />
          Verifying VIP session...
        </div>
      </div>
    )
  }

  return (
    <div className="vip-shell min-h-screen bg-[#050505] text-white flex items-center justify-center px-3 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#0d0d0d] border border-[#d4a843]/20 rounded-2xl p-5 sm:p-8 text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#d4a843]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-[#d4a843] sm:hidden" />
          <Lock size={32} className="text-[#d4a843] hidden sm:block" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold mb-2">VIP Access</h2>
        <p className="text-xs sm:text-sm text-[#a0a0a0] mb-5">Subscribe or enter your access code</p>
        <button onClick={() => setShowPaymentModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-[#d4a843] text-[#050505] font-bold py-3 rounded-xl hover:bg-[#e8c76a] transition-all mb-4 text-sm">
          <Crown size={16} /> Subscribe to VIP <ArrowRight size={14} />
        </button>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1f1f1f]"></div></div>
          <div className="relative flex justify-center"><span className="bg-[#0d0d0d] px-3 text-[10px] text-[#666666]">OR</span></div>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-[#22c55e]" />
            <span className="text-xs text-[#22c55e] font-semibold">I Have an Access Code</span>
          </div>
          <input type="text" value={enteredOTP}
            onChange={e => { setEnteredOTP(e.target.value.toUpperCase()); setOtpError("") }}
            onKeyDown={e => e.key === "Enter" && verifyOTP()}
            placeholder="X7K9P2M4"
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-3 text-base sm:text-lg text-white font-mono text-center placeholder-[#444444] focus:border-[#d4a843]/30 focus:outline-none tracking-[0.15em] uppercase mb-3"
            maxLength={10}
          />
          {otpError && (
            <div className="mb-2">
              <p className="text-[10px] text-[#e11d48] flex items-center gap-1 mb-1"><AlertTriangle size={10} /> {otpError}</p>
              {sessionBlocked && (
                <button onClick={handleForceEntry} disabled={verifying}
                  className="w-full mt-1 bg-[#d4a843]/10 border border-[#d4a843]/30 text-[#d4a843] text-[10px] font-bold py-2 rounded-lg hover:bg-[#d4a843]/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50">
                  <Key size={10} /> Force Entry — Logout Other Device
                </button>
              )}
            </div>
          )}
          <button onClick={verifyOTP} disabled={verifying}
            className="w-full bg-[#22c55e] text-white font-bold py-3 rounded-xl hover:bg-[#2dd46a] transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {verifying ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : "Verify & Enter"}
          </button>
        </div>

        <button onClick={() => navigate('/')} className="w-full mt-4 text-[10px] text-[#666666] hover:text-[#a0a0a0]">
          Back to Home
        </button>

        {/* Crypto Payment Modal — Direct subscribe */}
        <CryptoPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          planName="TradeVisor VIP Monthly"
          amount="69"
        />
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   FULL VIP DASHBOARD — Mobile Responsive
   ═══════════════════════════════════════════ */

type TabId = "analyzer" | "scalping" | "goldStrategy" | "agents" | "bankZero" | "tv" | "calculator" | "strategies" | "brokers" | "performance" | "account" | "goldai" | "education" | "partner"

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: "analyzer", label: "Analyzer", icon: Brain },
  { id: "scalping", label: "Scalping", icon: Layers },
  { id: "goldStrategy", label: "Gold Strategy", icon: Target },
  { id: "agents", label: "AI Agents", icon: Bot },
  { id: "bankZero", label: "Bank Zero", icon: Building2 },
  { id: "tv", label: "Charts", icon: LineChart },
  { id: "calculator", label: "Lot Calc", icon: Calculator },
  { id: "partner", label: "Partner", icon: Users },
  { id: "brokers", label: "Brokers", icon: Building2 },
  { id: "performance", label: "Stats", icon: Trophy },
  { id: "goldai", label: "Gold Flow", icon: Sparkles },
  { id: "education", label: "School", icon: GraduationCap },
  { id: "account", label: "Account", icon: Settings },
]

const vipAr: Record<string, string> = {
  analyzer: "المحلل",
  scalping: "السكالبينغ",
  goldStrategy: "استراتيجية الذهب",
  agents: "الوكلاء",
  tv: "الشارتات",
  calculator: "حاسبة اللوت",
  partner: "الشراكة",
  brokers: "الوسطاء",
  performance: "الإحصائيات",
  goldai: "تحليل الذهب",
  education: "التعليم",
  account: "الحساب",
  "VIP Dashboard": "لوحة VIP",
  ACTIVE: "فعال",
  "DEVELOPER MODE": "وضع المطور",
  Home: "الرئيسية",
  Exit: "خروج",
  "AI Chart Analyzer": "محلل الشارت بالذكاء الاصطناعي",
  "Upload any chart. AI detects Entry, SL, and TP automatically.": "ارفع أي شارت، والذكاء يحدد الدخول والستوب والأهداف تلقائيا.",
  "TF:": "الإطار:",
  "Price:": "السعر:",
  "Analyze Chart with AI": "حلل الشارت بالذكاء الاصطناعي",
  "Re-Analyze": "إعادة التحليل",
  "How did this trade turn out?": "كيف كانت نتيجة الصفقة؟",
  "Trade WON": "الصفقة ربحت",
  "Trade LOST": "الصفقة خسرت",
  "Drop chart image here": "اترك صورة الشارت هنا",
  "Upload your chart screenshot": "ارفع صورة الشارت",
  "Drag & drop or click • PNG, JPG, WEBP": "اسحب الصورة أو اضغط • PNG, JPG, WEBP",
  "Claude + GPT-4o Vision": "رؤية Claude + GPT-4o",
  "AI Analyzing Your Chart...": "الذكاء يحلل الشارت...",
  "Reading price action • Detecting patterns": "قراءة حركة السعر • كشف النماذج",
  "Setup Quality": "جودة الصفقة",
  "Danger Entry": "دخول خطر",
  "Clean Setup": "صفقة واضحة",
  "Needs Confirmation": "تحتاج تأكيد",
  "safety score": "درجة الأمان",
  "Before Entry": "قبل الدخول",
  "No Trade Now": "لا تدخل الآن",
  "Wait or Reduce Size": "انتظر أو خفف الحجم",
  "This entry is currently risky. The warning is based on the full AI review, market momentum, chart structure, six-agent checks, and final risk management.": "الدخول حاليا خطر. التحذير مبني على مراجعة الذكاء، زخم السوق، بنية الشارت، فحص الوكلاء الستة، وإدارة المخاطر.",
  "AI Indicators": "مؤشرات الذكاء",
  Confluence: "التوافق",
  Trend: "الاتجاه",
  Volume: "الحجم",
  Structure: "البنية",
  "Price Levels": "مستويات السعر",
  Entry: "الدخول",
  "Stop Loss": "وقف الخسارة",
  Risk: "المخاطر",
  "Max Risk": "أقصى مخاطرة",
  "Risk Distance": "مسافة الخطر",
  "Hold Time": "مدة الصفقة",
  "Best R:R": "أفضل عائد/خطر",
  "Lot Size": "حجم اللوت",
  "S/R Levels": "الدعم/المقاومة",
  Fibonacci: "فيبوناتشي",
  "Ready for AI Analysis": "جاهز للتحليل",
  "Upload Your Chart": "ارفع الشارت",
  "Click 'Analyze Chart with AI' to detect Entry, SL, and TP.": "اضغط تحليل الشارت ليحدد الدخول والستوب والأهداف.",
  "Upload a chart for AI technical analysis.": "ارفع شارت للحصول على تحليل فني بالذكاء.",
  "Chart scale not calibrated": "محور الشارت غير معاير",
  "Levels are listed on the right. Lines were hidden because the visible price axis was not readable enough.": "المستويات موجودة في اللوحة الجانبية. تم إخفاء الخطوط لأن محور السعر الظاهر غير مقروء بما يكفي.",
  "Axis calibrated": "المحور معاير",
}

function vipText(language: Language, text: string) {
  return language === "ar" ? vipAr[text] || text : text
}

function VIPDashboardFull({ email, code, initialSubscriber }: { email: string; code: string; initialSubscriber?: any }) {
  // ─── Track VIP login & page view ───
  useEffect(() => {
    trackVIPLogin()
    trackPageView('vip_dashboard')
  }, [])

  const [activeTab, setActiveTab] = useState<TabId>("analyzer")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { language } = useLanguage()
  const vt = (text: string) => text === "bankZero" ? (language === "ar" ? "استراتيجية البنوك صفر انعكاس" : "Bank Zero Reversal") : vipText(language, text)
  const subscriber = initialSubscriber || getSubscribers().find(s => s.email === email && s.code === code)
  const isDeveloperMode =
    localStorage.getItem("tradevisor_dev_mode") === "true" &&
    localStorage.getItem("tradevisor_current_user_email") === "developer@tradevisor.ai" &&
    Boolean(localStorage.getItem("tradevisor_session_token"))
  const dailyQuota = trpc.dashboard.dailyQuota.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
  })
  const consumeDaily = trpc.dashboard.consumeDaily.useMutation()

  const quotaSnapshot = dailyQuota.data
  const hasSubscriberQuota = Boolean(quotaSnapshot?.loggedIn && quotaSnapshot.isSubscriber)
  const quotaRemaining = hasSubscriberQuota ? quotaSnapshot.remaining : 0
  const quotaLimit = hasSubscriberQuota ? quotaSnapshot.limit : 0

  const quotaBadge = (
    <div className="mb-4 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4a843]">
          <Shield size={14} />
          <span>
            {isDeveloperMode
              ? language === "ar" ? "تحليلات غير محدودة للمطور" : "Developer unlimited analyses"
              : dailyQuota.isLoading
                ? language === "ar" ? "جاري مزامنة رصيد التحليلات..." : "Syncing analysis quota..."
                : hasSubscriberQuota
                  ? language === "ar"
                    ? `باقي ${quotaRemaining} من ${quotaLimit} تحليلات اليوم`
                    : `${quotaRemaining} of ${quotaLimit} analyses left today`
                  : language === "ar" ? "يتم التحقق من اشتراك VIP" : "Checking VIP quota"}
          </span>
        </div>
        {!isDeveloperMode && hasSubscriberQuota && (
          <span className="text-[10px] text-[#777777]">
            {language === "ar" ? "نفس الرصيد يعمل في التحليل العادي والسكالبينغ" : "Shared across normal and scalping analysis"}
          </span>
        )}
      </div>
    </div>
  )

  const ensureVipAnalysisAccess = async () => {
    if (isDeveloperMode) return true
    try {
      const latest = await dailyQuota.refetch()
      const quota = latest.data
      if (!quota?.loggedIn || !quota.isSubscriber) {
        toast.addToast(
          language === "ar" ? "لم يتم العثور على اشتراك VIP فعال لهذا الحساب." : "No active VIP subscription was found for this account.",
          "error"
        )
        return false
      }
      if (quota.remaining <= 0) {
        toast.addToast(
          language === "ar" ? "خلصت تحليلاتك اليومية. جرّب مرة ثانية بعد تجدد الرصيد." : "Your daily analyses are finished. Try again after the quota resets.",
          "warning"
        )
        return false
      }
      return true
    } catch {
      toast.addToast(
        language === "ar" ? "تعذر التحقق من رصيد التحليلات الآن." : "Could not verify your analysis quota right now.",
        "error"
      )
      return false
    }
  }

  const recordVipAnalysis = async () => {
    if (isDeveloperMode) return
    try {
      const consumed = await consumeDaily.mutateAsync({})
      await dailyQuota.refetch()
      if (!consumed.allowed) {
        toast.addToast(
          language === "ar" ? "تم التحليل، لكن رصيدك اليومي انتهى الآن." : "Analysis completed, but your daily quota is now finished.",
          "warning"
        )
      }
    } catch {
      toast.addToast(
        language === "ar" ? "تم التحليل، لكن لم نتمكن من مزامنة عداد التحليلات." : "Analysis completed, but quota sync failed.",
        "warning"
      )
    }
  }

  const logoutMutation = trpc.vip.logout.useMutation({
    onSuccess: () => { /* silently kill session */ },
    onError: () => { /* ignore */ }
  })

  const handleLogout = () => {
    const token = localStorage.getItem("tradevisor_session_token")
    const currentEmail = localStorage.getItem("tradevisor_current_user_email")
    const currentCode = localStorage.getItem("tradevisor_current_user_code")
    const exitingDeveloper = localStorage.getItem("tradevisor_dev_mode") === "true" || currentEmail === "developer@tradevisor.ai"
    if (token) logoutMutation.mutate({ sessionToken: token })

    if (!exitingDeveloper || currentEmail === "developer@tradevisor.ai") {
      localStorage.removeItem("tradevisor_current_user_email")
      localStorage.removeItem("tradevisor_current_user_code")
      localStorage.removeItem("tradevisor_session_token")
    } else if (!currentEmail || !currentCode) {
      localStorage.removeItem("tradevisor_session_token")
    }

    localStorage.removeItem("tradevisor_dev_mode")
    localStorage.removeItem("tradevisor_admin_token")
    localStorage.removeItem("tradevisor_admin_session")
    if (currentEmail === "developer@tradevisor.ai") {
      localStorage.removeItem("tradevisor_user_token")
    }
    toast.addToast("Logged out successfully.", "info")
    setTimeout(() => window.location.reload(), 400)
  }

  return (
    <div className="vip-shell min-h-screen bg-[#030305] text-white">
      {/* Mobile Header */}
      <header className="bg-[#0d0d0d] border-b border-[#1f1f1f] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-[#a0a0a0] hover:text-white p-1">
              <Menu size={20} />
            </button>
            <h1 className="text-sm sm:text-base font-bold flex items-center gap-1.5 sm:gap-2">
              <Crown size={16} className="text-[#d4a843] sm:hidden" />
              <Crown size={18} className="text-[#d4a843] hidden sm:block" />
              <span className="hidden sm:inline">{vt("VIP Dashboard")}</span>
              <span className="sm:hidden">VIP</span>
            </h1>
            <span className="hidden sm:inline-flex text-[9px] bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full font-bold border border-[#22c55e]/20">
              {vt("ACTIVE")}
            </span>
            {isDeveloperMode && (
              <span className="hidden sm:inline-flex text-[9px] bg-[#d4a843]/10 text-[#d4a843] px-2 py-0.5 rounded-full font-bold border border-[#d4a843]/20">
                {vt("DEVELOPER MODE")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden lg:block text-[10px] text-[#666666] max-w-[180px] truncate">{email}</span>
            <button onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 text-[10px] text-[#a78bfa] hover:text-[#c4b5fd] px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#a78bfa]/10 transition-all">
              <span className="hidden sm:inline">Trader </span>Dashboard
            </button>
            <button onClick={() => navigate("/")}
              className="text-[10px] text-[#666666] hover:text-white px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#141414] transition-all">
              {vt("Home")}
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1 text-[10px] text-[#e11d48] hover:text-[#ff6b8a] px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#e11d48]/10 transition-all">
              <LogOut size={10} /> <span className="hidden sm:inline">{vt("Exit")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Tab Menu */}
      {mobileMenuOpen && (
        <div className="vip-tabbar lg:hidden bg-[#0a0a0a] border-b border-[#1f1f1f] px-3 py-2">
          <div className="grid grid-cols-3 gap-1.5">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false) }}
                  className={`vip-tab-button flex items-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                    activeTab === tab.id ? "is-active bg-[#d4a843]/15 text-[#d4a843] border border-[#d4a843]/30" : "text-[#a0a0a0] hover:bg-[#141414]"
                  }`}>
                  <Icon size={13} /> {vt(tab.id)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Desktop Tab Navigation */}
      <div className="vip-tabbar hidden lg:block bg-[#0a0a0a] border-b border-[#1f1f1f] sticky top-[57px] z-40">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => setActiveTab(tab.id)}
                  className={`vip-tab-button flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id ? "is-active border-[#d4a843] text-[#d4a843]" : "border-transparent text-[#666666] hover:text-[#a0a0a0]"
                  }`}>
                  <Icon size={13} /> {vt(tab.id)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Tabs (compact) */}
      <div className="vip-tabbar lg:hidden bg-[#0a0a0a] border-b border-[#1f1f1f] sticky top-[49px] z-40">
        <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => setActiveTab(tab.id)}
                className={`vip-tab-button flex items-center gap-1 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all snap-start ${
                  activeTab === tab.id ? "is-active border-[#d4a843] text-[#d4a843]" : "border-transparent text-[#666666]"
                }`}>
                <Icon size={12} /> {vt(tab.id)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === "analyzer" && <AIAnalyzerTab beforeAnalyze={ensureVipAnalysisAccess} onAnalysisComplete={recordVipAnalysis} accessBadge={quotaBadge} />}
            {activeTab === "scalping" && <ScalpingAnalyzerTab beforeAnalyze={ensureVipAnalysisAccess} onAnalysisComplete={recordVipAnalysis} accessBadge={quotaBadge} />}
            {activeTab === "goldStrategy" && <GoldStrategyTab />}
            {activeTab === "agents" && <AIAgentsWorkflow />}
            {activeTab === "bankZero" && <BankZeroStrategyTab />}
            {activeTab === "tv" && <TradingViewLiveTab />}
            {activeTab === "calculator" && <LotCalculatorTab />}
            {activeTab === "partner" && <PartnerTab />}
            {activeTab === "brokers" && <BrokersTab />}
            {activeTab === "performance" && <PerformanceTab />}
            {activeTab === "education" && <EducationTab />}
            {activeTab === "account" && <AccountTab subscriber={subscriber} onLogout={handleLogout} />}
            {activeTab === "goldai" && <VIP2GoldChartAITab />}
          </motion.div>
        </AnimatePresence>
        {/* Jarvis AI Assistant — VIP Mode */}
        <Jarvis />
      </main>
      <LanguageToggle />
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB 1: AI Chart Analyzer — Mobile Responsive
   ═══════════════════════════════════════════ */

function getDefaultDecimals(asset: Asset): number {
  if (asset.type === "forex") return asset.id === "usdjpy" || asset.id === "gbpjpy" ? 3 : 5
  if (asset.type === "gold") return 2
  if (asset.type === "crypto") return asset.id === "btcusd" ? 0 : 2
  return 2
}

interface SavedTrade {
  id: string
  asset: string
  strategy: string
  signal: "BUY" | "SELL"
  entry: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  takeProfit3: number
  confidence: number
  result: "win" | "loss" | null
  timestamp: string
}

type VIPAnalysisQuotaProps = {
  beforeAnalyze?: () => Promise<boolean> | boolean
  onAnalysisComplete?: (result: AnalysisResult, assetName: string) => void | Promise<void>
  accessBadge?: ReactNode
}

function saveTrade(trade: SavedTrade) {
  const trades = JSON.parse(localStorage.getItem("tradevisor_vip_trades") || "[]")
  trades.push(trade)
  localStorage.setItem("tradevisor_vip_trades", JSON.stringify(trades))
}

function getSavedTrades(): SavedTrade[] {
  return JSON.parse(localStorage.getItem("tradevisor_vip_trades") || "[]")
}

function BankZeroStrategyTab() {
  const { language } = useLanguage()
  const isArabic = language === "ar"
  const title = isArabic ? "استراتيجية البنوك صفر انعكاس" : "Bank Zero Reversal Strategy"
  const subtitle = isArabic
    ? "نظام VIP خاص لقراءة مناطق دخول البنوك والسيولة قبل الانعكاس، قيد التجهيز للتفعيل الكامل."
    : "A private VIP system for reading bank liquidity zones before reversal, prepared for full activation."
  const points = isArabic
    ? ["قراءة مناطق سيولة البنوك", "فلترة الأخبار والبنوك قبل الدخول", "رفض الصفقات الخطرة تلقائياً", "أهداف وستوب مبنية على إدارة مخاطر"]
    : ["Bank liquidity zone reading", "News and bank-policy filtering before entry", "Automatic rejection for dangerous setups", "Risk-based stop and targets"]

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[#d4a843]/25 bg-[#0d0d0d] p-5 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4a843] to-transparent" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4a843]/25 bg-[#d4a843]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#d4a843] mb-3">
              <Building2 size={13} /> {isArabic ? "منتج VIP خاص" : "Private VIP Product"}
            </div>
            <h2 className="text-white text-2xl sm:text-3xl font-black mb-2">{title}</h2>
            <p className="text-[#a0a0a0] text-sm sm:text-base leading-relaxed max-w-2xl">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-[#d4a843]/30 bg-[#141414] px-5 py-4 min-w-[210px]">
            <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1">{isArabic ? "السعر" : "Price"}</div>
            <div className="text-[#d4a843] text-3xl font-black">$3,500</div>
            <div className="text-[#777777] text-xs mt-1">{isArabic ? "تفعيل خاص عند الإطلاق" : "Private activation at launch"}</div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {points.map((point, index) => (
          <motion.div key={point} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
            className="rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center text-[#d4a843]">
              <Shield size={16} />
            </div>
            <div className="text-white text-sm font-bold">{point}</div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
        <div className="text-[#d4a843] text-xs font-bold uppercase tracking-wider mb-2">
          {isArabic ? "ملاحظة التطوير" : "Development Note"}
        </div>
        <p className="text-[#a0a0a0] text-sm leading-relaxed">
          {isArabic
            ? "هذه الواجهة مضافة الآن داخل VIP. الخطوة التالية نربطها بمنطق تحليل مستقل يعتمد على وكيل البنوك، الأخبار، السيولة، ونقاط الانعكاس."
            : "This page is now available inside VIP. Next we can connect it to a dedicated analysis logic powered by the bank agent, news context, liquidity, and reversal zones."}
        </p>
      </div>
    </div>
  )
}

function AIAnalyzerTab({ beforeAnalyze, onAnalysisComplete, accessBadge }: VIPAnalysisQuotaProps = {}) {
  const toast = useToast()
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[4])
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(strategies[1])
  const [selectedTimeframe, setSelectedTimeframe] = useState("1H")
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [realPrice, setRealPrice] = useState<number | undefined>(undefined)
  const [manualPrice, setManualPrice] = useState("")

  const assetDecimals = getDefaultDecimals(selectedAsset)

  const fetchLatestPrice = async (asset: Asset): Promise<number | undefined> => {
    if (asset.name === "XAU/USD (Gold)") {
      try {
        const quote = await fetchMarketQuote("XAU/USD")
        if (quote?.price && quote.price > 0) return quote.price
      } catch { /* try metals fallback */ }

      try {
        const metals = await getMetalsPrices()
        if (metals.USDXAU && metals.USDXAU > 0) return metals.USDXAU
      } catch { /* try cached fallback */ }

      try {
        const cached = await getCachedPrice("XAU", 30000)
        if (cached.price && cached.price > 0) return cached.price
      } catch { /* no live price available */ }

      return undefined
    }

    try {
      const quote = await fetchMarketQuote(getAssetMarketPair(asset))
      if (quote?.price && quote.price > 0) return quote.price
    } catch { /* no live price available */ }

    return undefined
  }

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    const refreshPrice = async () => {
      const fresh = await fetchLatestPrice(selectedAsset)
      if (!cancelled) setRealPrice(fresh)
    }

    setRealPrice(undefined)
    refreshPrice()
    timer = setInterval(refreshPrice, 60000)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [selectedAsset.name])

  const handleAnalyze = async () => {
    if (!uploadedImage) return
    if (beforeAnalyze) {
      const allowed = await beforeAnalyze()
      if (!allowed) return
    }
    setResult(null)
    setIsAnalyzing(true)
    try {
      let priceBase: number | undefined
      const manual = parseFloat(manualPrice)
      if (!isNaN(manual) && manual > 0) {
        priceBase = manual
      } else {
        try {
          const freshPrice = await fetchLatestPrice(selectedAsset)
          if (freshPrice && freshPrice > 0) {
            priceBase = freshPrice
            setRealPrice(freshPrice)
          }
        } catch { /* analysis can still use chart structure without a live price */ }

        if (!priceBase && realPrice && realPrice > 0) priceBase = realPrice
      }

      const data = await analyzeChartClientSide(uploadedImage, selectedAsset.name, selectedStrategy.name, selectedTimeframe, priceBase)
      setResult(data)
      toast.addToast(`${data.signal} signal detected! ${data.confidence}% confidence.`, "success")
      await onAnalysisComplete?.(data, selectedAsset.name)
    } catch (error: any) {
      toast.addToast(`Analysis failed: ${error.message || "Error"}`, "error")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleTradeResult = (isWin: boolean) => {
    if (!result) return
    const trade: SavedTrade = {
      id: `TRADE-${Date.now()}`,
      asset: selectedAsset.name,
      strategy: selectedStrategy.name,
      signal: result.signal,
      entry: result.entry,
      stopLoss: result.stopLoss,
      takeProfit1: result.takeProfit1,
      takeProfit2: result.takeProfit2,
      takeProfit3: result.takeProfit3,
      confidence: result.confidence,
      result: isWin ? "win" : "loss",
      timestamp: new Date().toISOString(),
    }
    saveTrade(trade)
    toast.addToast(isWin ? "Trade marked as WIN!" : "Trade marked as LOSS. Keep learning!", isWin ? "success" : "info")
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-1"><Brain size={16} className="text-[#d4a843] sm:hidden" /><Brain size={18} className="text-[#d4a843] hidden sm:block" /> {vt("AI Chart Analyzer")}</h2>
        <p className="text-[11px] sm:text-xs text-[#666666]">{vt("Upload any chart. AI detects Entry, SL, and TP automatically.")}</p>
      </div>
      {accessBadge}

      {/* Controls */}
      <div className="relative z-40 overflow-visible bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative">
            <button onClick={() => setShowAssetDropdown(!showAssetDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 sm:px-4 py-2 text-white text-xs sm:text-sm hover:border-[#d4a843] transition-colors">
              <BarChart3 size={13} className="text-[#d4a843] sm:hidden" /><BarChart3 size={14} className="text-[#d4a843] hidden sm:block" />
              <span>{selectedAsset.name}</span>
              <ChevronDown size={12} className="text-[#666666]" />
            </button>
            <AnimatePresence>
              {showAssetDropdown && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full mt-2 left-0 z-[90] w-72 max-h-[22rem] overflow-y-auto rounded-xl border border-[#18c8ff]/25 bg-[#061018] shadow-[0_20px_70px_rgba(0,0,0,0.72),0_0_30px_rgba(24,200,255,0.12)] backdrop-blur-xl">
                  {assets.map(a => (
                    <button key={a.id} onClick={() => { setSelectedAsset(a); setManualPrice(""); setShowAssetDropdown(false); setResult(null); }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs sm:text-sm transition-colors hover:bg-[#10202d] ${selectedAsset.id === a.id ? "text-[#f5c542]" : "text-[#d7e8f6]"}`}>
                      <span>{a.name}</span>
                      {selectedAsset.id === a.id && <span className="h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.75)]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {strategies.map(s => (
              <button key={s.id} onClick={() => { setSelectedStrategy(s); setResult(null); }}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${selectedStrategy.id === s.id ? "bg-[#d4a843] text-[#050505]" : "bg-[#141414] border border-[#1f1f1f] text-[#a0a0a0] hover:border-[#d4a843]/50"}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[#1f1f1f]">
          <span className="text-[#666666] text-[10px] sm:text-xs mr-0.5 sm:mr-1">{vt("TF:")}</span>
          {selectedStrategy.timeframes.map(tf => (
            <button key={tf} onClick={() => { setSelectedTimeframe(tf); setResult(null); }}
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all ${selectedTimeframe === tf ? "bg-[#d4a843]/15 text-[#d4a843] border border-[#d4a843]/30" : "bg-transparent text-[#666666] border border-transparent hover:text-[#a0a0a0]"}`}>
              {tf}
            </button>
          ))}
          <span className="text-[#666666] text-[9px] sm:text-xs ml-1 sm:ml-3 hidden sm:inline">{selectedStrategy.description} &bull; WR: {selectedStrategy.winRate}</span>
        </div>
      </div>

      {/* Manual Price Input */}
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <DollarSign size={14} className="text-[#d4a843] flex-shrink-0 sm:hidden" /><DollarSign size={16} className="text-[#d4a843] flex-shrink-0 hidden sm:block" />
          <label className="text-[#a0a0a0] text-[10px] sm:text-xs whitespace-nowrap">{vt("Price:")}</label>
          <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)}
            placeholder={realPrice ? formatAssetPrice(realPrice, selectedAsset) : "Live price"}
            className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-white placeholder-[#666666] focus:outline-none focus:border-[#d4a843] min-w-0" />
          <span className="text-[#666666] text-[10px] sm:text-xs">USD</span>
          {realPrice && !manualPrice && (
            <span className="hidden sm:inline text-[#666666] text-[10px]">
              {getAssetMarketPair(selectedAsset)} live: {formatAssetPrice(realPrice, selectedAsset)}
            </span>
          )}
      </div>

      {/* Chart Upload + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-3">
          <div className="relative bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl overflow-hidden" style={{ minHeight: 300 }}>
            {isAnalyzing && <AnalyzingOverlay asset={selectedAsset.name} strategy={selectedStrategy.name} tf={selectedTimeframe} />}
            <ChartUploadArea onImageUpload={src => { setUploadedImage(src); setResult(null) }} uploadedImage={uploadedImage} onClear={() => { setUploadedImage(null); setResult(null) }} />
            {uploadedImage && result && <AnalysisOverlayVIP result={result} assetDecimals={assetDecimals} />}
          </div>

          <GoldFlowAgent assetName={selectedAsset.name} />

          <div className="mt-3 sm:mt-4">
            {uploadedImage && !result && !isAnalyzing && (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleAnalyze}
                className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#e8c76a] hover:scale-[1.01] transition-all text-sm">
                <Sparkles size={16} className="sm:hidden" /><Sparkles size={18} className="hidden sm:block" /> {vt("Analyze Chart with AI")}
              </motion.button>
            )}
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 sm:space-y-3">
                <button onClick={handleAnalyze}
                  className="w-full border border-[#1f1f1f] text-[#a0a0a0] font-semibold py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 hover:border-[#d4a843] hover:text-white transition-all text-sm">
                  <Brain size={16} className="sm:hidden" /><Brain size={18} className="hidden sm:block" /> {vt("Re-Analyze")}
                </button>
                {/* Win/Loss Buttons */}
                <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-3 sm:p-4">
                  <p className="text-[11px] sm:text-xs text-[#a0a0a0] text-center mb-2 sm:mb-3">{vt("How did this trade turn out?")}</p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button onClick={() => handleTradeResult(true)}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] font-bold py-2.5 sm:py-3 rounded-xl hover:bg-[#22c55e]/20 transition-all text-xs sm:text-sm">
                      <CheckCircle size={14} className="sm:hidden" /><CheckCircle size={16} className="hidden sm:block" /> {vt("Trade WON")}
                    </button>
                    <button onClick={() => handleTradeResult(false)}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 bg-[#e11d48]/10 border border-[#e11d48]/20 text-[#e11d48] font-bold py-2.5 sm:py-3 rounded-xl hover:bg-[#e11d48]/20 transition-all text-xs sm:text-sm">
                      <XCircle size={14} className="sm:hidden" /><XCircle size={16} className="hidden sm:block" /> {vt("Trade LOST")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {result ? <AnalysisResultCard key="result" result={result} assetDecimals={assetDecimals} />
              : <EmptyResultCard uploadedImage={!!uploadedImage} asset={selectedAsset.name} strategy={selectedStrategy.name} tf={selectedTimeframe} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function AnalyzingOverlay({ asset, strategy, tf }: { asset: string; strategy: string; tf: string }) {
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)
  return (
    <div className="absolute inset-0 z-30 bg-[#050505]/95 flex flex-col items-center justify-center px-4">
      <Loader2 size={36} className="text-[#d4a843] animate-spin mb-3 sm:hidden" />
      <Loader2 size={44} className="text-[#d4a843] animate-spin mb-4 hidden sm:block" />
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-[#d4a843] sm:hidden" /><Zap size={16} className="text-[#d4a843] hidden sm:block" />
        <span className="text-[#d4a843] text-[10px] sm:text-xs font-medium uppercase tracking-wider">{vt("Claude + GPT-4o Vision")}</span>
      </div>
      <p className="text-white font-semibold text-base sm:text-lg mb-1 text-center">{vt("AI Analyzing Your Chart...")}</p>
      <p className="text-[#666666] text-xs sm:text-sm mb-1 text-center">{vt("Reading price action • Detecting patterns")}</p>
      <p className="text-[#666666] text-[10px] sm:text-xs text-center">{asset} &bull; {strategy} &bull; {tf}</p>
      <div className="mt-4 sm:mt-5 w-48 sm:w-56 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
        <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "easeInOut" }} className="h-full bg-[#d4a843] rounded-full" />
      </div>
    </div>
  )
}

function ChartUploadArea({ onImageUpload, uploadedImage, onClear }: { onImageUpload: (src: string) => void; uploadedImage: string | null; onClear: () => void }) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0])
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadFile(e.target.files[0])
  }
  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Please upload an image"); return }
    const reader = new FileReader()
    reader.onload = e => onImageUpload(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  if (uploadedImage) {
    return (
      <div className="relative w-full" style={{ minHeight: 300 }}>
        <img src={uploadedImage} alt="Chart" className="w-full h-full object-contain" style={{ minHeight: 300 }} />
        <button onClick={e => { e.stopPropagation(); onClear(); }}
          className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20 bg-[#0d0d0d]/90 backdrop-blur-sm border border-[#1f1f1f] text-white rounded-full p-2 sm:p-2.5 hover:bg-[#e11d48] transition-all shadow-lg">
          <X size={14} className="sm:hidden" /><X size={16} className="hidden sm:block" />
        </button>
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 z-20 bg-[#0d0d0d]/90 backdrop-blur-sm border border-[#1f1f1f] rounded-lg px-2 sm:px-3 py-1 sm:py-1.5">
          <span className="text-[#a0a0a0] text-[9px] sm:text-[10px]">Chart uploaded</span>
        </div>
      </div>
    )
  }

  return (
    <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`w-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive ? "bg-[#d4a843]/8 border-2 border-dashed border-[#d4a843]" : "bg-[#0a0a0a] border-2 border-dashed border-[#1f1f1f] hover:border-[#d4a843]/40"}`}
      style={{ minHeight: 300 }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-all ${dragActive ? "bg-[#d4a843]/20 scale-110" : "bg-[#141414]"}`}>
        {dragActive ? <Upload size={24} className="text-[#d4a843] sm:hidden" /> : <Camera size={24} className="text-[#666666] sm:hidden" />}
        {dragActive ? <Upload size={32} className="text-[#d4a843] hidden sm:block" /> : <Camera size={32} className="text-[#666666] hidden sm:block" />}
      </div>
      <p className="text-white font-semibold text-sm sm:text-base mb-2">{dragActive ? vt("Drop chart image here") : vt("Upload your chart screenshot")}</p>
      <p className="text-[#666666] text-xs sm:text-sm mb-3 sm:mb-4">{vt("Drag & drop or click • PNG, JPG, WEBP")}</p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
        {["TradingView", "MT4", "MT5", "Any platform"].map(p => (
          <span key={p} className="text-[#666666] text-[9px] sm:text-[10px] bg-[#141414] border border-[#1f1f1f] rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1">{p}</span>
        ))}
      </div>
    </div>
  )
}

function AnalysisOverlayVIP({ result, assetDecimals }: { result: AnalysisResult; assetDecimals: number }) {
  const isBuy = result.signal === "BUY"
  const formatPrice = (p: number) => p.toFixed(assetDecimals)
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)
  const chartScale = result.chartScale
  const hasCalibratedAxis = !!chartScale && chartScale.confidence >= 70 && chartScale.topPrice > chartScale.bottomPrice
  const range = hasCalibratedAxis ? chartScale.topPrice - chartScale.bottomPrice : 1
  const getPos = (price: number) => {
    if (!hasCalibratedAxis) return null
    const normalized = (chartScale.topPrice - price) / range
    if (normalized < -0.02 || normalized > 1.02) return null
    return Math.max(4, Math.min(96, normalized * 100))
  }
  const lines = [
    { pos: getPos(result.entry), label: "ENTRY", price: formatPrice(result.entry), color: "#d4a843", dashed: true },
    { pos: getPos(result.stopLoss), label: "SL", price: formatPrice(result.stopLoss), color: "#e11d48", dashed: false },
    { pos: getPos(result.takeProfit1), label: "TP1", price: `${formatPrice(result.takeProfit1)} ${result.riskReward1}`, color: "#22c55e", opacity: 0.6 },
    { pos: getPos(result.takeProfit2), label: "TP2", price: `${formatPrice(result.takeProfit2)} ${result.riskReward2}`, color: "#22c55e", opacity: 0.8 },
    { pos: getPos(result.takeProfit3), label: "TP3", price: `${formatPrice(result.takeProfit3)} ${result.riskReward3}`, color: "#22c55e", opacity: 1 },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="absolute inset-0 pointer-events-none z-10">
      <div className={`absolute top-2 sm:top-3 left-2 sm:left-3 pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-bold text-[10px] sm:text-xs shadow-lg ${isBuy ? "bg-[#22c55e] text-white" : "bg-[#e11d48] text-white"}`}>
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white" /></span>
        AI {result.signal} &mdash; {result.confidence}%
      </div>
      {!hasCalibratedAxis && (
        <div className="absolute top-12 sm:top-14 left-2 sm:left-3 right-2 sm:right-3 pointer-events-auto rounded-xl border border-[#d4a843]/30 bg-[#0d0d0d]/92 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="text-[#d4a843] text-[10px] sm:text-xs font-bold">{vt("Chart scale not calibrated")}</div>
          <div className="text-[#a0a0a0] text-[9px] sm:text-[10px] leading-relaxed mt-1">
            {vt("Levels are listed on the right. Lines were hidden because the visible price axis was not readable enough.")}
          </div>
        </div>
      )}
      {hasCalibratedAxis && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 pointer-events-auto rounded-full border border-[#22c55e]/20 bg-[#0d0d0d]/90 px-2 py-1 text-[8px] sm:text-[10px] font-bold text-[#22c55e]">
          {vt("Axis calibrated")} {chartScale.confidence}%
        </div>
      )}
      {hasCalibratedAxis && lines.filter((line) => line.pos !== null).map((line, i) => (
        <div key={line.label} className="absolute left-0 right-0 pointer-events-auto" style={{ top: `${line.pos}%` }}>
          <div className="relative">
            <div className={`w-full shadow-[0_0_10px_${line.color}30]`} style={{ borderTop: `${i < 2 ? 2 : 1}px ${line.dashed ? "dashed" : "solid"} ${line.color}`, opacity: line.opacity || 1 }} />
            <div className={`absolute -top-5 sm:-top-6 ${i < 2 ? "right-2 sm:right-3" : "left-2 sm:left-3"} text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow`}
              style={{ backgroundColor: i < 2 ? line.color : `${line.color}30`, color: i < 2 ? (line.color === "#d4a843" ? "#050505" : "#fff") : line.color, border: i >= 2 ? `1px solid ${line.color}40` : "none" }}>
              {line.label} {line.price}
            </div>
          </div>
        </div>
      ))}
      <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 right-1.5 sm:right-2 pointer-events-auto">
        <div className="bg-[#0d0d0d]/90 backdrop-blur-sm border border-[#1f1f1f] rounded-lg sm:rounded-xl p-1.5 sm:p-2 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[#666666] text-[8px] sm:text-[10px]">Strat: <span className="text-[#d4a843]">{result.strategyUsed}</span></span>
            <span className="text-[#666666] text-[8px] sm:text-[10px]">R:R: <span className="text-[#22c55e]">{result.riskReward3}</span></span>
          </div>
          <span className="text-[#666666] text-[8px] sm:text-[10px]">Risk: <span className="text-[#e11d48]">{result.maxRiskPercent}%</span></span>
        </div>
      </div>
    </motion.div>
  )
}


function getVIPProviderLabel(result: AnalysisResult) {
  if (result.aiConsensus?.models?.length) return result.aiConsensus.models.join(" + ");
  if (result.analysisSource === "claude-openai-consensus") return "Claude + OpenAI";
  if (result.analysisSource === "claude") return "Claude";
  if (result.analysisSource === "openai") return "OpenAI";
  return "Tradevisor AI";
}

function AnalysisResultCard({ result, assetDecimals }: { result: AnalysisResult; assetDecimals: number }) {
  const isBuy = result.signal === "BUY"
  const formatPrice = (p: number) => p.toFixed(assetDecimals)
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)
  const providerLabel = getVIPProviderLabel(result)

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
      className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl sm:rounded-2xl overflow-hidden" style={{ maxHeight: 500, overflowY: "auto" }}>
      <div className={`p-3 sm:p-4 border-b border-[#1f1f1f] ${isBuy ? "bg-[#22c55e]/5" : "bg-[#e11d48]/5"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${isBuy ? "bg-[#22c55e]/20" : "bg-[#e11d48]/20"}`}>
              <Zap size={16} className={isBuy ? "text-[#22c55e] sm:hidden" : "text-[#e11d48] sm:hidden"} />
              <Zap size={20} className={`hidden sm:block ${isBuy ? "text-[#22c55e]" : "text-[#e11d48]"}`} />
            </div>
            <div>
              <span className={`text-base sm:text-lg font-bold ${isBuy ? "text-[#22c55e]" : "text-[#e11d48]"}`}>{result.signal}</span>
              <div className="text-[#666666] text-[9px] sm:text-[10px]">{result.strategyUsed} &bull; {providerLabel}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white text-base sm:text-lg font-bold">{result.confidence}%</div>
            <div className="text-[#666666] text-[9px] sm:text-[10px]">{providerLabel}</div>
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <VIPSetupQualityCard result={result} />
        <VIPTradeSafetyNotice result={result} />
        {/* AI Indicators */}
        <div>
          <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1"><Gauge size={10} className="text-[#d4a843] sm:hidden" /><Gauge size={11} className="text-[#d4a843] hidden sm:block" /> {vt("AI Indicators")}</h4>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {[
              { label: vt("Confluence"), value: `${result.confluenceScore}/100`, color: result.confluenceScore > 75 ? "text-[#22c55e]" : "text-[#d4a843]" },
              { label: vt("Trend"), value: result.trend, color: result.trend.includes("Up") ? "text-[#22c55e]" : "text-[#e11d48]" },
              { label: vt("Volume"), value: result.volume.signal.length > 12 ? result.volume.signal.substring(0, 12) + "..." : result.volume.signal, color: "text-[#3b82f6]" },
              { label: vt("Structure"), value: result.marketStructure.length > 15 ? result.marketStructure.substring(0, 15) + "..." : result.marketStructure, color: "text-[#a855f7]" },
            ].map(item => (
              <div key={item.label} className="bg-[#141414] rounded-lg sm:rounded-xl p-1.5 sm:p-2">
                <div className="text-[#666666] text-[8px] sm:text-[9px] uppercase tracking-wider mb-0.5 sm:mb-1">{item.label}</div>
                <div className={`${item.color} font-bold text-[9px] sm:text-[10px]`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <AgentAnalysisFlow result={result} />
        {/* Price Levels */}
        <div>
          <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1"><Target size={10} className="text-[#d4a843]" /> {vt("Price Levels")}</h4>
          <div className="space-y-1 sm:space-y-1.5">
            {[
              { label: vt("Entry"), price: formatPrice(result.entry), color: "#d4a843", icon: Crosshair },
              { label: vt("Stop Loss"), price: `${formatPrice(result.stopLoss)} (-${result.riskPips})`, color: "#e11d48", icon: Shield },
              { label: "TP1", price: `${formatPrice(result.takeProfit1)} ${result.riskReward1}`, color: "#22c55e", icon: TrendingUp },
              { label: "TP2", price: `${formatPrice(result.takeProfit2)} ${result.riskReward2}`, color: "#22c55e", icon: TrendingUp },
              { label: "TP3", price: `${formatPrice(result.takeProfit3)} ${result.riskReward3}`, color: "#22c55e", icon: TrendingUp },
            ].map((level, i) => (
              <div key={i} className="flex items-center justify-between bg-[#141414] border border-[#1f1f1f] rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <level.icon size={11} style={{ color: level.color }} className="sm:hidden" />
                  <level.icon size={12} style={{ color: level.color }} className="hidden sm:block" />
                  <span className="text-[#a0a0a0] text-[10px] sm:text-xs">{level.label}</span>
                </div>
                <span className="font-bold text-[10px] sm:text-xs" style={{ color: level.color }}>{level.price}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Risk */}
        <div className="border-t border-[#1f1f1f] pt-2 sm:pt-3">
          <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1"><Shield size={10} className="text-[#d4a843]" /> {vt("Risk")}</h4>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {[{ label: vt("Max Risk"), value: `${result.maxRiskPercent}%`, color: "text-[#d4a843]" }, { label: vt("Risk Distance"), value: `${result.riskPips}`, color: "text-white" }, { label: vt("Hold Time"), value: result.timeToHold, color: "text-white" }, { label: vt("Best R:R"), value: result.riskReward3, color: "text-[#22c55e]" }].map(item => (
              <div key={item.label} className="bg-[#141414] rounded-lg sm:rounded-xl p-1.5 sm:p-2">
                <div className="text-[#666666] text-[8px] sm:text-[9px] uppercase tracking-wider mb-0.5">{item.label}</div>
                <div className={`${item.color} font-bold text-[10px] sm:text-xs`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Lot Size */}
        <div className="border-t border-[#1f1f1f] pt-2 sm:pt-3">
          <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1"><Layers size={10} className="text-[#d4a843]" /> {vt("Lot Size")}</h4>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[{ balance: "$1K", lot: result.lotSize1000 }, { balance: "$5K", lot: result.lotSize5000 }, { balance: "$10K", lot: result.lotSize10000 }].map(item => (
              <div key={item.balance} className="bg-[#141414] rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center">
                <div className="text-[#666666] text-[8px] sm:text-[9px] mb-0.5">{item.balance}</div>
                <div className="text-[#d4a843] font-bold text-xs sm:text-sm">{item.lot}</div>
              </div>
            ))}
          </div>
        </div>
        {/* S/R */}
        <div className="border-t border-[#1f1f1f] pt-2 sm:pt-3">
          <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1"><Activity size={10} className="text-[#d4a843]" /> {vt("S/R Levels")}</h4>
          <div className="space-y-1">
            {result.srLevels.slice(0, 4).map((sr, i) => (
              <div key={i} className="flex items-center justify-between bg-[#141414] rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${sr.type === "support" ? "bg-[#22c55e]" : sr.type === "resistance" ? "bg-[#e11d48]" : "bg-[#d4a843]"}`} />
                  <span className="text-[#a0a0a0] text-[9px] sm:text-[10px] capitalize">{sr.type} ({sr.strength})</span>
                </div>
                <span className="text-white text-[9px] sm:text-[10px] font-medium">{formatPrice(sr.level)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Fibonacci */}
        <div className="border-t border-[#1f1f1f] pt-2 sm:pt-3">
          <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1"><Percent size={10} className="text-[#d4a843]" /> {vt("Fibonacci")}</h4>
          <div className="flex gap-0.5 sm:gap-1">
            {result.fibonacci.map(fib => (
              <div key={fib.level} className="flex-1 bg-[#141414] rounded-md sm:rounded-lg px-1 sm:px-2 py-1.5 sm:py-2 text-center">
                <div className="text-[#666666] text-[7px] sm:text-[9px]">{fib.level.toFixed(3)}</div>
                <div className="text-[#d4a843] text-[7px] sm:text-[9px] font-bold">{formatPrice(fib.price)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function VIPTradeSafetyNotice({ result }: { result: AnalysisResult }) {
  const action = result.agents?.finalPlan?.action
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)
  if (!action || action === "approve_plan") return null

  const isRejected = action === "reject"
  return (
    <div className={`rounded-xl border p-3 ${isRejected ? "bg-[#e11d48]/10 border-[#e11d48]/30" : "bg-[#d4a843]/10 border-[#d4a843]/30"}`}>
      <div className="flex items-start gap-2.5">
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isRejected ? "bg-[#e11d48]/15" : "bg-[#d4a843]/15"}`}>
          <AlertTriangle size={15} className={isRejected ? "text-[#e11d48]" : "text-[#d4a843]"} />
        </div>
        <div className="min-w-0">
          <div className={`text-xs sm:text-sm font-bold ${isRejected ? "text-[#e11d48]" : "text-[#d4a843]"}`}>
            {isRejected ? vt("No Trade Now") : vt("Wait or Reduce Size")}
          </div>
          <p className="text-[#a0a0a0] text-[10px] sm:text-[11px] leading-relaxed mt-1">
            {vt("This entry is currently risky. The warning is based on the full AI review, market momentum, chart structure, six-agent checks, and final risk management.")}
          </p>
          {result.agents?.finalPlan.notes.slice(0, 2).map((note) => (
            <div key={note} className="text-[#666666] text-[9px] sm:text-[10px] leading-relaxed mt-1">{note}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VIPSetupQualityCard({ result }: { result: AnalysisResult }) {
  const setupQuality = result.agents?.finalPlan?.setupQuality
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)
  if (!setupQuality) return null

  const isDanger = setupQuality.verdict === "danger"
  const isClean = setupQuality.verdict === "clean"
  const color = isDanger ? "#e11d48" : isClean ? "#22c55e" : "#d4a843"
  const label = isDanger ? vt("Danger Entry") : isClean ? vt("Clean Setup") : vt("Needs Confirmation")

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22` }}>
            <Gauge size={14} style={{ color }} />
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs sm:text-sm font-bold">{vt("Setup Quality")}</div>
            <div className="text-[#666666] text-[8px] sm:text-[9px] uppercase tracking-wider">{label}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm sm:text-base font-black" style={{ color }}>{setupQuality.score}/100</div>
          <div className="text-[#666666] text-[8px] sm:text-[9px]">{vt("safety score")}</div>
        </div>
      </div>
      <p className="text-[#a0a0a0] text-[10px] sm:text-[11px] leading-relaxed">{setupQuality.summary}</p>
      {(setupQuality.blockers.length > 0 || setupQuality.warnings.length > 0) && (
        <div className="mt-2 space-y-1">
          {[...setupQuality.blockers, ...setupQuality.warnings].slice(0, 2).map((item) => (
            <div key={item} className="text-[#777777] text-[9px] sm:text-[10px] leading-relaxed">- {item}</div>
          ))}
        </div>
      )}
      <div className="mt-2 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2">
        <div className="text-[#d4a843] text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mb-1">{vt("Before Entry")}</div>
        {setupQuality.confirmationChecklist.slice(0, 2).map((item) => (
          <div key={item} className="text-[#a0a0a0] text-[9px] sm:text-[10px] leading-relaxed">- {item}</div>
        ))}
      </div>
    </div>
  )
}

function EmptyResultCard({ uploadedImage, asset, strategy, tf }: { uploadedImage: boolean; asset: string; strategy: string; tf: string }) {
  const { language } = useLanguage()
  const vt = (text: string) => vipText(language, text)
  return (
    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-5 sm:p-6 h-full flex flex-col items-center justify-center text-center" style={{ minHeight: 300 }}>
      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#141414] border border-[#1f1f1f] flex items-center justify-center mb-3 sm:mb-4">
        <Brain size={18} className="text-[#d4a843]/40 sm:hidden" />
        <Brain size={24} className="text-[#d4a843]/40 hidden sm:block" />
      </div>
      <p className="text-white text-sm sm:text-base font-medium mb-1">{uploadedImage ? vt("Ready for AI Analysis") : vt("Upload Your Chart")}</p>
      <p className="text-[#666666] text-[10px] sm:text-xs max-w-xs leading-relaxed mb-2 sm:mb-3 px-4">
        {uploadedImage ? vt("Click 'Analyze Chart with AI' to detect Entry, SL, and TP.") : vt("Upload a chart for AI technical analysis.")}
      </p>
      {uploadedImage && <div className="flex items-center gap-1.5 sm:gap-2 text-[#d4a843] text-[9px] sm:text-[10px]"><TrendingUp size={10} /><span>{asset} &bull; {strategy} &bull; {tf}</span></div>}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   TAB 4: TradingView Live — Mobile Responsive
   ═══════════════════════════════════════════ */

function TradingViewLiveTab() {
  const toast = useToast()
  const [symbol, setSymbol] = useState("OANDA:XAUUSD")
  const [interval, setInterval] = useState("60")

  const symbolOptions = [
    { label: "XAU/USD", value: "OANDA:XAUUSD" },
    { label: "EUR/USD", value: "OANDA:EURUSD" },
    { label: "GBP/USD", value: "OANDA:GBPUSD" },
    { label: "USD/JPY", value: "OANDA:USDJPY" },
    { label: "GBP/JPY", value: "OANDA:GBPJPY" },
    { label: "BTC/USD", value: "COINBASE:BTCUSD" },
    { label: "ETH/USD", value: "COINBASE:ETHUSD" },
    { label: "NDX", value: "NASDAQ:NDX" },
    { label: "SPY", value: "AMEX:SPY" },
    { label: "USOIL", value: "TVC:USOIL" },
  ]

  const intervalOptions = [
    { label: "1m", value: "1" }, { label: "5m", value: "5" }, { label: "15m", value: "15" },
    { label: "30m", value: "30" }, { label: "1H", value: "60" }, { label: "4H", value: "240" },
    { label: "D", value: "D" }, { label: "W", value: "W" },
  ]

  const copySymbol = () => {
    navigator.clipboard.writeText(symbol)
    toast.addToast(`${symbol} copied!`, "success")
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-0.5 sm:mb-1"><LineChart size={16} className="text-[#d4a843] sm:hidden" /><LineChart size={18} className="text-[#d4a843] hidden sm:block" /> Live Charts</h2>
          <p className="text-[11px] sm:text-xs text-[#666666]">Real-time TradingView charts.</p>
        </div>
        <button onClick={copySymbol}
          className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-[#d4a843] bg-[#d4a843]/10 px-3 py-2 rounded-xl transition-all w-full sm:w-auto">
          <Copy size={12} /> Copy Symbol
        </button>
      </div>

      {/* Controls */}
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          <div className="w-full sm:w-auto">
            <label className="text-[9px] sm:text-[10px] text-[#666666] mb-1 block">Asset</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)}
              className="w-full sm:w-auto bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 py-2 text-white text-xs focus:border-[#d4a843] focus:outline-none min-w-[140px]">
              {symbolOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] sm:text-[10px] text-[#666666] mb-1 block">Timeframe</label>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {intervalOptions.map(o => (
                <button key={o.value} onClick={() => setInterval(o.value)}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[10px] font-medium transition-all flex-shrink-0 ${interval === o.value ? "bg-[#d4a843] text-[#050505]" : "bg-[#141414] text-[#666666]"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TradingView Advanced Chart — Full Drawing Tools + Indicators */}
      <TradingViewAdvancedChart symbol={symbol} interval={interval} />

      {/* Quick Access */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
        {symbolOptions.slice(0, 10).map(s => (
          <button key={s.value} onClick={() => setSymbol(s.value)}
            className={`text-[9px] sm:text-[10px] font-medium py-1.5 sm:py-2 rounded-xl transition-all ${symbol === s.value ? "bg-[#d4a843] text-[#050505]" : "bg-[#141414] text-[#a0a0a0] border border-[#1f1f1f]"}`}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════
   TradingView Advanced Chart — Drawing Tools + Indicators
   ═══════════════════════════════════════════ */

function TradingViewAdvancedChart({ symbol, interval }: { symbol: string; interval: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ""

    const widgetDiv = document.createElement("div")
    widgetDiv.id = "tv_advanced_chart_" + Date.now()
    widgetDiv.style.width = "100%"
    widgetDiv.style.height = "100%"
    containerRef.current.appendChild(widgetDiv)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => {
      if (!(window as any).TradingView) return
      new (window as any).TradingView.widget({
        container_id: widgetDiv.id,
        symbol: symbol,
        interval: interval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0d0d0d",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false,      // ← Drawing tools visible!
        allow_symbol_change: true,
        save_image: true,
        details: true,
        hotlist: true,
        calendar: true,
        studies: [
          "RSI@tv-basicstudies",
          "MACD@tv-basicstudies",
          "MASimple@tv-basicstudies",
          "BollingerBands@tv-basicstudies",
        ],
        show_popup_button: true,
        popup_width: "1200",
        popup_height: "800",
        autosize: true,
        backgroundColor: "#0d0d0d",
        watchlist: [
          "OANDA:XAUUSD", "OANDA:EURUSD", "OANDA:GBPUSD",
          "OANDA:USDJPY", "COINBASE:BTCUSD", "COINBASE:ETHUSD",
        ],
        disabled_features: [],
        enabled_features: [
          "use_localstorage_for_settings",
          "header_widget",
          "header_symbol_search",
          "header_resolutions",
          "header_chart_type",
          "header_settings",
          "header_indicators",
          "header_compare",
          "header_undo_redo",
          "header_screenshot",
          "header_fullscreen_button",
          "study_templates",
          "drawing_templates",
          "show_hide_button_in_legend",
          "format_button_in_legend",
          "study_buttons_in_legend",
          "left_toolbar",
        ],
      })
    }
    document.body.appendChild(script)

    return () => {
      script.remove()
      if (containerRef.current) containerRef.current.innerHTML = ""
    }
  }, [symbol, interval])

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl overflow-hidden" style={{ height: 520 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB 5: Lot Calculator — Mobile Responsive
   ═══════════════════════════════════════════ */

function LotCalculatorTab() {
  const toast = useToast()
  const [accountBalance, setAccountBalance] = useState(10000)
  const [riskPercent, setRiskPercent] = useState(1.5)
  const [stopLossPips, setStopLossPips] = useState(20)
  const [pipValue, setPipValue] = useState(10)
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD")

  const riskAmount = accountBalance * (riskPercent / 100)
  const lotSize = (riskAmount / (stopLossPips * pipValue)).toFixed(2)
  const maxLot = (accountBalance / 100000).toFixed(2)

  const copyLotSize = () => {
    navigator.clipboard.writeText(lotSize)
    toast.addToast(`Lot size ${lotSize} copied!`, "success")
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-0.5 sm:mb-1"><Calculator size={16} className="text-[#d4a843] sm:hidden" /><Calculator size={18} className="text-[#d4a843] hidden sm:block" /> Lot Size Calculator</h2>
        <p className="text-[11px] sm:text-xs text-[#666666]">Professional risk management.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Inputs */}
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Account Balance */}
          <div>
            <label className="text-[10px] sm:text-xs text-[#a0a0a0] mb-1.5 sm:mb-2 block flex items-center gap-1"><Wallet size={10} className="text-[#d4a843] sm:hidden" /><Wallet size={11} className="text-[#d4a843] hidden sm:block" /> Account Balance</label>
            <div className="flex gap-2">
              <input type="number" value={accountBalance} onChange={e => setAccountBalance(Number(e.target.value))}
                className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#d4a843] focus:outline-none" />
              <select value={currency} onChange={e => setCurrency(e.target.value as any)}
                className="bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 text-white text-xs sm:text-sm focus:border-[#d4a843] focus:outline-none">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div className="flex gap-1.5 sm:gap-2 mt-2 flex-wrap">
              {[100, 500, 1000, 5000, 10000, 50000, 100000, 500000].map(v => (
                <button key={v} onClick={() => setAccountBalance(v)}
                  className={`text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 rounded-lg transition-all ${accountBalance === v ? "bg-[#d4a843] text-[#050505] font-bold" : "bg-[#141414] text-[#666666] hover:text-white"}`}>
                  ${v >= 1000 ? (v / 1000) + "K" : v}
                </button>
              ))}
            </div>
          </div>

          {/* Risk % */}
          <div>
            <label className="text-[10px] sm:text-xs text-[#a0a0a0] mb-1.5 sm:mb-2 block flex items-center gap-1"><Percent size={10} className="text-[#e11d48] sm:hidden" /><Percent size={11} className="text-[#e11d48] hidden sm:block" /> Risk Per Trade (%)</label>
            <input type="range" min="0.1" max="5" step="0.1" value={riskPercent}
              onChange={e => setRiskPercent(Number(e.target.value))}
              className="w-full accent-[#d4a843] mb-1.5 sm:mb-2" />
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-bold">{riskPercent}%</span>
              <span className="text-[#666666] text-[9px] sm:text-[10px]">Recommended: 1-2%</span>
            </div>
          </div>

          {/* Stop Loss */}
          <div>
            <label className="text-[10px] sm:text-xs text-[#a0a0a0] mb-1.5 sm:mb-2 block flex items-center gap-1"><Target size={10} className="text-[#22c55e] sm:hidden" /><Target size={11} className="text-[#22c55e] hidden sm:block" /> Stop Loss (pips)</label>
            <input type="number" value={stopLossPips} onChange={e => setStopLossPips(Number(e.target.value))}
              className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#d4a843] focus:outline-none mb-1.5 sm:mb-2" />
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {[10, 15, 20, 25, 30, 50, 100].map(v => (
                <button key={v} onClick={() => setStopLossPips(v)}
                  className={`text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 rounded-lg transition-all ${stopLossPips === v ? "bg-[#d4a843] text-[#050505] font-bold" : "bg-[#141414] text-[#666666] hover:text-white"}`}>
                  {v}p
                </button>
              ))}
            </div>
          </div>

          {/* Pip Value */}
          <div>
            <label className="text-[10px] sm:text-xs text-[#a0a0a0] mb-1.5 sm:mb-2 block flex items-center gap-1"><DollarSign size={10} className="text-[#3b82f6] sm:hidden" /><DollarSign size={11} className="text-[#3b82f6] hidden sm:block" /> Pip Value ($)</label>
            <input type="number" value={pipValue} onChange={e => setPipValue(Number(e.target.value))}
              className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:border-[#d4a843] focus:outline-none" />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-[#0d0d0d] border border-[#d4a843]/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-[#666666] text-[10px] sm:text-xs mb-1.5 sm:mb-2 uppercase tracking-wider">Recommended Lot Size</div>
            <div className="text-3xl sm:text-4xl font-black text-[#d4a843] mb-0.5 sm:mb-1">{lotSize}</div>
            <div className="text-[#666666] text-[10px] sm:text-xs">Standard Lots</div>
            <button onClick={copyLotSize}
              className="mt-2 sm:mt-3 text-[9px] sm:text-[10px] text-[#d4a843] bg-[#d4a843]/10 px-3 py-1.5 rounded-lg hover:bg-[#d4a843]/20 transition-all flex items-center gap-1 mx-auto">
              <Copy size={10} /> Copy Lot Size
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { label: "Risk Amount", value: `$${riskAmount.toFixed(2)}`, color: "text-[#e11d48]" },
              { label: "Max Lot", value: maxLot, color: "text-[#a0a0a0]" },
              { label: "Rec. Risk", value: `${Math.min(riskPercent, 2).toFixed(1)}%`, color: "text-[#22c55e]" },
              { label: "Leverage", value: "1:500", color: "text-[#a0a0a0]" },
            ].map(item => (
              <div key={item.label} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-[#666666] text-[8px] sm:text-[10px] mb-0.5 sm:mb-1">{item.label}</div>
                <div className={`font-bold text-xs sm:text-sm ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-4">
            <h4 className="text-white text-[10px] sm:text-xs font-semibold mb-2 sm:mb-3 flex items-center gap-1"><Info size={10} className="text-[#d4a843] sm:hidden" /><Info size={11} className="text-[#d4a843] hidden sm:block" /> Quick Reference</h4>
            <div className="space-y-1.5 sm:space-y-2">
              {[
                { balance: "$100", lot: "0.01", risk: "$1.50" },
                { balance: "$1,000", lot: "0.10", risk: "$15" },
                { balance: "$5,000", lot: "0.50", risk: "$75" },
                { balance: "$10,000", lot: "1.00", risk: "$150" },
                { balance: "$50,000", lot: "5.00", risk: "$750" },
                { balance: "$100,000", lot: "10.00", risk: "$1,500" },
                { balance: "$500,000", lot: "50.00", risk: "$7,500" },
              ].map(row => (
                <div key={row.balance} className="flex items-center justify-between text-[10px] sm:text-xs py-1 sm:py-1.5 border-b border-[#1f1f1f] last:border-0">
                  <span className="text-[#a0a0a0]">{row.balance}</span>
                  <span className="text-[#d4a843] font-bold">{row.lot} lot</span>
                  <span className="text-[#666666]">{row.risk} risk</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB 7: Brokers — Mobile Responsive
   ═══════════════════════════════════════════ */

const brokerList = [
  { name: "Pepperstone", type: "ECN/STP", leverage: "1:500", spread: "0.0 pips", min: "$0", regulator: "ASIC, FCA", bonus: "None", rating: 4.8, link: "https://pepperstone.com" },
  { name: "IC Markets", type: "ECN", leverage: "1:500", spread: "0.0 pips", min: "$200", regulator: "ASIC, CySEC", bonus: "None", rating: 4.7, link: "https://icmarkets.com" },
  { name: "XM", type: "Market Maker", leverage: "1:1000", spread: "0.6 pips", min: "$5", regulator: "ASIC, CySEC, FSC", bonus: "$30 No Deposit", rating: 4.5, link: "https://xm.com" },
  { name: "Exness", type: "ECN/Market", leverage: "1:Unlimited", spread: "0.0 pips", min: "$10", regulator: "FCA, CySEC, FSCA", bonus: "None", rating: 4.6, link: "https://exness.com" },
  { name: "FP Markets", type: "ECN/DMA", leverage: "1:500", spread: "0.0 pips", min: "$100", regulator: "ASIC, CySEC", bonus: "None", rating: 4.5, link: "https://fpmarkets.com" },
  { name: "Axi", type: "ECN", leverage: "1:500", spread: "0.0 pips", min: "$0", regulator: "ASIC, FCA", bonus: "None", rating: 4.4, link: "https://axi.com" },
  { name: "OANDA", type: "Market Maker", leverage: "1:200", spread: "1.0 pip", min: "$0", regulator: "FCA, CFTC", bonus: "None", rating: 4.3, link: "https://oanda.com" },
  { name: "Tickmill", type: "ECN/STP", leverage: "1:500", spread: "0.0 pips", min: "$100", regulator: "FCA, CySEC, FSCA", bonus: "$30 Welcome", rating: 4.4, link: "https://tickmill.com" },
]

function BrokersTab() {
  const toast = useToast()
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-0.5 sm:mb-1"><Building2 size={16} className="text-[#d4a843] sm:hidden" /><Building2 size={18} className="text-[#d4a843] hidden sm:block" /> VIP Broker Partners</h2>
        <p className="text-[11px] sm:text-xs text-[#666666]">8 trusted brokers with exclusive VIP conditions.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {brokerList.map((broker, i) => (
          <motion.div key={broker.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-[#d4a843]/20 transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white">{broker.name}</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#d4a843]">{broker.rating}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={9} className={s <= Math.round(broker.rating) ? "text-[#d4a843] fill-[#d4a843] sm:hidden" : "text-[#333333] sm:hidden"} />
                  ))}
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={10} className={`hidden sm:block ${s <= Math.round(broker.rating) ? "text-[#d4a843] fill-[#d4a843]" : "text-[#333333]"}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              {[
                { label: "Leverage", value: broker.leverage, color: "text-[#22c55e]" },
                { label: "Spread", value: broker.spread, color: "text-[#d4a843]" },
                { label: "Min", value: broker.min },
              ].map(item => (
                <div key={item.label} className="bg-[#141414] rounded-md sm:rounded-lg p-1.5 sm:p-2 text-center">
                  <div className="text-[#666666] text-[7px] sm:text-[8px]">{item.label}</div>
                  <div className={`text-[9px] sm:text-[10px] font-semibold ${item.color || "text-white"}`}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="bg-[#141414] rounded-md sm:rounded-lg p-1.5 sm:p-2">
                <div className="text-[#666666] text-[7px] sm:text-[8px]">Type</div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-white">{broker.type}</div>
              </div>
              <div className="bg-[#141414] rounded-md sm:rounded-lg p-1.5 sm:p-2">
                <div className="text-[#666666] text-[7px] sm:text-[8px]">Regulator</div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-white">{broker.regulator}</div>
              </div>
            </div>
            {broker.bonus !== "None" && (
              <div className="bg-[#d4a843]/5 border border-[#d4a843]/10 rounded-md sm:rounded-lg p-1.5 sm:p-2 mb-2 sm:mb-3 text-center">
                <span className="text-[9px] sm:text-[10px] text-[#d4a843] font-bold">VIP Bonus: {broker.bonus}</span>
              </div>
            )}
            <button onClick={() => { window.open(broker.link, "_blank", "noopener,noreferrer"); toast.addToast(`Opening ${broker.name}...`, "info") }}
              className="w-full bg-[#141414] border border-[#1f1f1f] text-[#a0a0a0] text-[10px] sm:text-xs font-medium py-2 sm:py-2.5 rounded-xl hover:border-[#d4a843]/30 hover:text-white transition-all flex items-center justify-center gap-1">
              <ExternalLink size={10} /> Visit Broker
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════
   TAB 8: Performance — Mobile Responsive
   ═══════════════════════════════════════════ */

function PerformanceTab() {
  const toast = useToast()
  const trades = getSavedTrades()
  const totalTrades = trades.length
  const wins = trades.filter(t => t.result === "win").length
  const losses = trades.filter(t => t.result === "loss").length
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0"
  const lossRate = totalTrades > 0 ? ((losses / totalTrades) * 100).toFixed(1) : "0"

  const winByAsset = trades.reduce((acc: Record<string, { wins: number; total: number }>, t) => {
    if (!acc[t.asset]) acc[t.asset] = { wins: 0, total: 0 }
    acc[t.asset].total++
    if (t.result === "win") acc[t.asset].wins++
    return acc
  }, {})

  const clearHistory = () => {
    if (confirm("Clear all trade history?")) {
      localStorage.removeItem("tradevisor_vip_trades")
      toast.addToast("History cleared!", "info")
      window.location.reload()
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-0.5 sm:mb-1"><Trophy size={16} className="text-[#d4a843] sm:hidden" /><Trophy size={18} className="text-[#d4a843] hidden sm:block" /> Performance Report</h2>
          <p className="text-[11px] sm:text-xs text-[#666666]">Track your trading results.</p>
        </div>
        {totalTrades > 0 && (
          <button onClick={clearHistory}
            className="text-[9px] sm:text-[10px] text-[#e11d48] hover:text-[#ff6b8a] bg-[#e11d48]/10 px-3 py-2 rounded-xl transition-all w-full sm:w-auto">
            Clear History
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { label: "Total Trades", value: totalTrades.toString(), color: "text-white", icon: Hash },
          { label: "Wins", value: wins.toString(), color: "text-[#22c55e]", icon: TrendingUp },
          { label: "Losses", value: losses.toString(), color: "text-[#e11d48]", icon: TrendDown },
          { label: "Win Rate", value: `${winRate}%`, color: Number(winRate) >= 60 ? "text-[#22c55e]" : Number(winRate) >= 40 ? "text-[#d4a843]" : "text-[#e11d48]", icon: PieChart },
        ].map(item => (
          <div key={item.label} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#141414] rounded-md sm:rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
              <item.icon size={12} className="text-[#d4a843] sm:hidden" />
              <item.icon size={14} className="text-[#d4a843] hidden sm:block" />
            </div>
            <div className={`text-xl sm:text-2xl font-black ${item.color}`}>{item.value}</div>
            <div className="text-[#666666] text-[9px] sm:text-[10px]">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {totalTrades > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-4">
            <h4 className="text-white text-[10px] sm:text-xs font-semibold mb-2 sm:mb-3 flex items-center gap-1"><Gauge size={10} className="text-[#d4a843]" /> Win Rate Distribution</h4>
            <div className="h-3 sm:h-4 bg-[#141414] rounded-full overflow-hidden flex mb-2">
              <div className="h-full bg-[#22c55e] transition-all" style={{ width: `${winRate}%` }} />
              <div className="h-full bg-[#e11d48] transition-all" style={{ width: `${lossRate}%` }} />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px]">
              <span className="text-[#22c55e]">Wins ({winRate}%)</span>
              <span className="text-[#e11d48]">Losses ({lossRate}%)</span>
            </div>
          </div>
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-4">
            <h4 className="text-white text-[10px] sm:text-xs font-semibold mb-2 sm:mb-3 flex items-center gap-1"><BarChart3 size={10} className="text-[#d4a843]" /> By Asset</h4>
            <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
              {Object.entries(winByAsset).map(([asset, data]) => (
                <div key={asset} className="flex items-center justify-between">
                  <span className="text-[#a0a0a0] text-[10px] sm:text-xs">{asset}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-[#141414] rounded-full overflow-hidden">
                      <div className="h-full bg-[#22c55e] rounded-full" style={{ width: `${(data.wins / data.total) * 100}%` }} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-[#d4a843] font-bold">{data.wins}/{data.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trade History */}
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-4">
        <h4 className="text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-1"><Clock size={10} className="text-[#d4a843]" /> Trade History</h4>
        {trades.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#141414] rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <Activity size={16} className="text-[#666666] sm:hidden" />
              <Activity size={20} className="text-[#666666] hidden sm:block" />
            </div>
            <p className="text-[#666666] text-[10px] sm:text-xs px-4">No trades yet. Analyze charts and mark results!</p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2 max-h-72 sm:max-h-96 overflow-y-auto">
            {trades.slice().reverse().map((trade) => (
              <div key={trade.id} className={`flex items-center justify-between bg-[#141414] rounded-lg sm:rounded-xl p-2 sm:p-3 border ${trade.result === "win" ? "border-[#22c55e]/10" : "border-[#e11d48]/10"}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center ${trade.result === "win" ? "bg-[#22c55e]/15" : "bg-[#e11d48]/15"}`}>
                    {trade.result === "win" ? <TrendingUp size={10} className="text-[#22c55e] sm:hidden" /> : <TrendDown size={10} className="text-[#e11d48] sm:hidden" />}
                    {trade.result === "win" ? <TrendingUp size={12} className="text-[#22c55e] hidden sm:block" /> : <TrendDown size={12} className="text-[#e11d48] hidden sm:block" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className={`text-[10px] sm:text-xs font-bold ${trade.signal === "BUY" ? "text-[#22c55e]" : "text-[#e11d48]"}`}>{trade.signal}</span>
                      <span className="text-white text-[10px] sm:text-xs font-medium">{trade.asset}</span>
                      <span className={`text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded-full ${trade.result === "win" ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#e11d48]/10 text-[#e11d48]"}`}>
                        {trade.result?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[#666666] text-[8px] sm:text-[9px]">{trade.strategy} &bull; {trade.confidence}% conf</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#a0a0a0] text-[9px] sm:text-[10px] font-mono">E: {trade.entry.toFixed(2)}</div>
                  <div className="text-[#666666] text-[7px] sm:text-[8px]">{new Date(trade.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB 9: Account — Mobile Responsive
   ═══════════════════════════════════════════ */

function AccountTab({ subscriber, onLogout }: { subscriber: any; onLogout: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const daysLeft = subscriber ? Math.max(0, Math.ceil((new Date(subscriber.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.addToast("Code copied!", "success")
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 sm:mb-6 text-center">
        <h2 className="text-lg sm:text-xl font-bold flex items-center justify-center gap-2 mb-0.5 sm:mb-1"><Crown size={16} className="text-[#d4a843] sm:hidden" /><Crown size={18} className="text-[#d4a843] hidden sm:block" /> My VIP Account</h2>
        <p className="text-[11px] sm:text-xs text-[#666666]">Your subscription details.</p>
      </div>

      {/* Status */}
      <div className="bg-[#0d0d0d] border border-[#d4a843]/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-3 sm:mb-4 text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#d4a843]/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
          <Crown size={22} className="text-[#d4a843] sm:hidden" />
          <Crown size={28} className="text-[#d4a843] hidden sm:block" />
        </div>
        <h3 className="text-sm sm:text-lg font-bold text-white mb-0.5 sm:mb-1">VIP {subscriber?.plan || "Member"}</h3>
        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] bg-[#22c55e]/10 text-[#22c55e] px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold border border-[#22c55e]/20">
          <CheckCircle2 size={9} className="sm:hidden" /><CheckCircle2 size={10} className="hidden sm:block" /> ACTIVE
        </span>
        {subscriber && (
          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-[#141414] rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-[#666666] text-[8px] sm:text-[9px] mb-0.5 sm:mb-1">Started</div>
              <div className="text-white text-[10px] sm:text-xs font-bold">{new Date(subscriber.startDate).toLocaleDateString()}</div>
            </div>
            <div className="bg-[#141414] rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-[#666666] text-[8px] sm:text-[9px] mb-0.5 sm:mb-1">Expires</div>
              <div className="text-white text-[10px] sm:text-xs font-bold">{new Date(subscriber.endDate).toLocaleDateString()}</div>
            </div>
            <div className="bg-[#141414] rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="text-[#666666] text-[8px] sm:text-[9px] mb-0.5 sm:mb-1">Days Left</div>
              <div className={`text-[10px] sm:text-xs font-bold ${daysLeft < 7 ? "text-[#e11d48]" : "text-[#22c55e]"}`}>{daysLeft} days</div>
            </div>
          </div>
        )}
      </div>

      {/* TradingView Email */}
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-3 sm:mb-4">
        <h4 className="text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
          <TrendingUp size={11} className="text-[#d4a843]" /> TradingView Account
        </h4>
        <TradingViewEmailForm />
      </div>

      {/* Details */}
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-3 sm:mb-4">
        <h4 className="text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3">Account Details</h4>
        <div className="space-y-1.5 sm:space-y-2">
          {[
            { label: "Email", value: subscriber?.email || "N/A", icon: Mail },
            { label: "Access Code", value: subscriber?.code || "N/A", icon: Key, copy: true },
            { label: "Plan", value: subscriber?.plan || "VIP", icon: Crown },
            { label: "Order ID", value: subscriber?.orderId || "N/A", icon: Briefcase },
            { label: "Subscriber ID", value: subscriber?.id || "N/A", icon: User },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between bg-[#141414] rounded-lg sm:rounded-xl p-2 sm:p-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <item.icon size={10} className="text-[#d4a843] sm:hidden" />
                <item.icon size={11} className="text-[#d4a843] hidden sm:block" />
                <span className="text-[#a0a0a0] text-[10px] sm:text-xs">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-white text-[10px] sm:text-xs font-mono truncate max-w-[120px] sm:max-w-none">{item.value}</span>
                {item.copy && (
                  <button onClick={() => copyCode(item.value)} className="text-[#666666] hover:text-[#d4a843] transition-colors flex-shrink-0">
                    <Copy size={10} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-3 sm:mb-4">
        <h4 className="text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3">Quick Stats</h4>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { label: "Trades", value: getSavedTrades().length.toString() },
            { label: "Win Rate", value: getSavedTrades().length > 0 ? ((getSavedTrades().filter(t => t.result === "win").length / getSavedTrades().length) * 100).toFixed(1) + "%" : "N/A", color: "text-[#22c55e]" },
            { label: "Days Active", value: subscriber ? Math.ceil((Date.now() - new Date(subscriber.startDate).getTime()) / (1000 * 60 * 60 * 24)).toString() : "0" },
            { label: "Status", value: "VIP ACTIVE", color: "text-[#d4a843]" },
          ].map(item => (
            <div key={item.label} className="bg-[#141414] rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
              <div className="text-[#666666] text-[8px] sm:text-[9px] mb-0.5 sm:mb-1">{item.label}</div>
              <div className={`text-xs sm:text-sm font-bold ${item.color || "text-white"}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button onClick={() => navigate("/")}
          className="bg-[#141414] border border-[#1f1f1f] text-white text-[10px] sm:text-xs font-medium py-2.5 sm:py-3 rounded-xl hover:border-[#d4a843]/30 transition-all flex items-center justify-center gap-1">
          <Globe size={10} className="sm:hidden" /><Globe size={12} className="hidden sm:block" /> Website
        </button>
        <button onClick={onLogout}
          className="bg-[#e11d48]/10 border border-[#e11d48]/20 text-[#e11d48] text-[10px] sm:text-xs font-medium py-2.5 sm:py-3 rounded-xl hover:bg-[#e11d48]/20 transition-all flex items-center justify-center gap-1">
          <LogOut size={10} className="sm:hidden" /><LogOut size={12} className="hidden sm:block" /> Logout
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TradingView Email Form
   ═══════════════════════════════════════════ */

// Notify admin about new TradingView link request
async function notifyAdminTVRequest(tvEmail: string) {
  // Save to admin notifications
  const notifications = JSON.parse(localStorage.getItem("tradevisor_tv_notifications") || "[]")
  notifications.push({
    type: "tradingview_link",
    tvEmail,
    userEmail: localStorage.getItem("tradevisor_current_user_email") || "unknown",
    userCode: localStorage.getItem("tradevisor_current_user_code") || "unknown",
    date: new Date().toISOString(),
    status: "pending",
  })
  localStorage.setItem("tradevisor_tv_notifications", JSON.stringify(notifications))
}

function TradingViewEmailForm() {
  const [tvEmail, setTvEmail] = useState(() => localStorage.getItem("tradevisor_tradingview_email") || "")
  const [saved, setSaved] = useState(false)
  const toast = useToast()

  const handleSave = async () => {
    if (!tvEmail || !tvEmail.includes("@")) {
      toast.addToast("Enter a valid TradingView email", "warning")
      return
    }

    // Save locally
    localStorage.setItem("tradevisor_tradingview_email", tvEmail)

    // Send notification to admin via email
    await notifyAdminTVRequest(tvEmail)

    setSaved(true)
    toast.addToast("Request sent! Admin will invite you soon on TradingView.", "success")
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-3">
      {/* How it works */}
      <div className="bg-[#d4a843]/5 border border-[#d4a843]/10 rounded-lg p-2.5">
        <p className="text-[9px] sm:text-[10px] text-[#a0a0a0] leading-relaxed">
          <span className="text-[#d4a843] font-bold">How it works:</span> Enter your TradingView email. Our admin will send you a private invite within 24 hours to access premium indicators.
        </p>
      </div>

      {/* Status */}
      {localStorage.getItem("tradevisor_tradingview_email") && (
        <div className="bg-[#22c55e]/5 border border-[#22c55e]/10 rounded-lg p-2 flex items-center gap-2">
          <CheckCircle size={12} className="text-[#22c55e] flex-shrink-0" />
          <div>
            <p className="text-[9px] text-[#22c55e] font-bold">Request Submitted</p>
            <p className="text-[8px] text-[#a0a0a0]">{localStorage.getItem("tradevisor_tradingview_email")}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="email"
            value={tvEmail}
            onChange={e => { setTvEmail(e.target.value); setSaved(false) }}
            placeholder="your TradingView email..."
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:border-[#d4a843] focus:outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saved}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 flex-shrink-0 ${
            saved
              ? "bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]"
              : "bg-[#d4a843] text-[#050505] hover:bg-[#e8c76a]"
          }`}
        >
          {saved ? <><CheckCircle size={14} /> Sent</> : <><Send size={14} /> Submit</>}
        </button>
      </div>

      <p className="text-[8px] text-[#444444] text-center">
        Admin reviews requests manually. TradingView invite sent within 24h.
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB 10: Gold Chart AI (VIP2)
   ═══════════════════════════════════════════ */

function VIP2GoldChartAITab() {
  return (
    <div className="px-1 sm:px-0">
      <VIP2GoldChartAI />
    </div>
  )
}
