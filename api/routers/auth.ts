import { z } from "zod";
import { and, eq, desc, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/db";
import { users, userSessions, vipSubscribers, visitStats } from "../../db/schema";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { hashPassword, verifyPassword, isAcceptablePassword } from "../lib/password";

const SESSION_DAYS = 30;

function newUserId(): string {
  return `usr_${randomBytes(12).toString("base64url")}`;
}

function newSessionToken(): string {
  return `uss_${randomBytes(24).toString("base64url")}`;
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

/** UTC "YYYY-MM-DD" for the given date (defaults to now). */
function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve the currently logged-in user from the `x-user-token` header.
 * Returns null when there is no valid, active, non-expired session.
 */
async function resolveUser(req: Request) {
  const token = req.headers.get("x-user-token") || "";
  if (!token) return null;

  const [session] = await db.select().from(userSessions)
    .where(and(eq(userSessions.sessionToken, token), eq(userSessions.active, true)));
  if (!session) return null;

  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    await db.update(userSessions).set({ active: false }).where(eq(userSessions.id, session.id));
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.userId, session.userId));
  if (!user || user.status !== "ACTIVE") return null;

  return { user, session };
}

/** Public-safe view of a user (never expose passwordHash). */
function publicUser(u: typeof users.$inferSelect) {
  return {
    userId: u.userId,
    email: u.email,
    name: u.name || "",
    createdAt: u.createdAt,
  };
}

