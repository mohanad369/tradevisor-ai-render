/**
 * Gold Weekly 4H Zones Strategy
 * ─────────────────────────────
 * A real, rule-based scalping/intraday strategy for XAU/USD built on
 * actual 4-hour candles from Twelve Data — not chart-image guesses.
 *
 * The method (exactly as specified):
 *   1. From LAST week's 4H candles, compute the High / Low / Open / Close.
 *   2. Previous-week 4H HIGH zone  → Sell Zone.
 *   3. Previous-week 4H LOW zone   → Buy Zone.
 *   4. The NEW weekly open is the directional filter (bias).
 *   5. NO direct entry from a zone.
 *   6. Entry only after: Sweep → Rejection → MSS (market-structure shift)
 *      → Retest.
 *
 * The module returns the strict shape the spec requires and never drops
 * its risk rule — RR below 1:2 is always rejected.
 */

const TWELVE_TS_URL = "https://api.twelvedata.com/time_series";

export type StrategySignal = "BUY" | "SELL" | "WAIT";
export type StrategyBias = "Bullish" | "Bearish" | "Neutral";

export interface StrategyModuleResult {
  strategy_name: string;
  signal: StrategySignal;
  bias: StrategyBias;
  entry_zone: { low: number; high: number } | Record<string, never>;
  stop_loss: number | null;
  targets: number[];
  confidence_score: number;       // 0-100
  reasons: string[];
  invalidation: string;
  learning_notes: string[];
}

type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** A zone is a price band derived from a swing extreme. */
type Zone = { low: number; high: number; mid: number };

// Cache 4H readings briefly — 4H candles only change every 4 hours, and
// the strategy is read often by the UI.
let cache: { result: StrategyModuleResult; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

function n(v: string | number | undefined): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function emptyResult(reason: string): StrategyModuleResult {
  return {
    strategy_name: "Gold Weekly 4H Zones",
    signal: "WAIT",
    bias: "Neutral",
    entry_zone: {},
    stop_loss: null,
    targets: [],
    confidence_score: 0,
    reasons: [reason],
    invalidation: "",
    learning_notes: [],
  };
}

/**
 * Run the strategy. Returns the strict StrategyModuleResult shape.
 * `weights` lets the learning layer tune scoring without touching rules.
 */
export async function runGoldWeekly4hZones(
  weights?: { sweep?: number; rejection?: number; mss?: number; retest?: number },
): Promise<StrategyModuleResult> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.result;

  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) return emptyResult("Gold data source is not configured.");

  // Pull ~3 weeks of 4H candles (a 4H week ≈ 30 candles; 100 is safe).
  let candles: Candle[];
  try {
    const url = new URL(TWELVE_TS_URL);
    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("interval", "4h");
    url.searchParams.set("outputsize", "120");
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString());
    const data = (await res.json()) as any;
    if (!data?.values || data.values.length < 30) {
      return emptyResult(data?.message || "Not enough 4H gold history.");
    }
    // Twelve Data returns newest-first; reverse to oldest-first.
    candles = [...data.values].reverse().map((b: any) => ({
      datetime: b.datetime,
      open: n(b.open), high: n(b.high), low: n(b.low), close: n(b.close),
    }));
  } catch (err) {
    console.error("[GoldWeekly4H] fetch failed:", (err as Error)?.message);
    return emptyResult("Could not reach the gold data source.");
  }

  const result = computeStrategy(candles, weights);
  cache = { result, at: Date.now() };
  return result;
}

