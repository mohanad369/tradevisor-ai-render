import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  Activity, TrendingUp, TrendingDown, Minus, Gauge, Loader2,
  ArrowUpRight, ArrowDownRight, Layers,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Gold Flow Agent — the 7th agent, specialised in XAU/USD.
 *
 * Shows a live, computed flow reading (momentum, buy/sell pressure,
 * volatility, key levels) derived from real gold candles. Designed to
 * sit alongside the chart analysis result as one more agent opinion.
 *
 * Renders only when the selected asset is gold.
 */

const GOLD = "#f5c542";
const G_DIM = "#7b8da3";
const G_PANEL = "rgba(245,197,66,0.06)";
const G_BORDER = "rgba(245,197,66,0.22)";

export default function GoldFlowAgent({ assetName }: { assetName: string }) {
  const isGold = /xau|gold|ذهب/i.test(assetName || "");

  const flow = trpc.goldFlow.reading.useQuery(
    { interval: "5min" },
    { enabled: isGold, retry: false, refetchInterval: 60_000 },
  );

  if (!isGold) return null;

  const data = flow.data;

  const signalColor =
    data?.signal === "BUY" ? "#22c55e"
    : data?.signal === "SELL" ? "#ef4444"
    : G_DIM;

  const SignalIcon =
    data?.signal === "BUY" ? ArrowUpRight
    : data?.signal === "SELL" ? ArrowDownRight
    : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: G_BORDER, background: G_PANEL }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(245,197,66,0.14)" }}>
            <Gauge size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Gold Flow Agent</h3>
            <p className="text-[10px]" style={{ color: G_DIM }}>
              Live XAU/USD flow read · 7th agent
            </p>
          </div>
        </div>
        {flow.isFetching && <Loader2 size={14} className="animate-spin" style={{ color: GOLD }} />}
      </div>

      {/* Loading */}
      {flow.isLoading && (
        <div className="py-6 text-center">
          <Loader2 size={20} className="animate-spin mx-auto" style={{ color: GOLD }} />
          <p className="text-[11px] mt-2" style={{ color: G_DIM }}>Reading gold flow…</p>
        </div>
      )}

      {/* Unavailable */}
      {data && !data.ok && (
        <p className="text-[11px] py-3 text-center" style={{ color: G_DIM }}>
          {data.reason || "Gold flow is temporarily unavailable."}
        </p>
      )}

      {/* Reading */}
      {data && data.ok && (
        <>
          {/* Verdict + confidence */}
          <div className="flex items-center justify-between rounded-xl p-3 mb-3"
            style={{ background: "rgba(0,0,0,0.25)" }}>
            <div className="flex items-center gap-2">
              <SignalIcon size={20} style={{ color: signalColor }} />
              <div>
                <div className="text-lg font-black" style={{ color: signalColor }}>
                  {data.signal}
                </div>
                <div className="text-[10px]" style={{ color: G_DIM }}>flow verdict</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-white">{data.confidence}%</div>
              <div className="text-[10px]" style={{ color: G_DIM }}>confidence</div>
            </div>
          </div>

          {/* Metric grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <Metric
              icon={data.momentum.direction === "up"
                ? <TrendingUp size={13} />
                : data.momentum.direction === "down"
                ? <TrendingDown size={13} />
                : <Minus size={13} />}
              label="Momentum"
              value={data.momentum.direction}
              sub={`${data.momentum.strengthPct}% strength`}
            />
            <Metric
              icon={<Activity size={13} />}
              label="Pressure"
              value={data.pressure.side}
              sub={`${data.pressure.scorePct}% score`}
            />
            <Metric
              icon={<Gauge size={13} />}
              label="Volatility"
              value={data.volatility.state}
              sub={`${data.volatility.ratio}× avg`}
            />
            <Metric
              icon={<Layers size={13} />}
              label="Velocity"
              value={String(data.velocityPerBar)}
              sub="per bar"
            />
          </div>

          {/* Key levels */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-3 text-xs"
            style={{ background: "rgba(0,0,0,0.2)" }}>
            <span style={{ color: "#ef4444" }}>
              Support {data.keyLevels.support.toFixed(2)}
            </span>
            <span className="text-white font-semibold">
              {data.price.toFixed(2)}
            </span>
            <span style={{ color: "#22c55e" }}>
              Resistance {data.keyLevels.resistance.toFixed(2)}
            </span>
          </div>

          {/* Notes */}
          <ul className="space-y-1">
            {data.notes.map((note, i) => (
              <li key={i} className="text-[11px] flex gap-1.5" style={{ color: G_DIM }}>
                <span style={{ color: GOLD }}>•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>

          <p className="text-[10px] mt-3 pt-2 border-t" style={{ color: G_DIM, borderColor: G_BORDER }}>
            Computed from live gold candles. One agent input among the others —
            not a guarantee. Trading carries risk.
          </p>
        </>
      )}
    </motion.div>
  );
}

function Metric({ icon, label, value, sub }: {
  icon: ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-lg p-2" style={{ background: "rgba(0,0,0,0.2)" }}>
      <div className="flex items-center gap-1 mb-0.5" style={{ color: GOLD }}>
        {icon}
        <span className="text-[9px] uppercase tracking-wide" style={{ color: G_DIM }}>{label}</span>
      </div>
      <div className="text-xs font-bold text-white capitalize">{value}</div>
      <div className="text-[9px]" style={{ color: G_DIM }}>{sub}</div>
    </div>
  );
}
