/**
 * Gold Flow Agent
 * ───────────────
 * A seventh analysis agent focused only on XAU/USD (gold).
 *
 * It does NOT pretend to be a Bookmap-style order-book feed — real gold
 * order flow is OTC and not publicly available. Instead it derives
 * genuine, defensible flow signals from recent price candles returned by
 * Twelve Data's time_series endpoint:
 *
 *   - momentum     : direction + strength of the recent move
 *   - pressure     : are candles closing near highs (buy) or lows (sell)?
 *   - volatility   : current range expansion vs the recent average
 *   - velocity     : how fast price is moving per bar
 *   - keyLevels    : intraday support / resistance from real swing points
 *
 * These are real, computed metrics — not random numbers — so the agent's
 * verdict can be trusted as one honest input among the other agents.
 */

const TWELVE_TS_URL = "https://api.twelvedata.com/time_series";

export type GoldFlowSignal = "BUY" | "SELL" | "NEUTRAL";

export type GoldFlowReading = {
  ok: boolean;
  reason?: string;
  signal: GoldFlowSignal;
  confidence: number;          // 0-100
  price: number;
  momentum: { direction: "up" | "down" | "flat"; strengthPct: number };
  pressure: { side: "buyers" | "sellers" | "balanced"; scorePct: number };
  volatility: { state: "expanding" | "calm" | "normal"; ratio: number };
  velocityPerBar: number;
  keyLevels: { support: number; resistance: number };
  notes: string[];
  fetchedAt: number;
};

type TwelveBar = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
};

type TwelveTimeSeries = {
  values?: TwelveBar[];
  status?: string;
  message?: string;
  code?: number;
};

// Cache — the agent is read often by the UI. 5-minute candles update
// at most every 5 minutes, so a 2-minute cache is a safe upper bound
// that still keeps the reading fresh from the user's perspective.
let cache: { reading: GoldFlowReading; at: number } | null = null;
const CACHE_TTL_MS = 120_000;

function num(v: string | undefined, fallback = 0): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function neutralReading(reason: string): GoldFlowReading {
  return {
    ok: false,
    reason,
    signal: "NEUTRAL",
    confidence: 0,
    price: 0,
    momentum: { direction: "flat", strengthPct: 0 },
    pressure: { side: "balanced", scorePct: 0 },
    volatility: { state: "normal", ratio: 1 },
    velocityPerBar: 0,
    keyLevels: { support: 0, resistance: 0 },
    notes: ["Gold flow data is temporarily unavailable."],
    fetchedAt: Date.now(),
  };
}

/**
 * Fetch the latest gold flow reading. `interval` accepts Twelve Data
 * intervals like "5min", "15min", "1h". Defaults to 5min for an
 * intraday flow read.
 */
export async function getGoldFlow(interval = "5min"): Promise<GoldFlowReading> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.reading;
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return neutralReading("Gold data source is not configured.");
  }

  let bars: TwelveBar[];
  try {
    const url = new URL(TWELVE_TS_URL);
    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "40");
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString());
    const data = (await res.json()) as TwelveTimeSeries;
    if (!data.values || data.values.length < 10) {
      return neutralReading(data.message || "Not enough gold price history.");
    }
    // Twelve Data returns newest-first; reverse to oldest-first.
    bars = [...data.values].reverse();
  } catch (err) {
    console.error("[GoldFlow] fetch failed:", (err as Error)?.message);
    return neutralReading("Could not reach the gold data source.");
  }

  const reading = computeFlow(bars);
  cache = { reading, at: Date.now() };
  return reading;
}

