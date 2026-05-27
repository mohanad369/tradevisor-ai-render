import { motion } from "framer-motion"
import {
  Loader2, TrendingUp, TrendingDown, Minus, Target, Crosshair,
  AlertTriangle, ShieldCheck, Layers,
} from "lucide-react"
import { trpc } from "@/lib/trpc"

/**
 * Gold Weekly 4H Zones — VIP strategy tab.
 *
 * Shows the live, rule-based reading from the Gold Weekly 4H Zones
 * strategy: bias, sell/buy zones, the sweep→rejection→MSS→retest setup,
 * and a trade plan that always respects the 1:2 risk rule.
 */

const C = {
  gold: "#f5c542", dim: "#7b8da3", buy: "#22c55e", sell: "#ef4444",
}

export default function GoldStrategyTab() {
  const query = trpc.strategies.goldWeekly4h.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60 * 1000, // 4H candles change slowly
  })

  const data = query.data?.strategy_analysis?.weekly_4h_zones

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers size={20} style={{ color: C.gold }} />
          Gold Weekly 4H Zones Strategy
        </h2>
        <p className="text-xs text-[#666666] mt-1">
          A rule-based XAU/USD strategy on real 4-hour candles. Entry only after
          sweep → rejection → market-structure shift → retest. Always 1:2 risk minimum.
        </p>
      </div>

      {query.isLoading && (
        <div className="py-10 text-center">
          <Loader2 size={22} className="animate-spin mx-auto" style={{ color: C.gold }} />
          <p className="text-xs text-[#666666] mt-2">Reading the weekly 4H zones…</p>
        </div>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-4 space-y-4"
        >
          {/* Verdict */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.signal === "BUY"
                ? <TrendingUp size={22} style={{ color: C.buy }} />
                : data.signal === "SELL"
                ? <TrendingDown size={22} style={{ color: C.sell }} />
                : <Minus size={22} style={{ color: C.dim }} />}
              <span className="text-2xl font-black"
                style={{ color: data.signal === "BUY" ? C.buy : data.signal === "SELL" ? C.sell : C.dim }}>
                {data.signal}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-white">{data.confidence_score}</div>
              <div className="text-[9px] text-[#666666]">strategy score</div>
            </div>
          </div>

          {/* Bias */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <Crosshair size={13} style={{ color: C.gold }} />
            <span className="text-[#a0a0a0]">Weekly bias:</span>
            <span className="font-bold"
              style={{ color: data.bias === "Bullish" ? C.buy : data.bias === "Bearish" ? C.sell : C.dim }}>
              {data.bias}
            </span>
          </div>

          {/* Trade plan — only when actionable */}
          {data.signal !== "WAIT" && data.stop_loss !== null && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {data.entry_zone && "low" in data.entry_zone && (
                <Cell label="Entry Zone"
                  value={`${(data.entry_zone as any).low?.toFixed(2)}–${(data.entry_zone as any).high?.toFixed(2)}`}
                  color={C.gold} />
              )}
              <Cell label="Stop Loss" value={data.stop_loss?.toFixed(2)} color={C.sell} />
              {data.targets?.map((t: number, i: number) => (
                <Cell key={i} label={`TP${i + 1}`} value={t.toFixed(2)} color={C.buy} />
              ))}
            </div>
          )}

          {/* Invalidation */}
          {data.invalidation && (
            <div className="flex items-start gap-1.5 text-[11px] rounded-lg bg-[#e11d48]/8 p-2">
              <AlertTriangle size={12} style={{ color: C.sell }} className="mt-0.5 shrink-0" />
              <span className="text-[#a0a0a0]">{data.invalidation}</span>
            </div>
          )}

          {/* Reasons */}
          {Array.isArray(data.reasons) && data.reasons.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#666666] mb-1.5 flex items-center gap-1">
                <Target size={11} /> Strategy logic
              </div>
              <ul className="space-y-1">
                {data.reasons.map((r: string, i: number) => (
                  <li key={i} className="text-[11px] text-[#a0a0a0] flex gap-1.5">
                    <span style={{ color: C.gold }}>•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk rule badge */}
          <div className="flex items-center gap-1.5 text-[10px] pt-2 border-t border-[#1f1f1f]"
            style={{ color: C.dim }}>
            <ShieldCheck size={12} style={{ color: C.buy }} />
            Risk rule enforced: trades below 1:2 reward:risk are always rejected.
          </div>

          <p className="text-[10px] text-[#666666]">
            Rule-based analysis on live gold data. Not a guarantee — trading
            carries real risk.
          </p>
        </motion.div>
      )}
    </div>
  )
}

function Cell({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-lg bg-[#141414] px-3 py-2">
      <div className="text-[9px] text-[#666666]">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>{value ?? "—"}</div>
    </div>
  )
}
