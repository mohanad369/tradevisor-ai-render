/**
 * Order Blocks
 * ────────────
 * An Order Block (OB) is the LAST candle that moved against the
 * immediately following impulsive move:
 *
 *   - BULLISH OB: the last DOWN candle before a strong up-move that
 *     breaks structure. Smart-money interpretation: institutions
 *     accumulated long positions inside that down candle's range
 *     before launching the rally. Price often returns to fill the
 *     range and bounce.
 *
 *   - BEARISH OB: the last UP candle before a strong down-move.
 *     Mirror logic.
 *
 * What makes an OB "valid":
 *   1. The candle is contrarian to the move that follows it.
 *   2. The move after must be "impulsive" — not noise. We measure
 *      this as the close-to-close swing exceeding `minImpulsePct`
 *      of the candle's own range (default 1.5×).
 *   3. The move must break a recent swing — confirming structure
 *      change at that level.
 *   4. The OB hasn't been "mitigated" yet: price hasn't returned
 *      to fill more than 50% of its range. Mitigated OBs no longer
 *      hold orders.
 *
 * The result is sorted strongest-first. Strength factors in: the
 * impulse size after the OB, distance from current price (closer =
 * more relevant for entry), and whether the OB sits at a meaningful
 * round number or known liquidity level (we score that bit elsewhere).
 */

import type { Candle } from "./swings";

export type OrderBlockType = "bullish" | "bearish";

export interface OrderBlock {
  type: OrderBlockType;
  /** Index of the OB candle in the source array. */
  index: number;
  datetime: string;
  /** Top of the OB range — for a bullish OB, this is its high. */
  top: number;
  /** Bottom of the OB range. */
  bottom: number;
  /** The middle — used as the "ideal" entry by some SMC traders. */
  mid: number;
  /** How big the impulse after the OB was, as % of the OB's own range. */
  impulseRatio: number;
  /** Has price returned and taken out more than 50% of the OB range? */
  mitigated: boolean;
  /** If mitigated, when. */
  mitigatedAt?: string;
  /** Strength 0-100. */
  strength: number;
  /** One-line description for the execution agent. */
  description: string;
}

/**
 * Detect order blocks in a candle series.
 *
 * @param candles            oldest-first candle series
 * @param impulseWindow      how many candles after the OB to measure the impulse (default 5)
 * @param minImpulseMultiplier  impulse close-to-close move must be at least
 *                              this many times the OB candle's range (default 1.5)
 * @param keepMitigated      include OBs that have already been mitigated (default false)
 */
export function detectOrderBlocks(
  candles: Candle[],
  options: {
    impulseWindow?: number;
    minImpulseMultiplier?: number;
    keepMitigated?: boolean;
  } = {},
): OrderBlock[] {
  const impulseWindow = options.impulseWindow ?? 5;
  const minMult = options.minImpulseMultiplier ?? 1.5;
  const keepMitigated = options.keepMitigated ?? false;

  if (!Array.isArray(candles) || candles.length < impulseWindow + 2) return [];

  const obs: OrderBlock[] = [];
  const n = candles.length;

  // For each candle from index 1 to n - impulseWindow - 1, check whether
  // it's the LAST contrarian candle before an impulsive move.
  for (let i = 1; i < n - impulseWindow; i++) {
    const ob = candles[i];
    if (!ob || !Number.isFinite(ob.open) || !Number.isFinite(ob.close)) continue;

    const obRange = Math.max(ob.high - ob.low, 0);
    if (obRange === 0) continue; // skip doji-as-OB; not useful

    const obIsDown = ob.close < ob.open;
    const obIsUp = ob.close > ob.open;

    // Window = the impulseWindow candles immediately after the OB.
    const windowEnd = Math.min(i + impulseWindow, n - 1);
    const windowCandles = candles.slice(i + 1, windowEnd + 1);
    if (windowCandles.length === 0) continue;

    // Measure the impulse: close at the end of the window vs OB's close.
    const finalClose = windowCandles[windowCandles.length - 1].close;
    const impulseMove = finalClose - ob.close;
    const impulseAbs = Math.abs(impulseMove);
    const impulseRatio = impulseAbs / obRange;

    if (impulseRatio < minMult) continue; // not impulsive enough

    // Bullish OB: down candle, followed by upward impulse.
    if (obIsDown && impulseMove > 0) {
      // Confirm the move actually broke above the OB's high.
      const brokeHigh = windowCandles.some((c) => c.close > ob.high);
      if (!brokeHigh) continue;

      const block: OrderBlock = {
        type: "bullish",
        index: i,
        datetime: ob.datetime,
        top: ob.high,
        bottom: ob.low,
        mid: round((ob.high + ob.low) / 2, 2),
        impulseRatio: round(impulseRatio, 2),
        mitigated: false,
        strength: 0,
        description: "",
      };
      checkMitigation(block, candles, i);
      if (!keepMitigated && block.mitigated) continue;
      block.strength = scoreOB(block, candles);
      block.description = formatDescription(block);
      obs.push(block);
    }

    // Bearish OB: up candle, followed by downward impulse.
    else if (obIsUp && impulseMove < 0) {
      const brokeLow = windowCandles.some((c) => c.close < ob.low);
      if (!brokeLow) continue;

      const block: OrderBlock = {
        type: "bearish",
        index: i,
        datetime: ob.datetime,
        top: ob.high,
        bottom: ob.low,
        mid: round((ob.high + ob.low) / 2, 2),
        impulseRatio: round(impulseRatio, 2),
        mitigated: false,
        strength: 0,
        description: "",
      };
      checkMitigation(block, candles, i);
      if (!keepMitigated && block.mitigated) continue;
      block.strength = scoreOB(block, candles);
      block.description = formatDescription(block);
      obs.push(block);
    }
  }

  obs.sort((a, b) => b.strength - a.strength);
  return obs;
}

