import { createRouter, publicQuery } from "./middleware";
import { chartRouter } from "./routers/chart";
import { supportRouter } from "./routers/support";
import { ordersRouter } from "./routers/orders";
import { vipRouter } from "./routers/vip";
import { newsRouter } from "./routers/news";
import { authRouter } from "./routers/auth";
import { trialRouter } from "./routers/trial";
import { dashboardRouter } from "./routers/dashboard";
import { goldFlowRouter } from "./routers/goldFlow";
import { jarvisRouter } from "./routers/jarvis";
import { strategiesRouter } from "./routers/strategies";
import { fractalRouter } from "./routers/fractal";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true })),
  chart: chartRouter,
  support: supportRouter,
  orders: ordersRouter,
  vip: vipRouter,
  news: newsRouter,
  auth: authRouter,
  trial: trialRouter,
  dashboard: dashboardRouter,
  goldFlow: goldFlowRouter,
  jarvis: jarvisRouter,
  strategies: strategiesRouter,
  fractal: fractalRouter,
});

export type AppRouter = typeof appRouter;
