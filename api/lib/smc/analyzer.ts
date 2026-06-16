/**
 * SMC Analyzer
 * ────────────
 * Runs all four detection modules on a candle series and combines their
 * output into "entry zones" — actionable areas where multiple SMC signals
 * agree. This is what the Execution Plan agent reads to set its Buy Limit
 * and Sell Limit levels.
 *
 * The pipeline:
 *   1. Detect swing points (foundation).
 *   2. Detect liquidity zones from those swings.
 *   3. Detect order blocks from the candle structure.
 *   4. Detect FVGs from the candle structure.
 *   5. Build "long entry zones" (below current price, where buying is
 *      structurally justified) and "short entry zones" (above price,
 *      where selling is structurally justified).
 *   6. Confluence scoring: a zone where an OB + FVG + liquidity sweep
 *      overlap is far stronger than any one of them alone.
 *
 * Output is consumed by `executionPlan.ts` which picks the strongest
 * zone in the analysis direction and builds the order from it.
 *
 * IMPORTANT: This module is GOLD-ONLY in practice (it's the only asset
 * we have candle data for via Twelve Data). It's safe to call for other
 * assets — it'll just return empty zones, and the execution agent will
 * fall back to its previous behaviour.
 */

import type { Candle, SwingPoint } from "./swings";
import { detectSwings } from "./swings";
import type { LiquidityZone } from "./liquidity";
import { findLiquidityZones } from "./liquidity";
import type { OrderBlock } from "./orderBlocks";
import { detectOrderBlocks } from "./orderBlocks";
import type { FairValueGap } from "./fvg";
import { detectFVGs } from "./fvg";

/**
 * An actionable entry zone — built from one or more SMC signals that
 * agree on a price area. This is what the execution agent consumes.
 */
export interface SmcEntryZone {
  /** Direction this zone supports. */
  side: "long" | "short";
  /** Top of the zone (price range for limit fills). */
  top: number;
  /** Bottom of the zone. */
  bottom: number;
  /** Suggested entry price (typically the zone midpoint). */
  entry: number;
  /** Suggested stop loss — beyond the protective swing. */
  stopLoss: number;
  /** Combined strength of all signals at this zone, 0-100. */
  strength: number;
  /** Which signals contributed. */
  signals: {
    orderBlock?: OrderBlock;
    fvg?: FairValueGap;
    liquidity?: LiquidityZone;
    /** Swept-liquidity reference — the high/low that price already grabbed. */
    sweptLiquidity?: SwingPoint;
  };
  /** Human-readable rationale composed from the signals. */
  rationale: string;
}

export interface SmcAnalysis {
  ok: boolean;
  reason?: string;
  /** All raw swings (for diagnostics / UI). */
  swings: SwingPoint[];
  /** All detected liquidity zones, strongest first. */
  liquidity: LiquidityZone[];
  /** All detected order blocks, strongest first. */
  orderBlocks: OrderBlock[];
  /** All detected FVGs, strongest first. */
  fvgs: FairValueGap[];
  /**
   * Long entry zones (below current price, structurally justified for
   * buying). Strongest first.
   */
  longZones: SmcEntryZone[];
  /** Short entry zones (above current price). */
  shortZones: SmcEntryZone[];
  /** Snapshot of the current price for downstream consumers. */
  currentPrice: number;
  /** Diagnostics: candle counts per timeframe combined. */
  candleCount: number;
}

/**
 * Run the full SMC pipeline on a candle series.
 *
 * @param candles      oldest-first candle array (typically 4H, ~500 bars)
 * @param currentPrice latest price for "above/below" filtering
 * @param options.swingLookback  passed to detectSwings (default 5)
 * @param options.maxZones       cap on entry zones returned per side (default 5)
 */
