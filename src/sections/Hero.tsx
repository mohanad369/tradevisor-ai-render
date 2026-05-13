import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown, Activity, Zap, Globe,
  Radio, ArrowUpRight, ArrowDownRight,
  BarChart3, Eye, Compass, Lightbulb, Menu, Target
} from "lucide-react"

/* ═══════════════════════════════════════════
   LIVING HERO - Pulsing, breathing, alive
   ═══════════════════════════════════════════ */

const SIGNALS = [
  { type: "BUY" as const, price: 3325.50, time: "2 min ago", pair: "XAU/USD", conf: 94 },
  { type: "SELL" as const, price: 67250.00, time: "5 min ago", pair: "BTC/USD", conf: 87 },
  { type: "BUY" as const, price: 1.0850, time: "8 min ago", pair: "EUR/USD", conf: 91 },
  { type: "SELL" as const, price: 145.20, time: "12 min ago", pair: "USD/JPY", conf: 82 },
  { type: "BUY" as const, price: 38520.00, time: "15 min ago", pair: "US30", conf: 89 },
]

const ASSETS = [
  { pair: "XAU/USD", price: 3325.50, change: 1.24, dir: "up" as const },
  { pair: "BTC/USD", price: 67250.00, change: -0.82, dir: "down" as const },
  { pair: "EUR/USD", price: 1.0850, change: 0.56, dir: "up" as const },
  { pair: "GBP/USD", price: 1.2650, change: 0.31, dir: "up" as const },
  { pair: "USD/JPY", price: 145.20, change: -0.15, dir: "down" as const },
  { pair: "US30", price: 38520.00, change: 0.78, dir: "up" as const },
]

export default function Hero() {
  return (
    <section className="relative bg-[#030305] text-white overflow-hidden pt-20 pb-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <LivingParticles />
      </div>
      <div className="relative z-10">
        <ProfitHeader />
        <LiveChart />
        <StatsGrid />
        <SignalsFeed />
        <AssetsGrid />
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      {/* Profits */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] text-[#666666] uppercase tracking-wider mb-1">Total Profits</p>
          <motion.div className="text-3xl sm:text-4xl font-black text-[#d4a843]"
            animate={{ textShadow: ["0 0 10px rgba(212,168,67,0.3)", "0 0 25px rgba(212,168,67,0.5)", "0 0 10px rgba(212,168,67,0.3)"] }}
            transition={{ duration: 2, repeat: Infinity }}>
            $2.4M+
          </motion.div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={10} className="text-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e]">+$12,700 today</span>
          </div>
        </div>

        <motion.div className="bg-[#0a0a0a]/80 backdrop-blur border border-[#22c55e]/20 rounded-2xl px-5 py-3 text-center"
          animate={{ borderColor: ["rgba(34,197,94,0.2)", "rgba(34,197,94,0.5)", "rgba(34,197,94,0.2)"] }}
          transition={{ duration: 3, repeat: Infinity }}>
          <p className="text-[9px] text-[#666666] uppercase tracking-wider">Win Rate</p>
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

function LiveChart() {
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
          <motion.div className="flex items-center gap-1 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full px-2 py-0.5"
            animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[8px] text-[#22c55e] font-bold">LIVE</span>
          </motion.div>
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
  const stats = [
    { label: "Active Signals", value: "12", icon: Radio, color: "#d4a843", sub: "+3 this hour" },
    { label: "Win Rate", value: "78%", icon: Target, color: "#22c55e", sub: "Last 30 days" },
    { label: "Profit Today", value: "$12.7K", icon: TrendingUp, color: "#22c55e", sub: "+8.4%" },
    { label: "Assets", value: "6", icon: Globe, color: "#3b82f6", sub: "XAU, EUR, BTC..." },
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

function SignalsFeed() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold flex items-center gap-1.5">
          <Radio size={12} className="text-[#d4a843]" /> Live Signals
        </h2>
        <span className="text-[8px] text-[#666666]">Real-time</span>
      </div>

      <div className="space-y-2">
        {SIGNALS.map((sig, i) => (
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
              <p className="text-[10px] font-mono font-bold text-white">${sig.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
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

function AssetsGrid() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold flex items-center gap-1.5">
          <Globe size={12} className="text-[#d4a843]" /> Trading Assets
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ASSETS.map((a, i) => (
          <motion.div key={a.pair} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.08 }}
            className="bg-[#0a0a0f]/60 border border-[#1f1f1f] rounded-xl p-3 hover:border-[#d4a843]/15 transition-all group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-white">{a.pair}</span>
              <div className={`flex items-center gap-0.5 ${a.dir === "up" ? "text-[#22c55e]" : "text-[#e11d48]"}`}>
                {a.dir === "up" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                <span className="text-[8px] font-bold">{a.change > 0 ? "+" : ""}{a.change}%</span>
              </div>
            </div>
            <motion.p className="text-sm font-black font-mono text-[#d4a843]"
              animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}>
              ${a.price.toLocaleString(undefined, { minimumFractionDigits: a.price > 1000 ? 0 : 4, maximumFractionDigits: a.price > 1000 ? 0 : 4 })}
            </motion.p>
            <MiniSparkline dir={a.dir} />
          </motion.div>
        ))}
      </div>
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
