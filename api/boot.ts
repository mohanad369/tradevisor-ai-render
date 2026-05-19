import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import {
  checkRateLimit,
  createAdminSessionToken,
  SECURITY_HEADERS,
  verifyAdminSessionToken,
  verifyPassword,
} from "./lib/security";
import { env } from "./lib/env";
import { replenishPool, seedVIPCodes } from "../db/seed";
import { db } from "../db/db";
import { vipCodes, vipSubscribers } from "../db/schema";
import { and, eq } from "drizzle-orm";

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

app.post("/api/admin/grant-vip", async (c) => {
  const ip = getClientIp(c.req.raw);
  const limit = checkRateLimit(`admin-grant:${ip}`, 12);
  if (!limit.allowed) return c.json({ error: "Too many VIP code requests", retryAfter: limit.retryAfter }, 429);

  const authorization = c.req.header("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!verifyAdminSessionToken(token)) return c.json({ error: "Admin authentication required" }, 401);

  const body = await c.req.json().catch(() => null) as {
    email?: string;
    months?: number;
    plan?: string;
  } | null;

  if (!body) return c.json({ error: "Request body is required" }, 400);

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "Valid friend email is required" }, 400);
  }

  const months = Math.min(Math.max(Math.floor(body.months || 1), 1), 12);
  const plan = body.plan?.trim() || `Admin Gift ${months} Month${months === 1 ? "" : "s"}`;

  try {
    return c.json(await grantVipAccess(email, months, plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create VIP code";
    return c.json({ error: message }, 500);
  }
});

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

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function makeSubscriberId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
}

async function grantVipAccess(email: string, months: number, plan: string) {
  const [existing] = await db.select().from(vipSubscribers).where(eq(vipSubscribers.email, email));

  if (existing?.status === "ACTIVE" && existing.endDate && new Date(existing.endDate) > new Date()) {
    return { success: true, email: existing.email, code: existing.code, expires: existing.endDate, reused: true };
  }

  if (existing) {
    await db.delete(vipSubscribers).where(eq(vipSubscribers.subscriberId, existing.subscriberId));
  }

  const codeType = months >= 12 || plan.toLowerCase().includes("year") ? "yearly" : "monthly";
  const [availableCode] = await db.select().from(vipCodes)
    .where(and(eq(vipCodes.used, false), eq(vipCodes.codeType, codeType)))
    .limit(1);

  if (!availableCode) throw new Error(`No ${codeType} VIP codes available`);

  await db.update(vipCodes)
    .set({ used: true, assignedTo: email })
    .where(eq(vipCodes.id, availableCode.id));

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + months);

  await db.insert(vipSubscribers).values({
    subscriberId: makeSubscriberId("gift"),
    orderId: `ADMIN-GIFT-${Date.now()}`,
    email,
    code: availableCode.code,
    plan,
    amount: "$0",
    txId: "ADMIN-GIFT",
    status: "ACTIVE",
    startDate: now,
    endDate,
  });

  await replenishPool(codeType, 20);

  return { success: true, email, code: availableCode.code, expires: endDate, reused: false };
}

if (env.IS_PRODUCTION) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);
  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
    console.log(`Server running on port ${port}`);
  });
}
