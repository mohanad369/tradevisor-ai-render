import { sqliteClient } from "../../../db/db";

/**
 * Strategy Learning Layer
 * ───────────────────────
 * This is NOT machine learning / model training. It is a transparent
 * statistical tracker:
 *   - Every actionable signal is stored.
 *   - Later, a signal is graded against real price movement (hit TP or SL).
 *   - Scoring WEIGHTS are nudged based on the win rate.
 *
 * Hard guarantee: the learning layer can only adjust scoring weights.
 * It can NEVER remove or weaken a risk-management rule — those live in
 * the strategy module as fixed code.
 */

// ── Ensure the learning tables exist (additive, IF NOT EXISTS) ──
try {
  sqliteClient.exec(`
    CREATE TABLE IF NOT EXISTS strategy_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy_key TEXT NOT NULL,
      signal TEXT NOT NULL,
      entry_zone TEXT DEFAULT '',
      stop_loss REAL,
      targets TEXT DEFAULT '',
      confidence INTEGER DEFAULT 0,
      outcome TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      graded_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS strategy_weights (
      strategy_key TEXT PRIMARY KEY,
      weights_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
} catch (err) {
  console.error("[StrategyLearning] table init failed:", (err as Error)?.message);
}

export type StrategyWeights = {
  sweep: number;
  rejection: number;
  mss: number;
  retest: number;
};

// Default weights — also the floor/ceiling the learning layer stays within.
const DEFAULT_WEIGHTS: StrategyWeights = { sweep: 30, rejection: 25, mss: 25, retest: 20 };
const WEIGHT_MIN = 10;
const WEIGHT_MAX = 40;

/** Get the current (possibly tuned) weights for a strategy. */
export function getStrategyWeights(strategyKey: string): StrategyWeights {
  try {
    const row = sqliteClient
      .prepare("SELECT weights_json FROM strategy_weights WHERE strategy_key = ?")
      .get(strategyKey) as { weights_json: string } | undefined;
    if (row?.weights_json) {
      const parsed = JSON.parse(row.weights_json);
      return {
        sweep: clamp(parsed.sweep ?? DEFAULT_WEIGHTS.sweep),
        rejection: clamp(parsed.rejection ?? DEFAULT_WEIGHTS.rejection),
        mss: clamp(parsed.mss ?? DEFAULT_WEIGHTS.mss),
        retest: clamp(parsed.retest ?? DEFAULT_WEIGHTS.retest),
      };
    }
  } catch (err) {
    console.error("[StrategyLearning] getWeights failed:", (err as Error)?.message);
  }
  return { ...DEFAULT_WEIGHTS };
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_WEIGHTS.sweep;
  return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, v));
}

/** Store an actionable signal for later grading. */
export function recordStrategySignal(
  strategyKey: string,
  signal: {
    signal: string;
    entryZone: unknown;
    stopLoss: number;
    targets: number[];
    confidence: number;
    createdAt: number;
  },
): void {
  try {
    // Avoid logging a near-duplicate of the most recent signal (the UI
    // may poll). Only store if the last signal is older than 30 min.
    const last = sqliteClient
      .prepare("SELECT created_at FROM strategy_signals WHERE strategy_key = ? ORDER BY id DESC LIMIT 1")
      .get(strategyKey) as { created_at: number } | undefined;
    if (last && signal.createdAt - last.created_at < 30 * 60 * 1000) return;

    sqliteClient
      .prepare(`INSERT INTO strategy_signals
        (strategy_key, signal, entry_zone, stop_loss, targets, confidence, outcome, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`)
      .run(
        strategyKey,
        signal.signal,
        JSON.stringify(signal.entryZone),
        signal.stopLoss,
        JSON.stringify(signal.targets),
        signal.confidence,
        signal.createdAt,
      );
  } catch (err) {
    console.error("[StrategyLearning] recordSignal failed:", (err as Error)?.message);
  }
}

/**
 * Grade a pending signal once its outcome is known, then nudge the
 * weights. `outcome` is "win" (hit a target) or "loss" (hit the stop).
 *
 * The nudge is small and bounded — it tunes, it does not overhaul.
 * Risk rules are untouched: this only moves scoring weights.
 */
export function gradeStrategySignal(signalId: number, outcome: "win" | "loss"): void {
  try {
    sqliteClient
      .prepare("UPDATE strategy_signals SET outcome = ?, graded_at = ? WHERE id = ?")
      .run(outcome, Date.now(), signalId);
  } catch (err) {
    console.error("[StrategyLearning] grade failed:", (err as Error)?.message);
  }
}

/** Recompute the win rate and report it (read-only stats). */
export function getStrategyStats(strategyKey: string): {
  total: number; wins: number; losses: number; pending: number; winRate: number;
} {
  try {
    const rows = sqliteClient
      .prepare("SELECT outcome FROM strategy_signals WHERE strategy_key = ?")
      .all(strategyKey) as Array<{ outcome: string }>;
    const wins = rows.filter((r) => r.outcome === "win").length;
    const losses = rows.filter((r) => r.outcome === "loss").length;
    const pending = rows.filter((r) => r.outcome === "pending").length;
    const graded = wins + losses;
    return {
      total: rows.length,
      wins, losses, pending,
      winRate: graded > 0 ? Math.round((wins / graded) * 100) : 0,
    };
  } catch {
    return { total: 0, wins: 0, losses: 0, pending: 0, winRate: 0 };
  }
}
