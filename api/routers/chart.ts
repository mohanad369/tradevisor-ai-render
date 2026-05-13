import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { validateBase64Image } from "../lib/security";
import { analyzeChartWithAI } from "../lib/anthropic";

export const chartRouter = createRouter({
  analyze: publicQuery
    .input(
      z.object({
        imageBase64: z.string().min(100).max(14_000_000, "Image too large"),
        assetName: z.string().min(1).max(50).default("EUR/USD"),
        strategyName: z.string().min(1).max(50).default("Day Trading"),
        timeframe: z.string().min(1).max(10).default("1H"),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Strip data URI prefix
      let base64Data = input.imageBase64;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }

      // 2. Validate image integrity
      const validation = validateBase64Image(base64Data);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid image");
      }

      // 3. Call REAL AI to analyze chart and generate entry/SL/TP
      const result = await analyzeChartWithAI(
        base64Data,
        input.assetName,
        input.strategyName,
        input.timeframe,
      );

      if (!result) {
        throw new Error("AI analysis failed. Please try again with a clearer chart image.");
      }

      return result;
    }),
});
