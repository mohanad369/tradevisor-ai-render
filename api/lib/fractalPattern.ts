/**
 * Fractal Pattern Agent (10th agent — gold-focused)
 * ─────────────────────────────────────────────────
 * Gold trades in recurring patterns. Sometimes today's setup looks
 * almost identical to a move from two days, two weeks, or two months
 * ago. This agent finds those historical look-alikes across multiple
 * timeframes and reports what actually happened after them.
 *
 * This is REAL pattern matching, not prediction:
 *   1. Take the last 30 candles on each of 4 timeframes (1H, 4H, 1D, 1W).
 *   2. Normalize each window to percent returns from its first candle —
 *      this strips out absolute price and isolates the SHAPE.
 *   3. Slide a 30-candle window through ~180 days of history and compute
 *      the Euclidean distance vs the current fingerprint.
 *   4. The top-K closest historical windows are the "analogs".
 *   5. For each analog, look at the next 10 candles and record the move.
 *   6. Aggregate into a probability + expected move size + confidence.
 *   7. Add a time-of-day seasonality reading.
 *
 * The agent's output is HONEST: it labels things "historical analogs",
 * not "predictions". Past patterns don't guarantee the future. The
 * value is having one more honest, data-driven input among the others.
 */

const TWELVE_TS_URL = "https://api.twelvedata.com/time_series";

type Candle = { datetime: string; open: number; high: number; low: number; close: number };

export interface AnalogMatch {
  /** ISO datetime of the analog window's last candle. */
  endedAt: string;
  /** How many days ago this analog ended. */
  ageDays: number;
  /** Lower is better — Euclidean distance on normalized returns. */
  distance: number;
  /** What happened in the N candles after the analog (% change). */
  forwardMovePercent: number;
  /** Direction it moved. */
  forwardDirection: "up" | "down" | "flat";
}

export interface FractalTimeframeReading {
  timeframe: string;
  candlesAnalyzed: number;
  analogs: AnalogMatch[];
  /** % of top analogs that moved UP after. */
  upProbability: number;
  /** Average forward move across top analogs (signed %). */
  avgForwardMove: number;
  /** Standard deviation of the forward moves — lower = more consistent. */
  consistency: number;
  /** A direction the analogs lean toward, or "mixed". */
  lean: "bullish" | "bearish" | "mixed";
}

export interface FractalAgentReading {
  ok: boolean;
  reason?: string;
  /** Per-timeframe pattern analysis. */
  byTimeframe: FractalTimeframeReading[];
  /** Combined verdict weighted across timeframes. */
  combined: {
    lean: "bullish" | "bearish" | "mixed";
    bullishScore: number;     // 0-100
    bearishScore: number;     // 0-100
    confidence: number;       // 0-100
    expectedMovePercent: number; // weighted average across TFs
  };
  /** Time-of-day seasonality (current hour vs historical performance). */
  seasonality: {
    currentHourUTC: number;
    sampleSize: number;
    upRate: number;            // % of historical hours like this that went up
    avgHourlyMove: number;     // % avg move in this hour historically
  };
  /** Reasons the user can read. */
  reasons: string[];
}

// ────────────────────────────────────────────────────────────────────
//  Configuration
// ────────────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { interval: "1h",  fingerprintLen: 30, forwardLen: 10, outputsize: 500 },
  { interval: "4h",  fingerprintLen: 30, forwardLen: 8,  outputsize: 500 },
  { interval: "1day", fingerprintLen: 30, forwardLen: 5,  outputsize: 200 },
  { interval: "1week", fingerprintLen: 12, forwardLen: 4, outputsize: 80  },
] as const;

const TOP_K = 5;                  // user asked: top 5 analogs
const LOOKBACK_DAYS = 180;        // user picked 180-day search window
const MIN_DISTANCE_GAP = 0.01;    // avoid trivially overlapping windows
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — candles update slowly

// Cache the heavy result for 5 minutes so repeat analyses don't re-fetch.
let cache: { result: FractalAgentReading; at: number } | null = null;

function n(v: any): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function empty(reason: string): FractalAgentReading {
  return {
    ok: false,
    reason,
    byTimeframe: [],
    combined: { lean: "mixed", bullishScore: 0, bearishScore: 0, confidence: 0, expectedMovePercent: 0 },
    seasonality: { currentHourUTC: new Date().getUTCHours(), sampleSize: 0, upRate: 0, avgHourlyMove: 0 },
    reasons: [reason],
  };
}

/** Normalize a window of candles to a percent-return series from its open. */
function fingerprint(window: Candle[]): number[] {
  if (window.length === 0) return [];
  const base = window[0].close;
  if (base === 0) return [];
  return window.map((c) => ((c.close - base) / base) * 100);
}

/** Euclidean distance between two equal-length series. */
function distance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** Standard deviation of a number array. */
function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const v = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

