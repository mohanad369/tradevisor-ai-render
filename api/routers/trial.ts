import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../../db/db";
import { freeUsage, userSessions, users, vipSubscribers } from "../../db/schema";
import { createRouter, publicQuery } from "../middleware";

/**
 * Free-trial tracking for the public chart analyzer.
 *
 * The 4-free-analysis limit used to live only in localStorage, which a
 * visitor could reset by clearing storage or opening a new browser.
 * This router moves the counter to the server and keys it on a stable
 * identity:
 *   - logged-in users  → "user:<userId>"   (most accurate)
 *   - anonymous visitors → "ip:<sha256(ip)>" (best-effort)
 *
 * The raw IP is never stored — only a one-way hash — so the table holds
 * nothing that identifies a person directly.
 */

const FREE_LIMIT = 4;

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`tradevisor:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Work out which identity key to use for this request, and whether the
 * visitor currently has VIP (VIP users are never limited).
 */
async function resolveIdentity(req: Request): Promise<{
  key: string;
  kind: "user" | "ip";
  isVip: boolean;
}> {
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
        // Logged-in: check VIP by email
        const [vip] = await db.select().from(vipSubscribers)
          .where(eq(vipSubscribers.email, user.email));
        const isVip = Boolean(
          vip && vip.status === "ACTIVE" && (!vip.endDate || new Date(vip.endDate) > new Date()),
        );
        return { key: `user:${user.userId}`, kind: "user", isVip };
      }
    }
  }

  // Anonymous → key on hashed IP
  return { key: `ip:${hashIp(clientIp(req))}`, kind: "ip", isVip: false };
}

async function readUsage(key: string): Promise<number> {
  const [row] = await db.select().from(freeUsage)
    .where(eq(freeUsage.identityKey, key));
  return row?.used ?? 0;
}

export const trialRouter = createRouter({

  // ─── How many free analyses are left for this visitor ───
  status: publicQuery.query(async ({ ctx }) => {
    const identity = await resolveIdentity(ctx.req);
    if (identity.isVip) {
      return { unlimited: true, used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT };
    }
    const used = await readUsage(identity.key);
    return {
      unlimited: false,
      used,
      limit: FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - used),
    };
  }),

  /**
   * Consume one free analysis. The client calls this AFTER a successful
   * analysis. Returns the new remaining count, and `blocked: true` when
   * the visitor had already hit the limit (the client should then show
   * the subscribe modal).
   */
  consume: publicQuery
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      const identity = await resolveIdentity(ctx.req);
      if (identity.isVip) {
        return { unlimited: true, used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT, blocked: false };
      }

      const current = await readUsage(identity.key);
      if (current >= FREE_LIMIT) {
        return { unlimited: false, used: current, limit: FREE_LIMIT, remaining: 0, blocked: true };
      }

      // UPSERT: +1 for this identity.
      const now = new Date();
      await db.insert(freeUsage)
        .values({
          identityKey: identity.key,
          kind: identity.kind,
          used: 1,
          firstSeenAt: now,
          lastUsedAt: now,
        })
        .onConflictDoUpdate({
          target: freeUsage.identityKey,
          set: {
            used: sql`${freeUsage.used} + 1`,
            lastUsedAt: now,
          },
        });

      const used = current + 1;
      return {
        unlimited: false,
        used,
        limit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - used),
        blocked: false,
      };
    }),
});
