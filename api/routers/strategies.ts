import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { runGoldWeekly4hZones } from "../lib/strategies/goldWeekly4h";
import { getStrategyWeights, recordStrategySignal } from "../lib/strategies/learning";

/**
 * Strategies router.
 *
 * Exposes rule-based gold strategy modules. Each module runs on real
 * Twelve Data candles and returns the strict spec shape. The learning
 * layer tunes scoring weights without ever touching the risk rules.
 */
export const strategiesRouter = createRouter({
  /** Run the Gold Weekly 4H Zones strategy and return its reading. */
  goldWeekly4h: publicQuery.query(async () => {
    const weights = getStrategyWeights("gold_weekly_4h");
    const result = await runGoldWeekly4hZones(weights);

    // Log every actionable signal so the learning layer can review it
    // later against real price movement.
    if (result.signal !== "WAIT" && result.stop_loss !== null) {
      recordStrategySignal("gold_weekly_4h", {
        signal: result.signal,
        entryZone: result.entry_zone,
        stopLoss: result.stop_loss,
        targets: result.targets,
        confidence: result.confidence_score,
        createdAt: Date.now(),
      });
    }

    return {
      strategy_analysis: {
        weekly_4h_zones: result,
        final_strategy_score: result.confidence_score,
      },
    };
  }),
});
