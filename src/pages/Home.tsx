import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  TrendingUp, TrendingDown, Activity, Eye, BarChart3,
  Globe, Zap, Shield, Crown, ChevronRight, Clock, Flame,
  Target, DollarSign, Percent, ArrowUpRight, ArrowDownRight,
  Radio, Sparkles, Menu, X, Bell, Wallet, LineChart,
  Compass, Lightbulb, LayoutDashboard
} from "lucide-react"
import { useNavigate } from "react-router"

/* ═══════════════════════════════════════════
   LIVING DASHBOARD - Tradevisor AI
   Pulsing, breathing, alive
   ═══════════════════════════════════════════ */

// ── Candle data generator ──
function generateCandles(count: number) {
  const candles = []
  let price = 3320
  for (let i = 0; i < count; i++) {
    const volatility = 3 + Math.random() * 4
    const open = price
    const direction = Math.random() > 0.45 ? 1 : -1
    const close = open + direction * (Math.random() * volatility)
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    price = close
    candles.push({ open, close, high, low })
  }
  return candles
}

// ── Signal generator ──
const SIGNALS = [
  { type: "BUY" as const, price: 3325.50, time: "2 min ago", pair: "XAU/USD", confidence: 94 },
  { type: "SELL" as const, price: 3328.00, time: "5 min ago", pair: "BTC/USD", confidence: 87 },
  { type: "BUY" as const, price: 1.0850, time: "8 min ago", pair: "EUR/USD", confidence: 91 },
  { type: "SELL" as const, price: 3327.50, time: "12 min ago", pair: "XAU/USD", confidence: 82 },
  { type: "BUY" as const, price: 145.20, time: "15 min ago", pair: "USD/JPY", confidence: 89 },
]

// ── Assets with live prices ──
const ASSETS = [
  { pair: "XAU/USD", price: 3325.50, change: 1.24, direction: "up" as const, icon: "Gold" },
  { pair: "EUR/USD", price: 1.0850, change: 0.56, direction: "up" as const, icon: "EUR" },
  { pair: "BTC/USD", price: 67250.00, change: -0.82, direction: "down" as const, icon: "BTC" },
  { pair: "GBP/USD", price: 1.2650, change: 0.31, direction: "up" as const, icon: "GBP" },
  { pair: "USD/JPY", price: 145.20, change: -0.15, direction: "down" as const, icon: "JPY" },
  { pair: "US30", price: 38520.00, change: 0.78, direction: "up" as const, icon: "US30" },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#030305] text-white relative overflow-hidden">
      {/* Living Background */}
      <LivingBackground />

      {/* Top Bar */}
      <TopBar />

      {/* Main Content */}
      <main className="relative z-10 pb-24">
        {/* Total Profits */}
        <ProfitHeader />

        {/* Live Chart */}
        <LiveChart />

        {/* Stats Grid */}
        <StatsGrid />

        {/* Live Signals Feed */}
        <SignalsFeed />

        {/* Trading Assets */}
        <AssetsGrid />

        {/* Bottom CTA */}
        <BottomCTA />
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  )
}

/* ═══════════════════════════════════════════
   LIVING BACKGROUND - Particles + Glow
   ═══════════════════════════════════════════ */

function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.6 ? "212,168,67" : Math.random() > 0.5 ? "34,197,94" : "16,185,129",
      })
    }

    let frame = 0
    const animate = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Subtle grid
      ctx.strokeStyle = "rgba(212,168,67,0.015)"
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const pulse = Math.sin(frame * 0.02 + p.x * 0.01) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${p.alpha * pulse})`
        ctx.fill()
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(212,168,67,${0.04 * (1 - dist / 120)})`
            ctx.lineWidth = 0.3
            ctx.stroke()
          }
        }
      }

      requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />
      {/* Radial glow */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.07] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, #d4a843 0%, transparent 70%)" }} />
      <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] opacity-[0.05] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, #22c55e 0%, transparent 70%)" }} />
    </>
  )
}

/* ═══════════════════════════════════════════
   TOP BAR
   ═══════════════════════════════════════════ */

function TopBar() {
  const navigate = useNavigate()
  const [notifCount] = useState(3)

  return (
    <header className="relative z-20 flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#d4a843] to-[#b8922e] flex items-center justify-center"
        >
          <Zap size={18} className="text-[#050505]" />
        </motion.div>
        <div>
          <h1 className="text-sm font-bold leading-tight">Tradevisor<span className="text-[#d4a843]"> AI</span></h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[9px] text-[#22c55e]">Live</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/vip")}
          className="flex items-center gap-1 bg-[#d4a843]/10 border border-[#d4a843]/30 text-[#d4a843] px-3 py-1.5 rounded-full text-[10px] font-semibold hover:bg-[#d4a843]/20 transition-all"
        >
          <Crown size={10} /> VIP
        </button>
        <button
          onClick={() => navigate("/candles")}
          className="flex items-center gap-1 bg-[#e11d48]/10 border border-[#e11d48]/30 text-[#e11d48] px-3 py-1.5 rounded-full text-[10px] font-semibold hover:bg-[#e11d48]/20 transition-all"
        >
          <Flame size={10} /> AI
        </button>
        <div className="relative">
          <Bell size={16} className="text-[#888888]" />
          {notifCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#e11d48] rounded-full text-[7px] flex items-center justify-center font-bold"
            >
              {notifCount}
            </motion.div>
          )}
        </div>
      </div>
    </header>
  )
}

