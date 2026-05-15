import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { sendVipCodeEmail } from "./lib/email";
import { getLatestGoldQuote, onGoldQuote, startLiveGoldFeed } from "./lib/liveGold";
import { fetchServerMarketQuotes } from "./lib/market";
import { isPaidNowPaymentsStatus, verifyNowPaymentsIpn } from "./lib/nowpayments";
import { checkRateLimit, createAdminSessionToken, SECURITY_HEADERS, verifyAdminSessionToken, verifyDeveloperPassword, verifyPassword } from "./lib/security";
import { env } from "./lib/env";
import { seedVIPCodes } from "../db/seed";
import { db } from "../db/db";
import { paymentInvoices, vipCodes, vipPayments, vipSubscribers } from "../db/schema";
import { eq } from "drizzle-orm";

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

app.post("/api/developer/login", async (c) => {
  const ip = getClientIp(c.req.raw);
  const limit = checkRateLimit(`developer-login:${ip}`, 5);
  if (!limit.allowed) return c.json({ error: "Too many login attempts", retryAfter: limit.retryAfter }, 429);

  const body = await c.req.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || !verifyDeveloperPassword(body.password)) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  try {
    return c.json(await grantDeveloperAccess());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to grant developer access";
    return c.json({ error: message }, 500);
  }
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
  const plan = body.plan?.trim() || `Developer Gift ${months} Month${months === 1 ? "" : "s"}`;

  try {
    return c.json(await grantVipAccess(email, months, plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create VIP code";
    return c.json({ error: message }, 500);
  }
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

app.get("/api/market/gold/stream", () => {
  startLiveGoldFeed();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("hello", { ok: true });
      const latest = getLatestGoldQuote();
      if (latest) send("quote", latest);

      const unsubscribe = onGoldQuote((quote) => send("quote", quote));
      const heartbeat = setInterval(() => send("ping", { t: Date.now() }), 15_000);

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
});

app.post("/api/payments/nowpayments/ipn", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-nowpayments-sig");

  if (!verifyNowPaymentsIpn(rawBody, signature)) {
    console.warn("[NOWPayments] Invalid IPN signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  const payload = JSON.parse(rawBody) as any;
  const orderId = String(payload.order_id || "");
  const status = String(payload.payment_status || payload.invoice_status || "").toUpperCase();

  if (!orderId) return c.json({ error: "Missing order_id" }, 400);

  await db.update(paymentInvoices)
    .set({ status, rawPayload: rawBody, updatedAt: new Date() })
    .where(eq(paymentInvoices.orderId, orderId));

  if (isPaidNowPaymentsStatus(status)) {
    const [payment] = await db.select().from(vipPayments).where(eq(vipPayments.orderId, orderId));
    if (payment?.status === "PENDING") {
      const activated = await activatePaymentFromRecord(payment);
      if (!activated.success) {
        console.error("[NOWPayments] Paid invoice could not activate VIP", { orderId, error: activated.error });
        return c.json({ ok: true, activated: false, error: activated.error });
      }

      const emailResult = await sendVipCodeEmail({
        to: activated.email,
        code: activated.code,
        plan: payment.planName,
        orderId: payment.orderId,
        expiresAt: activated.expiresAt,
      });

      console.log("[NOWPayments] VIP activated from hosted checkout", {
        orderId,
        email: activated.email,
        emailSent: emailResult.sent,
      });
      return c.json({ ok: true, activated: true, emailSent: emailResult.sent });
    }
  }

  return c.json({ ok: true, activated: false });
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

async function activatePaymentFromRecord(payment: typeof vipPayments.$inferSelect) {
  const [availableCode] = await db.select().from(vipCodes).where(eq(vipCodes.used, false)).limit(1);
  if (!availableCode) return { success: false as const, error: "No VIP codes available" };

  await db.update(vipCodes).set({ used: true, assignedTo: payment.email }).where(eq(vipCodes.id, availableCode.id));

  const now = new Date();
  const isYearly = payment.planName.toLowerCase().includes("year");
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));

  await db.update(vipPayments)
    .set({ status: "APPROVED", approvedAt: now, assignedCode: availableCode.code })
    .where(eq(vipPayments.id, payment.id));

  await db.insert(vipSubscribers).values({
    subscriberId: `np_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    orderId: payment.orderId,
    email: payment.email,
    code: availableCode.code,
    plan: payment.planName,
    amount: payment.amount,
    txId: payment.txId,
    status: "ACTIVE",
    startDate: now,
    endDate,
  });

  return { success: true as const, email: payment.email, code: availableCode.code, expiresAt: endDate };
}

async function grantDeveloperAccess() {
  const developerEmail = "developer@tradevisor.ai";
  const [existing] = await db.select().from(vipSubscribers).where(eq(vipSubscribers.email, developerEmail));

  if (existing?.status === "ACTIVE" && existing.endDate && new Date(existing.endDate) > new Date()) {
    return { success: true, email: existing.email, code: existing.code, expires: existing.endDate };
  }

  let code = existing?.code;
  if (!code) {
    const [availableCode] = await db.select().from(vipCodes).where(eq(vipCodes.used, false)).limit(1);
    if (!availableCode) throw new Error("No VIP codes available");
    code = availableCode.code;
    await db.update(vipCodes).set({ used: true, assignedTo: developerEmail }).where(eq(vipCodes.id, availableCode.id));
  }

  if (existing) {
    await db.delete(vipSubscribers).where(eq(vipSubscribers.subscriberId, existing.subscriberId));
  }

  const now = new Date();
  const endDate = new Date();
  endDate.setFullYear(now.getFullYear() + 1);

  await db.insert(vipSubscribers).values({
    subscriberId: `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    orderId: `DEV-${Date.now()}`,
    email: developerEmail,
    code,
    plan: "Developer Access",
    amount: "$0",
    txId: "DEVELOPER-LOGIN",
    status: "ACTIVE",
    startDate: now,
    endDate,
  });

  return { success: true, email: developerEmail, code, expires: endDate };
}

async function grantVipAccess(email: string, months: number, plan: string) {
  const [existing] = await db.select().from(vipSubscribers).where(eq(vipSubscribers.email, email));

  if (existing?.status === "ACTIVE" && existing.endDate && new Date(existing.endDate) > new Date()) {
    return { success: true, email: existing.email, code: existing.code, expires: existing.endDate, reused: true };
  }

  let code = existing?.code;
  if (!code) {
    const [availableCode] = await db.select().from(vipCodes).where(eq(vipCodes.used, false)).limit(1);
    if (!availableCode) throw new Error("No VIP codes available");
    code = availableCode.code;
    await db.update(vipCodes).set({ used: true, assignedTo: email }).where(eq(vipCodes.id, availableCode.id));
  }

  if (existing) {
    await db.delete(vipSubscribers).where(eq(vipSubscribers.subscriberId, existing.subscriberId));
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + months);

  await db.insert(vipSubscribers).values({
    subscriberId: `gift_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    orderId: `DEV-GIFT-${Date.now()}`,
    email,
    code,
    plan,
    amount: "$0",
    txId: "DEVELOPER-GIFT",
    status: "ACTIVE",
    startDate: now,
    endDate,
  });

  return { success: true, email, code, expires: endDate, reused: false };
}
