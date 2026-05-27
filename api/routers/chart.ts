import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { validateBase64Image } from "../lib/security";
import { analyzeChartWithAI, analyzeScalpingMultiFrame } from "../lib/anthropic";
import { runBullBearDebate } from "../lib/debate";

/** Strip a data-URI prefix if present. */
function stripDataUri(b64: string): string {
  return b64.includes(",") ? b64.split(",")[1] : b64;
}

export const chartRouter = createRouter({
  analyze: publicQuery
    .input(
      z.object({
        imageBase64: z.string().min(100).max(14_000_000, "Image too large"),
        assetName: z.string().min(1).max(50).default("EUR/USD"),
        strategyName: z.string().min(1).max(50).default("Day Trading"),
        timeframe: z.string().min(1).max(10).default("1H"),
        currentPrice: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const base64Data = stripDataUri(input.imageBase64);

      const validation = validateBase64Image(base64Data);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid image");
      }

      const result = await analyzeChartWithAI(
        base64Data,
        input.assetName,
        input.strategyName,
        input.timeframe,
        input.currentPrice,
      );

      if (!result) {
        throw new Error("AI analysis failed. Please try again with a clearer chart image.");
      }

      return result;
    }),

  /**
   * Multi-timeframe scalping analysis.
   * Accepts up to 3 chart images (15m / 5m / 1m) and analyzes them
   * top-down in a single AI call for a precise scalping plan.
   * At least one frame is required; 3 gives the best accuracy.
   */
  analyzeScalping: publicQuery
    .input(
      z.object({
        assetName: z.string().min(1).max(50).default("XAU/USD (Gold)"),
        frames: z.array(
          z.object({
            timeframe: z.string().min(1).max(10),
            imageBase64: z.string().min(100).max(14_000_000, "Image too large"),
          })
        ).min(1).max(3),
      })
    )
    .mutation(async ({ input }) => {
      // Validate every frame before sending anything to the AI.
      const frames: Array<{ timeframe: string; base64: string }> = [];
      for (const f of input.frames) {
        const base64 = stripDataUri(f.imageBase64);
        const validation = validateBase64Image(base64);
        if (!validation.valid) {
          throw new Error(`${f.timeframe} chart: ${validation.error || "invalid image"}`);
        }
        frames.push({ timeframe: f.timeframe, base64 });
      }

      // Order highest -> lowest timeframe for correct top-down reading.
      const rank: Record<string, number> = {
        "15m": 3, "15min": 3, "5m": 2, "5min": 2, "1m": 1, "1min": 1,
      };
      frames.sort((a, b) => (rank[b.timeframe] || 0) - (rank[a.timeframe] || 0));

      const result = await analyzeScalpingMultiFrame(frames, input.assetName);
      if (!result) {
        throw new Error(
          "Multi-timeframe analysis failed. Please upload clear chart images and try again."
        );
      }
      return result;
    }),

  /**
   * Bull vs Bear debate — the 9th agent.
   * Takes an existing analysis result and runs a structured debate
   * between a bull and a bear, with a judge's verdict. Called by the
   * client AFTER the initial analysis renders, so the user sees their
   * signal fast and the debate streams in behind it.
   */
  debate: publicQuery
    .input(
      z.object({
        assetName: z.string().min(1).max(50),
        strategyName: z.string().min(1).max(50).default("Day Trading"),
        timeframe: z.string().min(1).max(10).default("1H"),
        analysis: z.object({
          signal: z.enum(["BUY", "SELL"]),
          confidence: z.number().min(0).max(100),
          entry: z.number(),
          stopLoss: z.number(),
          takeProfit1: z.number(),
          takeProfit2: z.number(),
          takeProfit3: z.number(),
          trend: z.string().max(200).optional(),
          marketStructure: z.string().max(200).optional(),
          reasons: z.array(z.string().max(400)).max(8).optional(),
        }),
        goldFlow: z.object({
          signal: z.string().optional(),
          confidence: z.number().optional(),
          notes: z.array(z.string()).optional(),
        }).optional().nullable(),
        goldStrategy: z.object({
          signal: z.string().optional(),
          bias: z.string().optional(),
        }).optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return await runBullBearDebate(input.analysis, {
        assetName: input.assetName,
        strategyName: input.strategyName,
        timeframe: input.timeframe,
        goldFlow: input.goldFlow,
        goldStrategy: input.goldStrategy,
      });
    }),
});
