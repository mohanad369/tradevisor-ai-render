/**
 * Fair Value Gaps (FVGs)
 * ──────────────────────
 * A Fair Value Gap is a three-candle pattern where the middle candle
 * left a price range that the two neighbouring candles never touched.
 * Specifically:
 *
 *   - BULLISH FVG: candle[i+1].low > candle[i-1].high
 *     → the gap is the range (candle[i-1].high … candle[i+1].low)
 *     → price moved up so fast it left a "gap" that wasn't traded
 *     → typically gets filled (price returns to it) before continuing
 *
 *   - BEARISH FVG: candle[i+1].high < candle[i-1].low
 *     → mirror: gap is (candle[i+1].high … candle[i-1].low)
 *     → fast move down, gap above gets filled later
 *
 * SMC traders use FVGs as:
 *   - Limit entry zones (price returns to the gap, you enter there)
 *   - Confluence with order blocks (an OB + FVG at the same area is
 *     stronger than either alone)
 *   - Stop-loss reference (place stop beyond the FVG)
 *
 * "Fill status": once price re-enters the gap, it's considered partially
 * filled. We track:
 *   - Untouched: pristine, strongest
 *   - Partially filled: price entered but didn't go through
 *   - Fully filled: a candle's body fully consumed the gap — no longer
 *     a valid entry
 */

import type { Candle } from "./swings";

export type FVGType = "bullish" | "bearish";

export interface FairValueGap {
  type: FVGType;
  /** Index of the middle candle that created the gap. */
  index: number;
  datetime: string;
  /** Top of the gap. */
  top: number;
  /** Bottom of the gap. */
  bottom: number;
  /** (top + bottom) / 2 — the midline traders often use as the entry. */
  mid: number;
  /** Size of the gap in price units. */
  size: number;
  /**
   * 0-100 percent of the gap that's been eaten by later price action.
   * 0 = untouched, 100 = fully filled (no longer valid).
   */
  fillPercent: number;
  /** Convenience boolean. */
  filled: boolean;
  /** Strength 0-100. */
  strength: number;
  description: string;
}

/**
 * Detect FVGs in a candle series.
 *
 * @param candles            oldest-first
 * @param minSizePct         minimum gap as % of price (filters noise)
 * @param keepFilled         include fully-filled gaps (default false)
 */
export function detectFVGs(
  candles: Candle[],
  options: {
    minSizePct?: number;
    keepFilled?: boolean;
  } = {},
): FairValueGap[] {
  const minSizePct = options.minSizePct ?? 0.03; // 0.03% — small but real
  const keepFilled = options.keepFilled ?? false;

  if (!Array.isArray(candles) || candles.length < 3) return [];

  const fvgs: FairValueGap[] = [];
  const n = candles.length;

  // A gap forms across three candles, but we name it by the MIDDLE one
  // (that's the one whose impulse created it).
  for (let i = 1; i < n - 1; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];
    const next = candles[i + 1];
    if (!prev || !cur || !next) continue;

    const refPrice = cur.close > 0 ? cur.close : cur.high;
    if (refPrice <= 0) continue;

    // Bullish FVG: prev.high < next.low → gap upward
    if (prev.high < next.low) {
      const size = next.low - prev.high;
      if ((size / refPrice) * 100 < minSizePct) continue;

      const fvg: FairValueGap = {
        type: "bullish",
        index: i,
        datetime: cur.datetime,
        top: round(next.low, 2),
        bottom: round(prev.high, 2),
        mid: round((next.low + prev.high) / 2, 2),
        size: round(size, 2),
        fillPercent: 0,
        filled: false,
        strength: 0,
        description: "",
      };
      computeFillStatus(fvg, candles, i);
      if (!keepFilled && fvg.filled) continue;
      fvg.strength = scoreFVG(fvg, candles);
      fvg.description = formatDescription(fvg);
      fvgs.push(fvg);
    }

    // Bearish FVG: prev.low > next.high → gap downward
    else if (prev.low > next.high) {
      const size = prev.low - next.high;
      if ((size / refPrice) * 100 < minSizePct) continue;

      const fvg: FairValueGap = {
        type: "bearish",
        index: i,
        datetime: cur.datetime,
        top: round(prev.low, 2),
        bottom: round(next.high, 2),
        mid: round((prev.low + next.high) / 2, 2),
        size: round(size, 2),
        fillPercent: 0,
        filled: false,
        strength: 0,
        description: "",
      };
      computeFillStatus(fvg, candles, i);
      if (!keepFilled && fvg.filled) continue;
      fvg.strength = scoreFVG(fvg, candles);
      fvg.description = formatDescription(fvg);
      fvgs.push(fvg);
    }
  }

  fvgs.sort((a, b) => b.strength - a.strength);
  return fvgs;
}