/** Core math — turns raw candles into flow metrics. */
function computeFlow(bars: TwelveBar[]): GoldFlowReading {
  const closes = bars.map((b) => num(b.close));
  const highs = bars.map((b) => num(b.high));
  const lows = bars.map((b) => num(b.low));
  const opens = bars.map((b) => num(b.open));

  const n = bars.length;
  const price = closes[n - 1];
  const notes: string[] = [];

  // ── Momentum: last close vs the close ~10 bars ago ──
  const lookback = Math.min(10, n - 1);
  const past = closes[n - 1 - lookback];
  const momentumPct = past > 0 ? ((price - past) / past) * 100 : 0;
  const momentumDir: "up" | "down" | "flat" =
    momentumPct > 0.05 ? "up" : momentumPct < -0.05 ? "down" : "flat";
  const momentumStrength = Math.min(100, Math.abs(momentumPct) * 40);

  // ── Pressure: where does each candle close inside its range? ──
  // Closing near the high = buyers in control; near the low = sellers.
  const recent = Math.min(12, n);
  let pressureSum = 0;
  for (let i = n - recent; i < n; i++) {
    const range = highs[i] - lows[i];
    if (range <= 0) continue;
    // 0 = closed at low, 1 = closed at high
    const closePos = (closes[i] - lows[i]) / range;
    pressureSum += closePos - 0.5; // center around 0
  }
  const pressureAvg = pressureSum / recent;          // -0.5 .. +0.5
  const pressureScore = Math.min(100, Math.abs(pressureAvg) * 200);
  const pressureSide: "buyers" | "sellers" | "balanced" =
    pressureAvg > 0.08 ? "buyers" : pressureAvg < -0.08 ? "sellers" : "balanced";

  // ── Volatility: current bar range vs average range ──
  const ranges = bars.map((b) => num(b.high) - num(b.low));
  const avgRange = ranges.reduce((s, r) => s + r, 0) / ranges.length || 1;
  const lastRange = ranges[n - 1];
  const volRatio = avgRange > 0 ? lastRange / avgRange : 1;
  const volState: "expanding" | "calm" | "normal" =
    volRatio > 1.6 ? "expanding" : volRatio < 0.6 ? "calm" : "normal";

  // ── Velocity: average absolute close-to-close move, last 8 bars ──
  let velSum = 0;
  const velBars = Math.min(8, n - 1);
  for (let i = n - velBars; i < n; i++) {
    velSum += Math.abs(closes[i] - closes[i - 1]);
  }
  const velocityPerBar = Number((velSum / velBars).toFixed(2));

  // ── Key levels: highest high / lowest low of the window ──
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  // ── Combine into a verdict ──
  // Momentum and pressure should agree for a confident directional call.
  let score = 0; // positive = buy bias, negative = sell bias
  if (momentumDir === "up") score += momentumStrength;
  if (momentumDir === "down") score -= momentumStrength;
  if (pressureSide === "buyers") score += pressureScore;
  if (pressureSide === "sellers") score -= pressureScore;

  let signal: GoldFlowSignal = "NEUTRAL";
  if (score > 45) signal = "BUY";
  else if (score < -45) signal = "SELL";

  // Confidence: how strongly the two inputs agree, dampened when volatility
  // is calm (a quiet market gives weaker signals).
  let confidence = Math.min(95, Math.abs(score) / 2);
  if (volState === "calm") confidence *= 0.7;
  if (volState === "expanding") confidence = Math.min(95, confidence * 1.1);
  confidence = Math.round(confidence);

  // ── Human-readable notes ──
  if (momentumDir !== "flat") {
    notes.push(`Price is trending ${momentumDir} (${momentumPct.toFixed(2)}% over the last ${lookback} bars).`);
  } else {
    notes.push("Momentum is flat — no clear short-term trend.");
  }
  if (pressureSide !== "balanced") {
    notes.push(`Candles are closing toward their ${pressureSide === "buyers" ? "highs" : "lows"} — ${pressureSide} are in control.`);
  } else {
    notes.push("Buy/sell pressure is balanced.");
  }
  if (volState === "expanding") notes.push("Volatility is expanding — moves are larger than usual.");
  if (volState === "calm") notes.push("Volatility is calm — expect smaller moves.");
  notes.push(`Intraday range: support ${support.toFixed(2)} / resistance ${resistance.toFixed(2)}.`);
  if (signal === "NEUTRAL") notes.push("Momentum and pressure don't agree strongly enough — staying neutral.");

  return {
    ok: true,
    signal,
    confidence,
    price,
    momentum: { direction: momentumDir, strengthPct: Number(momentumStrength.toFixed(0)) },
    pressure: { side: pressureSide, scorePct: Number(pressureScore.toFixed(0)) },
    volatility: { state: volState, ratio: Number(volRatio.toFixed(2)) },
    velocityPerBar,
    keyLevels: {
      support: Number(support.toFixed(2)),
      resistance: Number(resistance.toFixed(2)),
    },
    notes,
    fetchedAt: Date.now(),
  };
}
