import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { checkRateLimit, SECURITY_HEADERS } from "./lib/security";
import { env } from "./lib/env";
import { seedVIPCodes } from "../db/seed";

const app = new Hono<{ Bindings: HttpBindings }>();

// 1. CORS
app.use(cors({
  origin: env.IS_PRODUCTION
    ? [env.PUBLIC_SITE_ORIGIN, env.PUBLIC_SITE_ORIGIN_WWW].filter(Boolean) as string[]
    : ["http://localhost:3000", "http://localhost:5173"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-trpc-source", "x-csrf-token"],
  credentials: true,
  maxAge: 600,
}));

// 2. Security headers
app.use(secureHeaders({ contentSecurityPolicy: {}, crossOriginEmbedderPolicy: false }));

app.use(async (c, next) => {
  await next();
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => c.header(k, v));
});

// 3. Body size limit
app.use(bodyLimit({ maxSize: 8 * 1024 * 1024 }));

// 4. Rate limiting
app.use("/api/trpc/*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) return c.json({ error: "Too many requests", retryAfter: limit.retryAfter }, 429);
  return next();
});

// 5. tRPC handler (with error logging so DB / validation issues are visible)
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError({ error, path, type, input }) {
      console.error(`[tRPC] ${type} ${path} failed:`, {
        message: error.message,
        code: error.code,
        cause: error.cause,
        input,
      });
    },
  });
});

// 6. VIP2 Gold Chart AI router (isolated — won't affect existing routes)
app.route("/api/vip2", (await import("./addons/vip2/router")).default);

// 7. Seed VIP codes BEFORE accepting requests so the first approval
//    after a fresh deploy never sees an empty pool. Failures are logged
//    but won't crash the app (subsequent /approve calls will surface them).
try {
  await seedVIPCodes();
} catch (err) {
  console.error("[Seed] Failed to seed VIP codes:", err);
}

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.IS_PRODUCTION) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);
  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
    console.log(`Server running on port ${port}`);
  });
}
