/**
 * Real-time gold and metals prices.
 */

import { fetchMarketQuote } from "./marketPrices";

export interface MetalPrice {
  symbol: string;
  price: number;
  ask: number;
  bid: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: number;
  gram24k: number;
  gram22k: number;
  gram21k: number;
  gram18k: number;
}

// Client-side cache
const cache = new Map<string, { data: MetalPrice; expires: number }>();
const CACHE_TTL = 1000; // 1 second

function toMetalPrice(price: number, change: number, changePercent: number, open: number, high: number, low: number, previousClose: number, timestamp: number): MetalPrice {
  const troyOzToGram = 31.1034768;
  const gram24k = price / troyOzToGram;
  return {
    symbol: "XAU/USD",
    price: Number(price.toFixed(2)),
    ask: Number((price + 0.2).toFixed(2)),
    bid: Number((price - 0.2).toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
    timestamp: Math.floor(timestamp / 1000),
    gram24k: Number(gram24k.toFixed(2)),
    gram22k: Number((gram24k * 0.9167).toFixed(2)),
    gram21k: Number((gram24k * 0.875).toFixed(2)),
    gram18k: Number((gram24k * 0.75).toFixed(2)),
  };
}

/** Fetch gold price via tRPC backend OR client-side fallback */
export async function getMetalPrice(metal: string = "XAU", currency: string = "USD", useCache: boolean = true): Promise<MetalPrice> {
  const key = `${metal}_${currency}`;

  if (useCache) {
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.data;
  }

  const quote = await fetchMarketQuote(`${metal}/${currency}`);
  if (!quote) throw new Error("Live gold price is unavailable");

  const result = toMetalPrice(
    quote.price,
    quote.changeAmount,
    quote.change,
    quote.open,
    quote.high,
    quote.low,
    quote.previousClose,
    quote.timestamp,
  );
  cache.set(key, { data: result, expires: Date.now() + CACHE_TTL });
  return result;
}

/** Get cached price */
export async function getCachedPrice(metal: string = "XAU", _ttlMs: number = 5000): Promise<MetalPrice> {
  return getMetalPrice(metal, "USD", true);
}

/** Get all metals */
export async function getAllMetalPrices(): Promise<Record<string, MetalPrice>> {
  const result: Record<string, MetalPrice> = {};
  try { result.XAU = await getMetalPrice("XAU"); } catch { /* skip */ }
  return result;
}
