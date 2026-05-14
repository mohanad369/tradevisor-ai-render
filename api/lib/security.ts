import { createHmac, timingSafeEqual } from "node:crypto";

// Rate Limiting
interface RateLimitEntry { count: number; resetAt: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000;

export function checkRateLimit(key: string, max = 30): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 300_000);

// Image Validation
const MAX_BASE64_IMAGE_CHARS = 8_500_000;
export function validateBase64Image(base64String: string): { valid: boolean; error?: string } {
  if (!/^[A-Za-z0-9+/=_-]+$/.test(base64String)) return { valid: false, error: "Invalid image encoding." };
  if (base64String.length > MAX_BASE64_IMAGE_CHARS) return { valid: false, error: "Image too large. Max 6MB." };
  if (base64String.length < 100) return { valid: false, error: "Invalid image data." };
  const sig = base64String.slice(0, 20);
  const isPng = sig.startsWith("iVBORw0KGgo");
  const isJpg = sig.startsWith("/9j/");
  const isWebp = sig.startsWith("UklGR");
  const isGif = sig.startsWith("R0lGOD");
  const isBmp = sig.startsWith("Qk1");
  if (!isPng && !isJpg && !isWebp && !isGif && !isBmp) {
    return { valid: false, error: "Only PNG, JPG, WEBP, GIF, BMP allowed." };
  }
  return { valid: true };
}

// Security Headers
export const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function hashSecret(value: string) {
  return createHmac("sha256", getServerSecret()).update(value).digest("hex");
}

export function verifyPassword(password: string) {
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;
  if (configuredHash) return safeEqual(hashSecret(password), configuredHash);
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (configuredPassword) return safeEqual(password, configuredPassword);
  if (process.env.NODE_ENV === "production") return false;
  return safeEqual(password, "Tradevisor2026!");
}

export function createAdminSessionToken() {
  const payload = {
    role: "admin",
    exp: Date.now() + ADMIN_SESSION_TTL_MS,
    nonce: Math.random().toString(36).slice(2),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null | undefined) {
  if (!token || !token.includes(".")) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8")) as { role?: string; exp?: number };
    return payload.role === "admin" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function sign(value: string) {
  return createHmac("sha256", getServerSecret()).update(value).digest("base64url");
}

function getServerSecret() {
  const secret = process.env.APP_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET must be set to at least 32 characters in production");
  }
  return "dev-only-tradevisor-session-secret-please-change";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
