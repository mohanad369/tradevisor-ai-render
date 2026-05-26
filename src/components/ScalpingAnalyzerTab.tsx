import { useState } from "react"
import { motion } from "framer-motion"
import {
  Upload, X, Loader2, TrendingUp, TrendingDown, Target,
  Layers, AlertTriangle, CheckCircle2, Zap,
} from "lucide-react"
import { trpc } from "@/lib/trpc"

/**
 * Multi-Timeframe Scalping Analyzer (VIP).
 *
 * The trader uploads up to three charts of the same asset — 15m, 5m,
 * and 1m — and Claude analyzes them top-down in one pass: the 15m sets
 * the bias, the 5m confirms structure, the 1m gives the precise entry,
 * stop, and targets. All three must agree for a high-confidence call.
 */

const FRAME_SLOTS = [
  { tf: "15m", label: "15-Minute", hint: "Trend & bias" },
  { tf: "5m", label: "5-Minute", hint: "Market structure" },
  { tf: "1m", label: "1-Minute", hint: "Entry timing" },
] as const

const ASSETS = [
  "XAU/USD (Gold)", "EUR/USD", "GBP/USD", "USD/JPY", "GBP/JPY",
  "BTC/USD", "ETH/USD",
]

type FrameImages = Record<string, string> // tf -> base64 data URI

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error("Could not read the image"))
    r.readAsDataURL(file)
  })
}

export default function ScalpingAnalyzerTab() {
  const [asset, setAsset] = useState(ASSETS[0])
  const [images, setImages] = useState<FrameImages>({})
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)

  const analyze = trpc.chart.analyzeScalping.useMutation()

  const handleUpload = async (tf: string, file: File | undefined) => {
    if (!file) return
    setError("")
    try {
      const dataUri = await fileToDataUri(file)
      setImages((prev) => ({ ...prev, [tf]: dataUri }))
    } catch {
      setError("Could not read that image. Try another file.")
    }
  }

  const removeImage = (tf: string) => {
    setImages((prev) => {
      const next = { ...prev }
      delete next[tf]
      return next
    })
  }

  const uploadedCount = Object.keys(images).length

  const handleAnalyze = async () => {
    setError("")
    setResult(null)
    const frames = FRAME_SLOTS
      .filter((s) => images[s.tf])
      .map((s) => ({ timeframe: s.tf, imageBase64: images[s.tf] }))

    if (frames.length === 0) {
      setError("Upload at least one chart to analyze.")
      return
    }

    try {
      const res = await analyze.mutateAsync({ assetName: asset, frames })
      setResult(res)
    } catch (err: any) {
      setError(err?.message || "Analysis failed. Please try again.")
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers size={20} className="text-[#d4a843]" />
          Multi-Timeframe Scalping Analyzer
        </h2>
        <p className="text-xs text-[#666666] mt-1">
          Upload the 15m, 5m, and 1m charts of the same asset. The AI reads
          them top-down for a precise scalping plan. All 3 give the best accuracy.
        </p>
      </div>

      {/* Asset selector */}
      <div>
        <label className="text-[10px] uppercase tracking-wide text-[#666666] block mb-1.5">
          Asset
        </label>
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="bg-[#141414] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#d4a843]/40"
        >
          {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Upload slots */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FRAME_SLOTS.map((slot) => {
          const img = images[slot.tf]
          return (
            <div key={slot.tf}
              className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-[#d4a843]">{slot.label}</div>
                  <div className="text-[9px] text-[#666666]">{slot.hint}</div>
                </div>
                {img && (
                  <button onClick={() => removeImage(slot.tf)}
                    className="text-[#666666] hover:text-[#e11d48]">
                    <X size={14} />
                  </button>
                )}
              </div>
              {img ? (
                <img src={img} alt={slot.label}
                  className="w-full h-28 object-cover rounded-lg border border-[#1f1f1f]" />
              ) : (
                <label className="flex flex-col items-center justify-center h-28 rounded-lg border border-dashed border-[#2a2a2a] cursor-pointer hover:border-[#d4a843]/40 transition-colors">
                  <Upload size={18} className="text-[#666666]" />
                  <span className="text-[9px] text-[#666666] mt-1">Upload chart</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleUpload(slot.tf, e.target.files?.[0])} />
                </label>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-lg p-3 text-[#e11d48] text-xs flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={analyze.isPending || uploadedCount === 0}
        className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {analyze.isPending
          ? <><Loader2 size={16} className="animate-spin" /> Analyzing {uploadedCount} timeframe{uploadedCount !== 1 ? "s" : ""}…</>
          : <><Zap size={16} /> Analyze Scalping Setup ({uploadedCount}/3)</>}
      </button>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-4 space-y-4"
        >
          {/* Verdict */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.signal === "BUY"
                ? <TrendingUp size={22} className="text-[#22c55e]" />
                : <TrendingDown size={22} className="text-[#e11d48]" />}
              <span className="text-2xl font-black"
                style={{ color: result.signal === "BUY" ? "#22c55e" : "#e11d48" }}>
                {result.signal}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-white">{result.confidence}%</div>
              <div className="text-[9px] text-[#666666]">confidence</div>
            </div>
          </div>

          {/* Alignment badge */}
          {result.alignment && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {result.alignment === "aligned"
                ? <CheckCircle2 size={13} className="text-[#22c55e]" />
                : <AlertTriangle size={13} className="text-[#d4a843]" />}
              <span style={{ color: result.alignment === "aligned" ? "#22c55e" : "#d4a843" }}>
                Timeframes: {result.alignment}
              </span>
            </div>
          )}

          {/* Timeframe bias */}
          {Array.isArray(result.timeframeBias) && result.timeframeBias.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {result.timeframeBias.map((b: any, i: number) => (
                <div key={i} className="rounded-lg bg-[#141414] p-2">
                  <div className="text-[9px] text-[#666666]">{b.timeframe}</div>
                  <div className="text-xs font-bold capitalize"
                    style={{ color: b.bias === "bullish" ? "#22c55e" : b.bias === "bearish" ? "#e11d48" : "#666666" }}>
                    {b.bias}
                  </div>
                  {b.note && <div className="text-[9px] text-[#888] mt-0.5">{b.note}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Trade levels */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Level label="Entry" value={result.entry} color="#d4a843" />
            <Level label="Stop Loss" value={result.stopLoss} color="#e11d48" />
            <Level label="TP1" value={result.takeProfit1} color="#22c55e" />
            <Level label="TP2" value={result.takeProfit2} color="#22c55e" />
            <Level label="TP3" value={result.takeProfit3} color="#22c55e" />
            <Level label="R:R" value={result.riskReward3} color="#38bdf8" />
          </div>

          {/* Reasons */}
          {Array.isArray(result.reasons) && result.reasons.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#666666] mb-1.5 flex items-center gap-1">
                <Target size={11} /> Analysis
              </div>
              <ul className="space-y-1">
                {result.reasons.map((r: string, i: number) => (
                  <li key={i} className="text-[11px] text-[#a0a0a0] flex gap-1.5">
                    <span className="text-[#d4a843]">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-[#666666] pt-2 border-t border-[#1f1f1f]">
            AI-generated scalping plan from your charts. Not a guarantee —
            trading carries real risk. Always use proper risk management.
          </p>
        </motion.div>
      )}
    </div>
  )
}

function Level({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-lg bg-[#141414] px-3 py-2">
      <div className="text-[9px] text-[#666666]">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>{value ?? "—"}</div>
    </div>
  )
}
