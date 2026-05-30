import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown, Activity, Zap, Globe,
  Radio, ArrowUpRight, ArrowDownRight,
  BarChart3, Eye, Compass, Lightbulb, Menu, Target,
  Home, ShieldCheck, Settings, WalletCards,
  Newspaper, CheckCircle2, Gauge
} from "lucide-react"
import { useLanguage } from "@/lib/language"
import { fetchMarketQuotes, type MarketQuote } from "@/lib/marketPrices"

/* ═══════════════════════════════════════════
   LIVING HERO - Pulsing, breathing, alive
   ═══════════════════════════════════════════ */

const SIGNALS = [
  { type: "BUY" as const, price: 3325.50, time: "2 min ago", pair: "XAU/USD", conf: 94 },
  { type: "SELL" as const, price: 67250.00, time: "5 min ago", pair: "BTC/USD", conf: 87 },
  { type: "BUY" as const, price: 1.0850, time: "8 min ago", pair: "EUR/USD", conf: 91 },
  { type: "SELL" as const, price: 145.20, time: "12 min ago", pair: "USD/JPY", conf: 82 },
  { type: "BUY" as const, price: 3900.00, time: "15 min ago", pair: "ETH/USD", conf: 89 },
]

const ASSETS = [
  { pair: "XAU/USD", price: 3325.50, change: 1.24, dir: "up" as const },
  { pair: "BTC/USD", price: 67250.00, change: -0.82, dir: "down" as const },
  { pair: "EUR/USD", price: 1.0850, change: 0.56, dir: "up" as const },
  { pair: "GBP/USD", price: 1.2650, change: 0.31, dir: "up" as const },
  { pair: "USD/JPY", price: 145.20, change: -0.15, dir: "down" as const },
  { pair: "ETH/USD", price: 3900.00, change: 0.78, dir: "up" as const },
]

const HERO_PRICE_REFRESH_MS = 5_000

type MarketPhase = "bullish" | "bearish" | "consolidation"

type MarketTheme = {
  phase: MarketPhase
  label: string
  headline: string
  note: string
  color: string
  soft: string
  border: string
  glow: string
}

function createMarketTheme(phase: MarketPhase, isArabic: boolean, isLive: boolean): MarketTheme {
  if (!isLive) {
    return {
      phase: "consolidation",
      label: isArabic ? "جاري الاتصال" : "Connecting",
      headline: isArabic ? "جاري مزامنة السوق" : "Synchronizing market",
      note: isArabic ? "بانتظار وصول أحدث بيانات الأسعار" : "Waiting for the latest market prices",
      color: "#a855f7",
      soft: "rgba(168, 85, 247, 0.16)",
      border: "rgba(168, 85, 247, 0.35)",
      glow: "rgba(168, 85, 247, 0.18)",
    }
  }

  if (phase === "bearish") {
    return {
      phase,
      label: isArabic ? "سوق هابط" : "Bearish market",
      headline: isArabic ? "مرحلة ضغط بيعي" : "Bearish pressure",
      note: isArabic ? "الذكاء يلتقط ضغط بيع واضح" : "AI detects clear selling pressure",
      color: "#ef4444",
      soft: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.34)",
      glow: "rgba(239, 68, 68, 0.17)",
    }
  }

  if (phase === "consolidation") {
    return {
      phase,
      label: isArabic ? "سوق جانبي" : "Sideways market",
      headline: isArabic ? "مرحلة تجميع" : "Accumulation phase",
      note: isArabic ? "السوق يجمع السيولة قبل الحركة التالية" : "Liquidity is building before the next move",
      color: "#a855f7",
      soft: "rgba(168, 85, 247, 0.16)",
      border: "rgba(168, 85, 247, 0.35)",
      glow: "rgba(168, 85, 247, 0.18)",
    }
  }

  return {
    phase,
    label: isArabic ? "سوق صاعد" : "Bullish market",
    headline: isArabic ? "مرحلة زخم شرائي" : "Bullish momentum",
    note: isArabic ? "الذكاء يلتقط ضغط شراء واضح" : "AI detects clean buying pressure",
    color: "#22c55e",
    soft: "rgba(34, 197, 94, 0.15)",
    border: "rgba(34, 197, 94, 0.34)",
    glow: "rgba(34, 197, 94, 0.17)",
  }
}

function getMarketTheme(
  assets: Array<{ change: number; dir: string }>,
  isArabic: boolean,
  isLive: boolean,
): MarketTheme {
  if (!isLive || assets.length === 0) return createMarketTheme("consolidation", isArabic, false)

  const changes = assets.map((asset) => Number.isFinite(asset.change) ? asset.change : 0)
  const positive = changes.filter((change) => change > 0.08).length
  const negative = changes.filter((change) => change < -0.08).length
  const average = changes.reduce((total, change) => total + change, 0) / changes.length
  const leadChange = changes[0] ?? 0
  const score = (average * 0.65) + (leadChange * 0.35)

  if (positive >= 4 && score >= 0.08) return createMarketTheme("bullish", isArabic, true)
  if (negative >= 4 && score <= -0.08) return createMarketTheme("bearish", isArabic, true)
  return createMarketTheme("consolidation", isArabic, true)
}

function applyQuotes<T extends { pair: string; price: number }>(items: T[], quotes: Record<string, MarketQuote>) {
  return items.map((item) => {
    const quote = quotes[item.pair]
    if (!quote) return item
    return {
      ...item,
      price: quote.price,
      ...("change" in item ? { change: quote.change, dir: quote.change >= 0 ? "up" as const : "down" as const } : {}),
    }
  })
}

function useMarketData() {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({})
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const nextQuotes = await fetchMarketQuotes()
        if (!mounted || Object.keys(nextQuotes).length === 0) return
        setQuotes(nextQuotes)
        setUpdatedAt(Date.now())
      } catch (error) {
        console.warn("[Market] Live price update failed:", error)
      }
    }

    load()
    const interval = window.setInterval(load, HERO_PRICE_REFRESH_MS)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  return {
    assets: applyQuotes(ASSETS, quotes),
    signals: applyQuotes(SIGNALS, quotes),
    goldPrice: quotes["XAU/USD"]?.price ?? null,
    updatedAt,
  }
}