export function analyzeSmc(
  candles: Candle[],
  currentPrice: number,
  options: {
    swingLookback?: number;
    maxZones?: number;
  } = {},
): SmcAnalysis {
  const swingLookback = options.swingLookback ?? 5;
  const maxZones = options.maxZones ?? 5;

  if (!Array.isArray(candles) || candles.length < swingLookback * 2 + 5) {
    return emptyAnalysis(currentPrice, "Not enough candle history for SMC analysis.");
  }

  const swings = detectSwings(candles, swingLookback);
  if (swings.length === 0) {
    return emptyAnalysis(currentPrice, "No swing points detected.");
  }

  const liquidity = findLiquidityZones(candles, swings, {
    tolerancePct: 0.05,
    // Cap age so 6-month-old liquidity doesn't dominate. 200 bars on 4H
    // is about a month — enough context, not stale.
    maxAgeBars: 200,
  });

  const orderBlocks = detectOrderBlocks(candles, {
    impulseWindow: 5,
    minImpulseMultiplier: 1.5,
    keepMitigated: false,
  });

  const fvgs = detectFVGs(candles, {
    minSizePct: 0.03,
    keepFilled: false,
  });

  const longZones = buildLongZones(orderBlocks, fvgs, liquidity, swings, currentPrice).slice(0, maxZones);
  const shortZones = buildShortZones(orderBlocks, fvgs, liquidity, swings, currentPrice).slice(0, maxZones);

  return {
    ok: true,
    swings,
    liquidity,
    orderBlocks,
    fvgs,
    longZones,
    shortZones,
    currentPrice,
    candleCount: candles.length,
  };
}

