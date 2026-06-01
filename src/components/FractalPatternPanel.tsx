import { motion } from "framer-motion"
import {
  GitFork, TrendingUp, TrendingDown, Activity, Clock,
  AlertTriangle, CheckCircle2, Layers,
} from "lucide-react"

/**
 * Fractal Pattern Agent UI panel.
 *
 * Displays the multi-timeframe analog pattern reading: combined verdict
 * across 4 timeframes, top matching historical patterns, and current
 * hour seasonality. Renders inside the analysis result; gold-only.
 */

interface FractalReading {
  ok?: boolean
  reason?: string
  byTimeframe?: Array<{
    timeframe: string
    candlesAnalyzed: number
    analogs: Array<{
      endedAt: string
      ageDays: number
      distance: number
      forwardMovePercent: number
      forwardDirection: "up" | "down" | "flat"
    }>
    upProbability: number
    avgForwardMove: number
    consistency: number
    lean: "bullish" | "bearish" | "mixed"
  }>
  combined?: {
    lean: "bullish" | "bearish" | "mixed"
    bullishScore: number
    bearishScore: number
    confidence: number
    expectedMovePercent: number
  }
  seasonality?: {
    currentHourUTC: number
    sampleSize: number
    upRate: number
    avgHourlyMove: number
  }
  reasons?: string[]
  agreementWithChart?: "confirms" | "conflicts" | "neutral"
  status?: "active" | "standby"
}

interface Props {
  reading: FractalReading | null | undefined
}

const C = {
  primary: "#06b6d4", dim: "#7b8da3", bull: "#22c55e", bear: "#ef4444", warn: "#f59e0b",
}

const TIMEFRAME_LABELS: Record<string, string> = {
  "1h": "1H", "4h": "4H", "1day": "Daily", "1week": "Weekly",
}

export default function FractalPatternPanel({ reading }: Props) {
  if (!reading) return null
  if (reading.status === "standby" || !reading.ok || !reading.combined) {
    return (
      <div className="mt-4 rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitFork size={16} style={{ color: C.primary }} />
          <h3 className="text-sm font-bold text-white">Fractal Pattern Agent</h3>
        </div>
        <p className="text-[11px] text-[#666666]">
          {reading.reason || "Fractal data is not available for this analysis."}
        </p>
      </div>
    )
  }

  const c = reading.combined
  const leanColor = c.lean === "bullish" ? C.bull : c.lean === "bearish" ? C.bear : C.warn
  const agreement = reading.agreementWithChart

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${C.primary}20` }}>
          <GitFork size={16} style={{ color: C.primary }} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">Fractal Pattern Agent</h3>
          <p className="text-[10px] text-[#666666]">
            10th agent · historical analog patterns across multiple timeframes
          </p>
        </div>
        {agreement && agreement !== "neutral" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: agreement === "confirms" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: agreement === "confirms" ? C.bull : C.bear,
            }}>
            {agreement === "confirms" ? "AGREES" : "DISAGREES"}
          </span>
        )}
      </div>

      {/* Combined verdict */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Cell label="Lean" value={c.lean.toUpperCase()} color={leanColor} />
        <Cell label="Bull / Bear" value={`${c.bullishScore} / ${c.bearishScore}`} color="white" />
        <Cell label="Confidence" value={`${c.confidence}%`} color={C.primary} />
        <Cell label="Avg expected"
          value={`${c.expectedMovePercent > 0 ? "+" : ""}${c.expectedMovePercent}%`}
          color={c.expectedMovePercent > 0 ? C.bull : c.expectedMovePercent < 0 ? C.bear : C.dim} />
      </div>

      {/* Per timeframe */}
      {reading.byTimeframe && reading.byTimeframe.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-[10px] uppercase tracking-wide text-[#666666] flex items-center gap-1">
            <Layers size={11} /> By timeframe
          </div>
          {reading.byTimeframe.map((tf) => (
            <div key={tf.timeframe}
              className="rounded-lg border border-[#1f1f1f] bg-[#141414] p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">
                  {TIMEFRAME_LABELS[tf.timeframe] || tf.timeframe}
                </span>
                <span className="text-[10px] font-bold capitalize"
                  style={{ color: tf.lean === "bullish" ? C.bull : tf.lean === "bearish" ? C.bear : C.warn }}>
                  {tf.lean} · {tf.upProbability}% up
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#7b8da3]">
                <span>{tf.analogs.length} analogs</span>
                <span>·</span>
                <span>avg {tf.avgForwardMove > 0 ? "+" : ""}{tf.avgForwardMove}%</span>
                <span>·</span>
                <span>scanned {tf.candlesAnalyzed} candles</span>
              </div>
              {/* Show closest analog */}
              {tf.analogs[0] && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                  <Clock size={10} style={{ color: C.dim }} />
                  <span className="text-[#7b8da3]">
                    Closest match: {tf.analogs[0].ageDays} days ago →
                  </span>
                  <span style={{
                    color: tf.analogs[0].forwardDirection === "up" ? C.bull
                      : tf.analogs[0].forwardDirection === "down" ? C.bear : C.dim
                  }}>
                    {tf.analogs[0].forwardDirection === "up"
                      ? <TrendingUp size={10} className="inline" />
                      : tf.analogs[0].forwardDirection === "down"
                      ? <TrendingDown size={10} className="inline" />
                      : null}
                    {" "}{tf.analogs[0].forwardMovePercent > 0 ? "+" : ""}
                    {tf.analogs[0].forwardMovePercent}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Time-of-day seasonality */}
      {reading.seasonality && reading.seasonality.sampleSize > 0 && (
        <div className="rounded-lg border border-[#1f1f1f] bg-[#141414] p-2.5 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={11} style={{ color: C.primary }} />
            <span className="text-[10px] uppercase tracking-wide text-[#666666]">
              Time-of-day seasonality
            </span>
          </div>
          <p className="text-[11px] text-[#a0a0a0]">
            Hour {reading.seasonality.currentHourUTC}:00 UTC has gone up{" "}
            <span style={{ color: reading.seasonality.upRate >= 50 ? C.bull : C.bear }}>
              {reading.seasonality.upRate}% of the time
            </span>
            {" "}historically (n={reading.seasonality.sampleSize}, avg{" "}
            <span style={{ color: reading.seasonality.avgHourlyMove > 0 ? C.bull : C.bear }}>
              {reading.seasonality.avgHourlyMove > 0 ? "+" : ""}
              {reading.seasonality.avgHourlyMove}%
            </span>).
          </p>
        </div>
      )}

      <p className="text-[10px] text-[#666666] flex items-start gap-1.5 pt-2 border-t border-[#1f1f1f]">
        <AlertTriangle size={10} style={{ color: C.warn }} className="mt-0.5 shrink-0" />
        Historical analogs are not predictions — past patterns don't guarantee future moves.
        Use this as ONE input among the other agents.
      </p>
    </motion.div>
  )
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-[#141414] px-2.5 py-2">
      <div className="text-[9px] text-[#666666] uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color }}>{value}</div>
    </div>
  )
}