function formatGoldPrice(price: number | null) {
  if (price === null) return "Connecting"
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function Hero() {
  const marketData = useMarketData()

  return (
    <section className="relative bg-[#030305] text-white overflow-hidden pt-20 pb-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <LivingParticles />
      </div>
      <div className="relative z-10">
        <ProfitHeader />
        <LiveMarketCommandWindow marketData={marketData} />
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════
   LIVING BACKGROUND
   ═══════════════════════════════════════════ */

function LivingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = 900
    }
    resize()
    window.addEventListener("resize", resize)

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      s: Math.random() * 2 + 0.5,
      a: Math.random() * 0.4 + 0.1,
      c: Math.random() > 0.6 ? "212,168,67" : Math.random() > 0.5 ? "34,197,94" : "16,185,129",
    }))

    let f = 0
    const animate = () => {
      f++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Grid
      ctx.strokeStyle = "rgba(212,168,67,0.012)"
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0

        const pulse = Math.sin(f * 0.018 + p.x * 0.008) * 0.25 + 0.75
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.s * pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.c},${p.a * pulse})`
        ctx.fill()
      })

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 140) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(212,168,67,${0.035 * (1 - d / 140)})`
            ctx.lineWidth = 0.3
            ctx.stroke()
          }
        }
      }
      requestAnimationFrame(animate)
    }
    animate()
    return () => window.removeEventListener("resize", resize)
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ height: 900 }} />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.06] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, #d4a843 0%, transparent 70%)" }} />
    </>
  )
}

/* ═══════════════════════════════════════════
   PROFIT HEADER
   ═══════════════════════════════════════════ */

