import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/db";
import {
  traderAccounts,
  traderTrades,
  agentMemory,
  dailyAnalysisUsage,
  aiAnalyses,
  userSessions,
  users,
  vipSubscribers,
} from "../../db/schema";
import { createRouter, publicQuery } from "../middleware";

/**
 * Trader Dashboard router.
 *
 * Everything here is scoped to the logged-in user (resolved from the
 * `x-user-token` header). It covers: the trading account (capital +
 * risk settings), the trade journal, the growth-plan projection, the
 * lot-size helper, and the agent performance memory.
 *
 * IMPORTANT: numbers here are tracking + math tools. They are NOT a
 * promise of profit — trading carries real risk of loss.
 */

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

/** Resolve the logged-in user from the x-user-token header, or null. */
async function resolveUser(req: Request) {
  const token = req.headers.get("x-user-token") || "";
  if (!token) return null;
  const [session] = await db.select().from(userSessions)
    .where(eq(userSessions.sessionToken, token));
  if (!session || !session.active) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(users)
    .where(eq(users.userId, session.userId));
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

/** Get the user's trading account row, creating a default one if absent. */
async function getOrCreateAccount(userId: string) {
  const [existing] = await db.select().from(traderAccounts)
    .where(eq(traderAccounts.userId, userId));
  if (existing) return existing;
  await db.insert(traderAccounts).values({
    userId,
    startingCapital: "0",
    currentBalance: "0",
    riskPercent: "1",
    rewardRatio: "2",
    currency: "USD",
  });
  const [created] = await db.select().from(traderAccounts)
    .where(eq(traderAccounts.userId, userId));
  return created;
}

/** Roll a win/loss/BE into the per-(user,asset,strategy) agent memory. */
async function updateAgentMemory(
  userId: string,
  asset: string,
  strategy: string,
  outcome: "WIN" | "LOSS" | "BE",
  lesson: string,
) {
  const a = (asset || "general").toLowerCase();
  const s = (strategy || "general").toLowerCase();
  const memoryKey = `${userId}:${a}:${s}`;

  const [existing] = await db.select().from(agentMemory)
    .where(eq(agentMemory.memoryKey, memoryKey));

  // Keep a short rolling list of the most recent lessons (max 8).
  const trimmedLesson = lesson.trim().slice(0, 240);
  const mergeLessons = (prev: string) => {
    if (!trimmedLesson) return prev;
    const list = prev ? prev.split("\n").filter(Boolean) : [];
    list.unshift(trimmedLesson);
    return list.slice(0, 8).join("\n");
  };

  if (!existing) {
    await db.insert(agentMemory).values({
      memoryKey,
      userId,
      asset: a,
      strategy: s,
      wins: outcome === "WIN" ? 1 : 0,
      losses: outcome === "LOSS" ? 1 : 0,
      breakeven: outcome === "BE" ? 1 : 0,
      lessons: mergeLessons(""),
      updatedAt: new Date(),
    });
    return;
  }

  await db.update(agentMemory)
    .set({
      wins: existing.wins + (outcome === "WIN" ? 1 : 0),
      losses: existing.losses + (outcome === "LOSS" ? 1 : 0),
      breakeven: existing.breakeven + (outcome === "BE" ? 1 : 0),
      lessons: mergeLessons(existing.lessons || ""),
      updatedAt: new Date(),
    })
    .where(eq(agentMemory.memoryKey, memoryKey));
}

export const dashboardRouter = createRouter({

  // ─── Full dashboard snapshot: account + stats + recent trades ───
  overview: publicQuery.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.req);
    if (!user) return { loggedIn: false as const };

    const account = await getOrCreateAccount(user.userId);
    const trades = await db.select().from(traderTrades)
      .where(eq(traderTrades.userId, user.userId))
      .orderBy(desc(traderTrades.createdAt));

    const wins = trades.filter((t) => t.outcome === "WIN").length;
    const losses = trades.filter((t) => t.outcome === "LOSS").length;
    const breakeven = trades.filter((t) => t.outcome === "BE").length;
    const totalTrades = trades.length;
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;

    const totalPnl = trades.reduce((sum, t) => sum + num(t.amount), 0);
    const grossWin = trades
      .filter((t) => t.outcome === "WIN")
      .reduce((sum, t) => sum + num(t.amount), 0);
    const grossLoss = trades
      .filter((t) => t.outcome === "LOSS")
      .reduce((sum, t) => sum + Math.abs(num(t.amount)), 0);

    return {
      loggedIn: true as const,
      account: {
        startingCapital: num(account.startingCapital),
        currentBalance: num(account.currentBalance),
        riskPercent: num(account.riskPercent, 1),
        rewardRatio: num(account.rewardRatio, 2),
        currency: account.currency,
      },
      stats: {
        totalTrades, wins, losses, breakeven, winRate,
        totalPnl: Number(totalPnl.toFixed(2)),
        grossWin: Number(grossWin.toFixed(2)),
        grossLoss: Number(grossLoss.toFixed(2)),
        avgWin: wins > 0 ? Number((grossWin / wins).toFixed(2)) : 0,
        avgLoss: losses > 0 ? Number((grossLoss / losses).toFixed(2)) : 0,
        profitFactor: grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? 999 : 0,
      },
      recentTrades: trades.slice(0, 20),
    };
  }),

  // ─── Set up / update the trading account ───
  saveAccount: publicQuery
    .input(z.object({
      startingCapital: z.number().min(0).max(100_000_000).optional(),
      currentBalance: z.number().min(0).max(100_000_000).optional(),
      riskPercent: z.number().min(0.1).max(10).optional(),
      rewardRatio: z.number().min(1).max(10).optional(),
      currency: z.string().max(8).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { success: false, error: "Not logged in" };

      const account = await getOrCreateAccount(user.userId);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.startingCapital !== undefined) {
        updates.startingCapital = String(input.startingCapital);
        // First-time setup: balance follows the starting capital.
        if (num(account.startingCapital) === 0 && num(account.currentBalance) === 0) {
          updates.currentBalance = String(input.startingCapital);
        }
      }
      if (input.currentBalance !== undefined) updates.currentBalance = String(input.currentBalance);
      if (input.riskPercent !== undefined) updates.riskPercent = String(input.riskPercent);
      if (input.rewardRatio !== undefined) updates.rewardRatio = String(input.rewardRatio);
      if (input.currency !== undefined) updates.currency = input.currency;

      await db.update(traderAccounts)
        .set(updates)
        .where(eq(traderAccounts.userId, user.userId));

      return { success: true };
    }),

  // ─── Log a trade (win / loss / breakeven) ───
  logTrade: publicQuery
    .input(z.object({
      asset: z.string().max(40).optional(),
      direction: z.enum(["BUY", "SELL"]).optional(),
      outcome: z.enum(["WIN", "LOSS", "BE"]),
      amount: z.number().min(-10_000_000).max(10_000_000),
      lotSize: z.number().min(0).max(10000).optional(),
      riskPercent: z.number().min(0).max(100).optional(),
      strategy: z.string().max(60).optional(),
      notes: z.string().max(600).optional(),
      lessonLearned: z.string().max(600).optional(),
      // When set, this trade was taken from a saved AI analysis.
      analysisId: z.string().max(60).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { success: false, error: "Not logged in" };

      const account = await getOrCreateAccount(user.userId);

      // Normalize the sign: WIN is positive, LOSS is negative, BE ~ 0.
      let signed = input.amount;
      if (input.outcome === "WIN") signed = Math.abs(input.amount);
      else if (input.outcome === "LOSS") signed = -Math.abs(input.amount);
      else signed = 0;

      // If linked to an AI analysis, pull its details so the trade and
      // the agent memory reflect what the AI actually advised.
      let linkedAnalysis: typeof aiAnalyses.$inferSelect | undefined;
      if (input.analysisId) {
        [linkedAnalysis] = await db.select().from(aiAnalyses)
          .where(and(
            eq(aiAnalyses.analysisId, input.analysisId),
            eq(aiAnalyses.userId, user.userId),
          ));
      }

      const asset = input.asset || linkedAnalysis?.asset || "";
      const strategy = linkedAnalysis
        ? `AI: ${linkedAnalysis.strategy || "analysis"}`
        : (input.strategy || "");
      const isAi = Boolean(linkedAnalysis);

      const tradeId = `trd_${randomBytes(9).toString("base64url")}`;
      await db.insert(traderTrades).values({
        tradeId,
        userId: user.userId,
        asset,
        direction: input.direction || linkedAnalysis?.signal || "",
        outcome: input.outcome,
        amount: String(signed),
        lotSize: input.lotSize !== undefined ? String(input.lotSize) : "",
        riskPercent: input.riskPercent !== undefined ? String(input.riskPercent) : "",
        strategy,
        analysisId: input.analysisId || "",
        source: isAi ? "ai" : "manual",
        notes: input.notes || "",
        lessonLearned: input.lessonLearned || "",
      });

      // Stamp the outcome back onto the AI analysis record.
      if (linkedAnalysis) {
        await db.update(aiAnalyses)
          .set({ outcome: input.outcome })
          .where(eq(aiAnalyses.analysisId, linkedAnalysis.analysisId));
      }

      // Move the running balance.
      const newBalance = num(account.currentBalance) + signed;
      await db.update(traderAccounts)
        .set({ currentBalance: String(newBalance), updatedAt: new Date() })
        .where(eq(traderAccounts.userId, user.userId));

      // Feed the agent memory so future analyses learn from this result.
      await updateAgentMemory(
        user.userId,
        asset,
        strategy,
        input.outcome,
        input.lessonLearned || "",
      );

      return { success: true, tradeId, newBalance: Number(newBalance.toFixed(2)) };
    }),

  // ─── Save an AI analysis (called by the chart analyzer) ───
  saveAnalysis: publicQuery
    .input(z.object({
      asset: z.string().max(40).optional(),
      strategy: z.string().max(60).optional(),
      timeframe: z.string().max(20).optional(),
      signal: z.string().max(20).optional(),
      confidence: z.number().min(0).max(100).optional(),
      entry: z.string().max(40).optional(),
      stopLoss: z.string().max(40).optional(),
      takeProfit: z.string().max(40).optional(),
      summary: z.string().max(600).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      // Silently no-op for logged-out visitors — analyses are only
      // saved for account holders who can use the dashboard.
      if (!user) return { saved: false };

      const analysisId = `anl_${randomBytes(9).toString("base64url")}`;
      await db.insert(aiAnalyses).values({
        analysisId,
        userId: user.userId,
        asset: input.asset || "",
        strategy: input.strategy || "",
        timeframe: input.timeframe || "",
        signal: input.signal || "",
        confidence: input.confidence ?? 0,
        entry: input.entry || "",
        stopLoss: input.stopLoss || "",
        takeProfit: input.takeProfit || "",
        summary: input.summary || "",
        outcome: "",
      });
      return { saved: true, analysisId };
    }),

  // ─── List the user's recent AI analyses (for the trade form) ───
  myAnalyses: publicQuery
    .input(z.object({ onlyUnlogged: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { loggedIn: false as const };

      const rows = await db.select().from(aiAnalyses)
        .where(eq(aiAnalyses.userId, user.userId))
        .orderBy(desc(aiAnalyses.createdAt));

      const list = (input?.onlyUnlogged ? rows.filter((r) => !r.outcome) : rows)
        .slice(0, 40)
        .map((r) => ({
          analysisId: r.analysisId,
          asset: r.asset,
          strategy: r.strategy,
          timeframe: r.timeframe,
          signal: r.signal,
          confidence: r.confidence ?? 0,
          entry: r.entry,
          stopLoss: r.stopLoss,
          takeProfit: r.takeProfit,
          summary: r.summary,
          outcome: r.outcome || "",
          createdAt: r.createdAt,
        }));

      return { loggedIn: true as const, analyses: list };
    }),

  // ─── Delete a logged trade (reverses its balance effect) ───
  // Daily subscriber archive: shows analyses opened in the last 24 hours.
  // We hide expired rows instead of deleting them here, keeping subscriber data safe.
  todayArchive: publicQuery
    .input(z.object({ limit: z.number().int().min(1).max(80).optional() }).optional())
    .query(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { loggedIn: false as const };

      const dailyLimit = await dailyLimitForUser(user.email);
      if (dailyLimit === 0) {
        return {
          loggedIn: true as const,
          isSubscriber: false,
          analyses: [],
          windowHours: 24,
        };
      }

      const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
      const rows = await db.select().from(aiAnalyses)
        .where(eq(aiAnalyses.userId, user.userId))
        .orderBy(desc(aiAnalyses.createdAt));

      const analyses = rows
        .filter((r) => new Date(r.createdAt ?? 0).getTime() >= cutoffMs)
        .slice(0, input?.limit ?? 40)
        .map((r) => {
          const createdMs = new Date(r.createdAt ?? 0).getTime();
          const expiresAt = new Date(createdMs + 24 * 60 * 60 * 1000);
          return {
            analysisId: r.analysisId,
            asset: r.asset,
            strategy: r.strategy,
            timeframe: r.timeframe,
            signal: r.signal,
            confidence: r.confidence ?? 0,
            entry: r.entry,
            stopLoss: r.stopLoss,
            takeProfit: r.takeProfit,
            summary: r.summary,
            outcome: r.outcome || "",
            createdAt: r.createdAt,
            expiresAt,
            minutesUntilExpiry: Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60000)),
          };
        });

      return {
        loggedIn: true as const,
        isSubscriber: true,
        windowHours: 24,
        dailyLimit,
        analyses,
      };
    }),

  deleteTrade: publicQuery
    .input(z.object({ tradeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { success: false, error: "Not logged in" };

      const [trade] = await db.select().from(traderTrades)
        .where(and(
          eq(traderTrades.tradeId, input.tradeId),
          eq(traderTrades.userId, user.userId),
        ));
      if (!trade) return { success: false, error: "Trade not found" };

      const account = await getOrCreateAccount(user.userId);
      const newBalance = num(account.currentBalance) - num(trade.amount);

      await db.delete(traderTrades).where(eq(traderTrades.tradeId, input.tradeId));
      await db.update(traderAccounts)
        .set({ currentBalance: String(newBalance), updatedAt: new Date() })
        .where(eq(traderAccounts.userId, user.userId));

      return { success: true, newBalance: Number(newBalance.toFixed(2)) };
    }),

  /**
   * Growth plan — a 1-month projection.
   *
   * Pure math, not a guarantee. With a fixed risk % per trade and a
   * fixed reward:risk, we project the balance forward over the month
   * using the user's REAL win rate (or a conservative estimate when
   * they have too few trades to be statistically meaningful).
   */
  growthPlan: publicQuery
    .input(z.object({
      tradesPerDay: z.number().int().min(1).max(20).optional(),
      tradingDays: z.number().int().min(1).max(31).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { loggedIn: false as const };

      const account = await getOrCreateAccount(user.userId);
      const trades = await db.select().from(traderTrades)
        .where(eq(traderTrades.userId, user.userId));

      const wins = trades.filter((t) => t.outcome === "WIN").length;
      const losses = trades.filter((t) => t.outcome === "LOSS").length;
      const decided = wins + losses;

      // Use the real win rate once there are enough decided trades;
      // otherwise fall back to a deliberately conservative 50%.
      const hasEnoughData = decided >= 10;
      const winRate = hasEnoughData ? wins / decided : 0.5;

      const balance = num(account.currentBalance) || num(account.startingCapital);
      const riskPct = num(account.riskPercent, 1) / 100;
      const rr = num(account.rewardRatio, 2);

      const tradesPerDay = clamp(input?.tradesPerDay ?? 4, 1, 20);
      const tradingDays = clamp(input?.tradingDays ?? 20, 1, 31);
      const totalTrades = tradesPerDay * tradingDays;

      // Expected value per trade as a fraction of balance:
      //   win:  +riskPct * rr      loss: -riskPct
      const evPerTrade = winRate * (riskPct * rr) - (1 - winRate) * riskPct;

      // Compound day by day so the projection reflects a growing base.
      let projected = balance;
      const dailyPoints: Array<{ day: number; balance: number }> = [];
      for (let d = 1; d <= tradingDays; d++) {
        for (let i = 0; i < tradesPerDay; i++) {
          projected = projected * (1 + evPerTrade);
        }
        dailyPoints.push({ day: d, balance: Number(projected.toFixed(2)) });
      }

      const projectedEnd = Number(projected.toFixed(2));
      const growthAmount = Number((projectedEnd - balance).toFixed(2));
      const growthPercent = balance > 0
        ? Number((((projectedEnd - balance) / balance) * 100).toFixed(1))
        : 0;

      return {
        loggedIn: true as const,
        basedOnRealData: hasEnoughData,
        inputs: {
          startBalance: Number(balance.toFixed(2)),
          riskPercent: num(account.riskPercent, 1),
          rewardRatio: rr,
          winRatePercent: Math.round(winRate * 100),
          tradesPerDay, tradingDays, totalTrades,
        },
        projection: {
          endBalance: projectedEnd,
          growthAmount,
          growthPercent,
          evPerTradePercent: Number((evPerTrade * 100).toFixed(3)),
          dailyPoints,
        },
        // If EV is negative the plan would shrink the account — flag it.
        warning: evPerTrade <= 0
          ? "With the current win rate and risk settings this plan does not grow the account. Improve win rate or adjust risk."
          : null,
      };
    }),

  /**
   * Lot-size helper.
   *
   * Given the account balance, risk %, and stop-loss distance in pips,
   * returns the position size that risks exactly that % of the account.
   */
  lotSize: publicQuery
    .input(z.object({
      stopLossPips: z.number().min(0.1).max(100000),
      pipValuePerLot: z.number().min(0.01).max(100000).optional(),
      riskPercentOverride: z.number().min(0.1).max(10).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { loggedIn: false as const };

      const account = await getOrCreateAccount(user.userId);
      const balance = num(account.currentBalance) || num(account.startingCapital);
      const riskPct = (input.riskPercentOverride ?? num(account.riskPercent, 1)) / 100;

      // Standard FX default: $10 per pip for 1.00 lot.
      const pipValuePerLot = input.pipValuePerLot ?? 10;

      const riskAmount = balance * riskPct;
      const rawLot = riskAmount / (input.stopLossPips * pipValuePerLot);
      const lot = Number(Math.max(0, rawLot).toFixed(2));

      return {
        loggedIn: true as const,
        balance: Number(balance.toFixed(2)),
        riskPercent: riskPct * 100,
        riskAmount: Number(riskAmount.toFixed(2)),
        stopLossPips: input.stopLossPips,
        pipValuePerLot,
        recommendedLot: lot,
        rewardTargetAmount: Number((riskAmount * num(account.rewardRatio, 2)).toFixed(2)),
      };
    }),

  // ─── Agent memory summary (what the agents "remember" for this user) ───
  agentMemory: publicQuery.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.req);
    if (!user) return { loggedIn: false as const };

    const rows = await db.select().from(agentMemory)
      .where(eq(agentMemory.userId, user.userId))
      .orderBy(desc(agentMemory.updatedAt));

    const buckets = rows.map((r) => {
      const decided = r.wins + r.losses;
      return {
        asset: r.asset,
        strategy: r.strategy,
        wins: r.wins,
        losses: r.losses,
        breakeven: r.breakeven,
        winRate: decided > 0 ? Math.round((r.wins / decided) * 100) : 0,
        lessons: (r.lessons || "").split("\n").filter(Boolean),
      };
    });

    const totalWins = rows.reduce((s, r) => s + r.wins, 0);
    const totalLosses = rows.reduce((s, r) => s + r.losses, 0);
    const decided = totalWins + totalLosses;

    return {
      loggedIn: true as const,
      overallWinRate: decided > 0 ? Math.round((totalWins / decided) * 100) : 0,
      totalWins,
      totalLosses,
      buckets,
    };
  }),

  // ─── Subscriber daily analysis quota ───
  // Monthly plan → 10/day, Yearly → 20/day, $33 two-week access → 5/day.
  dailyQuota: publicQuery.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.req);
    if (!user) return { loggedIn: false as const };

    const limit = await dailyLimitForUser(user.email);
    if (limit === 0) {
      return { loggedIn: true as const, isSubscriber: false, limit: 0, used: 0, remaining: 0 };
    }

    const day = new Date().toISOString().slice(0, 10);
    const used = await readDailyUsage(user.userId, day);
    return {
      loggedIn: true as const,
      isSubscriber: true,
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }),

  // ─── Consume one subscriber daily analysis ───
  consumeDaily: publicQuery
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      const user = await resolveUser(ctx.req);
      if (!user) return { loggedIn: false as const, allowed: false };

      const limit = await dailyLimitForUser(user.email);
      if (limit === 0) {
        return { loggedIn: true as const, isSubscriber: false, allowed: false, limit: 0, used: 0, remaining: 0 };
      }

      const day = new Date().toISOString().slice(0, 10);
      const used = await readDailyUsage(user.userId, day);
      if (used >= limit) {
        return { loggedIn: true as const, isSubscriber: true, allowed: false, limit, used, remaining: 0 };
      }

      const usageKey = `${user.userId}:${day}`;
      await db.insert(dailyAnalysisUsage)
        .values({ usageKey, userId: user.userId, day, used: 1, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: dailyAnalysisUsage.usageKey,
          set: { used: sql`${dailyAnalysisUsage.used} + 1`, updatedAt: new Date() },
        });

      return {
        loggedIn: true as const,
        isSubscriber: true,
        allowed: true,
        limit,
        used: used + 1,
        remaining: Math.max(0, limit - used - 1),
      };
    }),
});

