import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/db";
import { paymentInvoices, vipPayments, vipSubscribers, vipCodes, vipSessions, referrals } from "../../db/schema";
import { replaceAllCodes as replaceAllCodesHelper, replenishPool } from "../../db/seed";
import { adminQuery, createRouter, publicQuery } from "../middleware";
import { createNowPaymentsInvoice, isNowPaymentsConfigured } from "../lib/nowpayments";

function generateUUID(): string {
  return `sub_${randomBytes(18).toString("base64url")}`;
}

function isTwoWeekPlan(planName: string, amount = ""): boolean {
  const plan = planName.toLowerCase();
  const numericAmount = Number.parseFloat(amount.replace(/[^\d.]/g, ""));
  return plan.includes("2-week") || plan.includes("2 week") ||
    plan.includes("14-day") || plan.includes("14 day") ||
    numericAmount === 33;
}

/** Yearly plans use the yearly pool. Monthly and shorter plans use the monthly pool. */
function planToCodeType(planName: string, amount = ""): "monthly" | "yearly" {
  const plan = planName.toLowerCase();
  const numericAmount = Number.parseFloat(amount.replace(/[^\d.]/g, ""));
  return plan.includes("year") || plan.includes("annual") || numericAmount === 669
    ? "yearly"
    : "monthly";
}

