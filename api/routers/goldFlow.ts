import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getGoldFlow } from "../lib/goldFlow";

/**
 * Gold Flow Agent router — exposes the seventh analysis agent.
 *
 * Public read-only: any visitor can see the gold flow reading. It is
 * cheap (server-side cached) and contains no user data.
 */
export const goldFlowRouter = createRouter({
  reading: publicQuery
    .input(z.object({
      interval: z.enum(["5min", "15min", "1h"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getGoldFlow(input?.interval || "5min");
    }),
});