function emptyAnalysis(currentPrice: number, reason: string): SmcAnalysis {
  return {
    ok: false,
    reason,
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

// ─── Long zones (Buy Limit candidates) ─────────────────────────────

function buildLongZones(
  obs: OrderBlock[],
  fvgs: FairValueGap[],
  liq: LiquidityZone[],
  swings: SwingPoint[],
  currentPrice: number,
): SmcEntryZone[] {
  const zones: SmcEntryZone[] = [];

  // Start with every bullish OB BELOW current price.
  const candidateObs = obs.filter((o) => o.type === "bullish" && o.top < currentPrice);

  for (const ob of candidateObs) {
    // Look for an overlapping bullish FVG (confluence).
    const overlappingFvg = fvgs.find((f) =>
      f.type === "bullish" &&
      f.bottom <= ob.top &&
      f.top >= ob.bottom,
    );

    // Look for a SSL just below the OB — price needs to sweep liquidity
    // BEFORE returning to the OB. This is the textbook SMC long setup.
    const sweptBelow = liq.find((z) =>
      (z.type === "SSL" || z.type === "EQL") &&
      z.price < ob.bottom &&
      z.price > ob.bottom - (ob.top - ob.bottom) * 3, // not too far below
    );

    const signals: SmcEntryZone["signals"] = { orderBlock: ob };
    if (overlappingFvg) signals.fvg = overlappingFvg;
    if (sweptBelow) signals.liquidity = sweptBelow;

    // Confluence score: OB base + bonuses for stacked signals.
    let strength = Math.round(ob.strength * 0.5);
    if (overlappingFvg) strength += Math.round(overlappingFvg.strength * 0.3);
    if (sweptBelow) strength += Math.round(sweptBelow.strength * 0.2);
    strength = Math.min(100, strength);

    // Entry = OB midpoint (industry-standard SMC entry).
    const entry = ob.mid;
    // Stop = just below the OB bottom, with a small buffer (10% of OB range).
    const buffer = (ob.top - ob.bottom) * 0.1;
    const stopLoss = round(ob.bottom - buffer, 2);

    const parts: string[] = [];
    parts.push(`Bullish OB at ${ob.bottom.toFixed(2)}–${ob.top.toFixed(2)}`);
    if (overlappingFvg) parts.push(`overlapping bullish FVG (${overlappingFvg.fillPercent}% filled)`);
    if (sweptBelow) parts.push(`liquidity pool below at ${sweptBelow.price.toFixed(2)}`);

    zones.push({
      side: "long",
      top: ob.top,
      bottom: ob.bottom,
      entry,
      stopLoss,
      strength,
      signals,
      rationale: parts.join(" + "),
    });
  }

  // Also add zones built purely on a strong bullish FVG, in case the OB
  // detector missed it (different criteria). Only when no overlapping OB.
  for (const fvg of fvgs) {
    if (fvg.type !== "bullish") continue;
    if (fvg.top >= currentPrice) continue;
    if (fvg.fillPercent > 50) continue; // mostly filled — weak

    const alreadyCovered = zones.some((z) =>
      z.signals.fvg?.index === fvg.index ||
      (z.bottom <= fvg.top && z.top >= fvg.bottom),
    );
    if (alreadyCovered) continue;

    const entry = fvg.mid;
    const stopLoss = round(fvg.bottom - fvg.size * 0.2, 2);
    zones.push({
      side: "long",
      top: fvg.top,
      bottom: fvg.bottom,
      entry,
      stopLoss,
      strength: Math.round(fvg.strength * 0.6),
      signals: { fvg },
      rationale: `Bullish FVG ${fvg.bottom.toFixed(2)}–${fvg.top.toFixed(2)} (${fvg.fillPercent}% filled)`,
    });
  }

  zones.sort((a, b) => b.strength - a.strength);
  return zones;
}

// ─── Short zones (Sell Limit candidates) ───────────────────────────

function buildShortZones(
  obs: OrderBlock[],
  fvgs: FairValueGap[],
  liq: LiquidityZone[],
  swings: SwingPoint[],
  currentPrice: number,
): SmcEntryZone[] {
  const zones: SmcEntryZone[] = [];

  const candidateObs = obs.filter((o) => o.type === "bearish" && o.bottom > currentPrice);

  for (const ob of candidateObs) {
    const overlappingFvg = fvgs.find((f) =>
      f.type === "bearish" &&
      f.bottom <= ob.top &&
      f.top >= ob.bottom,
    );

    // Liquidity ABOVE the OB — needs to be swept before short entry.
    const sweptAbove = liq.find((z) =>
      (z.type === "BSL" || z.type === "EQH") &&
      z.price > ob.top &&
      z.price < ob.top + (ob.top - ob.bottom) * 3,
    );

    const signals: SmcEntryZone["signals"] = { orderBlock: ob };
    if (overlappingFvg) signals.fvg = overlappingFvg;
    if (sweptAbove) signals.liquidity = sweptAbove;

    let strength = Math.round(ob.strength * 0.5);
    if (overlappingFvg) strength += Math.round(overlappingFvg.strength * 0.3);
    if (sweptAbove) strength += Math.round(sweptAbove.strength * 0.2);
    strength = Math.min(100, strength);

    const entry = ob.mid;
    const buffer = (ob.top - ob.bottom) * 0.1;
    const stopLoss = round(ob.top + buffer, 2);

    const parts: string[] = [];
    parts.push(`Bearish OB at ${ob.bottom.toFixed(2)}–${ob.top.toFixed(2)}`);
    if (overlappingFvg) parts.push(`overlapping bearish FVG (${overlappingFvg.fillPercent}% filled)`);
    if (sweptAbove) parts.push(`liquidity pool above at ${sweptAbove.price.toFixed(2)}`);

    zones.push({
      side: "short",
      top: ob.top,
      bottom: ob.bottom,
      entry,
      stopLoss,
      strength,
      signals,
      rationale: parts.join(" + "),
    });
  }

  for (const fvg of fvgs) {
    if (fvg.type !== "bearish") continue;
    if (fvg.bottom <= currentPrice) continue;
    if (fvg.fillPercent > 50) continue;

    const alreadyCovered = zones.some((z) =>
      z.signals.fvg?.index === fvg.index ||
      (z.bottom <= fvg.top && z.top >= fvg.bottom),
    );
    if (alreadyCovered) continue;

    const entry = fvg.mid;
    const stopLoss = round(fvg.top + fvg.size * 0.2, 2);
    zones.push({
      side: "short",
      top: fvg.top,
      bottom: fvg.bottom,
      entry,
      stopLoss,
      strength: Math.round(fvg.strength * 0.6),
      signals: { fvg },
      rationale: `Bearish FVG ${fvg.bottom.toFixed(2)}–${fvg.top.toFixed(2)} (${fvg.fillPercent}% filled)`,
    });
  }

  zones.sort((a, b) => b.strength - a.strength);
  return zones;
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