function calculatePlanEndDate(planName: string, amount = "", from = new Date()): Date {
  const endDate = new Date(from);
  if (isTwoWeekPlan(planName, amount)) {
    endDate.setDate(endDate.getDate() + 14);
    return endDate;
  }
  endDate.setMonth(endDate.getMonth() + (planToCodeType(planName, amount) === "yearly" ? 12 : 1));
  return endDate;
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

      const url = new URL(ctx.req.url);
      const forwardedProto = ctx.req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
      const forwardedHost = ctx.req.headers.get("x-forwarded-host") || ctx.req.headers.get("host") || url.host;
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

      try {
        await db.insert(vipPayments).values({
          orderId: input.orderId,
          planName: input.planName,
          amount: input.amount,
          email: normalizedEmail,
          txId: `NOWPAYMENTS-${invoice.id}`,
          status: "PENDING",
          screenshot: "",
        });
      } catch (err: any) {
        if (!String(err?.message || "").includes("UNIQUE")) throw err;
      }

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
      txId: z.string().min(1),
      screenshot: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        await db.insert(vipPayments).values({
          orderId: input.orderId,
          planName: input.planName,
          amount: input.amount,
          email: input.email,
          txId: input.txId,
          status: "PENDING",
          screenshot: input.screenshot || "",
        });
        console.log(`[vip.submitPayment] Saved order ${input.orderId} for ${input.email}`);
        return { success: true, orderId: input.orderId };
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
    return await db.select().from(vipPayments).orderBy(desc(vipPayments.submittedAt));
  }),

  getPendingPayments: adminQuery.query(async () => {
    return await db.select().from(vipPayments)
      .where(eq(vipPayments.status, "PENDING"))
      .orderBy(desc(vipPayments.submittedAt));
  }),

  // FIX: now picks a code matching the plan type (monthly vs yearly)
  //      and auto-replenishes the pool when it runs low.
  approvePayment: adminQuery
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      const [payment] = await db.select().from(vipPayments)
        .where(eq(vipPayments.orderId, input.orderId));

      if (!payment) return { success: false, error: "Payment not found" };
      if (payment.status !== "PENDING") return { success: false, error: "Already processed" };

      const codeType = planToCodeType(payment.planName, payment.amount);

      // Pick an unused code FROM THE CORRECT POOL
      const [availableCode] = await db.select().from(vipCodes)
        .where(and(eq(vipCodes.used, false), eq(vipCodes.codeType, codeType)))
        .limit(1);

      if (!availableCode) {
        return { success: false, error: `No ${codeType} codes available — refill the pool first` };
      }

      await db.update(vipCodes)
        .set({ used: true, assignedTo: payment.email })
        .where(eq(vipCodes.id, availableCode.id));

      const now = new Date();
      const endDate = calculatePlanEndDate(payment.planName, payment.amount, now);

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

      // Auto-replenish so the pool never silently empties
      try {
        await replenishPool(codeType, 20);
      } catch (err) {
        console.warn("[approvePayment] Replenish failed (non-fatal):", err);
      }

      return { success: true, code: availableCode.code, email: payment.email, codeType };
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
    return await db.select().from(vipSubscribers).orderBy(desc(vipSubscribers.startDate));
  }),

  revokeSubscriber: adminQuery
    .input(z.object({ subscriberId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(vipSubscribers)
        .set({ status: "REVOKED" })
        .where(eq(vipSubscribers.subscriberId, input.subscriberId));
      await db.update(vipSessions)
        .set({ active: false })
        .where(eq(vipSessions.subscriberId, input.subscriberId));
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

      const currentEnd = sub.endDate ? new Date(sub.endDate) : new Date();
      const renewalStart = currentEnd > new Date() ? currentEnd : new Date();
      const newEnd = calculatePlanEndDate(sub.plan, sub.amount, renewalStart);

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
      await db.update(vipSessions)
        .set({ active: false })
        .where(eq(vipSessions.subscriberId, input.subscriberId));

      return { success: true };
    }),

  // ─── Code Pool Endpoints ───

  /** All codes, optionally filtered by type. Ordered for stable UI display. */
  getCodes: adminQuery
    .input(z.object({ codeType: z.enum(["monthly", "yearly"]).optional() }).optional())
    .query(async ({ input }) => {
      if (input?.codeType) {
        return await db.select().from(vipCodes)
          .where(eq(vipCodes.codeType, input.codeType))
          .orderBy(vipCodes.used, vipCodes.code);
      }
      return await db.select().from(vipCodes).orderBy(vipCodes.codeType, vipCodes.used, vipCodes.code);
    }),

  /**
   * Replace codes — type-aware. Without args = wipe & refill BOTH pools (safer:
   * only deletes unused codes so active subscribers aren't broken).
   * Pass `force: true` to wipe everything including assigned codes.
   */
  replaceAllCodes: adminQuery
    .input(z.object({
      codeType: z.enum(["monthly", "yearly"]).optional(),
      count: z.number().int().positive().max(1000).optional(),
      force: z.boolean().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      try {
        const result = await replaceAllCodesHelper({
          codeType: input?.codeType,
          count: input?.count ?? 100,
          force: input?.force ?? false,
        });
        return {
          success: true,
          count: result.created,
          deleted: result.deleted,
          codeType: input?.codeType ?? "all",
        };
      } catch (err: any) {
        console.error("[replaceAllCodes] failed:", err);
        return { success: false, error: err?.message || "Failed to replace codes" };
      }
    }),

  /** Dedicated endpoints — clearer for the admin UI buttons. */
  replaceMonthlyCodes: adminQuery
    .input(z.object({ count: z.number().int().positive().max(1000).optional() }).optional())
    .mutation(async ({ input }) => {
      const result = await replaceAllCodesHelper({
        codeType: "monthly",
        count: input?.count ?? 100,
      });
      return { success: true, count: result.created, deleted: result.deleted };
    }),

  replaceYearlyCodes: adminQuery
    .input(z.object({ count: z.number().int().positive().max(1000).optional() }).optional())
    .mutation(async ({ input }) => {
      const result = await replaceAllCodesHelper({
        codeType: "yearly",
        count: input?.count ?? 100,
      });
      return { success: true, count: result.created, deleted: result.deleted };
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
      force: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
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

      const [existingSession] = await db.select().from(vipSessions)
        .where(and(eq(vipSessions.subscriberId, sub.subscriberId), eq(vipSessions.active, true)))
        .orderBy(desc(vipSessions.lastSeenAt));

      if (existingSession && existingSession.deviceId !== input.deviceId && !input.force) {
        return { success: false, error: "Account active on another device. Logout first.", blocked: true };
      }

      await db.update(vipSessions).set({ active: false }).where(eq(vipSessions.subscriberId, sub.subscriberId));

      const sessionToken = `sess_${randomBytes(24).toString("base64url")}`;
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

  grantVipGift: adminQuery
    .input(z.object({
      email: z.string().email(),
      months: z.number().int().min(1).max(12).default(1),
      plan: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const months = Math.min(Math.max(input.months || 1, 1), 12);
      const plan = input.plan?.trim() || `Admin Gift ${months} Month${months === 1 ? "" : "s"}`;

      const [existing] = await db.select().from(vipSubscribers).where(eq(vipSubscribers.email, email));
      if (existing?.status === "ACTIVE" && existing.endDate && new Date(existing.endDate) > new Date()) {
        return { success: true, email: existing.email, code: existing.code, expires: existing.endDate, reused: true };
      }

      if (existing) {
        await db.delete(vipSubscribers).where(eq(vipSubscribers.subscriberId, existing.subscriberId));
      }

      const codeType: "monthly" | "yearly" = months >= 12 || plan.toLowerCase().includes("year") ? "yearly" : "monthly";
      const [availableCode] = await db.select().from(vipCodes)
        .where(and(eq(vipCodes.used, false), eq(vipCodes.codeType, codeType)))
        .limit(1);

      if (!availableCode) {
        return { success: false, error: `No ${codeType} codes available` };
      }

      await db.update(vipCodes)
        .set({ used: true, assignedTo: email })
        .where(eq(vipCodes.id, availableCode.id));

      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(now.getMonth() + months);

      await db.insert(vipSubscribers).values({
        subscriberId: generateUUID(),
        orderId: "ADMIN-GIFT-" + Date.now(),
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

      return { success: true, email, code: availableCode.code, expires: endDate, reused: false, codeType };
    }),

  submitReferral: publicQuery
    .input(z.object({
      referralId: z.string().min(1),
      referrerCode: z.string().min(1),
      referrerEmail: z.string().email(),
      invitedEmail: z.string().email(),
      invitedName: z.string().optional(),
      txId: z.string().min(1),
      amount: z.string().default("$88"),
      screenshot: z.string().optional(),
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

      await db.update(referrals)
        .set({ status: "APPROVED", approvedAt: new Date() })
        .where(eq(referrals.id, ref.id));

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

  // FIX: now also returns split monthly/yearly counts so the admin UI
  //      can finally read these from the DB instead of localStorage.
  getStats: adminQuery.query(async () => {
    const payments = await db.select().from(vipPayments);
    const subscribers = await db.select().from(vipSubscribers);
    const codes = await db.select().from(vipCodes);

    const now = new Date().getTime();

    const monthlyCodes = codes.filter(c => c.codeType === "monthly");
    const yearlyCodes = codes.filter(c => c.codeType === "yearly");

    return {
      totalSubs: subscribers.length,
      active: subscribers.filter(s => s.status === "ACTIVE" && (!s.endDate || new Date(s.endDate).getTime() > now)).length,
      expired: subscribers.filter(s => s.endDate && new Date(s.endDate).getTime() < now).length,
      revoked: subscribers.filter(s => s.status === "REVOKED").length,

      // Combined (legacy field name kept for back-compat with old UI)
      codesAvailable: codes.filter(c => !c.used).length,
      codesUsed: codes.filter(c => c.used).length,

      // Split per pool
      monthlyCodesAvailable: monthlyCodes.filter(c => !c.used).length,
      monthlyCodesUsed: monthlyCodes.filter(c => c.used).length,
      monthlyCodesTotal: monthlyCodes.length,

      yearlyCodesAvailable: yearlyCodes.filter(c => !c.used).length,
      yearlyCodesUsed: yearlyCodes.filter(c => c.used).length,
      yearlyCodesTotal: yearlyCodes.length,

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