export const authRouter = createRouter({

  // ─── Sign up a new account ───
  signup: publicQuery
    .input(z.object({
      email: z.string().email().max(150),
      password: z.string().min(1).max(200),
      name: z.string().max(80).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase();

      const policy = isAcceptablePassword(input.password);
      if (!policy.ok) return { success: false, error: policy.reason };

      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return { success: false, error: "An account with this email already exists" };
      }

      const userId = newUserId();
      try {
        await db.insert(users).values({
          userId,
          email,
          name: input.name?.trim() || "",
          passwordHash: hashPassword(input.password),
          status: "ACTIVE",
        });
      } catch (err: any) {
        if (String(err?.message || "").includes("UNIQUE")) {
          return { success: false, error: "An account with this email already exists" };
        }
        console.error("[auth.signup] insert failed:", err?.message);
        return { success: false, error: "Could not create account" };
      }

      // Issue a session straight away so signup logs them in.
      const sessionToken = newSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

      await db.insert(userSessions).values({
        sessionToken,
        userId,
        ip: clientIp(ctx.req),
        userAgent: ctx.req.headers.get("user-agent") || "",
        active: true,
        expiresAt,
      });

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.userId, userId));

      const [created] = await db.select().from(users).where(eq(users.userId, userId));
      return { success: true, sessionToken, user: publicUser(created) };
    }),

  // ─── Log in ───
  login: publicQuery
    .input(z.object({
      email: z.string().email().max(150),
      password: z.string().min(1).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase();

      const [user] = await db.select().from(users).where(eq(users.email, email));
      // Always run a verify to keep timing roughly constant even if no user.
      const ok = user
        ? verifyPassword(input.password, user.passwordHash)
        : verifyPassword(input.password, "scrypt$16384$00$00");

      if (!user || !ok) {
        return { success: false, error: "Invalid email or password" };
      }
      if (user.status !== "ACTIVE") {
        return { success: false, error: "This account is disabled" };
      }

      const sessionToken = newSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

      await db.insert(userSessions).values({
        sessionToken,
        userId: user.userId,
        ip: clientIp(ctx.req),
        userAgent: ctx.req.headers.get("user-agent") || "",
        active: true,
        expiresAt,
      });

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.userId, user.userId));

      return { success: true, sessionToken, user: publicUser(user) };
    }),

  // ─── Who am I — used on app load to restore the session ───
  me: publicQuery.query(async ({ ctx }) => {
    const resolved = await resolveUser(ctx.req);
    if (!resolved) return { loggedIn: false as const };

    // Attach VIP status so the UI can show "you are subscribed" without
    // a second request. This is read-only and never grants access by itself.
    const [vip] = await db.select().from(vipSubscribers)
      .where(eq(vipSubscribers.email, resolved.user.email));

    const isVip = Boolean(
      vip
      && vip.status === "ACTIVE"
      && (!vip.endDate || new Date(vip.endDate) > new Date()),
    );

    return {
      loggedIn: true as const,
      user: publicUser(resolved.user),
      vip: {
        active: isVip,
        plan: isVip ? vip!.plan : null,
        expiresAt: isVip ? vip!.endDate : null,
      },
    };
  }),

  // ─── Log out current session ───
  logout: publicQuery.mutation(async ({ ctx }) => {
    const token = ctx.req.headers.get("x-user-token") || "";
    if (token) {
      await db.update(userSessions).set({ active: false })
        .where(eq(userSessions.sessionToken, token));
    }
    return { success: true };
  }),

  // ─── Change password (must be logged in) ───
  changePassword: publicQuery
    .input(z.object({
      currentPassword: z.string().min(1).max(200),
      newPassword: z.string().min(1).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      const resolved = await resolveUser(ctx.req);
      if (!resolved) return { success: false, error: "Not logged in" };

      if (!verifyPassword(input.currentPassword, resolved.user.passwordHash)) {
        return { success: false, error: "Current password is incorrect" };
      }
      const policy = isAcceptablePassword(input.newPassword);
      if (!policy.ok) return { success: false, error: policy.reason };

      await db.update(users)
        .set({ passwordHash: hashPassword(input.newPassword) })
        .where(eq(users.userId, resolved.user.userId));

      // Invalidate every other session for safety; keep the current one.
      await db.update(userSessions)
        .set({ active: false })
        .where(eq(userSessions.userId, resolved.user.userId));
      await db.update(userSessions)
        .set({ active: true })
        .where(eq(userSessions.sessionToken, resolved.session.sessionToken));

      return { success: true };
    }),

  // ─── Update display name (must be logged in) ───
  updateProfile: publicQuery
    .input(z.object({ name: z.string().max(80) }))
    .mutation(async ({ input, ctx }) => {
      const resolved = await resolveUser(ctx.req);
      if (!resolved) return { success: false, error: "Not logged in" };

      await db.update(users)
        .set({ name: input.name.trim() })
        .where(eq(users.userId, resolved.user.userId));

      const [updated] = await db.select().from(users)
        .where(eq(users.userId, resolved.user.userId));
      return { success: true, user: publicUser(updated) };
    }),

  // ════════════════════════════════════════════════════════════
  // ADMIN: registered-user management
  // ════════════════════════════════════════════════════════════

  // ─── List every registered account (newest first) ───
  adminListUsers: adminQuery.query(async () => {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));

    // Cross-reference VIP subscribers so the admin sees who is paying.
    const subs = await db.select().from(vipSubscribers);
    const vipByEmail = new Map(subs.map((s) => [s.email.toLowerCase(), s]));
    const now = Date.now();

    return rows.map((u) => {
      const vip = vipByEmail.get(u.email.toLowerCase());
      const vipActive = Boolean(
        vip && vip.status === "ACTIVE" && (!vip.endDate || new Date(vip.endDate).getTime() > now),
      );
      return {
        userId: u.userId,
        email: u.email,
        name: u.name || "",
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        vipActive,
        vipPlan: vipActive ? vip!.plan : null,
      };
    });
  }),

  // ─── Summary counters for the dashboard ───
  adminUserStats: adminQuery.query(async () => {
    const rows = await db.select().from(users);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const createdWithin = (days: number) =>
      rows.filter((u) => u.createdAt && now - new Date(u.createdAt).getTime() <= days * dayMs).length;

    return {
      total: rows.length,
      active: rows.filter((u) => u.status === "ACTIVE").length,
      disabled: rows.filter((u) => u.status !== "ACTIVE").length,
      newToday: createdWithin(1),
      newThisWeek: createdWithin(7),
      newThisMonth: createdWithin(30),
    };
  }),

  // ─── Enable / disable an account ───
  adminSetUserStatus: adminQuery
    .input(z.object({
      userId: z.string(),
      status: z.enum(["ACTIVE", "DISABLED"]),
    }))
    .mutation(async ({ input }) => {
      await db.update(users)
        .set({ status: input.status })
        .where(eq(users.userId, input.userId));
      // Disabling an account also kills its sessions.
      if (input.status === "DISABLED") {
        await db.update(userSessions)
          .set({ active: false })
          .where(eq(userSessions.userId, input.userId));
      }
      return { success: true };
    }),

  // ─── Delete an account permanently ───
  adminDeleteUser: adminQuery
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(userSessions).where(eq(userSessions.userId, input.userId));
      await db.delete(users).where(eq(users.userId, input.userId));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════
  // Visit counter — aggregate page-open count per day
  // ════════════════════════════════════════════════════════════

  // ─── PUBLIC: called once per browser session when the site loads ───
  // Stores only a per-day total — no IP, no path, nothing per-visitor.
  recordVisit: publicQuery.mutation(async () => {
    const day = dayKey();
    try {
      // UPSERT: increment today's counter, create the row if it's a new day.
      await db.insert(visitStats)
        .values({ day, count: 1, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: visitStats.day,
          set: {
            count: sql`${visitStats.count} + 1`,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      // Visit counting must never break the site — swallow errors.
      console.warn("[auth.recordVisit] failed:", (err as Error)?.message);
    }
    return { ok: true };
  }),

  // ─── ADMIN: visit totals for the dashboard ───
  adminVisitStats: adminQuery.query(async () => {
    const rows = await db.select().from(visitStats).orderBy(desc(visitStats.day));

    const today = dayKey();
    const now = new Date();
    const within = (days: number) => {
      const cutoff = new Date(now);
      cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
      const cutoffKey = dayKey(cutoff);
      return rows
        .filter((r) => r.day >= cutoffKey)
        .reduce((sum, r) => sum + (r.count || 0), 0);
    };

    const allTime = rows.reduce((sum, r) => sum + (r.count || 0), 0);

    // Last 14 days as a small series for a sparkline / mini chart.
    const last14: Array<{ day: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = dayKey(d);
      const row = rows.find((r) => r.day === key);
      last14.push({ day: key, count: row?.count || 0 });
    }

    return {
      today: rows.find((r) => r.day === today)?.count || 0,
      last7Days: within(7),
      last30Days: within(30),
      allTime,
      daysTracked: rows.length,
      last14,
    };
  }),
});
