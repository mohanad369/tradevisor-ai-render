import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, TrendingUp, TrendingDown, Shield, Target, Zap,
  BarChart3, Activity, GitFork, ClipboardList, Bot,
  ArrowUpRight, ArrowDownRight, Layers, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
} from "lucide-react"
import type { AnalysisResult } from "@/lib/analyzer"
import { useLanguage } from "@/lib/language"

/* ─── helpers ─── */
function tr(isArabic: boolean, en: string, ar: string) {
  return isArabic ? ar : en
}

function xlate(v: string, isArabic: boolean) {
  if (!isArabic || !v) return v
  return v
    .replace(/\bBUY\b/g, "شراء").replace(/\bSELL\b/g, "بيع")
    .replace(/\bBullish\b/gi, "صاعد").replace(/\bBearish\b/gi, "هابط")
    .replace(/\bNeutral\b/gi, "محايد").replace(/\bUptrend\b/gi, "اتجاه صاعد")
    .replace(/\bDowntrend\b/gi, "اتجاه هابط").replace(/\bSupport\b/gi, "دعم")
    .replace(/\bResistance\b/gi, "مقاومة").replace(/\bEntry\b/gi, "الدخول")
    .replace(/\bStop Loss\b/gi, "وقف الخسارة").replace(/\bTarget\b/gi, "الهدف")
    .replace(/\bRisk\b/gi, "المخاطر").replace(/\bMomentum\b/gi, "الزخم")
    .replace(/\bTrend\b/gi, "الاتجاه").replace(/\bVolume\b/gi, "الحجم")
    .replace(/\bWait\b/gi, "انتظار").replace(/\bConfirmation\b/gi, "التأكيد")
}

function orderLabel(ot: string, isArabic: boolean) {
  if (ot === "BUY_LIMIT")   return isArabic ? "أمر شراء معلّق"  : "Buy Limit"
  if (ot === "SELL_LIMIT")  return isArabic ? "أمر بيع معلّق"   : "Sell Limit"
  if (ot === "BUY_MARKET")  return isArabic ? "شراء سوقي"        : "Buy Market"
  if (ot === "SELL_MARKET") return isArabic ? "بيع سوقي"          : "Sell Market"
  return ot
}

/* ─── sub-components ─── */
function Pill({
  label, value, valueColor = "#e8e6df", bg = "#161920", border = "#2a2d35", small = false,
}: { label: string; value: string | number; valueColor?: string; bg?: string; border?: string; small?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl p-3" style={{ background: bg, border: `0.5px solid ${border}` }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "#666" }}>{label}</span>
      <span className={`font-bold ${small ? "text-xs" : "text-sm"} leading-snug`} style={{ color: valueColor }}>{value}</span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, color = "#d4a843" }: { icon: React.FC<any>; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} style={{ color }} />
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#999" }}>{title}</span>
    </div>
  )
}

