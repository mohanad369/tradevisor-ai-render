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
  verifyDeveloperPassword,
  verifyPassword,
} from "./lib/security";
import { env } from "./lib/env";
import { sendVipCodeEmail } from "./lib/email";
import { fetchServerMarketQuotes } from "./lib/market";
import { isPaidNowPaymentsStatus, verifyNowPaymentsIpn } from "./lib/nowpayments";
import { replenishPool, seedVIPCodes } from "../db/seed";
import { db } from "../db/db";
import { paymentInvoices, users, userSessions, vipCodes, vipPayments, vipSessions, vipSubscribers } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

const app = new Hono<{ Bindings: HttpBindings }>();

// 1. CORS
app.use(cors({
  origin: env.IS_PRODUCTION
    ? [env.PUBLIC_SITE_ORIGIN, env.PUBLIC_SITE_ORIGIN_WWW].filter(Boolean) as string[]
    : ["http://localhost:3000", "http://localhost:5173"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-trpc-source", "x-csrf-token", "x-nowpayments-sig", "x-user-token"],
  credentials: true,
  maxAge: 600,
}));

// 2. Security headers
app.use(secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
    styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    fontSrc: ["'self'", "data:", "https:"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "https:", "wss:", "ws:"],
    frameSrc: ["'self'", "https:"],
    mediaSrc: ["'self'", "https:", "blob:"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
  },
  crossOriginEmbedderPolicy: false,
}));

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
app.get("/api/market/quotes", async (c) => {
  const pairsParam = c.req.query("pairs") || "XAU/USD";
  const pairs = pairsParam
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (pairs.length === 0) {
    return c.json({ quotes: {} });
  }

  try {
    const quotes = await fetchServerMarketQuotes(pairs);
    return c.json({ quotes });
  } catch (error) {
    console.error("[Market] /api/market/quotes failed:", error instanceof Error ? error.message : String(error));
    return c.json({ quotes: {}, error: "Market prices unavailable" }, 503);
  }
});

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

  const body = await c.req.json().catch(() => null) as { password?: string; deviceId?: string } | null;
  if (!body?.password || !verifyDeveloperPassword(body.password)) {
    return c.json({ error: "Invalid developer credentials" }, 401);
  }

  const deviceId = (body.deviceId || "").trim() || `dev_${randomBytes(8).toString("base64url")}`;
  const developerEmail = "developer@tradevisor.ai";

  try {
    let [subscriber] = await db.select().from(vipSubscribers)
      .where(eq(vipSubscribers.email, developerEmail));

    if (!subscriber || subscriber.status !== "ACTIVE" || !subscriber.endDate || new Date(subscriber.endDate) < new Date()) {
      if (subscriber) {
        await db.update(vipCodes)
          .set({ used: false, assignedTo: null })
          .where(eq(vipCodes.code, subscriber.code));
        await db.delete(vipSubscribers)
          .where(eq(vipSubscribers.subscriberId, subscriber.subscriberId));
      }

      const [availableCode] = await db.select().from(vipCodes)
        .where(and(eq(vipCodes.used, false), eq(vipCodes.codeType, "yearly")))
        .limit(1);

      if (!availableCode) {
        return c.json({ error: "No yearly VIP codes available" }, 503);
      }

      await db.update(vipCodes)
        .set({ used: true, assignedTo: developerEmail })
        .where(eq(vipCodes.id, availableCode.id));

      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);
      const subscriberId = makeSubscriberId("dev");

      await db.insert(vipSubscribers).values({
        subscriberId,
        orderId: `DEV-${randomBytes(6).toString("hex").toUpperCase()}`,
        email: developerEmail,
        code: availableCode.code,
        plan: "Developer Access",
        amount: "$0",
        txId: "DEVELOPER-LOGIN",
        status: "ACTIVE",
        startDate: now,
        endDate,
      });

      [subscriber] = await db.select().from(vipSubscribers)
        .where(eq(vipSubscribers.subscriberId, subscriberId));
    }

    if (!subscriber) return c.json({ error: "Developer access could not be created" }, 500);

    await db.update(vipSessions)
      .set({ active: false })
      .where(eq(vipSessions.subscriberId, subscriber.subscriberId));

    const sessionToken = `sess_${randomBytes(24).toString("base64url")}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(vipSessions).values({
      sessionToken,
      subscriberId: subscriber.subscriberId,
      email: subscriber.email,
      code: subscriber.code,
      deviceId,
      ip,
      userAgent: c.req.header("user-agent") || "",
      active: true,
      expiresAt,
    });

    // ── Also provision a USER ACCOUNT for the developer ──
    // The Trader Dashboard runs on the user-account system (users +
    // user_sessions, x-user-token). Developer login must issue one too,
    // otherwise /dashboard sees no logged-in user.
    let [devUser] = await db.select().from(users)
      .where(eq(users.email, developerEmail));

    if (!devUser) {
      const devUserId = `usr_dev_${randomBytes(8).toString("base64url")}`;
      await db.insert(users).values({
        userId: devUserId,
        email: developerEmail,
        name: "Developer",
        // Random hash — developer never logs in via the password form,
        // only through this endpoint, so this value is never used.
        passwordHash: `dev$${randomBytes(24).toString("hex")}`,
        status: "ACTIVE",
        lastLoginAt: new Date(),
      });
      [devUser] = await db.select().from(users)
        .where(eq(users.email, developerEmail));
    } else {
      await db.update(users)
        .set({ status: "ACTIVE", lastLoginAt: new Date() })
        .where(eq(users.userId, devUser.userId));
    }

    let userToken = "";
    if (devUser) {
      // Retire old developer user-sessions, issue a fresh one.
      await db.update(userSessions)
        .set({ active: false })
        .where(eq(userSessions.userId, devUser.userId));

      userToken = `uss_dev_${randomBytes(24).toString("base64url")}`;
      await db.insert(userSessions).values({
        sessionToken: userToken,
        userId: devUser.userId,
        ip,
        userAgent: c.req.header("user-agent") || "",
        active: true,
        expiresAt,
      });
    }

    return c.json({
      success: true,
      sessionToken,
      userToken,
      user: devUser
        ? { userId: devUser.userId, email: devUser.email, name: devUser.name || "Developer" }
        : null,
      subscriber,
      email: subscriber.email,
      code: subscriber.code,
      expires: subscriber.endDate?.toISOString() || expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error("[developer/login] failed:", err?.message || err);
    return c.json({ error: "Developer login failed" }, 500);
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
  const plan = body.plan?.trim() || `Admin Gift ${months} Month${months === 1 ? "" : "s"}`;

  try {
    return c.json(await grantVipAccess(email, months, plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create VIP code";
    return c.json({ error: message }, 500);
  }
});

app.route("/api/vip2", (await import("./addons/vip2/router")).default);

app.post("/api/payments/nowpayments/ipn", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-nowpayments-sig");

  if (!verifyNowPaymentsIpn(rawBody, signature)) {
    console.warn("[NOWPayments] Invalid IPN signature");
    return c.json({ error: "Invalid signature" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const orderId = String(payload.order_id || "");
  const paymentStatus = String(payload.payment_status || payload.invoice_status || "");
  const normalizedStatus = paymentStatus.toUpperCase();

  if (!orderId) {
    return c.json({ error: "Missing order_id" }, 400);
  }

  await db.update(paymentInvoices)
    .set({
      status: normalizedStatus || "UNKNOWN",
      rawPayload: rawBody,
      updatedAt: new Date(),
    })
    .where(eq(paymentInvoices.orderId, orderId));

  if (!isPaidNowPaymentsStatus(paymentStatus)) {
    return c.json({ ok: true, activated: false, status: normalizedStatus });
  }

  const [payment] = await db.select().from(vipPayments)
    .where(eq(vipPayments.orderId, orderId))
    .limit(1);

  if (!payment) {
    console.warn("[NOWPayments] Paid IPN received without vip payment record", { orderId });
    return c.json({ ok: true, activated: false, reason: "Payment record not found" });
  }

  if (payment.status === "APPROVED") {
    return c.json({ ok: true, activated: true, alreadyApproved: true });
  }

  if (payment.status !== "PENDING") {
    return c.json({ ok: true, activated: false, status: payment.status });
  }

  const activated = await activateHostedPayment(payment);
  if (!activated.success) {
    console.error("[NOWPayments] Paid order could not be activated", {
      orderId,
      error: activated.error,
    });
    return c.json({ ok: true, activated: false, error: activated.error });
  }

  const emailResult = await sendVipCodeEmail({
    to: activated.email,
    code: activated.code,
    plan: payment.planName,
    orderId: payment.orderId,
    expiresAt: activated.expiresAt,
  });

  return c.json({
    ok: true,
    activated: true,
    orderId,
    codeType: activated.codeType,
    emailSent: emailResult.sent,
  });
});

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

function planToCodeType(planName: string): "monthly" | "yearly" {
  return planName.toLowerCase().includes("month") ? "monthly" : "yearly";
}

async function activateHostedPayment(payment: typeof vipPayments.$inferSelect) {
  const codeType = planToCodeType(payment.planName);
  const [availableCode] = await db.select().from(vipCodes)
    .where(and(eq(vipCodes.used, false), eq(vipCodes.codeType, codeType)))
    .limit(1);

  if (!availableCode) {
    return { success: false as const, error: `No ${codeType} VIP codes available` };
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(now.getMonth() + (codeType === "yearly" ? 12 : 1));

  await db.update(vipCodes)
    .set({ used: true, assignedTo: payment.email })
    .where(eq(vipCodes.id, availableCode.id));

  await db.update(vipPayments)
    .set({
      status: "APPROVED",
      approvedAt: now,
      assignedCode: availableCode.code,
    })
    .where(eq(vipPayments.id, payment.id));

  await db.insert(vipSubscribers).values({
    subscriberId: makeSubscriberId("np"),
    orderId: payment.orderId,
    email: payment.email,
    code: availableCode.code,
    plan: payment.planName,
    amount: payment.amount,
    txId: payment.txId,
    status: "ACTIVE",
    startDate: now,
    endDate: expiresAt,
  });

  await replenishPool(codeType, 20).catch((err) => {
    console.warn("[NOWPayments] Replenish failed after activation:", err);
  });

  return {
    success: true as const,
    email: payment.email,
    code: availableCode.code,
    expiresAt,
    codeType,
  };
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