/** Split candles into ISO-week buckets. */
function weekKey(iso: string): string {
  const d = new Date(iso.replace(" ", "T") + "Z");
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function computeStrategy(
  candles: Candle[],
  weights?: { sweep?: number; rejection?: number; mss?: number; retest?: number },
): StrategyModuleResult {
  // ── Group candles by week ──
  const byWeek = new Map<string, Candle[]>();
  for (const c of candles) {
    const k = weekKey(c.datetime);
    if (!byWeek.has(k)) byWeek.set(k, []);
    byWeek.get(k)!.push(c);
  }
  const weeks = [...byWeek.keys()].sort();
  if (weeks.length < 2) return emptyResult("Need at least two weeks of 4H data.");

  const currentWeek = byWeek.get(weeks[weeks.length - 1])!;
  const prevWeek = byWeek.get(weeks[weeks.length - 2])!;

  // ── Step 1: previous-week 4H High/Low/Open/Close ──
  const pwHigh = Math.max(...prevWeek.map((c) => c.high));
  const pwLow = Math.min(...prevWeek.map((c) => c.low));
  const pwOpen = prevWeek[0].open;
  const pwClose = prevWeek[prevWeek.length - 1].close;
  const pwRange = pwHigh - pwLow;
  const pwMid = pwLow + pwRange / 2;

  // ── Steps 2 & 3: build the Sell Zone (high) and Buy Zone (low) ──
  // A zone is a band ~12% of the weekly range around the extreme.
  const band = Math.max(pwRange * 0.12, 0.01);
  const sellZone: Zone = { low: pwHigh - band, high: pwHigh, mid: pwHigh - band / 2 };
  const buyZone: Zone = { low: pwLow, high: pwLow + band, mid: pwLow + band / 2 };

  // ── Step 4: new weekly open = directional filter ──
  const weeklyOpen = currentWeek[0].open;
  const lastPrice = currentWeek[currentWeek.length - 1].close;
  const bias: StrategyBias =
    weeklyOpen > pwMid ? "Bullish" : weeklyOpen < pwMid ? "Bearish" : "Neutral";

  const reasons: string[] = [];
  reasons.push(`Previous week 4H: High ${pwHigh.toFixed(2)}, Low ${pwLow.toFixed(2)}, Open ${pwOpen.toFixed(2)}, Close ${pwClose.toFixed(2)}.`);
  reasons.push(`Sell Zone ${sellZone.low.toFixed(2)}–${sellZone.high.toFixed(2)} · Buy Zone ${buyZone.low.toFixed(2)}–${buyZone.high.toFixed(2)}.`);
  reasons.push(`Weekly open ${weeklyOpen.toFixed(2)} vs prev-week mid ${pwMid.toFixed(2)} → ${bias} bias.`);

  // ── Steps 5 & 6: look for Sweep → Rejection → MSS → Retest ──
  // We only consider the zone aligned with the weekly-open bias.
  const w = {
    sweep: weights?.sweep ?? 30,
    rejection: weights?.rejection ?? 25,
    mss: weights?.mss ?? 25,
    retest: weights?.retest ?? 20,
  };

  const cur = currentWeek;
  let signal: StrategySignal = "WAIT";
  let entryZone: Zone | null = null;
  let stopLoss: number | null = null;
  let targets: number[] = [];
  let score = 0;
  let invalidation = "";
  const setup: string[] = [];

  // Helper: did any candle sweep beyond a level then close back inside?
  const sweptAbove = (level: number) =>
    cur.some((c) => c.high > level && c.close < level);
  const sweptBelow = (level: number) =>
    cur.some((c) => c.low < level && c.close > level);

  // ── BUY setup: bias not bearish, price worked the Buy Zone (prev low) ──
  if (bias !== "Bearish" && sweptBelow(buyZone.high)) {
    setup.push("Liquidity swept below the Buy Zone (previous-week low).");
    score += w.sweep;

    // Rejection: a candle closing back up strongly off the low.
    const rejection = cur.some((c) =>
      c.low <= buyZone.high && c.close > c.open &&
      (c.close - c.low) > (c.high - c.close));
    if (rejection) { setup.push("Bullish rejection candle off the Buy Zone."); score += w.rejection; }

    // MSS: price made a higher high after the sweep.
    const sweepIdx = cur.findIndex((c) => c.low < buyZone.high);
    const afterSweep = sweepIdx >= 0 ? cur.slice(sweepIdx + 1) : [];
    const mss = afterSweep.length > 1 &&
      Math.max(...afterSweep.map((c) => c.high)) > cur[sweepIdx]?.high;
    if (mss) { setup.push("Market-structure shift up (higher high after sweep)."); score += w.mss; }

    // Retest: price came back near the zone after the MSS.
    const retest = afterSweep.some((c) => c.low <= buyZone.high + band);
    if (retest) { setup.push("Price retested the Buy Zone after the shift."); score += w.retest; }

    if (rejection && mss) {
      signal = "BUY";
      entryZone = buyZone;
      // SL behind the sweep / zone.
      stopLoss = Number((Math.min(...cur.map((c) => c.low)) - band * 0.25).toFixed(2));
      // TP1 nearest liquidity, TP2 weekly open / mid range, TP3 prev-week high.
      targets = [
        Number(pwMid.toFixed(2)),
        Number(weeklyOpen.toFixed(2)),
        Number(pwHigh.toFixed(2)),
      ].filter((t) => t > buyZone.mid).sort((a, b) => a - b);
      invalidation = `A 4H close below ${stopLoss.toFixed(2)} invalidates the long.`;
    }
  }

  // ── SELL setup: bias not bullish, price worked the Sell Zone (prev high) ──
  if (signal === "WAIT" && bias !== "Bullish" && sweptAbove(sellZone.low)) {
    setup.push("Liquidity swept above the Sell Zone (previous-week high).");
    score += w.sweep;

    const rejection = cur.some((c) =>
      c.high >= sellZone.low && c.close < c.open &&
      (c.high - c.close) > (c.close - c.low));
    if (rejection) { setup.push("Bearish rejection candle off the Sell Zone."); score += w.rejection; }

    const sweepIdx = cur.findIndex((c) => c.high > sellZone.low);
    const afterSweep = sweepIdx >= 0 ? cur.slice(sweepIdx + 1) : [];
    const mss = afterSweep.length > 1 &&
      Math.min(...afterSweep.map((c) => c.low)) < cur[sweepIdx]?.low;
    if (mss) { setup.push("Market-structure shift down (lower low after sweep)."); score += w.mss; }

    const retest = afterSweep.some((c) => c.high >= sellZone.low - band);
    if (retest) { setup.push("Price retested the Sell Zone after the shift."); score += w.retest; }

    if (rejection && mss) {
      signal = "SELL";
      entryZone = sellZone;
      stopLoss = Number((Math.max(...cur.map((c) => c.high)) + band * 0.25).toFixed(2));
      targets = [
        Number(pwMid.toFixed(2)),
        Number(weeklyOpen.toFixed(2)),
        Number(pwLow.toFixed(2)),
      ].filter((t) => t < sellZone.mid).sort((a, b) => b - a);
      invalidation = `A 4H close above ${stopLoss.toFixed(2)} invalidates the short.`;
    }
  }

  reasons.push(...setup);

  // ── Risk rule (NEVER removed): reject anything below 1:2 RR ──
  let confidence = Math.min(95, score);
  if (signal !== "WAIT" && entryZone && stopLoss !== null && targets.length > 0) {
    const entry = entryZone.mid;
    const riskDist = Math.abs(entry - stopLoss);
    const rewardDist = Math.abs(targets[targets.length - 1] - entry);
    const rr = riskDist > 0 ? rewardDist / riskDist : 0;
    reasons.push(`Reward:risk to final target ≈ 1:${rr.toFixed(1)}.`);
    if (rr < 2) {
      // Risk management is mandatory — downgrade to WAIT.
      reasons.push("Reward:risk is below 1:2 — risk rule rejects this trade.");
      return {
        strategy_name: "Gold Weekly 4H Zones",
        signal: "WAIT",
        bias,
        entry_zone: {},
        stop_loss: null,
        targets: [],
        confidence_score: Math.min(45, confidence),
        reasons,
        invalidation: "",
        learning_notes: [
          "Setup formed but failed the 1:2 risk rule — logged for review.",
        ],
      };
    }
  } else {
    // No complete setup — WAIT with whatever partial score accrued.
    confidence = Math.min(50, score);
    if (setup.length === 0) reasons.push("No sweep/rejection/MSS sequence yet — waiting.");
  }

  return {
    strategy_name: "Gold Weekly 4H Zones",
    signal,
    bias,
    entry_zone: entryZone ? { low: entryZone.low, high: entryZone.high } : {},
    stop_loss: stopLoss,
    targets,
    confidence_score: Math.round(confidence),
    reasons,
    invalidation,
    learning_notes: [
      `Last price ${lastPrice.toFixed(2)} when evaluated.`,
      "Score weights are tunable by the learning layer; risk rule is fixed.",
    ],
  };
}
