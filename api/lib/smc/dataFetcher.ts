/**
 * SMC Data Fetcher
 * ────────────────
 * Fetches candle history for SMC analysis and caches the result so the
 * Execution Plan agent doesn't burn the Twelve Data quota on every
 * analysis. Pattern mirrors fractalPattern.ts: 30-min cache for 4H bars,
 * since 4H candles only finalize every 4 hours anyway.
 *
 * Gold-only for now (Twelve Data is the only data source we have for
 * candles in this project). The caller (executionPlan.ts) is expected
 * to skip this entirely for non-gold assets.
 */

import type { Candle } from "./swings";
import { analyzeSmc, type SmcAnalysis } from "./analyzer";

const TWELVE_TS_URL = "https://api.twelvedata.com/time_series";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — matches fractalPattern.ts
const CANDLE_COUNT = 500; // ~83 days on 4H — plenty for SMC structure

let cache: { analysis: SmcAnalysis; at: number } | null = null;

function num(v: any): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

async function fetchGoldCandles(apiKey: string, interval = "4h"): Promise<Candle[]> {
  const url = new URL(TWELVE_TS_URL);
  url.searchParams.set("symbol", "XAU/USD");
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(CANDLE_COUNT));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  const data = (await res.json()) as any;
  if (!data?.values || !Array.isArray(data.values)) {
    throw new Error(data?.message || `Twelve Data returned no values for XAU/USD ${interval}`);
  }

  // Twelve Data returns newest-first; SMC needs oldest-first.
  return [...data.values]
    .reverse()
    .map((b: any, idx: number) => ({
      datetime: b.datetime,
      open: num(b.open),
      high: num(b.high),
      low: num(b.low),
      close: num(b.close),
      index: idx,
    }))
    .filter((c) => c.close > 0);
}

/**
 * Get the SMC analysis for gold. Cached for CACHE_TTL_MS so repeat
 * analyses share the same expensive computation.
 *
 * @param currentPrice  the live price snapshot from the caller — used
 *                      to filter zones above/below price. Each call
 *                      passes its own snapshot so we don't accidentally
 *                      cache a stale "current price" too.
 */
export async function getGoldSmcAnalysis(currentPrice: number): Promise<SmcAnalysis> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    // Re-run the lightweight final step (zone filtering by current price)
    // because the candle data is cached but `currentPrice` can drift.
    return analyzeSmc(
      reconstructCandlesFromCache(),
      currentPrice,
      { swingLookback: 5, maxZones: 5 },
    );
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      reason: "Twelve Data API key is not configured.",
      swings: [],
      liquidity: [],
      orderBlocks: [],
      fvgs: [],
      longZones: [],
      shortZones: [],
      currentPrice,
      candleCount: 0,
    };
  }

  let candles: Candle[];
  try {
    candles = await fetchGoldCandles(apiKey, "4h");
  } catch (err) {
    console.warn("[SMC] gold candle fetch failed:", (err as Error)?.message);
    return {
      ok: false,
      reason: "Could not fetch gold candle data.",
      swings: [],
      liquidity: [],
      orderBlocks: [],
      fvgs: [],
      longZones: [],
      shortZones: [],
      currentPrice,
      candleCount: 0,
    };
  }

  const analysis = analyzeSmc(candles, currentPrice, { swingLookback: 5, maxZones: 5 });

  // Cache only the candle data (not the price-filtered result). We rebuild
  // the cached candles when serving from cache to keep the cached state
  // small and deterministic.
  if (analysis.ok) {
    cachedCandles = candles;
    cache = { analysis, at: Date.now() };
  }

  return analysis;
}

// Internal: keep the raw candles around so cache hits can re-run the
// zone-filtering step with a fresh currentPrice.
let cachedCandles: Candle[] = [];
function reconstructCandlesFromCache(): Candle[] {
  return cachedCandles;
}
