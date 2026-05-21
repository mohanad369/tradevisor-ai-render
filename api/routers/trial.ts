import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../../db/db";
import { freeUsage, userSessions, users, vipSubscribers } from "../../db/schema";
import { createRouter, publicQuery } from "../middleware";

/**
 * Free-trial tracking for the public chart analyzer — two-tier system.
 *
 *   Anonymous visitor   → must create/login to an account
 *   Registered account  → 2 free analyses (keyed on userId)
 *   After account tier  → must subscribe (VIP)
 *
 * VIP / developer accounts are never limited.
 *
 * The raw IP is never stored — only a one-way hash — so the table holds
 * nothing that directly identifies a person.
 */

const ANON_LIMIT = 0;     // anonymous visitors cannot analyze for free
const ACCOUNT_LIMIT = 2;  // logged-in accounts get two free analyses

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`tradevisor:${ip}`).digest("hex").slice(0, 32);
}

type Identity = {
  loggedIn: boolean;
  isVip: boolean;
  userKey: string | null;   // "user:<id>"  when logged in
  ipKey: string;            // "ip:<hash>"  always present
};

/**
 * Resolve who is making this request:
 *  - always compute the hashed-IP key (anonymous tier)
 *  - if a valid user session exists, also compute the user key and VIP flag
 */
async function resolveIdentity(req: Request): Promise<Identity> {
  const ipKey = `ip:${hashIp(clientIp(req))}`;
  const token = req.headers.get("x-user-token") || "";

  if (token) {
    const [session] = await db.select().from(userSessions)
      .where(eq(userSessions.sessionToken, token));
    if (
      session
      && session.active
      && (!session.expiresAt || new Date(session.expiresAt) > new Date())
    ) {
      const [user] = await db.select().from(users)
        .where(eq(users.userId, session.userId));
      if (user && user.status === "ACTIVE") {
        const [vip] = await db.select().from(vipSubscribers)
          .where(eq(vipSubscribers.email, user.email));
        const isVip = Boolean(
          vip && vip.status === "ACTIVE" && (!vip.endDate || new Date(vip.endDate) > new Date()),
        );
        return { loggedIn: true, isVip, userKey: `user:${user.userId}`, ipKey };
      }
    }
  }

  return { loggedIn: false, isVip: false, userKey: null, ipKey };
}

async function readUsage(key: string): Promise<number> {
  const [row] = await db.select().from(freeUsage)
    .where(eq(freeUsage.identityKey, key));
  return row?.used ?? 0;
}

async function bumpUsage(key: string, kind: "user" | "ip"): Promise<number> {
  const current = await readUsage(key);
  const now = new Date();
  await db.insert(freeUsage)
    .values({ identityKey: key, kind, used: 1, firstSeenAt: now, lastUsedAt: now })
    .onConflictDoUpdate({
      target: freeUsage.identityKey,
      set: { used: sql`${freeUsage.used} + 1`, lastUsedAt: now },
    });
  return current + 1;
}

/**
 * Build the trial state object the client uses to drive the UI.
 *
 *   stage: "anon"    → still has anonymous free analyses
 *          "signup"  → anonymous quota used; must create an account
 *          "account" → logged in, still has account free analyses
 *          "paywall" → account free tier used; must subscribe
 *          "unlimited" → VIP or developer
 */
async function buildState(identity: Identity) {
  if (identity.isVip) {
    return {
      unlimited: true,
      stage: "unlimited" as const,
      loggedIn: identity.loggedIn,
      remaining: 999,
      anonUsed: 0, anonLimit: ANON_LIMIT,
      accountUsed: 0, accountLimit: ACCOUNT_LIMIT,
    };
  }

  const anonUsed = await readUsage(identity.ipKey);

  if (!identity.loggedIn) {
    const remaining = Math.max(0, ANON_LIMIT - anonUsed);
    return {
      unlimited: false,
      stage: remaining > 0 ? ("anon" as const) : ("signup" as const),
      loggedIn: false,
      remaining,
      anonUsed, anonLimit: ANON_LIMIT,
      accountUsed: 0, accountLimit: ACCOUNT_LIMIT,
    };
  }

  // Logged in → account tier
  const accountUsed = identity.userKey ? await readUsage(identity.userKey) : 0;
  const remaining = Math.max(0, ACCOUNT_LIMIT - accountUsed);
  return {
    unlimited: false,
    stage: remaining > 0 ? ("account" as const) : ("paywall" as const),
    loggedIn: true,
    remaining,
    anonUsed, anonLimit: ANON_LIMIT,
    accountUsed, accountLimit: ACCOUNT_LIMIT,
  };
}

export const trialRouter = createRouter({

  // ─── Current trial state for this visitor ───
  status: publicQuery.query(async ({ ctx }) => {
    const identity = await resolveIdentity(ctx.req);
    return await buildState(identity);
  }),

  /**
   * Consume one free analysis. The client calls this AFTER a successful
   * analysis. Returns the updated state plus `blocked: true` when the
   * visitor had no free analysis left (client then shows signup/paywall).
   */
  consume: publicQuery
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      const identity = await resolveIdentity(ctx.req);

      if (identity.isVip) {
        const state = await buildState(identity);
        return { ...state, blocked: false };
      }

      if (!identity.loggedIn) {
        const anonUsed = await readUsage(identity.ipKey);
        if (anonUsed >= ANON_LIMIT) {
          const state = await buildState(identity);
          return { ...state, blocked: true };
        }
        await bumpUsage(identity.ipKey, "ip");
        const state = await buildState(identity);
        return { ...state, blocked: false };
      }

      // Logged in → consume from the account tier
      const accountUsed = identity.userKey ? await readUsage(identity.userKey) : 0;
      if (accountUsed >= ACCOUNT_LIMIT) {
        const state = await buildState(identity);
        return { ...state, blocked: true };
      }
      if (identity.userKey) await bumpUsage(identity.userKey, "user");
      const state = await buildState(identity);
      return { ...state, blocked: false };
    }),
});
