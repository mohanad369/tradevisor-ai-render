import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { fetchAssetNews } from "../lib/news";

export const newsRouter = createRouter({
  /**
   * Fetch real-world news for a tradable asset using Claude + web search.
   * Cached for 5 minutes per (symbol, lookbackHours) pair.
   */
  forAsset: publicQuery
    .input(
      z.object({
        symbol: z.string().min(1).max(40),
        lookbackHours: z.number().int().min(1).max(168).default(24),
      }),
    )
    .query(async ({ input }) => {
      return await fetchAssetNews(input.symbol, input.lookbackHours);
    }),
});
