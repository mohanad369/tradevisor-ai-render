import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, ClipboardList,
  Hourglass, Loader2, Sparkles, Target, XCircle,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { useLanguage } from "@/lib/language"

/**
 * Execution Plan panel — the 11th agent's UI.
 *
 * Sits ABOVE the rest of the analysis (it's the most actionable piece).
 * Calls trpc.chart.executionPlan after the analysis renders. Two states:
 *   - WAIT  — agents don't agree, plan is suppressed and a clear "wait"
 *             message is shown instead.
 *   - GO    — full plan with order type, levels, instructions.
 *
 * Failure is non-blocking. If anything fails, the panel shrinks to a
 * single line saying the plan is unavailable.
 */

interface Props {
  assetName: string
  strategyName: string
  timeframe: string
  currentPrice?: number
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
  /** Pass the agents output from the pipeline result so consensus uses real data. */
  agents?: any
  /** Optional debate output once it arrives. */
  debate?: {
    verdict: "bull_wins" | "bear_wins" | "draw"
    confidence: number
    recommendation?: string
  } | null
}

const C = {
  primary: "#d4a843", primaryBg: "rgba(212,168,67,0.12)",
  buy: "#22c55e", sell: "#ef4444", warn: "#f59e0b",
  dim: "#7b8da3",
}

function orderTypeLabelKey(ot: string): string {
  if (ot === "BUY_LIMIT") return "exec.buyLimit"
  if (ot === "SELL_LIMIT") return "exec.sellLimit"
  if (ot === "BUY_MARKET") return "exec.buyMarket"
  if (ot === "SELL_MARKET") return "exec.sellMarket"
  return "exec.title"
}

