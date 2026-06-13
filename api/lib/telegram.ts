/**
 * Telegram notifications
 * ──────────────────────
 * Sends business-event notifications to the owner's Telegram chat:
 *   - new email signup started (OTP sent but not yet confirmed)
 *   - new account confirmed (OTP verified, user is real)
 *   - new paid subscription (after NOWPayments approval)
 *
 * Configuration is read from env vars at call time:
 *   TELEGRAM_BOT_TOKEN  — from @BotFather when you create a bot
 *   TELEGRAM_CHAT_ID    — your numeric Telegram chat ID (or group ID)
 *
 * If either is missing, every call returns silently — the app must keep
 * working even when Telegram isn't set up. This is by design: the
 * notification is a "nice to have", never a blocker on the user flow.
 *
 * The module never throws. Every error is caught and logged so a flaky
 * network or a bad token can't break signup / payment paths.
 */

const TELEGRAM_API = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 8_000;

function isConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Send a raw HTML-formatted message to the configured chat.
 * Returns true on success, false on any failure. Never throws.
 */
async function sendMessage(html: string): Promise<boolean> {
  if (!isConfigured()) {
    // Silent no-op when not configured — keep logs clean during local
    // dev or before the owner sets up Telegram.
    return false;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[Telegram] sendMessage failed ${res.status}: ${txt.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("[Telegram] sendMessage timed out");
    } else {
      console.error("[Telegram] sendMessage error:", err?.message || err);
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Escape user-provided text so it can safely sit inside HTML. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ─── Public helpers ────────────────────────────────────────────────

/**
 * 📝 A new visitor just submitted the signup form (OTP sent, not yet
 * confirmed). Useful for tracking the funnel: how many start vs finish.
 */
export async function notifySignupStarted(input: {
  email: string;
  name?: string;
  phone?: string;
}): Promise<void> {
  const html = [
    "📝 <b>New signup started</b>",
    "",
    `<b>Email:</b> ${esc(input.email)}`,
    input.name ? `<b>Name:</b> ${esc(input.name)}` : "",
    input.phone ? `<b>Phone:</b> ${esc(input.phone)}` : "",
    "",
    `<i>Waiting for email verification…</i>`,
    `<i>${new Date().toUTCString()}</i>`,
  ].filter(Boolean).join("\n");

  void sendMessage(html);
}

/**
 * ✅ The visitor confirmed their OTP — they are now a real registered
 * user in the users table.
 */
export async function notifyAccountConfirmed(input: {
  email: string;
  name?: string;
  phone?: string;
}): Promise<void> {
  const html = [
    "✅ <b>New account confirmed</b>",
    "",
    `<b>Email:</b> ${esc(input.email)}`,
    input.name ? `<b>Name:</b> ${esc(input.name)}` : "",
    input.phone ? `<b>Phone:</b> ${esc(input.phone)}` : "",
    "",
    `<i>${new Date().toUTCString()}</i>`,
  ].filter(Boolean).join("\n");

  void sendMessage(html);
}

/**
 * 💰 A subscription was paid for and approved. Triggered from the IPN
 * handler when NOWPayments confirms the payment.
 */
export async function notifySubscriptionPaid(input: {
  email?: string;
  name?: string;
  plan?: string;
  amount?: string | number;
  currency?: string;
  paymentMethod?: string;
  orderId?: string;
}): Promise<void> {
  const amountStr = input.amount !== undefined && input.amount !== ""
    ? `${esc(input.amount)} ${esc(input.currency || "USD")}`
    : "-";

  const html = [
    "💰 <b>New subscription paid!</b>",
    "",
    input.email ? `<b>Email:</b> ${esc(input.email)}` : "",
    input.name ? `<b>Name:</b> ${esc(input.name)}` : "",
    input.plan ? `<b>Plan:</b> ${esc(input.plan)}` : "",
    `<b>Amount:</b> ${amountStr}`,
    input.paymentMethod ? `<b>Method:</b> ${esc(input.paymentMethod)}` : "",
    input.orderId ? `<b>Order ID:</b> <code>${esc(input.orderId)}</code>` : "",
    "",
    `<i>${new Date().toUTCString()}</i>`,
  ].filter(Boolean).join("\n");

  void sendMessage(html);
}