/** Fetch candles for one timeframe. Returns oldest-first. */
async function fetchCandles(
  interval: string,
  outputsize: number,
  apiKey: string,
): Promise<Candle[]> {
  const url = new URL(TWELVE_TS_URL);
  url.searchParams.set("symbol", "XAU/USD");
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  const data = (await res.json()) as any;
  if (!data?.values || !Array.isArray(data.values)) {
    throw new Error(data?.message || `No data for ${interval}`);
  }
  // Twelve Data returns newest-first — reverse to oldest-first.
  return [...data.values]
    .reverse()
    .map((b: any) => ({
      datetime: b.datetime,
      open: n(b.open),
      high: n(b.high),
      low: n(b.low),
      close: n(b.close),
    }))
    .filter((c) => c.close > 0);
}

/** Compute the pattern reading for one timeframe. */
function analyzeTimeframe(
  candles: Candle[],
  cfg: typeof TIMEFRAMES[number],
): FractalTimeframeReading | null {
  const { interval, fingerprintLen, forwardLen } = cfg;

  // Need: fingerprintLen for the present + at least 30 historical windows.
  if (candles.length < fingerprintLen + forwardLen + 30) return null;

  // The current window = the last fingerprintLen candles.
  const presentWindow = candles.slice(-fingerprintLen);
  const presentFp = fingerprint(presentWindow);

  // Slide a window through history, leaving a gap so it doesn't overlap
  // the present. For each window, we need forwardLen candles after it.
  const analogs: AnalogMatch[] = [];
  const lastUsableIdx = candles.length - fingerprintLen - forwardLen - 1;

  for (let start = 0; start <= lastUsableIdx; start++) {
    const win = candles.slice(start, start + fingerprintLen);
    const fp = fingerprint(win);
    if (fp.length !== presentFp.length) continue;

    const d = distance(fp, presentFp);
    if (!Number.isFinite(d)) continue;

    const after = candles.slice(start + fingerprintLen, start + fingerprintLen + forwardLen);
    const startClose = win[win.length - 1].close;
    const endClose = after[after.length - 1].close;
    const movePct = startClose > 0 ? ((endClose - startClose) / startClose) * 100 : 0;

    const endedAt = win[win.length - 1].datetime;
    const endedAtMs = new Date(endedAt.replace(" ", "T") + "Z").getTime();
    const ageDays = Math.max(0, Math.round((Date.now() - endedAtMs) / 86_400_000));

    analogs.push({
      endedAt,
      ageDays,
      distance: Number(d.toFixed(4)),
      forwardMovePercent: Number(movePct.toFixed(3)),
      forwardDirection: Math.abs(movePct) < 0.05 ? "flat" : movePct > 0 ? "up" : "down",
    });
  }

  // Keep the top-K closest, but require a minimum distance gap so we
  // don't pick 5 nearly-identical neighbouring windows.
  analogs.sort((a, b) => a.distance - b.distance);
  const filtered: AnalogMatch[] = [];
  for (const a of analogs) {
    if (filtered.length >= TOP_K) break;
    if (filtered.every((f) => Math.abs(f.distance - a.distance) > MIN_DISTANCE_GAP * filtered[0]?.distance)) {
      filtered.push(a);
    } else if (filtered.length === 0) {
      filtered.push(a);
    }
  }
  // Ensure we actually have K — fall back to top-K outright if filter was too strict.
  const topAnalogs = filtered.length >= 3 ? filtered : analogs.slice(0, TOP_K);

  if (topAnalogs.length === 0) return null;

  const ups = topAnalogs.filter((a) => a.forwardDirection === "up").length;
  const upProb = (ups / topAnalogs.length) * 100;
  const avgMove = topAnalogs.reduce((s, a) => s + a.forwardMovePercent, 0) / topAnalogs.length;
  const consistency = stdev(topAnalogs.map((a) => a.forwardMovePercent));

  const lean: "bullish" | "bearish" | "mixed" =
    upProb >= 65 ? "bullish" : upProb <= 35 ? "bearish" : "mixed";

  return {
    timeframe: interval,
    candlesAnalyzed: candles.length,
    analogs: topAnalogs,
    upProbability: Math.round(upProb),
    avgForwardMove: Number(avgMove.toFixed(3)),
    consistency: Number(consistency.toFixed(3)),
    lean,
  };
}

/** Time-of-day seasonality from the 1H series — current hour vs history. */
function computeSeasonality(hourlyCandles: Candle[]): FractalAgentReading["seasonality"] {
  const nowHour = new Date().getUTCHours();
  // For each candle, compute its hour-of-day and its own move (close vs open).
  const sameHourMoves: number[] = [];
  // Restrict to LOOKBACK_DAYS for fairness.
  const cutoffMs = Date.now() - LOOKBACK_DAYS * 86_400_000;

  for (const c of hourlyCandles) {
    const t = new Date(c.datetime.replace(" ", "T") + "Z").getTime();
    if (t < cutoffMs) continue;
    if (new Date(t).getUTCHours() !== nowHour) continue;
    if (c.open <= 0) continue;
    const movePct = ((c.close - c.open) / c.open) * 100;
    if (Number.isFinite(movePct)) sameHourMoves.push(movePct);
  }

  if (sameHourMoves.length === 0) {
    return { currentHourUTC: nowHour, sampleSize: 0, upRate: 0, avgHourlyMove: 0 };
  }

  const ups = sameHourMoves.filter((m) => m > 0).length;
  const avg = sameHourMoves.reduce((s, m) => s + m, 0) / sameHourMoves.length;
  return {
    currentHourUTC: nowHour,
    sampleSize: sameHourMoves.length,
    upRate: Math.round((ups / sameHourMoves.length) * 100),
    avgHourlyMove: Number(avg.toFixed(3)),
  };
}