export default function ExecutionPlanPanel(props: Props) {
  const { language, t, dir } = useLanguage()
  const exec = trpc.chart.executionPlan.useMutation()
  const [hasRun, setHasRun] = useState(false)

  // Fire the plan once per analysis result (re-runs if analysis changes
  // or the debate verdict arrives — both materially change the plan).
  useEffect(() => {
    if (hasRun || exec.isPending) return
    setHasRun(true)
    exec.mutate({
      language,
      assetName: props.assetName,
      strategyName: props.strategyName,
      timeframe: props.timeframe,
      currentPrice: props.currentPrice,
      analysis: props.analysis,
      agents: props.agents ?? null,
      debate: props.debate ?? null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.analysis.entry, props.analysis.signal, props.debate?.verdict])

  const result = exec.data
  const loading = exec.isPending || (!exec.isError && !result)
  const isBuy = props.analysis.signal === "BUY"
  const sideColor = isBuy ? C.buy : C.sell

  return (
    <motion.div
      dir={dir}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#d4a843]/30 bg-[#0d0d0d] p-4 sm:p-5"
      style={{ boxShadow: "0 0 30px rgba(212,168,67,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: C.primaryBg }}>
          <ClipboardList size={17} style={{ color: C.primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">{t("exec.title")}</h3>
          <p className="text-[10px] text-[#666666] truncate">{t("exec.subtitle")}</p>
        </div>
        {loading && <Loader2 size={14} className="animate-spin shrink-0" style={{ color: C.primary }} />}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-6 text-center">
          <p className="text-[11px] text-[#666666]">
            <Sparkles size={11} className="inline mx-1" />
            {t("exec.loading")}
          </p>
        </div>
      )}

      {/* API error or invalid result */}
      {(exec.isError || (result && !result.ok && result.orderType !== "WAIT")) && (
        <p className="text-[11px] text-[#666666] py-2 flex items-center gap-1.5">
          <AlertTriangle size={12} style={{ color: C.warn }} />
          {t("exec.errorTitle")}
          {result?.reason ? ` — ${result.reason}` : ""}
        </p>
      )}

      {/* WAIT verdict — consensus too weak */}
      {result && result.orderType === "WAIT" && (
        <div className="space-y-3">
          <div className="rounded-xl border p-3"
            style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.05)" }}>
            <div className="flex items-start gap-2">
              <Hourglass size={16} style={{ color: C.warn }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: C.warn }}>
                  {t("exec.waitTitle")}
                </p>
                <p className="text-[12px] text-[#c8d0d8] leading-relaxed">
                  {result.waitReason || ""}
                </p>
              </div>
            </div>
          </div>

          {/* Show the consensus breakdown for transparency */}
          <ConsensusBar
            agreementPercent={result.consensus.agreementPercent}
            bullishAgents={result.consensus.bullishAgents}
            bearishAgents={result.consensus.bearishAgents}
            neutralAgents={result.consensus.neutralAgents}
            totalAgents={result.consensus.totalAgents}
            passed={false}
            t={t}
          />
        </div>
      )}

      {/* GO verdict — full plan */}
      {result && result.ok && result.plan && result.orderType !== "WAIT" && (
        <div className="space-y-3">
          {/* Order type — big, prominent */}
          <div className="rounded-xl border p-3"
            style={{
              borderColor: `${sideColor}40`,
              background: `${sideColor}0d`,
            }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-[#666666]">
                {t("exec.orderType")}
              </span>
              {result.plan.confidenceLabel && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${sideColor}1f`, color: sideColor }}>
                  {result.plan.confidenceLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isBuy
                ? <ArrowUpRight size={20} style={{ color: sideColor }} />
                : <ArrowDownRight size={20} style={{ color: sideColor }} />}
              <span className="text-lg font-bold" style={{ color: sideColor }}>
                {t(orderTypeLabelKey(result.orderType))}
              </span>
            </div>
          </div>

          {/* Levels grid */}
          <div className="grid grid-cols-3 gap-2">
            <Cell label={t("exec.entry")} value={result.plan.entry} color="white" />
            <Cell label={t("exec.stopLoss")} value={result.plan.stopLoss} color={C.sell} />
            <Cell label={t("exec.targets")}
              value={result.plan.targets.map((x) => x.toFixed(2)).join(" · ")}
              color={C.buy} small />
          </div>

          {/* SMC structural zone — shown when the plan was built on real structure */}
          {result.smcZone && (
            <div className="rounded-xl border p-3"
              style={{ borderColor: "rgba(212,168,67,0.30)", background: "rgba(212,168,67,0.04)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} style={{ color: C.primary }} />
                  <span className="text-[10px] uppercase tracking-wide font-semibold"
                    style={{ color: C.primary }}>
                    {t("exec.smcZone")}
                  </span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: C.primary }}>
                  {result.smcZone.strength}/100
                </span>
              </div>
              <p className="text-[12px] text-[#c8d0d8] leading-relaxed mb-1.5">
                {result.smcZone.rationale}
              </p>
              <div className="flex items-center gap-2 text-[10px]" style={{ color: C.dim }}>
                <span>{t("exec.zone")}: {result.smcZone.bottom.toFixed(2)} – {result.smcZone.top.toFixed(2)}</span>
                {result.smcZone.signals.hasOrderBlock && <span>· OB</span>}
                {result.smcZone.signals.hasFvg && <span>· FVG</span>}
                {result.smcZone.signals.hasLiquiditySweep && <span>· {t("exec.liquiditySweep")}</span>}
              </div>
            </div>
          )}

          {/* Instructions */}
          {result.plan.instructions && (
            <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target size={12} style={{ color: C.primary }} />
                <span className="text-[10px] uppercase tracking-wide text-[#666666]">
                  {t("exec.instructions")}
                </span>
              </div>
              <p className="text-[12px] text-[#c8d0d8] leading-relaxed whitespace-pre-line">
                {result.plan.instructions}
              </p>
            </div>
          )}

          {/* Cancel condition */}
          {result.plan.cancelCondition && (
            <div className="flex items-start gap-2 rounded-xl border border-[#1f1f1f] bg-[#141414] p-3">
              <XCircle size={13} style={{ color: C.warn }} className="shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-[#666666] mb-0.5">
                  {t("exec.cancelIf")}
                </div>
                <p className="text-[12px] text-[#c8d0d8] leading-relaxed">
                  {result.plan.cancelCondition}
                </p>
              </div>
            </div>
          )}

          {/* Consensus reading */}
          <ConsensusBar
            agreementPercent={result.consensus.agreementPercent}
            bullishAgents={result.consensus.bullishAgents}
            bearishAgents={result.consensus.bearishAgents}
            neutralAgents={result.consensus.neutralAgents}
            totalAgents={result.consensus.totalAgents}
            passed={true}
            t={t}
          />

          <p className="text-[10px] text-[#666666] pt-1">
            {t("exec.disclaimer")}
          </p>
        </div>
      )}
    </motion.div>
  )
}

function Cell({ label, value, color, small }: { label: string; value: any; color: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-[#141414] border border-[#1f1f1f] px-2.5 py-2">
      <div className="text-[9px] text-[#666666] uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`${small ? "text-[10px]" : "text-sm"} font-bold leading-tight break-words`}
        style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function ConsensusBar({
  agreementPercent, bullishAgents, bearishAgents, neutralAgents, totalAgents, passed, t,
}: {
  agreementPercent: number
  bullishAgents: number
  bearishAgents: number
  neutralAgents: number
  totalAgents: number
  passed: boolean
  t: (key: string) => string
}) {
  const barColor = passed ? C.buy : C.warn
  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wide text-[#666666]">
          {t("exec.consensus")}
        </span>
        <span className="text-[10px] font-bold" style={{ color: barColor }}>
          {agreementPercent}% {t("exec.agentsAgree")}
        </span>
      </div>
      <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden mb-1.5">
        <div className="h-full transition-all"
          style={{ width: `${agreementPercent}%`, background: barColor }} />
      </div>
      <div className="flex items-center gap-3 text-[10px]" style={{ color: C.dim }}>
        <span><span style={{ color: C.buy }}>●</span> {bullishAgents}</span>
        <span><span style={{ color: C.sell }}>●</span> {bearishAgents}</span>
        <span><span style={{ color: C.dim }}>●</span> {neutralAgents}</span>
        <span className="ms-auto">/ {totalAgents}</span>
      </div>
    </div>
  )
}