// ════════════════════════════════════════════════════════════════
// Daily quota helpers
// ════════════════════════════════════════════════════════════════

/**
 * Resolve a user's daily analysis limit from their active VIP plan.
 *   - yearly plan  → 20/day
 *   - $33 / two-week access → 5/day
 *   - legacy $25 / 3-day trial → 3/day
 *   - monthly plan → 10/day
 *   - no active VIP → 0 (handled by the free-trial system instead)
 *
 * Keyword matching keeps this robust no matter how the plan is labelled.
 */
async function dailyLimitForUser(email: string): Promise<number> {
  const [vip] = await db.select().from(vipSubscribers)
    .where(eq(vipSubscribers.email, email));
  if (!vip) return 0;
  if (vip.status !== "ACTIVE") return 0;
  if (vip.endDate && new Date(vip.endDate) < new Date()) return 0;

  const plan = (vip.plan || "").toLowerCase();
  const amount = (vip.amount || "").toLowerCase();
  const numericAmount = Number.parseFloat(amount.replace(/[^\d.]/g, ""));

  // Current short-access offer: $33 / two-week plan
  if (plan.includes("2-week") || plan.includes("2 week") || plan.includes("14-day") || plan.includes("14 day") || numericAmount === 33) {
    return 5;
  }
  // Legacy trial: preserve the original quota for existing $25 / 3-day subscribers.
  if (plan.includes("trial") || plan.includes("3-day") || plan.includes("3 day") || numericAmount === 25) {
    return 3;
  }
  // Yearly
  if (plan.includes("year") || plan.includes("annual")) return 20;
  // Default: monthly
  return 10;
}

async function readDailyUsage(userId: string, day: string): Promise<number> {
  const [row] = await db.select().from(dailyAnalysisUsage)
    .where(eq(dailyAnalysisUsage.usageKey, `${userId}:${day}`));
  return row?.used ?? 0;
}
