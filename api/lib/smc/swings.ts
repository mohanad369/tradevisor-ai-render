/**
 * Swing Point Detector
 * ────────────────────
 * The foundation every other SMC module builds on. A "swing high" is a
 * candle whose high is greater than the N candles before AND after it.
 * A "swing low" is the mirror — lowest in the window.
 *
 * Why this matters: markets move in swings. The swing highs and lows are
 * where liquidity pools sit (stop-loss clusters), where market structure
 * shifts get measured, and where institutional order blocks form. If
 * swings are wrong, every downstream SMC reading is wrong.
 *
 * Algorithm: sequential pivot scan with a configurable lookback window.
 * A 3-bar swing is sensitive (catches tiny pivots), a 5-bar swing is
 * standard for 4H+ timeframes, a 10-bar swing finds only major pivots.
 *
 * The detector also tags whether each swing has been "swept" — i.e. a
 * later candle traded through it. Unswept swings still hold liquidity;
 * swept swings have already had their liquidity grabbed and are mostly
 * historical reference.
 */

export interface Candle {
  /** ISO datetime string for the bar's start. */
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Index back into the source array — preserved for downstream modules. */
  index?: number;
}

export interface SwingPoint {
  /** Where this swing sits in the source candle array. */
  index: number;
  /** Datetime of the swing candle. */
  datetime: string;
  /** The actual price level — high for swing-high, low for swing-low. */
  price: number;
  /** Direction. */
  type: "high" | "low";
  /** Bars before the swing that confirmed it. */
  leftBars: number;
  /** Bars after the swing that confirmed it. */
  rightBars: number;
  /** Has a later candle taken this level? Updated by markSweptSwings. */
  swept: boolean;
  /** If swept, the index of the bar that swept it. */
  sweptByIndex?: number;
  /** If swept, the datetime of the sweep. */
  sweptAt?: string;
}

/**
 * Detect swing highs and lows in a candle series.
 *
 * @param candles  Candle array, OLDEST first (index 0 is the earliest).
 * @param lookback How many candles on EACH side must confirm the pivot.
 *                 3 = noisy/short TFs, 5 = standard 4H+, 10 = major pivots.
 * @returns        All swing points sorted by index (chronological).
 */
export function detectSwings(candles: Candle[], lookback = 5): SwingPoint[] {
  if (!Array.isArray(candles) || candles.length < lookback * 2 + 1) return [];

  const swings: SwingPoint[] = [];
  const n = candles.length;

  // A swing at index i requires `lookback` confirmed bars on each side.
  // The newest `lookback` bars cannot form a confirmed swing yet — they
  // might still be in the middle of one. We exclude them deliberately.
  for (let i = lookback; i < n - lookback; i++) {
    const cur = candles[i];
    if (!cur || !Number.isFinite(cur.high) || !Number.isFinite(cur.low)) continue;

    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= lookback; j++) {
      const left = candles[i - j];
      const right = candles[i + j];
      if (!left || !right) { isHigh = false; isLow = false; break; }

      // Strict >: equal highs DON'T form a confirmed swing here. We treat
      // equal-highs as "liquidity at the same level", which gets handled
      // by the liquidity module separately. This avoids double-counting.
      if (left.high >= cur.high || right.high >= cur.high) isHigh = false;
      if (left.low <= cur.low || right.low <= cur.low) isLow = false;

      if (!isHigh && !isLow) break;
    }

    if (isHigh) {
      swings.push({
        index: i,
        datetime: cur.datetime,
        price: cur.high,
        type: "high",
        leftBars: lookback,
        rightBars: lookback,
        swept: false,
      });
    } else if (isLow) {
      swings.push({
        index: i,
        datetime: cur.datetime,
        price: cur.low,
        type: "low",
        leftBars: lookback,
        rightBars: lookback,
        swept: false,
      });
    }
  }

  // Mark which swings have been swept by later price action.
  markSweptSwings(swings, candles);
  return swings;
}

/**
 * Walk forward from each swing and mark it swept if a later candle's
 * wick (high for swing-high, low for swing-low) breached it. Mutates
 * the array in place — the swing detector calls this automatically.
 *
 * Exported so callers can re-run it after appending new candles.
 */
export function markSweptSwings(swings: SwingPoint[], candles: Candle[]): void {
  for (const s of swings) {
    // Already swept? skip.
    if (s.swept) continue;
    for (let j = s.index + 1; j < candles.length; j++) {
      const c = candles[j];
      if (!c) continue;
      if (s.type === "high" && c.high > s.price) {
        s.swept = true;
        s.sweptByIndex = j;
        s.sweptAt = c.datetime;
        break;
      }
      if (s.type === "low" && c.low < s.price) {
        s.swept = true;
        s.sweptByIndex = j;
        s.sweptAt = c.datetime;
        break;
      }
    }
  }
}

/**
 * Convenience: return only the most recent N swings of a given type.
 * Useful for "show me the last 5 unswept swing highs above price".
 */
export function recentSwings(
  swings: SwingPoint[],
  type: "high" | "low",
  count: number,
  options: { onlyUnswept?: boolean } = {},
): SwingPoint[] {
  const filtered = swings.filter(
    (s) => s.type === type && (!options.onlyUnswept || !s.swept),
  );
  return filtered.slice(-count);
}
