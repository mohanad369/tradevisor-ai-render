import { createRouter, publicQuery } from "../middleware";
import { getFractalReading } from "../lib/fractalPattern";

/**
 * Fractal Pattern router (10th agent).
 *
 * Exposes the multi-timeframe fractal/analog reading. Heavy work is
 * cached internally for 5 minutes so polling and repeated analyses
 * don't burn through the Twelve Data quota.
 */
export const fractalRouter = createRouter({
  /** Get the current fractal pattern reading for XAU/USD. */
  forGold: publicQuery.query(async () => {
    return await getFractalReading();
  }),
});
