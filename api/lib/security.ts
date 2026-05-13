// Rate Limiting
interface RateLimitEntry { count: number; resetAt: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;

export function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
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
const MAX_BASE64_IMAGE_CHARS = 14_000_000;
export function validateBase64Image(base64String: string): { valid: boolean; error?: string } {
  if (base64String.length > MAX_BASE64_IMAGE_CHARS) return { valid: false, error: "Image too large. Max 10MB." };
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
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};