function ProfitHeader() {
  const { t } = useLanguage()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      {/* Profits */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] text-[#666666] uppercase tracking-wider mb-1">{t("hero.totalProfits")}</p>
          <motion.div className="text-3xl sm:text-4xl font-black text-[#d4a843]"
            animate={{ textShadow: ["0 0 10px rgba(212,168,67,0.3)", "0 0 25px rgba(212,168,67,0.5)", "0 0 10px rgba(212,168,67,0.3)"] }}
            transition={{ duration: 2, repeat: Infinity }}>
            $2.4M+
          </motion.div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={10} className="text-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e]">{t("hero.todayProfit")}</span>
          </div>
        </div>

        <motion.div className="bg-[#0a0a0a]/80 backdrop-blur border border-[#22c55e]/20 rounded-2xl px-5 py-3 text-center"
          animate={{ borderColor: ["rgba(34,197,94,0.2)", "rgba(34,197,94,0.5)", "rgba(34,197,94,0.2)"] }}
          transition={{ duration: 3, repeat: Infinity }}>
          <p className="text-[9px] text-[#666666] uppercase tracking-wider">{t("hero.winRate")}</p>
          <motion.p className="text-2xl font-black text-[#22c55e]"
            animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            78%
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   LIVE CANDLESTICK CHART (Canvas)
   ═══════════════════════════════════════════ */

function LiveMarketCommandWindow({ marketData }: { marketData: ReturnType<typeof useMarketData> }) {
  const { language } = useLanguage()
  const isArabic = language === "ar"
  const isLive = Boolean(marketData.updatedAt)
  const assets = marketData.assets
  const signals = marketData.signals
  const [selectedPair, setSelectedPair] = useState(assets[0]?.pair ?? "")
  const leadAsset = assets.find((asset) => asset.pair === selectedPair) ?? assets[0]
  const [activePanel, setActivePanel] = useState("overview")
  const selectedPhase: MarketPhase = leadAsset.change > 0.08
    ? "bullish"
    : leadAsset.change < -0.08
      ? "bearish"
      : "consolidation"
  const marketStatus = createMarketTheme(selectedPhase, isArabic, isLive)

  const selectAsset = (pair: string) => {
    setSelectedPair(pair)
    setActivePanel("markets")
  }

  const activatePanel = (id: string) => {
    setActivePanel(id)
    window.setTimeout(() => {
      document.getElementById(`market-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 0)
  }

  const navItems = [
    { id: "overview", label: isArabic ? "الرئيسية" : "Overview", icon: Home, action: () => activatePanel("overview") },
    { id: "agents", label: isArabic ? "وكلاء AI" : "AI agents", icon: Zap, action: () => activatePanel("agents") },
    { id: "markets", label: isArabic ? "الأسواق" : "Markets", icon: BarChart3, action: () => activatePanel("markets") },
    { id: "signals", label: isArabic ? "الإشارات" : "Signals", icon: Radio, action: () => activatePanel("signals") },
    { id: "portfolio", label: isArabic ? "الحساب" : "Portfolio", icon: WalletCards, action: () => { window.location.hash = "/account" } },
    { id: "risk", label: isArabic ? "المخاطر" : "Risk gate", icon: ShieldCheck, action: () => activatePanel("risk") },
    { id: "vip", label: "VIP", icon: Settings, action: () => { window.location.hash = "/vip" } },
  ]

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.55 }}
        className="relative overflow-hidden rounded-[22px] border bg-[#020604]/95 transition-colors duration-700"
        style={{ borderColor: marketStatus.border, boxShadow: `0 0 80px ${marketStatus.glow}` }}
      >
        <motion.div
          key={marketStatus.phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.68, 1, 0.68] }}
          transition={{ duration: 4.5, repeat: Infinity }}
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle at 68% 10%, ${marketStatus.soft}, transparent 29%), radial-gradient(circle at 8% 75%, rgba(212,168,67,0.11), transparent 28%)` }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(34,197,94,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(212,168,67,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#173326] px-4 py-3">
          <div className="flex items-center gap-2">
            <motion.span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: marketStatus.color, boxShadow: `0 0 18px ${marketStatus.color}` }}
              animate={{ scale: [0.72, 1.35, 0.72], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.25, repeat: Infinity }}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4a843]">
              {isArabic ? "نافذة قيادة السوق الحية" : "Live market command window"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#aab7ae]">
            <span>{isArabic ? "حالة السوق" : "Market status"}: <b style={{ color: marketStatus.color }}>{marketStatus.label}</b></span>
            <span>{isArabic ? "السعر الرئيسي" : "Primary"}: <b className="font-mono text-[#d4a843]">{isLive ? formatAssetPrice(leadAsset.price) : "Connecting"}</b></span>
            <span className="flex items-center gap-1" style={{ color: marketStatus.color }}><Globe size={12} /> API {isLive ? "LIVE" : "CONNECTING"}</span>
          </div>
        </div>

        <div className="relative z-10 grid lg:grid-cols-[118px_minmax(0,1fr)_272px]">
          <aside className="hidden border-r border-[#173326] bg-black/25 p-2 lg:flex lg:flex-col lg:gap-2">
            {navItems.map(({ id, label, icon: Icon, action }) => (
              <button
                key={id}
                type="button"
                onClick={action}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl border px-2 text-[9px] font-black uppercase transition-all ${
                  activePanel === id
                    ? "bg-black/30"
                    : "border-transparent text-[#87938c] hover:border-[#d4a843]/35 hover:bg-[#d4a843]/5 hover:text-[#d4a843]"
                }`}
                style={activePanel === id ? { borderColor: marketStatus.border, color: marketStatus.color, boxShadow: `0 0 24px ${marketStatus.glow}` } : undefined}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </aside>

          <main className="min-w-0 p-3 sm:p-4">
            <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div id="market-overview" className="relative overflow-hidden rounded-2xl border bg-black/35 p-4 transition-colors duration-700" style={{ borderColor: marketStatus.border }}>
                <MarketPhaseMascot theme={marketStatus} isArabic={isArabic} />
                <div className="relative z-10 pr-16 sm:pr-28">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8e9c94]">{isArabic ? "نظرة عامة على السوق" : "Market outlook"}</p>
                  <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                    <div>
                    <motion.h2
                      animate={{ opacity: [0.72, 1, 0.72] }}
                      transition={{ duration: 2.4, repeat: Infinity }}
                      className="text-2xl font-black uppercase sm:text-3xl"
                      style={{ color: marketStatus.color }}
                    >
                      {marketStatus.headline}
                    </motion.h2>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[#a6b2ab]">{marketStatus.note}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase text-[#7b8981]">{leadAsset.pair}</p>
                      <p className="font-mono text-xl font-black text-[#d4a843] sm:text-2xl">{isLive ? formatAssetPrice(leadAsset.price) : "Connecting"}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                <ConsoleMetric label={isArabic ? "الوضع" : "Mode"} value={marketStatus.label} color={marketStatus.color} />
                <ConsoleMetric label={isArabic ? "الاتصال" : "Feed"} value={isLive ? "Live" : "Connecting"} color={isLive ? "#22c55e" : "#f59e0b"} />
                <ConsoleMetric label={isArabic ? "الأصول" : "Assets"} value={`${assets.length}`} color="#d4a843" />
              </div>
            </div>

            <MarketPulseChart dir={leadAsset.dir} phase={marketStatus.phase} color={marketStatus.color} />

            <div id="market-signals" className="mt-3 grid gap-3 md:grid-cols-3">
              {signals.slice(0, 3).map((signal, index) => (
                <SignalCommandCard key={`${signal.pair}-${signal.type}`} signal={signal} index={index} isLive={isLive} />
              ))}
            </div>

            <div id="market-markets" className="mt-3 rounded-2xl border border-[#203126] bg-black/30 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase text-white">{isArabic ? "أصول التداول" : "Trading assets"}</p>
                <span className="flex items-center gap-1 text-[9px] font-black uppercase" style={{ color: marketStatus.color }}><Radio size={11} /> Live API</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {assets.map((asset, index) => (
                  <AssetMiniTile
                    key={asset.pair}
                    asset={asset}
                    index={index}
                    isLive={isLive}
                    isSelected={asset.pair === leadAsset.pair}
                    onSelect={() => selectAsset(asset.pair)}
                  />
                ))}
              </div>
            </div>
          </main>

          <aside className="border-t border-[#173326] bg-black/30 p-3 lg:border-l lg:border-t-0">
            <div id="market-agents"><AgentControlMatrix isArabic={isArabic} theme={marketStatus} /></div>
            <div id="market-risk" className="mt-3 rounded-2xl border bg-black/45 p-4 transition-colors duration-700" style={{ borderColor: marketStatus.border, boxShadow: `inset 0 0 24px ${marketStatus.glow}` }}>
              <div className="mb-3 flex items-center gap-2">
                <Gauge size={16} style={{ color: marketStatus.color }} />
                <p className="text-xs font-black uppercase text-white">{isArabic ? "إدارة المخاطر" : "Risk management"}</p>
              </div>
              {[
                isArabic ? "حجم الصفقة" : "Position sizing",
                isArabic ? "ضبط التراجع" : "Drawdown control",
                isArabic ? "مخاطر الترابط" : "Correlation risk",
                isArabic ? "حماية التقلب" : "Volatility protection",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between border-b border-[#1c3627] py-2 text-[10px] last:border-b-0">
                  <span className="text-[#a7b5ad]">{item}</span>
                  <span className="flex items-center gap-1 font-black" style={{ color: marketStatus.color }}><CheckCircle2 size={12} /> OK</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
              {navItems.map(({ id, label, icon: Icon, action }) => (
                <button key={id} type="button" onClick={action} className="flex items-center gap-2 rounded-xl border border-[#203126] bg-black/30 px-3 py-2 text-[10px] font-black uppercase text-[#b9c3bd] hover:border-[#d4a843]/50 hover:text-[#d4a843]">
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </aside>
        </div>

        <div className="relative z-10 overflow-hidden border-t border-[#173326] bg-[#020403]/80 py-2">
          <motion.div
            className="flex w-max gap-7 whitespace-nowrap px-4 text-[10px] font-black uppercase"
            animate={{ x: ["0%", "-45%"] }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          >
            {[...assets, ...assets].map((asset, index) => (
              <button
                key={`${asset.pair}-${index}`}
                type="button"
                onClick={() => selectAsset(asset.pair)}
                className="flex items-center gap-2 transition-opacity hover:opacity-75"
              >
                <b className="text-white">{asset.pair}</b>
                <b className="font-mono text-[#d4a843]">{isLive ? formatAssetPrice(asset.price) : "Connecting"}</b>
                <b className={asset.dir === "up" ? "text-[#22c55e]" : "text-[#e11d48]"}>{asset.change > 0 ? "+" : ""}{asset.change}%</b>
              </button>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

function MarketPhaseMascot({ theme, isArabic }: { theme: MarketTheme; isArabic: boolean }) {
  const isBullish = theme.phase === "bullish"
  const isBearish = theme.phase === "bearish"
  const label = isBullish
    ? (isArabic ? "ثور السوق" : "Market bull")
    : isBearish
      ? (isArabic ? "دب السوق" : "Market bear")
      : (isArabic ? "مرحلة التجميع" : "Accumulation")

  return (
    <motion.div
      key={theme.phase}
      role="img"
      aria-label={label}
      initial={{ opacity: 0, scale: 0.72, x: 16 }}
      animate={{
        opacity: [0.72, 1, 0.72],
        scale: [0.96, 1.08, 0.96],
        y: [0, -5, 0],
      }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      className="pointer-events-none absolute right-3 top-1/2 flex h-16 w-24 -translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl border sm:right-5 sm:h-24 sm:w-36"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.soft,
        boxShadow: `0 0 38px ${theme.glow}, inset 0 0 30px ${theme.glow}`,
      }}
    >
      <FacetedMarketAnimal phase={theme.phase} color={theme.color} />
    </motion.div>
  )
}

function FacetedMarketAnimal({ phase, color }: { phase: MarketPhase; color: string }) {
  const gradientId = `market-mascot-${phase}`
  const clipId = `market-mascot-clip-${phase}`
  const shineId = `market-mascot-shine-${phase}`

  if (phase === "consolidation") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" className="h-[76%] w-[76%] drop-shadow-[0_0_18px_currentColor]" style={{ color }}>
        <defs>
          <linearGradient id={gradientId} x1="12%" y1="8%" x2="88%" y2="92%">
            <stop offset="0%" stopColor="#f0d7ff" />
            <stop offset="46%" stopColor={color} />
            <stop offset="100%" stopColor="#391262" />
          </linearGradient>
        </defs>
        <polygon points="50,6 88,32 77,78 50,94 23,78 12,32" fill={`url(#${gradientId})`} stroke="#e7c6ff" strokeWidth="2" />
        <polygon points="50,6 50,50 12,32" fill="#c084fc" opacity=".65" />
        <polygon points="50,6 88,32 50,50" fill="#f0d7ff" opacity=".48" />
        <polygon points="12,32 50,50 23,78" fill="#7c3aed" opacity=".68" />
        <polygon points="88,32 77,78 50,50" fill="#4c1d95" opacity=".82" />
        <polygon points="23,78 50,50 50,94" fill="#a855f7" opacity=".62" />
      </svg>
    )
  }

  if (phase === "bullish") {
    return (
      <svg viewBox="0 0 220 130" aria-hidden="true" className="h-[92%] w-[94%] drop-shadow-[0_0_18px_currentColor]" style={{ color }}>
        <defs>
          <linearGradient id={gradientId} x1="6%" y1="10%" x2="92%" y2="88%">
            <stop offset="0%" stopColor="#ecfff6" />
            <stop offset="38%" stopColor={color} />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id={shineId} x1="12%" y1="16%" x2="86%" y2="76%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity=".9" />
            <stop offset="48%" stopColor="#6ee7b7" stopOpacity=".4" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity=".12" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M23 61 42 40l51-15 51 8 20 18 16-2 19 13-6 20-28 7-22-3-12 28h-15l-3-32-39 3-15 29H43l6-38-18-5-18 8 5-17Z" />
          </clipPath>
        </defs>
        <path d="M23 61 42 40l51-15 51 8 20 18 16-2 19 13-6 20-28 7-22-3-12 28h-15l-3-32-39 3-15 29H43l6-38-18-5-18 8 5-17Z" fill={`url(#${gradientId})`} stroke="#bbf7d0" strokeWidth="2" strokeLinejoin="round" />
        <g clipPath={`url(#${clipId})`} stroke="#d1fae5" strokeOpacity=".35" strokeWidth="1">
          <polygon points="15,62 45,35 59,83" fill="#d1fae5" opacity=".5" />
          <polygon points="45,35 96,21 82,82 59,83" fill="#34d399" opacity=".48" />
          <polygon points="96,21 146,31 112,80 82,82" fill="#a7f3d0" opacity=".42" />
          <polygon points="146,31 171,54 144,88 112,80" fill="#059669" opacity=".72" />
          <polygon points="171,54 210,62 191,87 144,88" fill="#6ee7b7" opacity=".55" />
          <polygon points="59,83 82,82 61,123 39,119" fill="#10b981" opacity=".68" />
          <polygon points="112,80 144,88 132,121 111,119" fill="#047857" opacity=".84" />
        </g>
        <path d="m165 52 7-21 8-12 1 30m4 4 16-18 9-6-11 33" fill="none" stroke="#ecfff6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 49 17 36 8 21l4 30" fill="none" stroke="#bbf7d0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="190" cy="64" r="3.2" fill="#ffffff" />
        <path d="M43 39 96 25l50 8" fill="none" stroke={`url(#${shineId})`} strokeWidth="3" opacity=".78" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 220 130" aria-hidden="true" className="h-[92%] w-[94%] drop-shadow-[0_0_18px_currentColor]" style={{ color }}>
      <defs>
        <linearGradient id={gradientId} x1="6%" y1="8%" x2="92%" y2="90%">
          <stop offset="0%" stopColor="#fff1f2" />
          <stop offset="38%" stopColor={color} />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id={shineId} x1="12%" y1="14%" x2="88%" y2="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".9" />
          <stop offset="48%" stopColor="#fda4af" stopOpacity=".45" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity=".12" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M18 57 43 33l48-12 47 7 25 18 21-1 22 16-5 22-32 8-23-5-15 30h-15l-2-34-42 3-11 31H44l5-39-20-7-20 8 7-18Z" />
        </clipPath>
      </defs>
      <path d="M18 57 43 33l48-12 47 7 25 18 21-1 22 16-5 22-32 8-23-5-15 30h-15l-2-34-42 3-11 31H44l5-39-20-7-20 8 7-18Z" fill={`url(#${gradientId})`} stroke="#fecdd3" strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#${clipId})`} stroke="#ffe4e6" strokeOpacity=".36" strokeWidth="1">
        <polygon points="16,58 44,31 58,82" fill="#fff1f2" opacity=".5" />
        <polygon points="44,31 92,19 82,81 58,82" fill="#fb7185" opacity=".5" />
        <polygon points="92,19 140,27 111,79 82,81" fill="#fecdd3" opacity=".42" />
        <polygon points="140,27 167,48 146,88 111,79" fill="#e11d48" opacity=".68" />
        <polygon points="167,48 214,60 200,84 146,88" fill="#fb7185" opacity=".55" />
        <polygon points="58,82 82,81 62,121 41,120" fill="#f43f5e" opacity=".66" />
        <polygon points="111,79 146,88 132,122 111,120" fill="#be123c" opacity=".84" />
      </g>
      <path d="m166 48 4-17 12 10m3 6 7-16 11 16" fill="none" stroke="#fff1f2" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 40 19 31 8 39l10 18" fill="none" stroke="#fecdd3" strokeWidth="3" strokeLinecap="round" />
      <circle cx="196" cy="64" r="3.2" fill="#ffffff" />
      <path d="M44 32 92 20l48 8" fill="none" stroke={`url(#${shineId})`} strokeWidth="3" opacity=".78" />
    </svg>
  )
}

function AgentControlMatrix({ isArabic, theme }: { isArabic: boolean; theme: MarketTheme }) {
  const [enabledAgents, setEnabledAgents] = useState<Record<string, boolean>>({
    validation: true,
    momentum: true,
    supervisor: true,
    execution: true,
    news: true,
  })
  const agents = [
    { id: "validation", label: isArabic ? "التحقق" : "Validation", icon: ShieldCheck },
    { id: "momentum", label: isArabic ? "الزخم" : "Momentum", icon: Activity },
    { id: "supervisor", label: isArabic ? "المشرف" : "Supervisor", icon: Eye },
    { id: "execution", label: isArabic ? "التنفيذ" : "Execution", icon: Target },
    { id: "news", label: isArabic ? "الأخبار" : "News sentinel", icon: Newspaper },
  ]

  return (
    <div className="rounded-2xl border border-[#d4a843]/25 bg-[#040704]/90 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase text-white">{isArabic ? "مصفوفة وكلاء الذكاء" : "AI agent matrix"}</p>
          <p className="mt-1 text-[9px] text-[#849188]">{isArabic ? "تحكم بصري مباشر" : "Live visual controls"}</p>
        </div>
        <span className="text-[9px] font-black uppercase" style={{ color: theme.color }}>
          {Object.values(enabledAgents).filter(Boolean).length}/{agents.length} {isArabic ? "نشط" : "active"}
        </span>
      </div>
      <div className="space-y-2">
        {agents.map(({ id, label, icon: Icon }, index) => {
          const enabled = enabledAgents[id]
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => setEnabledAgents((current) => ({ ...current, [id]: !current[id] }))}
              className="flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all"
              style={{ borderColor: enabled ? theme.border : "rgba(212,168,67,0.20)", backgroundColor: enabled ? theme.soft : "rgba(0,0,0,0.28)" }}
              animate={enabled ? { boxShadow: [`0 0 0 ${theme.glow}`, `0 0 18px ${theme.glow}`, `0 0 0 ${theme.glow}`] } : {}}
              transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.12 }}
            >
              <span className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${enabled ? "" : "bg-[#d4a843]/10 text-[#d4a843]"}`} style={enabled ? { backgroundColor: theme.soft, color: theme.color } : undefined}>
                  <Icon size={15} />
                </span>
                <span className="text-[10px] font-black uppercase text-white">{label}</span>
              </span>
              <span className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-all ${enabled ? "justify-end" : "justify-start bg-[#3d443f]"}`} style={enabled ? { backgroundColor: theme.color } : undefined}>
                <span className="h-4 w-4 rounded-full bg-white shadow" />
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function LiveMarketConsole({ marketData }: { marketData: ReturnType<typeof useMarketData> }) {
  const { language } = useLanguage()
  const isArabic = language === "ar"
  const isLive = Boolean(marketData.updatedAt)
  const assets = marketData.assets
  const leadAsset = assets[0]
  const bullishCount = assets.filter((asset) => asset.dir === "up").length
  const marketStatus = bullishCount >= Math.ceil(assets.length / 2)
    ? { label: isArabic ? "السوق صاعد" : "Bullish market", tone: "#22c55e", note: isArabic ? "زخم شرائي نشط" : "AI detects clean buying pressure" }
    : { label: isArabic ? "السوق حذر" : "Cautious market", tone: "#f59e0b", note: isArabic ? "نراقب المخاطر" : "AI is filtering risk before signals" }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.55 }}
        className="relative overflow-hidden rounded-[28px] border border-[#d4a843]/25 bg-[#050806]/90 p-3 shadow-[0_0_80px_rgba(34,197,94,0.10)] sm:p-5"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_12%_85%,rgba(212,168,67,0.14),transparent_32%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,197,94,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(212,168,67,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative z-10 mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <motion.span
                className="h-2.5 w-2.5 rounded-full bg-[#22c55e]"
                animate={{ scale: [0.8, 1.35, 0.8], opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#d4a843]">
                {isArabic ? "نافذة أسعار حية" : "Live market command window"}
              </span>
            </div>
            <h1 className="max-w-3xl text-3xl font-black uppercase leading-tight tracking-[0.03em] text-white sm:text-5xl">
              {isArabic ? "أسعار مباشرة. إشارات أوضح. قرار أسرع." : "AI-powered prices with a living market pulse."}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[440px]">
            <ConsoleMetric label={isArabic ? "حالة السوق" : "Market status"} value={marketStatus.label} color={marketStatus.tone} />
            <ConsoleMetric label={isArabic ? "السعر الرئيسي" : "Primary price"} value={isLive ? formatAssetPrice(leadAsset.price) : "Connecting"} color="#d4a843" />
            <ConsoleMetric label={isArabic ? "اتصال API" : "API feed"} value={isLive ? "Live" : "Connecting"} color="#22c55e" />
          </div>
        </div>

        <div className="relative z-10 grid gap-4 xl:grid-cols-[230px_1fr_330px]">
          <aside className="grid grid-cols-2 gap-2 xl:grid-cols-1">
            {[
              { icon: Activity, label: isArabic ? "نظرة عامة" : "Overview", active: true },
              { icon: Zap, label: isArabic ? "وكلاء AI" : "AI agents" },
              { icon: BarChart3, label: isArabic ? "الأسواق" : "Markets" },
              { icon: Radio, label: isArabic ? "الإشارات" : "Signals" },
              { icon: Target, label: isArabic ? "المخاطر" : "Risk gate" },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.04 }}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-wide ${
                  item.active ? "border-[#22c55e]/35 bg-[#22c55e]/10 text-[#22c55e]" : "border-[#1f2b22] bg-black/25 text-[#8d978f]"
                }`}
              >
                <item.icon size={16} />
                <span className="truncate">{item.label}</span>
              </motion.div>
            ))}
          </aside>

          <main className="space-y-4">
            <div className="rounded-3xl border border-[#22c55e]/20 bg-black/35 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7b8d80]">
                    {isArabic ? "قراءة السوق المباشرة" : "Market outlook"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-3xl font-black uppercase text-[#22c55e]">{marketStatus.label}</span>
                    <span className="rounded-full border border-[#22c55e]/25 bg-[#22c55e]/10 px-2 py-1 text-[9px] font-black uppercase text-[#22c55e]">
                      {marketStatus.note}
                    </span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase tracking-wider text-[#66756b]">{leadAsset.pair}</p>
                  <motion.p
                    className="font-mono text-3xl font-black text-[#d4a843]"
                    animate={{ textShadow: ["0 0 8px rgba(212,168,67,0.25)", "0 0 22px rgba(212,168,67,0.55)", "0 0 8px rgba(212,168,67,0.25)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {isLive ? formatAssetPrice(leadAsset.price) : "Connecting"}
                  </motion.p>
                </div>
              </div>

              <MarketPulseChart dir={leadAsset.dir} />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {marketData.signals.slice(0, 3).map((signal, index) => (
                <SignalCommandCard key={`${signal.pair}-${index}`} signal={signal} index={index} isLive={isLive} />
              ))}
            </div>

            <div className="rounded-3xl border border-[#d4a843]/15 bg-black/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                  {isArabic ? "الأصول المتداولة" : "Trading assets"}
                </h2>
                <span className="text-[9px] font-black uppercase text-[#22c55e]">{isLive ? "Live API" : "Waiting feed"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {assets.map((asset, index) => (
                  <AssetMiniTile key={asset.pair} asset={asset} index={index} isLive={isLive} />
                ))}
              </div>
            </div>
          </main>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-[#d4a843]/20 bg-black/35 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase text-white">{isArabic ? "وكلاء الأسعار" : "Price agents"}</h2>
                <span className="text-[10px] font-black text-[#22c55e]">5/5 Active</span>
              </div>
              {[
                [isArabic ? "قارئ الاتجاه" : "Trend oracle", isArabic ? "تحليل اتجاه السوق" : "Market trend analysis"],
                [isArabic ? "عبقري الدخول" : "Entry genius", isArabic ? "مناطق دخول دقيقة" : "Optimal entry zones"],
                [isArabic ? "حارس المخاطر" : "Risk guardian", isArabic ? "حماية المخاطر" : "Risk management"],
                [isArabic ? "حارس الأخبار" : "News sentinel", isArabic ? "أخبار وزخم" : "News and sentiment"],
                [isArabic ? "محسن الربح" : "Profit maximizer", isArabic ? "تحسين الأهداف" : "Target optimization"],
              ].map(([name, task], index) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.06 }}
                  className="mb-2 flex items-center gap-3 rounded-2xl border border-[#1f2b22] bg-[#08120c]/80 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4a843]/25 bg-[#d4a843]/10 text-[#d4a843]">
                    <Zap size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{name}</p>
                    <p className="truncate text-[10px] text-[#8b948e]">{task}</p>
                  </div>
                  <span className="rounded-full bg-[#22c55e]/15 px-2 py-1 text-[8px] font-black text-[#22c55e]">ACTIVE</span>
                </motion.div>
              ))}
            </div>

            <div className="rounded-3xl border border-[#22c55e]/20 bg-[#03120a]/80 p-4">
              <h2 className="mb-4 text-sm font-black uppercase text-white">{isArabic ? "إدارة المخاطر" : "Risk management"}</h2>
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#22c55e]/25 bg-[#22c55e]/10">
                  <motion.div
                    className="absolute inset-2 rounded-full border-4 border-[#22c55e]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="text-3xl font-black text-[#22c55e]">18</span>
                </div>
                <div className="flex-1 space-y-2">
                  {["Position sizing", "Drawdown control", "Correlation risk", "Volatility protection"].map((item) => (
                    <div key={item} className="flex items-center justify-between text-xs">
                      <span className="text-[#b8c2bb]">{item}</span>
                      <span className="text-[#22c55e]">OK</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    </div>
  )
}

function ConsoleMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[#1f2b22] bg-black/35 p-3">
      <p className="text-[8px] font-black uppercase tracking-wider text-[#6b756e]">{label}</p>
      <p className="mt-1 truncate text-sm font-black uppercase" style={{ color }}>{value}</p>
    </div>
  )
}

function SignalCommandCard({ signal, index, isLive }: { signal: typeof SIGNALS[number]; index: number; isLive: boolean }) {
  const isBuy = signal.type === "BUY"
  const color = isBuy ? "#22c55e" : "#e11d48"
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.72 + index * 0.08 }}
      className="rounded-2xl border bg-black/35 p-4"
      style={{ borderColor: `${color}30` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}18` }}>
            {isBuy ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
          </div>
          <div>
            <p className="text-lg font-black" style={{ color }}>{signal.type}</p>
            <p className="text-[10px] text-[#8b948e]">{signal.pair}</p>
          </div>
        </div>
        <span className="text-xl font-black text-white">{signal.conf}%</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[#66756b]">Live price</p>
          <p className="font-mono text-sm font-black text-[#d4a843]">{isLive ? formatAssetPrice(signal.price) : "Connecting"}</p>
        </div>
        <div className="w-24">
          <MiniSparkline dir={isBuy ? "up" : "down"} />
        </div>
      </div>
    </motion.div>
  )
}

function LiveChart({ goldPrice }: { goldPrice: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height
    const pad = 20
    const cw = 9
    const gap = 3

    // Generate candles
    const candles: { o: number; c: number; h: number; l: number }[] = []
    let p = 3318
    for (let i = 0; i < 42; i++) {
      const v = 3 + Math.random() * 4
      const o = p
      const c = o + (Math.random() > 0.45 ? 1 : -1) * Math.random() * v
      const h = Math.max(o, c) + Math.random() * v * 0.5
      const l = Math.min(o, c) - Math.random() * v * 0.5
      p = c
      candles.push({ o, c, h, l })
    }

    // Signal positions
    const sigIdx = [7, 14, 21, 27, 34, 39]

    let frame = 0
    const animate = () => {
      frame++
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = "rgba(8,8,12,0.85)"
      ctx.fillRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = "rgba(212,168,67,0.04)"
      ctx.lineWidth = 0.5
      for (let y = pad; y < H - pad; y += 28) {
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke()
      }

      // Price labels
      ctx.fillStyle = "rgba(160,160,160,0.25)"
      ctx.font = "7px monospace"
      for (let i = 0; i < 5; i++) {
        const price = 3310 + i * 6
        const y = H - pad - (i * (H - 2 * pad) / 4)
        ctx.fillText(price.toFixed(0), 2, y + 2)
      }

      const offset = Math.sin(frame * 0.008) * 4

      // Draw candles
      candles.forEach((c, i) => {
        const x = pad + i * (cw + gap) + offset
        if (x < pad || x > W - pad) return

        const minP = 3310
        const maxP = 3335
        const range = maxP - minP
        const sy = (H - 2 * pad) / range

        const yo = H - pad - (c.o - minP) * sy
        const yc = H - pad - (c.c - minP) * sy
        const yh = H - pad - (c.h - minP) * sy
        const yl = H - pad - (c.l - minP) * sy

        const green = c.c >= c.o
        const color = green ? "#22c55e" : "#e11d48"

        // Wick
        ctx.beginPath()
        ctx.moveTo(x + cw / 2, yh)
        ctx.lineTo(x + cw / 2, yl)
        ctx.strokeStyle = color
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Body
        const top = Math.min(yo, yc)
        const bh = Math.max(Math.abs(yo - yc), 1)
        ctx.fillStyle = color
        ctx.fillRect(x, top, cw, bh)

        // Last candle glow
        if (i === candles.length - 1) {
          ctx.shadowColor = color
          ctx.shadowBlur = 12
          ctx.fillRect(x, top, cw, bh)
          ctx.shadowBlur = 0
        }
      })

      // Volume
      candles.forEach((c, i) => {
        const x = pad + i * (cw + gap) + offset
        if (x < pad || x > W - pad) return
        const vol = Math.random() * 12 + 3
        ctx.fillStyle = c.c >= c.o ? "rgba(34,197,94,0.12)" : "rgba(225,29,72,0.12)"
        ctx.fillRect(x, H - vol - 2, cw, vol)
      })

      // BUY/SELL signals
      sigIdx.forEach((si) => {
        const x = pad + si * (cw + gap) + offset
        if (x < pad || x > W - pad) return
        const c = candles[si]
        const minP = 3310
        const maxP = 3335
        const range = maxP - minP
        const sy = (H - 2 * pad) / range
        const yc = H - pad - (c.c - minP) * sy
        const green = c.c >= c.o

        const badgeY = green ? yc - 22 : yc + 12
        const pulse = Math.sin(frame * 0.06 + si) * 2 + 3

        // Pulse ring
        ctx.beginPath()
        ctx.arc(x + cw / 2, badgeY + 6, pulse + 4, 0, Math.PI * 2)
        ctx.fillStyle = green ? `rgba(34,197,94,0.15)` : `rgba(225,29,72,0.15)`
        ctx.fill()

        // Badge
        ctx.fillStyle = green ? "rgba(34,197,94,0.85)" : "rgba(225,29,72,0.85)"
        roundRect(ctx, x - 7, badgeY, 23, 13, 3)
        ctx.fill()
        ctx.fillStyle = "#fff"
        ctx.font = "bold 7px sans-serif"
        ctx.fillText(green ? "BUY" : "SELL", x - 3, badgeY + 9)
      })

      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative bg-gradient-to-b from-[#0a0a0f] to-[#050508] border border-[#d4a843]/10 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 40px rgba(212,168,67,0.06)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-[#d4a843]" />
            <span className="text-[10px] text-[#a0a0a0] font-mono">XAU/USD - 5M</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs text-[#d4a843] font-mono font-black">
              {goldPrice === null ? formatGoldPrice(goldPrice) : `$${formatGoldPrice(goldPrice)}`}
            </span>
            <motion.div className="flex items-center gap-1 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full px-2 py-0.5"
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[8px] text-[#22c55e] font-bold">LIVE</span>
            </motion.div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ width: "100%", height: 220 }} className="block" />

        {/* Chart Footer */}
        <div className="flex items-center justify-around px-2 py-2.5 border-t border-[#1a1a1a]">
          {[
            { icon: Eye, label: "Watchlist" },
            { icon: BarChart3, label: "Chart" },
            { icon: Compass, label: "Explore" },
            { icon: Lightbulb, label: "Ideas" },
            { icon: Menu, label: "Menu" },
          ].map((item) => (
            <button key={item.label} className="flex items-center gap-1 text-[9px] text-[#666666] hover:text-[#d4a843] transition-colors">
              <item.icon size={10} /> {item.label}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   STATS GRID
   ═══════════════════════════════════════════ */

function StatsGrid() {
  const { t } = useLanguage()
  const stats = [
    { label: t("hero.activeSignals"), value: "12", icon: Radio, color: "#d4a843", sub: t("hero.thisHour") },
    { label: t("hero.winRate"), value: "78%", icon: Target, color: "#22c55e", sub: t("hero.last30") },
    { label: t("hero.profitToday"), value: "$12.7K", icon: TrendingUp, color: "#22c55e", sub: "+8.4%" },
    { label: t("hero.assets"), value: "6", icon: Globe, color: "#3b82f6", sub: t("hero.assetsList") },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="bg-[#0a0a0f]/80 backdrop-blur border border-[#1f1f1f] rounded-xl p-3 hover:border-[#d4a843]/15 transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-14 h-14 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity"
              style={{ background: `radial-gradient(circle, ${s.color} 0%, transparent 70%)` }} />
            <s.icon size={14} style={{ color: s.color }} className="mb-1.5" />
            <p className="text-[9px] text-[#666666] uppercase">{s.label}</p>
            <motion.p className="text-xl font-black" style={{ color: s.color }}
              animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}>
              {s.value}
            </motion.p>
            <p className="text-[8px] text-[#444444]">{s.sub}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   SIGNALS FEED
   ═══════════════════════════════════════════ */

function SignalsFeed({ signals, updatedAt }: { signals: typeof SIGNALS; updatedAt: number | null }) {
  const { t } = useLanguage()
  const isLive = Boolean(updatedAt)
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold flex items-center gap-1.5">
          <Radio size={12} className="text-[#d4a843]" /> {t("hero.liveSignals")}
        </h2>
        <span className="text-[8px] text-[#666666]">{t("hero.realTime")}</span>
      </div>

      <div className="space-y-2">
        {signals.map((sig, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className={`flex items-center justify-between bg-[#0a0a0f]/60 backdrop-blur border rounded-xl px-3 py-2.5 ${
              sig.type === "BUY" ? "border-[#22c55e]/10" : "border-[#e11d48]/10"
            }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                sig.type === "BUY" ? "bg-[#22c55e]/10" : "bg-[#e11d48]/10"
              }`}>
                {sig.type === "BUY"
                  ? <TrendingUp size={14} className="text-[#22c55e]" />
                  : <TrendingDown size={14} className="text-[#e11d48]" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold ${sig.type === "BUY" ? "text-[#22c55e]" : "text-[#e11d48]"}`}>{sig.type}</span>
                  <span className="text-[9px] text-[#a0a0a0]">{sig.pair}</span>
                </div>
                <p className="text-[9px] text-[#666666]">{sig.time}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono font-bold text-white">
                {isLive ? `$${sig.price.toLocaleString(undefined, { minimumFractionDigits: sig.price > 1000 ? 2 : 4, maximumFractionDigits: sig.price > 1000 ? 2 : 5 })}` : "Connecting"}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ backgroundColor: sig.type === "BUY" ? "#22c55e" : "#e11d48" }}
                    initial={{ width: 0 }} animate={{ width: `${sig.conf}%` }}
                    transition={{ duration: 1.5, delay: 0.8 + i * 0.15 }} />
                </div>
                <span className="text-[8px] text-[#666666]">{sig.conf}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ASSETS GRID
   ═══════════════════════════════════════════ */

function AssetsGrid({ assets, updatedAt }: { assets: typeof ASSETS; updatedAt: number | null }) {
  const { language, t } = useLanguage()
  const isArabic = language === "ar"
  const isLive = Boolean(updatedAt)
  const bullishCount = assets.filter((asset) => asset.dir === "up").length
  const marketStatus = bullishCount >= Math.ceil(assets.length / 2)
    ? { label: isArabic ? "صاعد" : "Bullish", color: "#22c55e", glow: "rgba(34,197,94,0.28)" }
    : { label: isArabic ? "حذر" : "Cautious", color: "#f59e0b", glow: "rgba(245,158,11,0.24)" }
  const leadAsset = assets[0]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.78 }}
        className="relative overflow-hidden rounded-3xl border border-[#d4a843]/25 bg-[#07110c]/85 p-4 sm:p-5 shadow-[0_0_55px_rgba(34,197,94,0.08)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_8%_82%,rgba(212,168,67,0.12),transparent_28%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(34,197,94,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(212,168,67,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Globe size={14} className="text-[#d4a843]" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d4a843]">{t("hero.tradingAssets")}</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white sm:text-2xl">
              {isArabic ? "لوحة الأسعار الذكية" : "Live Market Intelligence"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <motion.div
              className="rounded-2xl border px-4 py-2 text-right"
              style={{ borderColor: `${marketStatus.color}55`, backgroundColor: `${marketStatus.color}12`, boxShadow: `0 0 28px ${marketStatus.glow}` }}
              animate={{ boxShadow: [`0 0 12px ${marketStatus.glow}`, `0 0 34px ${marketStatus.glow}`, `0 0 12px ${marketStatus.glow}`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <p className="text-[8px] uppercase tracking-wider text-[#88998b]">{isArabic ? "حالة السوق" : "Market status"}</p>
              <p className="text-sm font-black uppercase" style={{ color: marketStatus.color }}>{marketStatus.label}</p>
            </motion.div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.95)]" />
              <span className="text-[9px] font-black uppercase text-[#22c55e]">{isLive ? "Live API" : "Connecting"}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-2xl border border-[#22c55e]/20 bg-black/30 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#a0a0a0]">{isArabic ? "الأصل الرئيسي" : "Primary market"}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-black text-white">{leadAsset.pair}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${leadAsset.dir === "up" ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-[#e11d48]/15 text-[#e11d48]"}`}>
                    {leadAsset.dir === "up" ? "BUY PRESSURE" : "SELL PRESSURE"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <motion.div
                  className="font-mono text-2xl font-black text-[#d4a843]"
                  animate={{ opacity: [0.78, 1, 0.78] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                >
                  {isLive ? formatAssetPrice(leadAsset.price) : "Connecting"}
                </motion.div>
                <div className={`mt-1 flex items-center justify-end gap-1 text-xs font-black ${leadAsset.dir === "up" ? "text-[#22c55e]" : "text-[#e11d48]"}`}>
                  {leadAsset.dir === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {leadAsset.change > 0 ? "+" : ""}{leadAsset.change}%
                </div>
              </div>
            </div>

            <MarketPulseChart dir={leadAsset.dir} />

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: isArabic ? "السيولة" : "Liquidity", value: "High" },
                { label: isArabic ? "الزخم" : "Momentum", value: leadAsset.dir === "up" ? "Bullish" : "Bearish" },
                { label: isArabic ? "الدقة" : "Signal score", value: "92%" },
              ].map((item, index) => (
                <div key={item.label} className="rounded-xl border border-[#1f3a29] bg-[#07130c]/80 p-3">
                  <p className="text-[8px] uppercase tracking-wider text-[#66756b]">{item.label}</p>
                  <p className="mt-1 text-xs font-black text-[#22c55e]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {assets.slice(1, 5).map((asset, index) => (
              <AssetPriceRow key={asset.pair} asset={asset} index={index} isLive={isLive} />
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {assets.map((asset, index) => (
            <AssetMiniTile key={asset.pair} asset={asset} index={index} isLive={isLive} />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function AssetPriceRow({ asset, index, isLive }: { asset: typeof ASSETS[number]; index: number; isLive: boolean }) {
  const isUp = asset.dir === "up"
  const color = isUp ? "#22c55e" : "#e11d48"
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.88 + index * 0.08 }}
      className="relative overflow-hidden rounded-2xl border bg-black/30 p-3"
      style={{ borderColor: `${color}22` }}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5" style={{ color }}>
            {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{asset.pair}</p>
            <p className="text-[9px] uppercase tracking-wider text-[#66756b]">{isUp ? "Demand rising" : "Pressure active"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs font-black text-[#d4a843]">{isLive ? formatAssetPrice(asset.price) : "Connecting"}</p>
          <p className="text-[10px] font-black" style={{ color }}>{asset.change > 0 ? "+" : ""}{asset.change}%</p>
        </div>
      </div>
    </motion.div>
  )
}

function AssetMiniTile({
  asset,
  index,
  isLive,
  isSelected = false,
  onSelect,
}: {
  asset: typeof ASSETS[number]
  index: number
  isLive: boolean
  isSelected?: boolean
  onSelect?: () => void
}) {
  const isUp = asset.dir === "up"
  const color = isUp ? "#22c55e" : "#e11d48"
  return (
    <motion.button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 + index * 0.06 }}
      className="group rounded-2xl border bg-[#050806]/75 p-3 text-left transition-all hover:border-[#d4a843]/55 hover:bg-[#d4a843]/5"
      style={isSelected ? { borderColor: color, boxShadow: `0 0 20px ${color}24` } : { borderColor: "#1f1f1f" }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black text-white">{asset.pair}</span>
        <span className="text-[8px] font-black" style={{ color }}>{asset.change > 0 ? "+" : ""}{asset.change}%</span>
      </div>
      <motion.p
        className="font-mono text-xs font-black text-[#d4a843]"
        animate={{ opacity: [0.72, 1, 0.72] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.2 }}
      >
        {isLive ? formatAssetPrice(asset.price) : "Connecting"}
      </motion.p>
      <MiniSparkline dir={asset.dir} />
    </motion.button>
  )
}

function formatAssetPrice(price: number) {
  return `$${price.toLocaleString(undefined, {
    minimumFractionDigits: price > 1000 ? 2 : 4,
    maximumFractionDigits: price > 1000 ? 2 : 5,
  })}`
}

function MarketPulseChart({ dir, phase, color }: { dir: string; phase?: MarketPhase; color?: string }) {
  const resolvedPhase = phase ?? (dir === "up" ? "bullish" : "bearish")
  const resolvedColor = color ?? (resolvedPhase === "bullish" ? "#22c55e" : "#e11d48")
  const points = resolvedPhase === "bullish"
    ? "0,118 42,102 82,110 126,84 168,92 210,66 252,74 296,42 340,30 380,14"
    : resolvedPhase === "bearish"
      ? "0,28 42,44 82,36 126,66 168,58 210,88 252,82 296,108 340,100 380,122"
      : "0,78 42,60 82,82 126,58 168,76 210,56 252,80 296,62 340,74 380,58"

  return (
    <div className="relative h-40 overflow-hidden rounded-2xl border bg-black/50 transition-colors duration-700" style={{ borderColor: `${resolvedColor}55`, boxShadow: `inset 0 0 36px ${resolvedColor}18` }}>
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(34,197,94,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      <svg viewBox="0 0 380 140" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="marketGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={resolvedColor} stopOpacity="0.34" />
            <stop offset="100%" stopColor={resolvedColor} stopOpacity="0" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon points={`0,140 ${points} 380,140`} fill="url(#marketGlow)" />
        <motion.polyline
          points={points}
          fill="none"
          stroke={resolvedColor}
          strokeWidth="4"
          filter="url(#lineGlow)"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
      </svg>
      <motion.div
        className="absolute bottom-6 right-8 h-4 w-4 rounded-full"
        style={{ backgroundColor: resolvedColor, boxShadow: `0 0 28px ${resolvedColor}` }}
        animate={{ scale: [0.8, 1.35, 0.8], opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
  )
}

function MiniSparkline({ dir }: { dir: string }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const base = dir === "up" ? 50 - i * 1.5 : 35 + i * 1.5
    return `${i * 7},${base + Math.random() * 10}`
  }).join(" ")
  const color = dir === "up" ? "#22c55e" : "#e11d48"

  return (
    <svg viewBox="0 0 84 55" className="w-full h-6 mt-1" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
      <polygon points={`0,55 ${points} 84,55`} fill={`${color}08`} />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// All icons imported from lucide-react