function Accordion({ title, icon: Icon, color = "#d4a843", children, defaultOpen = false }: {
  title: string; icon: React.FC<any>; color?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-[#1e2028] overflow-hidden mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        style={{ background: "#13151c" }}
      >
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color }} />
          <span className="text-xs font-medium" style={{ color: "#ccc" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={13} color="#555" /> : <ChevronDown size={13} color="#555" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-3 pb-3 pt-2" style={{ background: "#0e1014" }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ORDER CARD — Buy/Sell Limit & Market with all details
   ═══════════════════════════════════════════════════════════ */
function OrderCard({
  result, execPlan, assetDecimals, isArabic,
}: {
  result: AnalysisResult
  execPlan: any
  assetDecimals: number
  isArabic: boolean
}) {
  const isBuy = result.signal === "BUY"
  const sideColor = isBuy ? "#22c55e" : "#ef4444"
  const fmt = (n: number) => n.toFixed(assetDecimals)

  const orderType = execPlan?.orderType
  const isLimit = orderType === "BUY_LIMIT" || orderType === "SELL_LIMIT"
  const isWait  = orderType === "WAIT" || !execPlan?.ok

  const entry = execPlan?.plan?.entry ?? result.entry
  const sl    = execPlan?.plan?.stopLoss ?? result.stopLoss
  const targets: number[] = execPlan?.plan?.targets?.length
    ? execPlan.plan.targets
    : [result.takeProfit1, result.takeProfit2, result.takeProfit3]

  return (
    <div
      className="rounded-2xl border p-4 mb-4"
      style={{ borderColor: `${sideColor}35`, background: `${sideColor}08` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${sideColor}20` }}
          >
            {isBuy
              ? <ArrowUpRight size={20} style={{ color: sideColor }} />
              : <ArrowDownRight size={20} style={{ color: sideColor }} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color: sideColor }}>
                {isWait
                  ? tr(isArabic, "Wait — Don't Enter", "انتظر — لا تدخل")
                  : orderLabel(orderType, isArabic)}
              </span>
              {!isWait && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: sideColor }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: sideColor }} />
                </span>
              )}
            </div>
            <span className="text-[11px]" style={{ color: "#666" }}>
              {result.strategyUsed} • {result.confidence}% {tr(isArabic, "confidence", "ثقة")}
            </span>
          </div>
        </div>
        {/* Setup quality badge */}
        {result.agents?.finalPlan?.setupQuality && (
          <div className="text-right">
            <div
              className="text-base font-black"
              style={{
                color: result.agents.finalPlan.setupQuality.verdict === "clean"
                  ? "#22c55e" : result.agents.finalPlan.setupQuality.verdict === "danger"
                  ? "#ef4444" : "#d4a843",
              }}
            >
              {result.agents.finalPlan.setupQuality.score}/100
            </div>
            <div className="text-[10px]" style={{ color: "#666" }}>
              {tr(isArabic, "setup score", "درجة الإعداد")}
            </div>
          </div>
        )}
      </div>

      {isWait ? (
        <div className="rounded-xl border border-[#d4a843]/25 bg-[#d4a843]/08 p-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-[#d4a843] shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: "#aaa" }}>
            {execPlan?.message || tr(
              isArabic,
              "Agents don't agree strongly enough — wait for cleaner alignment.",
              "الوكلاء غير متفقين بشكل كافٍ — انتظر توافقاً أوضح قبل الدخول."
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Limit price callout — only for limit orders */}
          {isLimit && (
            <div
              className="rounded-xl border p-3 mb-3 flex items-center justify-between"
              style={{ borderColor: `${sideColor}40`, background: `${sideColor}12` }}
            >
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#888" }}>
                  {tr(isArabic, "Place limit order at", "ضع أمر معلّق عند")}
                </div>
                <div className="text-xl font-black" style={{ color: sideColor }}>
                  {fmt(entry)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#888" }}>
                  {tr(isArabic, "type", "النوع")}
                </div>
                <div className="text-sm font-bold" style={{ color: sideColor }}>
                  {orderLabel(orderType, isArabic)}
                </div>
              </div>
            </div>
          )}

          {/* Levels grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Pill
              label={tr(isArabic, "Entry", "الدخول")}
              value={fmt(entry)}
              valueColor="#d4a843"
              bg="#0f1014"
              border="#2a2519"
            />
            <Pill
              label={tr(isArabic, "Stop Loss", "وقف الخسارة")}
              value={`${fmt(sl)}  (-${result.riskPips})`}
              valueColor="#ef4444"
              bg="#0f1014"
              border="#2a1a1a"
            />
            <div className="rounded-xl p-3" style={{ background: "#0f1014", border: "0.5px solid #1a2a1a" }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#666" }}>
                {tr(isArabic, "Targets", "الأهداف")}
              </div>
              {targets.map((tp, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[10px]" style={{ color: "#555" }}>TP{i + 1}</span>
                  <span className="text-xs font-bold" style={{ color: "#22c55e" }}>{fmt(tp)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* R:R row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Pill label="TP1 R:R" value={result.riskReward1} valueColor="#22c55e" bg="#0f1014" border="#1a2a1a" small />
            <Pill label="TP2 R:R" value={result.riskReward2} valueColor="#22c55e" bg="#0f1014" border="#1a2a1a" small />
            <Pill label="TP3 R:R" value={result.riskReward3} valueColor="#22c55e" bg="#0f1014" border="#1a2a1a" small />
          </div>

          {/* Instructions */}
          {execPlan?.plan?.instructions && (
            <div className="rounded-xl border border-[#1e2028] bg-[#0e1014] p-3 mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target size={11} color="#d4a843" />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "#666" }}>
                  {tr(isArabic, "Instructions", "التعليمات")}
                </span>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "#bbb" }}>
                {execPlan.plan.instructions}
              </p>
            </div>
          )}

          {/* Cancel condition */}
          {execPlan?.plan?.cancelCondition && (
            <div className="rounded-xl border border-[#1e2028] bg-[#0e1014] p-3 flex items-start gap-2">
              <X size={12} color="#f59e0b" className="shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#666" }}>
                  {tr(isArabic, "Cancel order if", "ألغِ الأمر إذا")}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#bbb" }}>
                  {execPlan.plan.cancelCondition}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Confidence bar ─── */
function ConfBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: "#1a1d24" }}>
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN OVERLAY
   ═══════════════════════════════════════════════════════════ */
interface Props {
  result: AnalysisResult
  assetDecimals: number
  assetName?: string
  execPlan?: any         // ExecutionPlanPanel data (pass from parent)
  fractalReading?: any   // FractalPatternPanel reading
  debateResult?: { verdict: string; confidence: number; recommendation?: string } | null
  onClose: () => void
  onReanalyze?: () => void
}

export default function AnalysisFullscreenOverlay({
  result, assetDecimals, assetName = "XAUUSD",
  execPlan, fractalReading, debateResult,
  onClose, onReanalyze,
}: Props) {
  const { language } = useLanguage()
  const isArabic = language === "ar"
  const t = (en: string, ar: string) => tr(isArabic, en, ar)
  const isBuy = result.signal === "BUY"
  const sideColor = isBuy ? "#22c55e" : "#ef4444"
  const fmt = (n: number) => n.toFixed(assetDecimals)

  /* close on ESC */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[9999] flex items-stretch justify-center"
        style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-[1280px] mx-2 my-3 flex flex-col rounded-2xl overflow-hidden"
          style={{ background: "#0a0b0f", border: "0.5px solid #1e2028" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── TOP BAR ── */}
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ background: "#0d0e14", borderBottom: "0.5px solid #1e2028" }}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold" style={{ color: "#e8e6df" }}>TradeVisor</span>
              <div className="h-4 w-px" style={{ background: "#2a2d35" }} />
              <span className="text-sm font-medium" style={{ color: "#aaa" }}>{assetName}</span>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: `${sideColor}18`, color: sideColor, border: `0.5px solid ${sideColor}40` }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: sideColor }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: sideColor }} />
                </span>
                {isBuy ? t("BUY", "شراء") : t("SELL", "بيع")} • {result.confidence}%
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onReanalyze && (
                <button
                  onClick={onReanalyze}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: "#1a1d24", color: "#aaa", border: "0.5px solid #2a2d35" }}
                >
                  <RefreshCw size={12} />
                  {t("Re-analyze", "إعادة التحليل")}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-80"
                style={{ background: "#1a1d24", border: "0.5px solid #2a2d35" }}
                aria-label="Close"
              >
                <X size={15} color="#888" />
              </button>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ══ LEFT — Chart zone ══ */}
            <div
              className="flex flex-col"
              style={{ width: "55%", borderRight: "0.5px solid #1e2028" }}
            >
              {/* Chart placeholder — in production replace with TradingView widget */}
              <div className="flex-1 relative bg-[#07080c] flex items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(212,168,67,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.05) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                  }}
                />
                <div className="relative text-center pointer-events-none">
                  <BarChart3 size={32} color="#2a2d35" className="mx-auto mb-2" />
                  <p className="text-xs" style={{ color: "#333" }}>
                    {t("TradingView chart appears here", "يظهر الشارت هنا")}
                  </p>
                </div>

                {/* Overlay lines — Entry / SL / TPs */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* TP3 line ~20% */}
                  <div className="absolute left-0 right-0" style={{ top: "18%" }}>
                    <div style={{ borderTop: "1px solid rgba(34,197,94,0.5)" }} />
                    <span className="absolute left-2 -top-4 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "0.5px solid rgba(34,197,94,0.35)" }}>
                      TP3 {fmt(result.takeProfit3)} {result.riskReward3}
                    </span>
                  </div>
                  {/* TP2 line ~30% */}
                  <div className="absolute left-0 right-0" style={{ top: "30%" }}>
                    <div style={{ borderTop: "1px solid rgba(34,197,94,0.4)" }} />
                    <span className="absolute left-2 -top-4 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "0.5px solid rgba(34,197,94,0.3)" }}>
                      TP2 {fmt(result.takeProfit2)} {result.riskReward2}
                    </span>
                  </div>
                  {/* TP1 line ~42% */}
                  <div className="absolute left-0 right-0" style={{ top: "42%" }}>
                    <div style={{ borderTop: "1px solid rgba(34,197,94,0.35)" }} />
                    <span className="absolute left-2 -top-4 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(34,197,94,0.10)", color: "#22c55e", border: "0.5px solid rgba(34,197,94,0.25)" }}>
                      TP1 {fmt(result.takeProfit1)} {result.riskReward1}
                    </span>
                  </div>
                  {/* Entry line ~55% */}
                  <div className="absolute left-0 right-0" style={{ top: "55%" }}>
                    <div style={{ borderTop: "2px dashed rgba(212,168,67,0.7)" }} />
                    <span className="absolute right-2 -top-4 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "#d4a843", color: "#050505" }}>
                      {t("ENTRY", "دخول")} {fmt(result.entry)}
                    </span>
                  </div>
                  {/* SL line ~72% */}
                  <div className="absolute left-0 right-0" style={{ top: "72%" }}>
                    <div style={{ borderTop: "2px solid rgba(239,68,68,0.6)" }} />
                    <span className="absolute left-2 -top-4 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(239,68,68,0.18)", color: "#ef4444", border: "0.5px solid rgba(239,68,68,0.4)" }}>
                      SL {fmt(result.stopLoss)}  -{result.riskPips}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart footer — quick stats */}
              <div
                className="flex items-center gap-6 px-5 py-2.5 shrink-0"
                style={{ background: "#0d0e14", borderTop: "0.5px solid #1e2028" }}
              >
                {[
                  { label: t("Trend", "الاتجاه"), value: xlate(result.trend, isArabic) },
                  { label: t("Structure", "الهيكل"), value: xlate(result.marketStructure, isArabic) },
                  { label: t("Confluence", "التوافق"), value: `${result.confluenceScore}/100`, color: "#22c55e" },
                  { label: t("Max Risk", "أقصى مخاطرة"), value: `${result.maxRiskPercent}%`, color: "#d4a843" },
                  { label: t("Hold", "المدة"), value: xlate(result.timeToHold, isArabic) },
                ].map((item) => (
                  <div key={item.label} className="text-xs">
                    <span style={{ color: "#555" }}>{item.label}: </span>
                    <span style={{ color: item.color || "#bbb" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ══ RIGHT — Sidebar ══ */}
            <div
              className="flex flex-col overflow-y-auto"
              style={{ width: "45%", scrollbarWidth: "thin", scrollbarColor: "#2a2d35 transparent" }}
            >
              <div className="flex-1 p-4 space-y-1">

                {/* 1. ORDER CARD */}
                <OrderCard
                  result={result}
                  execPlan={execPlan}
                  assetDecimals={assetDecimals}
                  isArabic={isArabic}
                />

                {/* 2. RISK MANAGEMENT */}
                <Accordion
                  title={t("Risk Management", "إدارة المخاطر")}
                  icon={Shield}
                  color="#d4a843"
                  defaultOpen
                >
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Pill label={t("Max Risk", "أقصى مخاطرة")} value={`${result.maxRiskPercent}%`} valueColor="#d4a843" bg="#0f1014" border="#2a2519" />
                    <Pill label={t("Risk Distance", "مسافة الخطر")} value={`${result.riskPips}`} bg="#0f1014" border="#2a2d35" />
                    <Pill label={t("Best R:R", "أفضل نسبة")} value={result.riskReward3} valueColor="#22c55e" bg="#0f1014" border="#1a2a1a" />
                  </div>
                  {/* Lot sizes */}
                  <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#555" }}>
                    {t("Lot size by account", "حجم اللوت حسب الحساب")}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { bal: "$1K", lot: result.lotSize1000, risk: "$15" },
                      { bal: "$5K", lot: result.lotSize5000, risk: "$75" },
                      { bal: "$10K", lot: result.lotSize10000, risk: "$150" },
                    ].map((item) => (
                      <div key={item.bal} className="rounded-lg p-2 text-center" style={{ background: "#0f1014", border: "0.5px solid #1e2028" }}>
                        <div className="text-[10px] mb-1" style={{ color: "#555" }}>{item.bal}</div>
                        <div className="text-sm font-bold" style={{ color: "#d4a843" }}>{item.lot}</div>
                        <div className="text-[9px]" style={{ color: "#555" }}>{t("risk", "مخاطرة")} {item.risk}</div>
                      </div>
                    ))}
                  </div>
                </Accordion>

                {/* 3. FRACTAL PATTERN */}
                {fractalReading && (
                  <Accordion
                    title={t("Fractal Pattern Agent", "وكيل الفراكتال")}
                    icon={GitFork}
                    color="#a78bfa"
                    defaultOpen
                  >
                    {fractalReading.combined && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full capitalize"
                            style={{
                              background: fractalReading.combined.lean === "bullish"
                                ? "rgba(34,197,94,0.12)" : fractalReading.combined.lean === "bearish"
                                ? "rgba(239,68,68,0.12)" : "rgba(212,168,67,0.12)",
                              color: fractalReading.combined.lean === "bullish"
                                ? "#22c55e" : fractalReading.combined.lean === "bearish"
                                ? "#ef4444" : "#d4a843",
                            }}
                          >
                            {fractalReading.combined.lean}
                          </span>
                          <span className="text-xs" style={{ color: "#666" }}>
                            {fractalReading.combined.confidence}% {t("confidence", "ثقة")}
                          </span>
                        </div>
                        <ConfBar pct={fractalReading.combined.bullishScore} color="#22c55e" />
                        <div className="flex justify-between text-[10px] mt-1" style={{ color: "#555" }}>
                          <span>Bull {fractalReading.combined.bullishScore}%</span>
                          <span>Bear {fractalReading.combined.bearishScore}%</span>
                        </div>
                      </>
                    )}
                    {!fractalReading.ok && (
                      <p className="text-xs" style={{ color: "#666" }}>
                        {fractalReading.reason || t("Fractal data not available", "بيانات الفراكتال غير متاحة")}
                      </p>
                    )}
                  </Accordion>
                )}

                {/* 4. AI ANALYSIS */}
                <Accordion
                  title={t("AI Analysis Details", "تفاصيل التحليل الذكي")}
                  icon={Bot}
                  color="#38bdf8"
                >
                  {/* Candle patterns */}
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#555" }}>
                      {t("Detected patterns", "النماذج المكتشفة")}
                    </div>
                    {result.candlePatterns.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 mb-1" style={{ background: "#13151c" }}>
                        <span style={{ color: p.signal === "bullish" ? "#22c55e" : "#ef4444" }}>
                          {p.signal === "bullish" ? "▲" : "▼"}
                        </span>
                        <span className="text-xs font-medium" style={{ color: "#ccc" }}>
                          {xlate(p.name, isArabic)}
                        </span>
                        <span className="ml-auto text-[10px]" style={{ color: "#555" }}>
                          {t("Reliability", "الموثوقية")}: {p.reliability}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* S/R levels */}
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#555" }}>
                      {t("Support / Resistance", "الدعم / المقاومة")}
                    </div>
                    {result.srLevels.map((level, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 mb-1" style={{ background: "#13151c" }}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: level.type === "support" ? "#22c55e"
                                : level.type === "resistance" ? "#ef4444" : "#d4a843",
                            }}
                          />
                          <span className="text-xs capitalize" style={{ color: "#888" }}>
                            {xlate(level.type, isArabic)}
                          </span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: "#e8e6df" }}>
                          {fmt(level.level)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Fibonacci */}
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#555" }}>
                      {t("Fibonacci levels", "مستويات فيبوناتشي")}
                    </div>
                    <div className="flex gap-1">
                      {result.fibonacci.map((fib) => (
                        <div key={fib.level} className="flex-1 rounded-lg px-1.5 py-2 text-center" style={{ background: "#13151c" }}>
                          <div className="text-[9px]" style={{ color: "#555" }}>{fib.level.toFixed(3)}</div>
                          <div className="text-[10px] font-bold" style={{ color: "#d4a843" }}>{fmt(fib.price)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Why this signal */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#555" }}>
                      {t("Why this signal?", "لماذا هذه الإشارة؟")}
                    </div>
                    <ul className="space-y-1.5">
                      {result.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span style={{ color: "#d4a843", flexShrink: 0, marginTop: 2 }}>•</span>
                          <span style={{ color: "#999", lineHeight: 1.6 }}>{xlate(r, isArabic)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Accordion>

                {/* 5. BULL VS BEAR DEBATE */}
                {debateResult && (
                  <Accordion
                    title={t("Bull vs Bear Debate", "مناظرة الصعود والهبوط")}
                    icon={Activity}
                    color="#f59e0b"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: debateResult.verdict === "bull_wins" ? "#22c55e"
                            : debateResult.verdict === "bear_wins" ? "#ef4444" : "#d4a843",
                        }}
                      >
                        {debateResult.verdict === "bull_wins"
                          ? t("Bull Wins", "الصعود يفوز")
                          : debateResult.verdict === "bear_wins"
                          ? t("Bear Wins", "الهبوط يفوز")
                          : t("Draw", "تعادل")}
                      </span>
                      <span className="text-xs" style={{ color: "#666" }}>
                        {debateResult.confidence}% {t("confidence", "ثقة")}
                      </span>
                    </div>
                    <ConfBar
                      pct={debateResult.confidence}
                      color={debateResult.verdict === "bull_wins" ? "#22c55e" : "#ef4444"}
                    />
                    {debateResult.recommendation && (
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: "#888" }}>
                        {xlate(debateResult.recommendation, isArabic)}
                      </p>
                    )}
                  </Accordion>
                )}

                {/* 6. AGENT PIPELINE */}
                {result.agents && (
                  <Accordion
                    title={t("Agent Pipeline", "مسار الوكلاء")}
                    icon={ClipboardList}
                    color="#60a5fa"
                  >
                    <div className="space-y-1.5">
                      {result.agents.finalPlan?.setupQuality && (
                        <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "#13151c" }}>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={12} color="#22c55e" />
                            <span className="text-xs" style={{ color: "#ccc" }}>
                              {t("Setup Quality", "جودة الإعداد")}
                            </span>
                          </div>
                          <span className="text-xs font-bold" style={{
                            color: result.agents.finalPlan.setupQuality.verdict === "clean"
                              ? "#22c55e" : "#d4a843",
                          }}>
                            {result.agents.finalPlan.setupQuality.score}/100
                          </span>
                        </div>
                      )}
                      {result.agents.finalPlan?.notes?.slice(0, 4).map((note, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "#13151c" }}>
                          <span style={{ color: "#d4a843", fontSize: 10, flexShrink: 0, marginTop: 2 }}>•</span>
                          <span className="text-xs leading-relaxed" style={{ color: "#888" }}>
                            {xlate(note, isArabic)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                )}
              </div>

              {/* Footer disclaimer */}
              <div
                className="px-4 py-2.5 shrink-0"
                style={{ borderTop: "0.5px solid #1e2028", background: "#0d0e14" }}
              >
                <p className="text-[10px] text-center" style={{ color: "#444" }}>
                  {t(
                    "AI-generated analysis — not financial advice. Trading carries real risk.",
                    "تحليل مولّد بالذكاء الاصطناعي — ليس نصيحة مالية. التداول ينطوي على مخاطر حقيقية."
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
