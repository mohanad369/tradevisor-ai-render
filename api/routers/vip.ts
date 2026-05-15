import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/db";
import { paymentInvoices, vipPayments, vipSubscribers, vipCodes, vipSessions, referrals } from "../../db/schema";
import { adminQuery, createRouter, publicQuery } from "../middleware";
import { createNowPaymentsInvoice, isNowPaymentsConfigured } from "../lib/nowpayments";
import { verifyUsdtTrc20Payment } from "../lib/tron";

function generateUUID(): string {
  return 'sub_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

const USDT_TRC20_WALLET = "TYLqLhbtJSAaPZbibEZ1JtHfAD2ZJ71qHA";

async function activateVipFromPayment(payment: typeof vipPayments.$inferSelect) {
  const [availableCode] = await db.select().from(vipCodes)
    .where(eq(vipCodes.used, false))
    .limit(1);

  if (!availableCode) return { success: false, error: "No codes available" };

  await db.update(vipCodes)
    .set({ used: true, assignedTo: payment.email })
    .where(eq(vipCodes.id, availableCode.id));

  const now = new Date();
  const isYearly = payment.planName.toLowerCase().includes("year");
  const endDate = new Date();
  endDate.setMonth(now.getMonth() + (isYearly ? 12 : 1));

  await db.update(vipPayments)
    .set({ status: "APPROVED", approvedAt: now, assignedCode: availableCode.code })
    .where(eq(vipPayments.id, payment.id));

  await db.insert(vipSubscribers).values({
    subscriberId: generateUUID(),
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

  return { success: true, code: availableCode.code, email: payment.email };
}

export const vipRouter = createRouter({

  createCheckout: publicQuery
    .input(z.object({
      orderId: z.string().min(1),
      planName: z.string().min(1),
      amount: z.string().min(1),
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isNowPaymentsConfigured()) {
        return {
          success: false,
          error: "Hosted crypto checkout is not configured yet. Please contact support.",
        };
      }

      const normalizedEmail = input.email.trim().toLowerCase();
      const [existingInvoice] = await db.select().from(paymentInvoices)
        .where(eq(paymentInvoices.orderId, input.orderId))
        .limit(1);

      if (existingInvoice) {
        return {
          success: true,
          orderId: existingInvoice.orderId,
          invoiceUrl: existingInvoice.invoiceUrl,
          status: existingInvoice.status,
        };
      }

      const forwardedProto = ctx.req.headers.get("x-forwarded-proto") || new URL(ctx.req.url).protocol.replace(":", "");
      const forwardedHost = ctx.req.headers.get("x-forwarded-host") || ctx.req.headers.get("host") || new URL(ctx.req.url).host;
      const siteOrigin = `${forwardedProto}://${forwardedHost}`;

      const invoice = await createNowPaymentsInvoice({
        orderId: input.orderId,
        planName: input.planName,
        amount: input.amount,
        customerEmail: normalizedEmail,
        siteOrigin,
      });

      await db.insert(paymentInvoices).values({
        orderId: input.orderId,
        provider: "NOWPAYMENTS",
        providerInvoiceId: String(invoice.id),
        invoiceUrl: invoice.invoice_url,
        email: normalizedEmail,
        planName: input.planName,
        amount: input.amount,
        status: "WAITING",
        rawPayload: "",
      });

      await db.insert(vipPayments).values({
        orderId: input.orderId,
        planName: input.planName,
        amount: input.amount,
        email: normalizedEmail,
        txId: `NOWPAYMENTS-${invoice.id}`,
        status: "PENDING",
        screenshot: "",
      });

      return {
        success: true,
        orderId: input.orderId,
        invoiceUrl: invoice.invoice_url,
        status: "WAITING",
      };
    }),

  submitPayment: publicQuery
    .input(z.object({
      orderId: z.string().min(1),
      planName: z.string().min(1),
      amount: z.string().min(1),
      email: z.string().email(),
      txId: z.string().min(6).max(150),
      screenshot: z.string().max(7_000_000).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const normalizedTxId = input.txId.trim();
        const existingTx = await db.select().from(vipPayments)
          .where(eq(vipPayments.txId, normalizedTxId))
          .limit(1);

        if (existingTx.length > 0) {
          return {
            success: false,
            autoVerified: false,
            error: "This TXID was already submitted. Do not send again.",
          };
        }

        await db.insert(vipPayments).values({
          orderId: input.orderId,
          planName: input.planName,
          amount: input.amount,
          email: input.email,
          txId: normalizedTxId,
          status: "PENDING",
          screenshot: input.screenshot || "",
        });

        const [payment] = await db.select().from(vipPayments)
          .where(eq(vipPayments.orderId, input.orderId));

        const verification = await verifyUsdtTrc20Payment({
          txId: normalizedTxId,
          expectedAmount: input.amount,
          expectedRecipient: USDT_TRC20_WALLET,
        });

        if (payment && verification.verified) {
          const activation = await activateVipFromPayment(payment);
          if (activation.success) {
            console.log(`[vip.submitPayment] Auto-approved order ${input.orderId} for ${input.email}`);
            return {
              success: true,
              orderId: input.orderId,
              autoVerified: true,
              code: activation.code,
              email: activation.email,
            };
          }
        }

        console.log(`[vip.submitPayment] Saved order ${input.orderId} for ${input.email}`);
        return {
          success: true,
          orderId: input.orderId,
          autoVerified: false,
          verificationReason: verification.verified ? "Activation code was unavailable" : verification.reason,
        };
      } catch (err: any) {
        // SQLite UNIQUE constraint => duplicate orderId. Treat as already-submitted.
        if (String(err?.message || "").includes("UNIQUE")) {
          console.warn(`[vip.submitPayment] Duplicate orderId ${input.orderId} — already submitted`);
          return { success: true, orderId: input.orderId, duplicate: true };
        }
        console.error("[vip.submitPayment] DB insert failed:", err);
        throw new Error(`Failed to save payment: ${err?.message || "unknown error"}`);
      }
    }),

  getPayments: adminQuery.query(async () => {
    return await db.select().from(vipPayments).orderBy(vipPayments.submittedAt);
  }),

  getPendingPayments: adminQuery.query(async () => {
    return await db.select().from(vipPayments)
      .where(eq(vipPayments.status, "PENDING"))
      .orderBy(vipPayments.submittedAt);
  }),

  approvePayment: adminQuery
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      const [payment] = await db.select().from(vipPayments)
        .where(eq(vipPayments.orderId, input.orderId));

      if (!payment) return { success: false, error: "Payment not found" };
      if (payment.status !== "PENDING") return { success: false, error: "Already processed" };

      return activateVipFromPayment(payment);
    }),

  recheckPayment: adminQuery
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      const [payment] = await db.select().from(vipPayments)
        .where(eq(vipPayments.orderId, input.orderId));

      if (!payment) return { success: false, autoVerified: false, error: "Payment not found" };
      if (payment.status !== "PENDING") return { success: false, autoVerified: false, error: "Already processed" };

      const verification = await verifyUsdtTrc20Payment({
        txId: payment.txId,
        expectedAmount: payment.amount,
        expectedRecipient: USDT_TRC20_WALLET,
      });

      if (!verification.verified) {
        return {
          success: true,
          autoVerified: false,
          orderId: payment.orderId,
          reason: verification.reason,
          retryable: verification.retryable || false,
        };
      }

      const activation = await activateVipFromPayment(payment);
      if (!activation.success) {
        return {
          success: false,
          autoVerified: false,
          error: activation.error || "Could not activate VIP",
        };
      }

      return {
        success: true,
        autoVerified: true,
        orderId: payment.orderId,
        code: activation.code,
        email: activation.email,
      };
    }),

  rejectPayment: adminQuery
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(vipPayments)
        .set({ status: "REJECTED" })
        .where(eq(vipPayments.orderId, input.orderId));
      return { success: true };
    }),

  deletePayment: adminQuery
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(vipPayments).where(eq(vipPayments.orderId, input.orderId));
      return { success: true };
    }),

  getSubscribers: adminQuery.query(async () => {
    return await db.select().from(vipSubscribers).orderBy(vipSubscribers.startDate);
  }),

  revokeSubscriber: adminQuery
    .input(z.object({ subscriberId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(vipSubscribers)
        .set({ status: "REVOKED" })
        .where(eq(vipSubscribers.subscriberId, input.subscriberId));
      return { success: true };
    }),

  reactivateSubscriber: adminQuery
    .input(z.object({ subscriberId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(vipSubscribers)
        .set({ status: "ACTIVE" })
        .where(eq(vipSubscribers.subscriberId, input.subscriberId));
      return { success: true };
    }),

  renewSubscriber: adminQuery
    .input(z.object({ subscriberId: z.string() }))
    .mutation(async ({ input }) => {
      const [sub] = await db.select().from(vipSubscribers)
        .where(eq(vipSubscribers.subscriberId, input.subscriberId));
      if (!sub) return { success: false };

      const isYearly = sub.plan.toLowerCase().includes("year");
      const newEnd = sub.endDate ? new Date(sub.endDate) : new Date();
      newEnd.setMonth(newEnd.getMonth() + (isYearly ? 12 : 1));

      await db.update(vipSubscribers)
        .set({ status: "ACTIVE", endDate: newEnd })
        .where(eq(vipSubscribers.subscriberId, input.subscriberId));

      return { success: true };
    }),

  deleteSubscriber: adminQuery
    .input(z.object({ subscriberId: z.string() }))
    .mutation(async ({ input }) => {
      const [sub] = await db.select().from(vipSubscribers)
        .where(eq(vipSubscribers.subscriberId, input.subscriberId));

      if (sub) {
        await db.update(vipCodes)
          .set({ used: false, assignedTo: null })
          .where(eq(vipCodes.code, sub.code));
      }

      await db.delete(vipSubscribers)
        .where(eq(vipSubscribers.subscriberId, input.subscriberId));

      return { success: true };
    }),

  getCodes: adminQuery.query(async () => {
    return await db.select().from(vipCodes);
  }),

  replaceAllCodes: adminQuery
    .mutation(async () => {
      await db.delete(vipCodes);

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const newCodes = [];
      for (let i = 0; i < 100; i++) {
        let code = "";
        for (let j = 0; j < 8; j++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        newCodes.push({ code, used: false, assignedTo: null });
      }

      await db.insert(vipCodes).values(newCodes);
      return { success: true, count: 100 };
    }),

  // FIXED: chained .where() in Drizzle silently drops the first condition.
  //        Combine with `and()` so email + code are both checked.
  verifyCode: publicQuery
    .input(z.object({ email: z.string().optional(), code: z.string() }))
    .query(async ({ input }) => {
      let sub;
      if (input.email) {
        const [found] = await db.select().from(vipSubscribers)
          .where(and(
            eq(vipSubscribers.email, input.email),
            eq(vipSubscribers.code, input.code),
          ));
        sub = found;
      } else {
        const [found] = await db.select().from(vipSubscribers)
          .where(eq(vipSubscribers.code, input.code));
        sub = found;
      }

      if (!sub) return { valid: false, error: "Invalid credentials" };
      if (sub.status === "REVOKED") return { valid: false, error: "Access revoked" };
      if (sub.endDate && new Date(sub.endDate) < new Date()) return { valid: false, error: "Subscription expired" };

      return { valid: true, subscriber: sub };
    }),

  // ─── Login with Session Lock (prevents multi-device) ───
  login: publicQuery
    .input(z.object({
      email: z.string().email().optional(),
      code: z.string().min(1),
      deviceId: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Verify subscriber credentials
      let sub;
      if (input.email) {
        const [found] = await db.select().from(vipSubscribers)
          .where(and(eq(vipSubscribers.email, input.email), eq(vipSubscribers.code, input.code)));
        sub = found;
      } else {
        const [found] = await db.select().from(vipSubscribers)
          .where(eq(vipSubscribers.code, input.code));
        sub = found;
      }

      if (!sub) return { success: false, error: "Invalid credentials" };
      if (sub.status === "REVOKED") return { success: false, error: "Access revoked" };
      if (sub.endDate && new Date(sub.endDate) < new Date()) return { success: false, error: "Subscription expired" };

      // 2. Check if there's an active session on ANOTHER device
      const [existingSession] = await db.select().from(vipSessions)
        .where(and(eq(vipSessions.subscriberId, sub.subscriberId), eq(vipSessions.active, true)))
        .orderBy(desc(vipSessions.lastSeenAt));

      if (existingSession && existingSession.deviceId !== input.deviceId) {
        return { success: false, error: "Account active on another device. Logout first.", blocked: true };
      }

      // 3. Deactivate old sessions for this subscriber
      await db.update(vipSessions).set({ active: false }).where(eq(vipSessions.subscriberId, sub.subscriberId));

      // 4. Create new session
      const sessionToken = "sess_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const ip = ctx.req.headers.get("x-forwarded-for") || ctx.req.headers.get("x-real-ip") || "unknown";
      const ua = ctx.req.headers.get("user-agent") || "";

      await db.insert(vipSessions).values({
        sessionToken, subscriberId: sub.subscriberId, email: sub.email,
        code: sub.code, deviceId: input.deviceId, ip, userAgent: ua,
        active: true, expiresAt,
      });

      return { success: true, sessionToken, subscriber: sub, expires: expiresAt };
    }),

  verifySession: publicQuery
    .input(z.object({ sessionToken: z.string(), deviceId: z.string() }))
    .query(async ({ input }) => {
      const [session] = await db.select().from(vipSessions)
        .where(and(eq(vipSessions.sessionToken, input.sessionToken), eq(vipSessions.deviceId, input.deviceId), eq(vipSessions.active, true)));

      if (!session) return { valid: false, error: "Session invalid" };
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        await db.update(vipSessions).set({ active: false }).where(eq(vipSessions.id, session.id));
        return { valid: false, error: "Session expired" };
      }

      await db.update(vipSessions).set({ lastSeenAt: new Date() }).where(eq(vipSessions.id, session.id));
      const [sub] = await db.select().from(vipSubscribers).where(eq(vipSubscribers.subscriberId, session.subscriberId));
      return { valid: true, subscriber: sub };
    }),

  logout: publicQuery
    .input(z.object({ sessionToken: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(vipSessions).set({ active: false }).where(eq(vipSessions.sessionToken, input.sessionToken));
      return { success: true };
    }),

  getSessions: adminQuery.query(async () => {
    return await db.select().from(vipSessions).where(eq(vipSessions.active, true)).orderBy(desc(vipSessions.lastSeenAt));
  }),

  // ─── Referral / Partner Program ───

  submitReferral: publicQuery
    .input(z.object({
      referralId: z.string().min(1),
      referrerCode: z.string().min(1),
      referrerEmail: z.string().email(),
      invitedEmail: z.string().email(),
      invitedName: z.string().optional(),
      txId: z.string().min(6).max(150),
      amount: z.string().default("$88"),
      screenshot: z.string().max(7_000_000).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        await db.insert(referrals).values({
          referralId: input.referralId,
          referrerCode: input.referrerCode,
          referrerEmail: input.referrerEmail,
          invitedEmail: input.invitedEmail,
          invitedName: input.invitedName || null,
          txId: input.txId,
          amount: input.amount,
          screenshot: input.screenshot || "",
          status: "PENDING",
        });
        return { success: true, referralId: input.referralId };
      } catch (err: any) {
        if (String(err?.message || "").includes("UNIQUE")) {
          return { success: true, referralId: input.referralId, duplicate: true };
        }
        throw new Error(`Failed to save referral: ${err?.message || "unknown"}`);
      }
    }),

  getReferrals: adminQuery.query(async () => {
    return await db.select().from(referrals).orderBy(desc(referrals.submittedAt));
  }),

  getPendingReferrals: adminQuery.query(async () => {
    return await db.select().from(referrals)
      .where(eq(referrals.status, "PENDING"))
      .orderBy(desc(referrals.submittedAt));
  }),

  approveReferral: adminQuery
    .input(z.object({ referralId: z.string() }))
    .mutation(async ({ input }) => {
      const [ref] = await db.select().from(referrals)
        .where(eq(referrals.referralId, input.referralId));

      if (!ref) return { success: false, error: "Referral not found" };
      if (ref.status !== "PENDING") return { success: false, error: "Already processed" };

      // Approve the referral
      await db.update(referrals)
        .set({ status: "APPROVED", approvedAt: new Date() })
        .where(eq(referrals.id, ref.id));

      // Extend referrer's subscription by 1 month
      const [referrerSub] = await db.select().from(vipSubscribers)
        .where(eq(vipSubscribers.email, ref.referrerEmail));

      if (referrerSub) {
        const newEndDate = referrerSub.endDate
          ? new Date(referrerSub.endDate)
          : new Date();
        newEndDate.setMonth(newEndDate.getMonth() + 1);

        await db.update(vipSubscribers)
          .set({ endDate: newEndDate })
          .where(eq(vipSubscribers.subscriberId, referrerSub.subscriberId));

        // Mark reward as granted
        await db.update(referrals)
          .set({ rewardGranted: true, rewardDate: new Date() })
          .where(eq(referrals.id, ref.id));
      }

      return { success: true, referrerEmail: ref.referrerEmail };
    }),

  rejectReferral: adminQuery
    .input(z.object({ referralId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(referrals)
        .set({ status: "REJECTED" })
        .where(eq(referrals.referralId, input.referralId));
      return { success: true };
    }),

  deleteReferral: adminQuery
    .input(z.object({ referralId: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(referrals).where(eq(referrals.referralId, input.referralId));
      return { success: true };
    }),

  getReferrerStats: publicQuery
    .input(z.object({ referrerCode: z.string() }))
    .query(async ({ input }) => {
      const all = await db.select().from(referrals)
        .where(eq(referrals.referrerCode, input.referrerCode));

      return {
        total: all.length,
        pending: all.filter(r => r.status === "PENDING").length,
        approved: all.filter(r => r.status === "APPROVED").length,
        rejected: all.filter(r => r.status === "REJECTED").length,
        rewards: all.filter(r => r.rewardGranted).length,
      };
    }),

  getStats: adminQuery.query(async () => {
    const payments = await db.select().from(vipPayments);
    const subscribers = await db.select().from(vipSubscribers);
    const codes = await db.select().from(vipCodes);

    const now = new Date().getTime();
    return {
      totalSubs: subscribers.length,
      active: subscribers.filter(s => s.status === "ACTIVE" && (!s.endDate || new Date(s.endDate).getTime() > now)).length,
      expired: subscribers.filter(s => s.endDate && new Date(s.endDate).getTime() < now).length,
      revoked: subscribers.filter(s => s.status === "REVOKED").length,
      codesAvailable: codes.filter(c => !c.used).length,
      codesUsed: codes.filter(c => c.used).length,
      pendingPayments: payments.filter(p => p.status === "PENDING").length,
      approvedPayments: payments.filter(p => p.status === "APPROVED").length,
      rejectedPayments: payments.filter(p => p.status === "REJECTED").length,
    };
  }),

  /** Get real-time gold price from Yahoo Finance (server-side = no CORS) */
  getGoldPrice: publicQuery.query(async () => {
    try {
      const res = await fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d"
      );
      if (!res.ok) throw new Error("Yahoo error");
      const json = await res.json() as any;
      const result = json.chart?.result?.[0];
      if (!result) throw new Error("No data");

      const meta = result.meta;
      const price = meta.regularMarketPrice || meta.previousClose || 0;
      const prevClose = meta.previousClose || meta.chartPreviousClose || price;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
      const troyOzToGram = 31.1034768;
      const gram24k = price / troyOzToGram;

      return {
        symbol: "XAU/USD",
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        open: Number((meta.regularMarketOpen || prevClose).toFixed(2)),
        high: Number((meta.regularMarketDayHigh || price).toFixed(2)),
        low: Number((meta.regularMarketDayLow || price).toFixed(2)),
        previousClose: Number(prevClose.toFixed(2)),
        gram24k: Number(gram24k.toFixed(2)),
        gram22k: Number((gram24k * 0.9167).toFixed(2)),
        gram21k: Number((gram24k * 0.875).toFixed(2)),
        gram18k: Number((gram24k * 0.75).toFixed(2)),
        timestamp: Math.floor(Date.now() / 1000),
      };
    } catch {
      // Fallback: Binance XAUUSDT
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=XAUUSDT");
        if (!res.ok) throw new Error("Binance error");
        const data = await res.json() as any;
        const price = parseFloat(data.lastPrice) || 0;
        const open = parseFloat(data.openPrice) || price;
        const change = parseFloat(data.priceChange) || 0;
        const changePercent = parseFloat(data.priceChangePercent) || 0;
        const troyOzToGram = 31.1034768;
        const gram24k = price / troyOzToGram;

        return {
          symbol: "XAU/USD",
          price: Number(price.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          open: Number(open.toFixed(2)),
          high: Number((parseFloat(data.highPrice) || price).toFixed(2)),
          low: Number((parseFloat(data.lowPrice) || price).toFixed(2)),
          previousClose: Number(open.toFixed(2)),
          gram24k: Number(gram24k.toFixed(2)),
          gram22k: Number((gram24k * 0.9167).toFixed(2)),
          gram21k: Number((gram24k * 0.875).toFixed(2)),
          gram18k: Number((gram24k * 0.75).toFixed(2)),
          timestamp: Math.floor(Date.now() / 1000),
        };
      } catch {
        return null;
      }
    }
  }),
});
