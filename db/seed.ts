import { db } from "./db";
import { vipCodes } from "./schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// Excludes ambiguous chars (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Cryptographically safe random code generator.
 * Uses `crypto.randomInt` so the distribution is unbiased
 * and avoids Math.random() predictability.
 */
function randomCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET.charAt(crypto.randomInt(0, ALPHABET.length));
  }
  return out;
}

/**
 * Generates `count` unique codes that don't already exist in the DB.
 * Uniqueness is checked against existing rows so the UNIQUE constraint
 * never blows up during the bulk insert.
 */
async function generateUniqueCodes(count: number): Promise<string[]> {
  // Pull existing codes once so we don't hit the DB for every candidate.
  const existing = await db.select({ code: vipCodes.code }).from(vipCodes);
  const seen = new Set(existing.map((r) => r.code));

  const codes: string[] = [];
  while (codes.length < count) {
    const candidate = randomCode(8);
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    codes.push(candidate);
  }
  return codes;
}

/**
 * Seed a single pool ("monthly" or "yearly") to `target` total codes.
 * Only adds the difference — never deletes existing codes.
 */
async function seedPool(codeType: "monthly" | "yearly", target = 100): Promise<number> {
  const existing = await db
    .select({ code: vipCodes.code })
    .from(vipCodes)
    .where(eq(vipCodes.codeType, codeType));

  const have = existing.length;
  if (have >= target) return 0;

  const need = target - have;
  const fresh = await generateUniqueCodes(need);
  const rows = fresh.map((code) => ({
    code,
    used: false,
    assignedTo: null,
    codeType,
  }));

  await db.insert(vipCodes).values(rows);
  console.log(`[Seed] Added ${need} ${codeType} codes (pool now ${have + need}/${target}).`);
  return need;
}

/**
 * Public entry point — called on boot.
 * - Seeds BOTH monthly and yearly pools (not just one).
 * - Idempotent: running twice never duplicates or overflows.
 */
export async function seedVIPCodes(): Promise<void> {
  try {
    console.log("[Seed] Ensuring VIP code pools are filled...");
    const yearlyAdded = await seedPool("yearly", 100);
    const monthlyAdded = await seedPool("monthly", 100);
    if (yearlyAdded === 0 && monthlyAdded === 0) {
      console.log("[Seed] Both pools already full.");
    }
  } catch (err) {
    console.error("[Seed] Error while seeding codes:", err);
    throw err; // surface in boot.ts logging
  }
}

/**
 * Auto-replenish a single pool to `target` AVAILABLE (unused) codes.
 * Call this after every approval/assignment if you want the pool to
 * never run empty. Safe to call frequently — only inserts what's needed.
 */
export async function replenishPool(
  codeType: "monthly" | "yearly",
  targetAvailable = 20,
): Promise<number> {
  const available = await db
    .select({ code: vipCodes.code })
    .from(vipCodes)
    .where(and(eq(vipCodes.codeType, codeType), eq(vipCodes.used, false)));

  if (available.length >= targetAvailable) return 0;

  const need = targetAvailable - available.length;
  const fresh = await generateUniqueCodes(need);
  await db.insert(vipCodes).values(
    fresh.map((code) => ({ code, used: false, assignedTo: null, codeType })),
  );
  console.log(`[Replenish] Added ${need} fresh ${codeType} codes.`);
  return need;
}

/**
 * Replace ALL codes of a given type (or both types if `codeType` is omitted).
 * Used by the admin "Replace All" buttons.
 *
 * NOTE: this deletes only UNASSIGNED codes by default to avoid breaking
 * active subscribers. Pass `force: true` to wipe everything regardless.
 */
export async function replaceAllCodes(opts: {
  codeType?: "monthly" | "yearly";
  count?: number;
  force?: boolean;
}): Promise<{ deleted: number; created: number }> {
  const count = opts.count ?? 100;

  // Delete: filter by type if requested, and only unused unless force=true.
  let deleted = 0;
  if (opts.codeType && !opts.force) {
    const res = await db
      .delete(vipCodes)
      .where(and(eq(vipCodes.codeType, opts.codeType), eq(vipCodes.used, false)));
    deleted = (res as any)?.changes ?? 0;
  } else if (opts.codeType && opts.force) {
    const res = await db.delete(vipCodes).where(eq(vipCodes.codeType, opts.codeType));
    deleted = (res as any)?.changes ?? 0;
  } else if (!opts.codeType && opts.force) {
    const res = await db.delete(vipCodes);
    deleted = (res as any)?.changes ?? 0;
  } else {
    // No type, not forced — only delete unused
    const res = await db.delete(vipCodes).where(eq(vipCodes.used, false));
    deleted = (res as any)?.changes ?? 0;
  }

  // Re-seed up to `count` for the targeted pool(s)
  let created = 0;
  if (!opts.codeType || opts.codeType === "yearly") {
    created += await seedPool("yearly", count);
  }
  if (!opts.codeType || opts.codeType === "monthly") {
    created += await seedPool("monthly", count);
  }

  return { deleted, created };
}
