import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Loader2, TrendingUp, TrendingDown, Scale, Gavel, MessageCircle,
  AlertTriangle, Sparkles,
} from "lucide-react"
import { trpc } from "@/lib/trpc"

/**
 * Bull vs Bear Debate panel — the 9th agent's UI.
 *
 * Renders after the main analysis result so the user sees the signal
 * fast, then watches the debate appear. Calls trpc.chart.debate which
 * runs a real LLM debate (bull → bear → judge) server-side.
 *
 * Failure is non-blocking: if the debate can't run, the panel quietly
 * shows a single line saying so and the rest of the analysis stays.
 */

interface Props {
  assetName: string
  strategyName: string
  timeframe: string
  analysis: {
    signal: "BUY" | "SELL"
    confidence: number
    entry: number
    stopLoss: number
    takeProfit1: number
    takeProfit2: number
    takeProfit3: number
    trend?: string
    marketStructure?: string
    reasons?: string[]
  }
  goldFlow?: { signal?: string; confidence?: number; notes?: string[] } | null
  goldStrategy?: { signal?: string; bias?: string } | null
  /** Optional — called once when the debate completes, so parents can pass
   *  the result into a follow-up panel (e.g. the Execution Plan agent). */
  onResult?: (verdict: "bull_wins" | "bear_wins" | "draw", confidence: number, recommendation: string) => void
}

export default function BullBearDebatePanel({
  assetName, strategyName, timeframe, analysis, goldFlow, goldStrategy, onResult,
}: Props) {
  const debate = trpc.chart.debate.useMutation()
  const [hasRun, setHasRun] = useState(false)

  // Fire the debate once per analysis result.
  useEffect(() => {
    if (hasRun || debate.isPending) return
    setHasRun(true)
    debate.mutate({
      assetName, strategyName, timeframe, analysis,
      goldFlow: goldFlow ?? null,
      goldStrategy: goldStrategy ?? null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.entry, analysis.signal])

  // Notify the parent once we have a successful debate result.
  useEffect(() => {
    if (onResult && debate.data && debate.data.ok) {
      onResult(debate.data.verdict, debate.data.confidence, debate.data.recommendation || "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate.data?.ok, debate.data?.verdict])

  const result = debate.data
  const loading = debate.isPending || (!debate.isError && !result)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.12)" }}>
          <Scale size={16} className="text-[#a78bfa]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Bull vs Bear Debate</h3>
          <p className="text-[10px] text-[#666666]">
            9th agent · independent review of this trade
          </p>
        </div>
        {loading && (
          <Loader2 size={14} className="animate-spin text-[#a78bfa] ml-auto" />
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-6 text-center">
          <p className="text-[11px] text-[#666666]">
            <Sparkles size={11} className="inline mr-1" />
            The agents are debating this setup…
          </p>
        </div>
      )}

      {/* Failure — non-blocking */}
      {debate.isError && (
        <p className="text-[11px] text-[#666666] py-2">
          Debate is unavailable right now. The rest of the analysis is still valid.
        </p>
      )}
      {result && !result.ok && (
        <p className="text-[11px] text-[#666666] py-2 flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-[#d4a843]" />
          {result.reason || "Debate is unavailable."}
        </p>
      )}

      {/* Full debate */}
      {result && result.ok && (
        <div className="space-y-3">
          {/* Bull */}
          <div className="rounded-xl border border-[#22c55e]/15 bg-[#22c55e]/[0.04] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={13} className="text-[#22c55e]" />
              <span className="text-[11px] font-bold text-[#22c55e]">Bull — take the trade</span>
            </div>
            <p className="text-[11px] text-[#c8d0d8] leading-relaxed whitespace-pre-line">
              {result.bullArgument}
            </p>
          </div>

          {/* Bear */}
          <div className="rounded-xl border border-[#ef4444]/15 bg-[#ef4444]/[0.04] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown size={13} className="text-[#ef4444]" />
              <span className="text-[11px] font-bold text-[#ef4444]">Bear — reject the trade</span>
            </div>
            <p className="text-[11px] text-[#c8d0d8] leading-relaxed whitespace-pre-line">
              {result.bearArgument}
            </p>
          </div>

          {/* Judge */}
          <div className="rounded-xl border border-[#a78bfa]/20 bg-[#a78bfa]/[0.05] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Gavel size={13} className="text-[#a78bfa]" />
              <span className="text-[11px] font-bold text-[#a78bfa]">Judge's verdict</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: result.verdict === "bull_wins"
                    ? "rgba(34,197,94,0.15)"
                    : result.verdict === "bear_wins"
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(123,141,163,0.15)",
                  color: result.verdict === "bull_wins"
                    ? "#22c55e"
                    : result.verdict === "bear_wins"
                    ? "#ef4444"
                    : "#7b8da3",
                }}>
                {result.verdict === "bull_wins"
                  ? "BULL WINS"
                  : result.verdict === "bear_wins"
                  ? "BEAR WINS"
                  : "DRAW"} · {result.confidence}%
              </span>
            </div>
            <p className="text-[11px] text-[#c8d0d8] leading-relaxed whitespace-pre-line mb-2">
              {result.judgeReasoning}
            </p>
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-[#a78bfa]/15">
              <MessageCircle size={12} className="text-[#a78bfa] mt-0.5 shrink-0" />
              <span className="text-[11px] font-semibold text-white">
                {result.recommendation}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-[#666666] pt-1">
            Independent debate by the 9th agent. Not financial advice — trading carries real risk.
          </p>
        </div>
      )}
    </motion.div>
  )
}