/* ═══════════════════════════════════════════
   PROFIT HEADER - Floating profits
   ═══════════════════════════════════════════ */

function ProfitHeader() {
  const [totalProfit] = useState(2400000)
  const [todayProfit] = useState(12700)

  return (
    <div className="px-5 mb-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        {/* Total Profits */}
        <div>
          <p className="text-[10px] text-[#666666] uppercase tracking-wider mb-1">Total Profits</p>
          <motion.div
            className="text-3xl font-black text-[#d4a843]"
            animate={{ textShadow: ["0 0 10px rgba(212,168,67,0.3)", "0 0 20px rgba(212,168,67,0.5)", "0 0 10px rgba(212,168,67,0.3)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ${(totalProfit / 1000000).toFixed(1)}M+
          </motion.div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={10} className="text-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e]">+${todayProfit.toLocaleString()} today</span>
          </div>
        </div>

        {/* Win Rate */}
        <motion.div
          className="bg-[#0a0a0a]/80 backdrop-blur border border-[#22c55e]/20 rounded-2xl px-4 py-3 text-center"
          animate={{ borderColor: ["rgba(34,197,94,0.2)", "rgba(34,197,94,0.5)", "rgba(34,197,94,0.2)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <p className="text-[9px] text-[#666666] uppercase tracking-wider">Win Rate</p>
          <motion.p
            className="text-2xl font-black text-[#22c55e]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            64%
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   LIVE CHART - Animated candlestick
   ═══════════════════════════════════════════ */

function LiveChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const candlesRef = useRef(generateCandles(40))
  const offsetRef = useRef(0)

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

    const w = rect.width
    const h = rect.height
    const candleWidth = 8
    const gap = 4
    const chartPadding = 20

    let frame = 0
    const animate = () => {
      frame++
      ctx.clearRect(0, 0, w, h)

      // Background
      ctx.fillStyle = "rgba(10,10,15,0.8)"
      ctx.fillRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = "rgba(212,168,67,0.05)"
      ctx.lineWidth = 0.5
      for (let y = chartPadding; y < h - chartPadding; y += 30) {
        ctx.beginPath()
        ctx.moveTo(chartPadding, y)
        ctx.lineTo(w - chartPadding, y)
        ctx.stroke()
      }

      // Price labels
      ctx.fillStyle = "rgba(160,160,160,0.3)"
      ctx.font = "8px monospace"
      for (let i = 0; i < 5; i++) {
        const price = 3310 + i * 5
        const y = h - chartPadding - (i * (h - 2 * chartPadding) / 4)
        ctx.fillText(price.toFixed(0), 2, y + 3)
      }

      const candles = candlesRef.current
      offsetRef.current = Math.sin(frame * 0.01) * 5

      // Draw candles
      candles.forEach((candle, i) => {
        const x = chartPadding + i * (candleWidth + gap) + offsetRef.current
        if (x < chartPadding || x > w - chartPadding) return

        const minPrice = 3310
        const maxPrice = 3335
        const priceRange = maxPrice - minPrice
        const scaleY = (h - 2 * chartPadding) / priceRange

        const yOpen = h - chartPadding - (candle.open - minPrice) * scaleY
        const yClose = h - chartPadding - (candle.close - minPrice) * scaleY
        const yHigh = h - chartPadding - (candle.high - minPrice) * scaleY
        const yLow = h - chartPadding - (candle.low - minPrice) * scaleY

        const isGreen = candle.close >= candle.open
        const color = isGreen ? "#22c55e" : "#e11d48"

        // Wick
        ctx.beginPath()
        ctx.moveTo(x + candleWidth / 2, yHigh)
        ctx.lineTo(x + candleWidth / 2, yLow)
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.stroke()

        // Body
        const bodyTop = Math.min(yOpen, yClose)
        const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1)
        ctx.fillStyle = color
        ctx.fillRect(x, bodyTop, candleWidth, bodyHeight)

        // Glow effect on last candle
        if (i === candles.length - 1) {
          ctx.shadowColor = color
          ctx.shadowBlur = 15
          ctx.fillRect(x, bodyTop, candleWidth, bodyHeight)
          ctx.shadowBlur = 0
        }
      })

      // Volume bars at bottom
      candles.forEach((candle, i) => {
        const x = chartPadding + i * (candleWidth + gap) + offsetRef.current
        if (x < chartPadding || x > w - chartPadding) return
        const isGreen = candle.close >= candle.open
        const volHeight = Math.random() * 15 + 3
        ctx.fillStyle = isGreen ? "rgba(34,197,94,0.15)" : "rgba(225,29,72,0.15)"
        ctx.fillRect(x, h - volHeight - 2, candleWidth, volHeight)
      })

      // Signal overlay on some candles
      const signalIndices = [8, 15, 22, 28, 35]
      signalIndices.forEach((si) => {
        const x = chartPadding + si * (candleWidth + gap) + offsetRef.current
        if (x < chartPadding || x > w - chartPadding) return
        const candle = candles[si]
        const minPrice = 3310
        const maxPrice = 3335
        const priceRange = maxPrice - minPrice
        const scaleY = (h - 2 * chartPadding) / priceRange
        const yClose = h - chartPadding - (candle.close - minPrice) * scaleY
        const isBuy = candle.close >= candle.open

        // Signal badge
        const badgeY = isBuy ? yClose - 20 : yClose + 10
        ctx.fillStyle = isBuy ? "rgba(34,197,94,0.9)" : "rgba(225,29,72,0.9)"
        roundRect(ctx, x - 8, badgeY, 24, 12, 3)
        ctx.fill()
        ctx.fillStyle = "#fff"
        ctx.font = "bold 7px sans-serif"
        ctx.fillText(isBuy ? "BUY" : "SELL", x - 4, badgeY + 9)

        // Pulsing dot
        const pulseSize = Math.sin(frame * 0.08 + si) * 2 + 4
        ctx.beginPath()
        ctx.arc(x + candleWidth / 2, badgeY + 6, pulseSize, 0, Math.PI * 2)
        ctx.fillStyle = isBuy ? "rgba(34,197,94,0.3)" : "rgba(225,29,72,0.3)"
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  return (
    <div className="px-5 mb-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative bg-gradient-to-b from-[#0a0a0f] to-[#050508] border border-[#d4a843]/10 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 30px rgba(212,168,67,0.05)" }}
      >
        {/* Chart Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-[#d4a843]" />
            <span className="text-[10px] text-[#a0a0a0] font-mono">XAU/USD - 5M</span>
          </div>
          <motion.div
            className="flex items-center gap-1 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full px-2 py-0.5"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[8px] text-[#22c55e] font-bold">LIVE</span>
          </motion.div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: 200 }}
          className="block"
        />

        {/* Chart Footer */}
        <div className="flex items-center justify-around px-2 py-2 border-t border-[#1a1a1a]">
          {["Watchlist", "Chart", "Explore", "Ideas", "Menu"].map((item) => (
            <button key={item} className="flex items-center gap-1 text-[8px] text-[#666666] hover:text-[#d4a843] transition-colors">
              {item === "Watchlist" && <Eye size={9} />}
              {item === "Chart" && <BarChart3 size={9} />}
              {item === "Explore" && <Compass size={9} />}
              {item === "Ideas" && <Lightbulb size={9} />}
              {item === "Menu" && <Menu size={9} />}
              {item}
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
  const stats = [
    { label: "Active Signals", value: "12", icon: Radio, color: "#d4a843", sub: "+3 this hour" },
    { label: "Win Rate", value: "64%", icon: Target, color: "#22c55e", sub: "Last 30 days" },
    { label: "Profit Today", value: "$12.7K", icon: TrendingUp, color: "#22c55e", sub: "+8.4%" },
    { label: "Assets", value: "6", icon: Globe, color: "#3b82f6", sub: "XAU, EUR, BTC..." },
  ]

  return (
    <div className="px-5 mb-6">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-[#0a0a0f]/80 backdrop-blur border border-[#1f1f1f] rounded-xl p-3 relative overflow-hidden group hover:border-[#d4a843]/20 transition-all"
          >
            <div className="absolute top-0 right-0 w-12 h-12 opacity-5 group-hover:opacity-10 transition-opacity"
              style={{ background: `radial-gradient(circle, ${s.color} 0%, transparent 70%)` }} />
            <s.icon size={14} style={{ color: s.color }} className="mb-1" />
            <p className="text-[9px] text-[#666666] uppercase">{s.label}</p>
            <motion.p
              className="text-lg font-black"
              style={{ color: s.color }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
            >
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

function SignalsFeed() {
  const [signals] = useState(SIGNALS)

  return (
    <div className="px-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold flex items-center gap-1.5">
          <Radio size={12} className="text-[#d4a843]" /> Live Signals
        </h2>
        <span className="text-[8px] text-[#666666]">Real-time</span>
      </div>

      <div className="space-y-2">
        {signals.map((sig, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className={`flex items-center justify-between bg-[#0a0a0f]/60 backdrop-blur border rounded-xl px-3 py-2.5 ${
              sig.type === "BUY" ? "border-[#22c55e]/10" : "border-[#e11d48]/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                sig.type === "BUY" ? "bg-[#22c55e]/10" : "bg-[#e11d48]/10"
              }`}>
                {sig.type === "BUY" ? (
                  <TrendingUp size={14} className="text-[#22c55e]" />
                ) : (
                  <TrendingDown size={14} className="text-[#e11d48]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold ${sig.type === "BUY" ? "text-[#22c55e]" : "text-[#e11d48]"}`}>
                    {sig.type}
                  </span>
                  <span className="text-[9px] text-[#a0a0a0]">{sig.pair}</span>
                </div>
                <p className="text-[9px] text-[#666666]">{sig.time}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-mono font-bold text-white">${sig.price.toFixed(2)}</p>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: sig.type === "BUY" ? "#22c55e" : "#e11d48" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${sig.confidence}%` }}
                    transition={{ duration: 1.5, delay: 0.8 + i * 0.2 }}
                  />
                </div>
                <span className="text-[8px] text-[#666666]">{sig.confidence}%</span>
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

function AssetsGrid() {
  return (
    <div className="px-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold flex items-center gap-1.5">
          <Globe size={12} className="text-[#d4a843]" /> Trading Assets
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ASSETS.map((asset, i) => (
          <motion.div
            key={asset.pair}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="bg-[#0a0a0f]/60 border border-[#1f1f1f] rounded-xl p-3 hover:border-[#d4a843]/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-white">{asset.pair}</span>
              <div className={`flex items-center gap-0.5 ${asset.direction === "up" ? "text-[#22c55e]" : "text-[#e11d48]"}`}>
                {asset.direction === "up" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                <span className="text-[8px] font-bold">{asset.change > 0 ? "+" : ""}{asset.change}%</span>
              </div>
            </div>
            <motion.p
              className="text-sm font-black font-mono text-[#d4a843]"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
            >
              ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.p>
            {/* Mini sparkline */}
            <MiniSparkline direction={asset.direction} delay={i} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function MiniSparkline({ direction, delay }: { direction: string; delay: number }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const base = direction === "up" ? 50 - i * 2 : 30 + i * 2
    return base + Math.random() * 15
  })
  const path = points.map((p, i) => `${i * 8},${p}`).join(" ")
  const color = direction === "up" ? "#22c55e" : "#e11d48"

  return (
    <svg viewBox="0 0 88 60" className="w-full h-6 mt-1" preserveAspectRatio="none">
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.4"
      />
      <polygon
        points={`0,60 ${path} 88,60`}
        fill={`${color}10`}
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   BOTTOM CTA
   ═══════════════════════════════════════════ */

function BottomCTA() {
  const navigate = useNavigate()

  return (
    <div className="px-5 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#d4a843]/10 to-[#22c55e]/10 border border-[#d4a843]/20 rounded-2xl p-5 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(ellipse at center, #d4a843 0%, transparent 70%)" }} />
        <Sparkles size={20} className="text-[#d4a843] mx-auto mb-2" />
        <h3 className="text-sm font-bold mb-1">Ready to Trade Smarter?</h3>
        <p className="text-[10px] text-[#888888] mb-3">AI-powered analysis with 94% accuracy</p>
        <div className="flex gap-2 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/candles")}
            className="bg-[#d4a843] text-[#050505] font-bold text-[10px] px-4 py-2.5 rounded-xl hover:bg-[#e8c76a] transition-all flex items-center gap-1"
          >
            <Flame size={12} /> AI Predictor
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/vip")}
            className="bg-[#141414] border border-[#d4a843]/30 text-[#d4a843] font-bold text-[10px] px-4 py-2.5 rounded-xl hover:bg-[#d4a843]/10 transition-all flex items-center gap-1"
          >
            <Crown size={12} /> VIP Access
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   BOTTOM NAVIGATION
   ═══════════════════════════════════════════ */

function BottomNav() {
  const navigate = useNavigate()
  const [active] = useState("home")

  const items = [
    { id: "home", label: "Home", icon: LayoutDashboard, path: "/" },
    { id: "chart", label: "Chart", icon: LineChart, path: "/candles" },
    { id: "signals", label: "Signals", icon: Radio, path: "/vip" },
    { id: "wallet", label: "Wallet", icon: Wallet, path: "/vip" },
    { id: "profile", label: "Profile", icon: Shield, path: "/vip" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-[#1f1f1f]">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
              active === item.id
                ? "text-[#d4a843]"
                : "text-[#666666] hover:text-[#a0a0a0]"
            }`}
          >
            <item.icon size={16} />
            <span className="text-[7px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
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
