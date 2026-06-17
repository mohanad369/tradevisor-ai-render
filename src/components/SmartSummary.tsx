import { motion } from "framer-motion"
import { CheckCircle2, AlertTriangle, Activity, GitFork, Scale } from "lucide-react"
import { useLanguage } from "@/lib/language"

/**
 * SmartSummary
 * ────────────
 * Condenses the output of every agent panel (Gold Flow, Fractal,
 * Bull/Bear Debate, SMC) into ONE plain-language sentence each. This is
 * what the everyday user sees by default — not the 4 separate technical
 * panels. The technical panels still exist (inside the collapsible
 * "show details" section); this is the friendly face.
 *
 * Design rules:
 *   - One line per agent, max.
 *   - No technical acronyms (BSL, SSL, FVG, OB...) in the visible text.
 *   - Use color (green/red/yellow) for instant scan-ability.
 *   - Skip agents that have nothing useful to say (gold-only ones on
 *     non-gold assets, etc.).
 */

interface AgentSummaryItem {
  icon: any
  text: string
  tone: "positive" | "negative" | "neutral"
}

interface Props {
  /** From result.agents — passed straight through from the analyzer. */
  agents?: any
  /** Debate verdict carried by the parent (set when BullBearDebatePanel resolves). */
  debate?: {
    verdict: "bull_wins" | "bear_wins" | "draw"
    confidence: number
    recommendation?: string
  } | null
  /** From result — the signal the analysis itself produced. */
  signal: "BUY" | "SELL"
}

export default function SmartSummary({ agents, debate, signal }: Props) {
  const { t } = useLanguage()
  const items: AgentSummaryItem[] = []

  // ── Gold Flow Agent ──────────────────────────────────────────────
  // Lives outside `agents` (it's a sibling component), but if it's
  // present we can summarize its presence as "live gold momentum".
  // For now we skip it here because the panel is self-displaying;
  // if the user opens details, they see it directly.

  // ── Fractal Pattern Agent ────────────────────────────────────────
  const fractal = agents?.fractalAgent
  if (fractal?.status === "active" && fractal?.combined?.lean) {
    const lean = String(fractal.combined.lean).toLowerCase()
    const conf = Number(fractal.combined.confidence) || 0
    const matchesSignal =
      (signal === "BUY" && lean === "bullish") ||
      (signal === "SELL" && lean === "bearish")
    const oppositesSignal =
      (signal === "BUY" && lean === "bearish") ||
      (signal === "SELL" && lean === "bullish")

    if (matchesSignal) {
      items.push({
        icon: GitFork,
        text: t("summary.fractal.agrees").replace("{conf}", String(conf)),
        tone: "positive",
      })
    } else if (oppositesSignal) {
      items.push({
        icon: GitFork,
        text: t("summary.fractal.disagrees").replace("{conf}", String(conf)),
        tone: "negative",
      })
    } else {
      items.push({
        icon: GitFork,
        text: t("summary.fractal.mixed"),
        tone: "neutral",
      })
    }
  }

  // ── Gold Strategy Agent ──────────────────────────────────────────
  const goldStrategy = agents?.goldStrategyAgent
  if (goldStrategy?.signal) {
    const sig = String(goldStrategy.signal).toUpperCase()
    const agrees = sig === signal
    if (sig === "WAIT") {
      items.push({
        icon: Activity,
        text: t("summary.strategy.wait"),
        tone: "neutral",
      })
    } else if (agrees) {
      items.push({
        icon: Activity,
        text: t("summary.strategy.confirms"),
        tone: "positive",
      })
    } else {
      items.push({
        icon: Activity,
        text: t("summary.strategy.conflicts"),
        tone: "negative",
      })
    }
  }

  // ── Bull vs Bear Debate ──────────────────────────────────────────
  if (debate) {
    const conf = Number(debate.confidence) || 0
    if (debate.verdict === "draw") {
      items.push({
        icon: Scale,
        text: t("summary.debate.draw"),
        tone: "neutral",
      })
    } else {
      const supportsSignal =
        (signal === "BUY" && debate.verdict === "bull_wins") ||
        (signal === "SELL" && debate.verdict === "bear_wins")
      items.push({
        icon: Scale,
        text: supportsSignal
          ? t("summary.debate.supports").replace("{conf}", String(conf))
          : t("summary.debate.opposes").replace("{conf}", String(conf)),
        tone: supportsSignal ? "positive" : "negative",
      })
    }
  }

  // If we have nothing to show, don't render an empty card.
  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 size={14} className="text-[#22c55e]" />
        <h3 className="text-xs font-bold text-white uppercase tracking-wide">
          {t("summary.title")}
        </h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon
          const color =
            item.tone === "positive" ? "#22c55e" :
            item.tone === "negative" ? "#ef4444" : "#7b8da3"
          return (
            <li key={i} className="flex items-start gap-2">
              <Icon size={13} className="shrink-0 mt-0.5" style={{ color }} />
              <span className="text-[12px] text-[#c8d0d8] leading-relaxed">
                {item.text}
              </span>
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}
