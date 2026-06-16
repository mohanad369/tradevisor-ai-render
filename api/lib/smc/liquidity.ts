/**
 * Liquidity Zones
 * ───────────────
 * Smart money targets retail stop-losses. A "liquidity zone" is a
 * cluster of those stops. There are four classes the SMC framework
 * uses, and this module finds all of them:
 *
 *   - BSL (Buy-Side Liquidity): unswept swing HIGHS. Retail shorts
 *     park stops just above these. Smart money runs them, then
 *     reverses down. Excellent SELL LIMIT targets BELOW current price
 *     once price has swept the high.
 *
 *   - SSL (Sell-Side Liquidity): unswept swing LOWS. Retail longs
 *     park stops below. Same logic, reversed.
 *
 *   - EQH (Equal Highs): two or more swing highs within tight tolerance.
 *     A magnet for price — multiple stops layered at one level. Stronger
 *     liquidity grab target than a single swing.
 *
 *   - EQL (Equal Lows): same for swing lows.
 *
 * The output is sorted from STRONGEST to WEAKEST. Strength is a function
 * of: type (EQH/EQL > BSL/SSL), age (recent > old), and whether the
 * level is above or below current price (untouched = strong).
 */

import type { Candle } from "./swings";
import type { SwingPoint } from "./swings";

export type LiquidityType = "BSL" | "SSL" | "EQH" | "EQL";

export interface LiquidityZone {
  type: LiquidityType;
  /** The price level the zone sits at. For EQH/EQL it's the average. */
  price: number;
  /** Constituent swings (1 for BSL/SSL, 2+ for EQH/EQL). */
  swings: SwingPoint[];
  /** When the most recent constituent swing formed. */
  formedAt: string;
  /** Index of the most recent constituent swing. */
  recentIndex: number;
  /** Is the zone still alive (price hasn't taken it yet)? */
  active: boolean;
  /**
   * Strength score 0-100. Combines type weight, number of stacked swings,
   * recency, and "cleanness" (how cleanly price respected the level).
   */
  strength: number;
  /** Human-readable summary used by the execution agent. */
  description: string;
}

/**
 * Two prices count as "equal" when they're within `tolerancePct` of
 * each other. 0.05% (5 basis points) is industry standard for gold —
 * roughly $1 at $2000 gold, which matches how SMC traders eyeball
 * "equal highs" on a chart.
 */
