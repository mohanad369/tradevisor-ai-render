import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { fetchServerMarketQuotes } from "./lib/market";
import { checkRateLimit, createAdminSessionToken, SECURITY_HEADERS, verifyPassword } from "./lib/security";
import { env } from "./lib/env";
import { seedVIPCodes } from "../db/seed";

const app = new Hono<{ Bindings: HttpBindings }>();

const allowedOrigins = env.IS_PRODUCTION
  ? [
      env.PUBLIC_SITE_ORIGIN,
      env.PUBLIC_SITE_ORIGIN_WWW,
      "https://mohanad369.github.io",
      "https://tradevisorai369.b-cdn.net",
      ...env.PUBLIC_EXTRA_SITE_ORIGINS,
    ].filter(Boolean) as string[]
  : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"];

// 1. CORS
app.use(cors({
  origin: allowedOrigins,
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-trpc-source", "x-csrf-token"],
  credentials: true,
  maxAge: 600,
}));

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/admin/login", async (c) => {
  const ip = getClientIp(c.req.raw);
  const limit = checkRateLimit(`admin-login:${ip}`, 5);
  if (!limit.allowed) return c.json({ error: "Too many login attempts", retryAfter: limit.retryAfter }, 429);

  const body = await c.req.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || !verifyPassword(body.password)) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  return c.json({ token: createAdminSessionToken() });
});

app.get("/api/market/quotes", async (c) => {
  const ip = getClientIp(c.req.raw);
  const limit = checkRateLimit(`market:${ip}`, 90);
  if (!limit.allowed) return c.json({ error: "Too many requests", retryAfter: limit.retryAfter }, 429);

  const pairs = c.req.query("pairs")?.split(",").map((pair) => pair.trim()).filter(Boolean);
  try {
    const quotes = await fetchServerMarketQuotes(pairs);
    return c.json({ ok: true, quotes });
  } catch (error) {
    console.error("[Market] quote fetch failed", error);
    return c.json({ ok: false, error: "Market prices are unavailable" }, 503);
  }
});

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
  const ip = getClientIp(c.req.raw);
  const limit = checkRateLimit(`trpc:${ip}`, 30);
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
    onError({ error, path, type }) {
      console.error(`[tRPC] ${type} ${path} failed:`, {
        message: error.message,
        code: error.code,
        cause: error.cause,
      });
    },
  });
});

// 6. VIP2 Gold Chart AI router (isolated — won't affect existing routes)
app.route("/api/vip2", (await import("./addons/vip2/router")).default);

// 7. Seed VIP codes — now properly awaited and errors logged
(async () => {
  try {
    await seedVIPCodes();
  } catch (err) {
    console.error("[Seed] Failed to seed VIP codes:", err);
  }
})();

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

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