/**
 * After the OB, has price returned and traded through more than 50%
 * of its range? If yes, the OB is considered "mitigated" — its orders
 * have been filled and it's no longer a reliable reversal level.
 */
function checkMitigation(ob: OrderBlock, candles: Candle[], obIndex: number): void {
  const range = ob.top - ob.bottom;
  if (range <= 0) return;
  const halfPoint = ob.bottom + range * 0.5;

  for (let j = obIndex + 1; j < candles.length; j++) {
    const c = candles[j];
    if (!c) continue;
    if (ob.type === "bullish") {
      // Bullish OB is mitigated when price trades back DOWN through 50%.
      if (c.low <= halfPoint) {
        ob.mitigated = true;
        ob.mitigatedAt = c.datetime;
        return;
      }
    } else {
      // Bearish OB is mitigated when price trades back UP through 50%.
      if (c.high >= halfPoint) {
        ob.mitigated = true;
        ob.mitigatedAt = c.datetime;
        return;
      }
    }
  }
}

/**
 * Score an OB 0-100. Heavy weight on impulse size and recency, lighter
 * weight on mitigation status (we already filter mitigated unless caller
 * opted in).
 */
function scoreOB(ob: OrderBlock, candles: Candle[]): number {
  // Impulse: 2× minimum (1.5) = 30, 3× = 45, capped at 50.
  const impulseScore = Math.min(50, Math.round((ob.impulseRatio - 1) * 20));

  // Recency: bars formed in the last 20% of the series get +30.
  const recency = candles.length > 0 ? ob.index / candles.length : 0;
  const recencyScore = Math.round(recency * 30);

  // Cleanness: an OB with a wider range (more "absorbed" volume) scores
  // marginally higher, but cap small so noise doesn't dominate.
  const rangePct = candles.length > 0 ?
    ((ob.top - ob.bottom) / candles[ob.index].close) * 100 : 0;
  const rangeScore = Math.min(15, Math.round(rangePct * 10));

  // Mitigation penalty (only matters when keepMitigated is true).
  const mitigationPenalty = ob.mitigated ? 25 : 0;

  return Math.max(0, Math.min(100, impulseScore + recencyScore + rangeScore + 5 - mitigationPenalty));
}

function formatDescription(ob: OrderBlock): string {
  const kind = ob.type === "bullish" ? "Bullish" : "Bearish";
  const flag = ob.mitigated ? " (mitigated)" : "";
  return `${kind} OB ${ob.bottom.toFixed(2)} – ${ob.top.toFixed(2)} · impulse ${ob.impulseRatio}× range${flag}`;
}

/**
 * Convenience: order blocks that sit BELOW current price (candidates
 * for Buy Limit entries because price would have to dip down to them).
 */
export function bullishObsBelow(obs: OrderBlock[], currentPrice: number): OrderBlock[] {
  return obs.filter((o) => o.type === "bullish" && o.top < currentPrice);
}

/**
 * Order blocks that sit ABOVE current price (candidates for Sell Limit).
 */
export function bearishObsAbove(obs: OrderBlock[], currentPrice: number): OrderBlock[] {
  return obs.filter((o) => o.type === "bearish" && o.bottom > currentPrice);
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
