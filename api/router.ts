import { createRouter, publicQuery } from "./middleware";
import { chartRouter } from "./routers/chart";
import { supportRouter } from "./routers/support";
import { ordersRouter } from "./routers/orders";
import { vipRouter } from "./routers/vip";
import { newsRouter } from "./routers/news";
import { authRouter } from "./routers/auth";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true })),
  chart: chartRouter,
  support: supportRouter,
  orders: ordersRouter,
  vip: vipRouter,
  news: newsRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