function approxEqual(a: number, b: number, tolerancePct: number): boolean {
  if (a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / Math.max(a, b) <= tolerancePct / 100;
}

/**
 * Find clusters of swings that share a price level (the EQH/EQL case).
 * A cluster needs at least 2 swings within tolerance, neither of which
 * has been swept (a swept high is no longer a liquidity target — its
 * stops are already gone).
 */
function findEqualLevels(
  swings: SwingPoint[],
  type: "high" | "low",
  tolerancePct: number,
): SwingPoint[][] {
  const candidates = swings.filter((s) => s.type === type && !s.swept);
  if (candidates.length < 2) return [];

  const clusters: SwingPoint[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (used.has(i)) continue;
    const seed = candidates[i];
    const cluster: SwingPoint[] = [seed];
    used.add(i);

    for (let j = i + 1; j < candidates.length; j++) {
      if (used.has(j)) continue;
      if (approxEqual(seed.price, candidates[j].price, tolerancePct)) {
        cluster.push(candidates[j]);
        used.add(j);
      }
    }

    if (cluster.length >= 2) clusters.push(cluster);
  }

  return clusters;
}

/**
 * Score a single zone 0-100. The math is deterministic so the same
 * inputs always give the same strength — important for trader trust.
 */
function scoreZone(
  type: LiquidityType,
  swings: SwingPoint[],
  totalCandles: number,
): number {
  // Base weight by type. EQH/EQL > BSL/SSL because stacked stops are
  // more valuable to smart money.
  const typeWeight = type === "EQH" || type === "EQL" ? 50 : 30;

  // Stack bonus: each extra swing in an EQH/EQL adds 8 points, capped at 24.
  const stackBonus = Math.min(24, Math.max(0, (swings.length - 1) * 8));

  // Recency bonus: zones formed in the last 25% of bars get +20. Older
  // zones still count but progressively less.
  const newest = Math.max(...swings.map((s) => s.index));
  const recencyRatio = totalCandles > 0 ? newest / totalCandles : 0;
  const recencyBonus = Math.round(recencyRatio * 20);

  // Right-bar bonus: a swing confirmed by many bars on its right side
  // is "cleaner" than one barely confirmed.
  const avgRight = swings.reduce((s, x) => s + x.rightBars, 0) / swings.length;
  const cleanBonus = Math.min(6, Math.round(avgRight));

  return Math.max(0, Math.min(100, typeWeight + stackBonus + recencyBonus + cleanBonus));
}

/**
 * Build the liquidity map for a candle series.
 *
 * @param candles  oldest-first candle array
 * @param swings   output of detectSwings on the same series
 * @param options  tuning. tolerancePct defaults to 0.05% (gold-friendly).
 *                 maxAgeBars caps how far back we look (default: all).
 */
export function findLiquidityZones(
  candles: Candle[],
  swings: SwingPoint[],
  options: {
    tolerancePct?: number;
    maxAgeBars?: number;
  } = {},
): LiquidityZone[] {
  if (!candles.length || !swings.length) return [];

  const tolerancePct = options.tolerancePct ?? 0.05;
  const maxAge = options.maxAgeBars ?? Number.MAX_SAFE_INTEGER;
  const cutoffIndex = Math.max(0, candles.length - maxAge);

  // Filter to recent-enough swings.
  const recentSwings = swings.filter((s) => s.index >= cutoffIndex);

  const zones: LiquidityZone[] = [];

  // 1. EQH and EQL (stacked liquidity — strongest)
  const eqhClusters = findEqualLevels(recentSwings, "high", tolerancePct);
  for (const cluster of eqhClusters) {
    const avg = cluster.reduce((s, x) => s + x.price, 0) / cluster.length;
    const newest = cluster.reduce((a, b) => (a.index > b.index ? a : b));
    zones.push({
      type: "EQH",
      price: round(avg, 2),
      swings: cluster,
      formedAt: newest.datetime,
      recentIndex: newest.index,
      active: true,
      strength: scoreZone("EQH", cluster, candles.length),
      description: `${cluster.length} equal highs at ~${round(avg, 2)} — buy-side liquidity pool`,
    });
  }

  const eqlClusters = findEqualLevels(recentSwings, "low", tolerancePct);
  for (const cluster of eqlClusters) {
    const avg = cluster.reduce((s, x) => s + x.price, 0) / cluster.length;
    const newest = cluster.reduce((a, b) => (a.index > b.index ? a : b));
    zones.push({
      type: "EQL",
      price: round(avg, 2),
      swings: cluster,
      formedAt: newest.datetime,
      recentIndex: newest.index,
      active: true,
      strength: scoreZone("EQL", cluster, candles.length),
      description: `${cluster.length} equal lows at ~${round(avg, 2)} — sell-side liquidity pool`,
    });
  }

  // Track which swing indexes are already part of an EQH/EQL cluster so we
  // don't double-count them as standalone BSL/SSL.
  const usedSwingIdx = new Set<number>();
  for (const z of zones) for (const s of z.swings) usedSwingIdx.add(s.index);

  // 2. BSL — every unswept swing high not already in an EQH cluster
  for (const s of recentSwings) {
    if (s.type !== "high" || s.swept) continue;
    if (usedSwingIdx.has(s.index)) continue;
    zones.push({
      type: "BSL",
      price: round(s.price, 2),
      swings: [s],
      formedAt: s.datetime,
      recentIndex: s.index,
      active: true,
      strength: scoreZone("BSL", [s], candles.length),
      description: `Unswept swing high at ${round(s.price, 2)} — buy-side liquidity`,
    });
  }

  // 3. SSL — every unswept swing low not already in an EQL cluster
  for (const s of recentSwings) {
    if (s.type !== "low" || s.swept) continue;
    if (usedSwingIdx.has(s.index)) continue;
    zones.push({
      type: "SSL",
      price: round(s.price, 2),
      swings: [s],
      formedAt: s.datetime,
      recentIndex: s.index,
      active: true,
      strength: scoreZone("SSL", [s], candles.length),
      description: `Unswept swing low at ${round(s.price, 2)} — sell-side liquidity`,
    });
  }

  // Strongest first.
  zones.sort((a, b) => b.strength - a.strength);
  return zones;
}

/**
 * Filter zones to only those ABOVE a given price (useful for selecting
 * BSL/EQH targets when looking for short setups).
 */
export function zonesAbove(zones: LiquidityZone[], price: number): LiquidityZone[] {
  return zones.filter((z) => z.price > price);
}

/**
 * Filter zones to only those BELOW a given price (useful for selecting
 * SSL/EQL targets when looking for long setups).
 */
export function zonesBelow(zones: LiquidityZone[], price: number): LiquidityZone[] {
  return zones.filter((z) => z.price < price);
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