/** Combine all timeframe readings into a single weighted verdict. */
function combineReadings(readings: FractalTimeframeReading[]) {
  if (readings.length === 0) {
    return { lean: "mixed" as const, bullishScore: 0, bearishScore: 0, confidence: 0, expectedMovePercent: 0 };
  }
  // Higher timeframes weigh more — the trend matters more than noise.
  const weights: Record<string, number> = { "1h": 1, "4h": 1.5, "1day": 2, "1week": 2.5 };
  let wSum = 0, bullW = 0, bearW = 0, moveW = 0;

  for (const r of readings) {
    const w = weights[r.timeframe] || 1;
    wSum += w;
    bullW += (r.upProbability / 100) * w;
    bearW += ((100 - r.upProbability) / 100) * w;
    moveW += r.avgForwardMove * w;
  }

  const bullScore = Math.round((bullW / wSum) * 100);
  const bearScore = Math.round((bearW / wSum) * 100);
  // Confidence rises when timeframes AGREE.
  const allBull = readings.every((r) => r.lean !== "bearish");
  const allBear = readings.every((r) => r.lean !== "bullish");
  let confidence = Math.max(bullScore, bearScore);
  if (allBull || allBear) confidence = Math.min(95, confidence + 10);

  const lean: "bullish" | "bearish" | "mixed" =
    bullScore - bearScore >= 15 ? "bullish"
    : bearScore - bullScore >= 15 ? "bearish"
    : "mixed";

  return {
    lean,
    bullishScore: bullScore,
    bearishScore: bearScore,
    confidence,
    expectedMovePercent: Number((moveW / wSum).toFixed(3)),
  };
}

// ────────────────────────────────────────────────────────────────────
//  Public entry point
// ────────────────────────────────────────────────────────────────────

export async function getFractalReading(): Promise<FractalAgentReading> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.result;

  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) return empty("Gold data source is not configured.");

  // Fetch all timeframes in parallel — much faster.
  const fetched: Array<{ cfg: typeof TIMEFRAMES[number]; candles: Candle[] } | null> = await Promise.all(
    TIMEFRAMES.map(async (cfg) => {
      try {
        const candles = await fetchCandles(cfg.interval, cfg.outputsize, apiKey);
        return { cfg, candles };
      } catch (err) {
        console.warn(`[Fractal] ${cfg.interval} fetch failed:`, (err as Error)?.message);
        return null;
      }
    }),
  );

  const readings: FractalTimeframeReading[] = [];
  for (const f of fetched) {
    if (!f) continue;
    const r = analyzeTimeframe(f.candles, f.cfg);
    if (r) readings.push(r);
  }

  if (readings.length === 0) return empty("Could not analyze any timeframe.");

  // Seasonality uses the 1H series (it has hourly granularity).
  const hourly = fetched.find((f) => f?.cfg.interval === "1h")?.candles || [];
  const seasonality = computeSeasonality(hourly);

  const combined = combineReadings(readings);

  // Build human-readable reasons.
  const reasons: string[] = [];
  reasons.push(`Analyzed ${readings.length} timeframes against the last ${LOOKBACK_DAYS} days of gold history.`);
  for (const r of readings) {
    const dirWord = r.lean === "bullish" ? "bullish" : r.lean === "bearish" ? "bearish" : "mixed";
    reasons.push(
      `${r.timeframe}: ${r.upProbability}% of ${r.analogs.length} analog patterns went up · avg move ${r.avgForwardMove > 0 ? "+" : ""}${r.avgForwardMove}% · ${dirWord}.`,
    );
  }
  if (seasonality.sampleSize > 0) {
    reasons.push(
      `Time-of-day: hour ${seasonality.currentHourUTC} UTC went up ${seasonality.upRate}% of the time historically (n=${seasonality.sampleSize}, avg ${seasonality.avgHourlyMove > 0 ? "+" : ""}${seasonality.avgHourlyMove}%).`,
    );
  }
  reasons.push(
    `Combined: ${combined.lean} lean — bull ${combined.bullishScore}% vs bear ${combined.bearishScore}%, confidence ${combined.confidence}%.`,
  );

  const result: FractalAgentReading = {
    ok: true,
    byTimeframe: readings,
    combined,
    seasonality,
    reasons,
  };

  cache = { result, at: Date.now() };
  return result;
}