/**
 * After the FVG was created, did later candles trade into / through it?
 * Computes a fill percent for partial/full mitigation tracking.
 */
function computeFillStatus(fvg: FairValueGap, candles: Candle[], idx: number): void {
  const range = fvg.top - fvg.bottom;
  if (range <= 0) return;

  let maxEaten = 0;
  for (let j = idx + 2; j < candles.length; j++) {
    const c = candles[j];
    if (!c) continue;
    if (fvg.type === "bullish") {
      // Bullish FVG fills from the top down — price drops back in.
      if (c.low < fvg.top) {
        const eaten = Math.min(fvg.top - c.low, range);
        if (eaten > maxEaten) maxEaten = eaten;
        if (eaten >= range) break;
      }
    } else {
      // Bearish FVG fills from the bottom up.
      if (c.high > fvg.bottom) {
        const eaten = Math.min(c.high - fvg.bottom, range);
        if (eaten > maxEaten) maxEaten = eaten;
        if (eaten >= range) break;
      }
    }
  }

  fvg.fillPercent = Math.round((maxEaten / range) * 100);
  fvg.filled = fvg.fillPercent >= 100;
}

function scoreFVG(fvg: FairValueGap, candles: Candle[]): number {
  // Size: bigger gaps score higher (more institutional intent).
  // Cap at 40 to leave room for other factors.
  const refPrice = candles[fvg.index]?.close || 1;
  const sizePct = (fvg.size / refPrice) * 100;
  const sizeScore = Math.min(40, Math.round(sizePct * 100));

  // Recency: gaps in the last 20% of bars get +25.
  const recency = candles.length > 0 ? fvg.index / candles.length : 0;
  const recencyScore = Math.round(recency * 25);

  // Cleanness: untouched gaps score +25; partial fills lose progressively.
  const cleanScore = Math.round(25 * (1 - fvg.fillPercent / 100));

  return Math.max(0, Math.min(100, sizeScore + recencyScore + cleanScore + 10));
}

function formatDescription(fvg: FairValueGap): string {
  const kind = fvg.type === "bullish" ? "Bullish" : "Bearish";
  const fillNote = fvg.fillPercent === 0 ? "untouched" :
    fvg.filled ? "filled" :
    `${fvg.fillPercent}% filled`;
  return `${kind} FVG ${fvg.bottom.toFixed(2)} – ${fvg.top.toFixed(2)} · ${fillNote}`;
}

/**
 * Convenience: bullish FVGs that sit below current price (potential
 * Buy Limit entries — price would dip to fill them).
 */
export function bullishFvgsBelow(fvgs: FairValueGap[], currentPrice: number): FairValueGap[] {
  return fvgs.filter((f) => f.type === "bullish" && f.top < currentPrice);
}

/**
 * Bearish FVGs above current price (potential Sell Limit entries).
 */
export function bearishFvgsAbove(fvgs: FairValueGap[], currentPrice: number): FairValueGap[] {
  return fvgs.filter((f) => f.type === "bearish" && f.bottom > currentPrice);
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
