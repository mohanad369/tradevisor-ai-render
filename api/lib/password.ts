import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for user accounts.
 *
 * Uses Node's built-in scrypt — a memory-hard KDF — so no extra npm
 * dependency is needed. The stored string format is:
 *
 *   scrypt$<N>$<saltHex>$<hashHex>
 *
 * where N is the scrypt cost parameter. Keeping N in the string means
 * we can raise the cost later without breaking old hashes.
 */

const SCRYPT_COST = 16384; // 2^14 — solid for a login form
const KEY_LEN = 64;
const SALT_BYTES = 16;

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(plain, salt, KEY_LEN, { N: SCRYPT_COST });
  return `scrypt$${SCRYPT_COST}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const cost = parseInt(parts[1], 10);
    const salt = Buffer.from(parts[2], "hex");
    const expected = Buffer.from(parts[3], "hex");
    if (!Number.isFinite(cost) || salt.length === 0 || expected.length === 0) return false;
    const derived = scryptSync(plain, salt, expected.length, { N: cost });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Basic password policy — at least 8 chars. */
export function isAcceptablePassword(plain: string): { ok: boolean; reason?: string } {
  if (typeof plain !== "string" || plain.length < 8) {
    return { ok: false, reason: "Password must be at least 8 characters" };
  }
  if (plain.length > 200) {
    return { ok: false, reason: "Password is too long" };
  }
  return { ok: true };
}
