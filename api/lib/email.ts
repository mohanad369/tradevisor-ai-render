import nodemailer from "nodemailer";

type VipCodeEmailInput = {
  to: string;
  code: string;
  plan: string;
  orderId: string;
  expiresAt: Date;
};

type EmailResult = {
  sent: boolean;
  reason?: string;
};

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

export async function sendVipCodeEmail(input: VipCodeEmailInput): Promise<EmailResult> {
  if (!isSmtpConfigured()) {
    console.warn("[Email] SMTP is not configured; VIP code email was skipped", {
      to: input.to,
      orderId: input.orderId,
    });
    return { sent: false, reason: "SMTP is not configured" };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  const siteUrl = process.env.PUBLIC_SITE_ORIGIN || "https://tradevisortrading.com";
  const expires = input.expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: "Your Tradevisor VIP access code",
    text: [
      "Welcome to Tradevisor VIP.",
      "",
      `Your VIP code: ${input.code}`,
      `Plan: ${input.plan}`,
      `Order: ${input.orderId}`,
      `Expires: ${expires}`,
      "",
      `Open Tradevisor: ${siteUrl}/#/vip`,
      "",
      "Keep this code private. It unlocks your VIP access.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#080808;color:#f7f7f7;padding:24px">
        <div style="max-width:560px;margin:auto;border:1px solid #2d2412;border-radius:12px;padding:24px;background:#101010">
          <h1 style="margin:0 0 12px;color:#e5b93d">Tradevisor VIP</h1>
          <p style="margin:0 0 18px;color:#d8d8d8">Your payment is confirmed and your VIP access is active.</p>
          <div style="font-size:28px;letter-spacing:3px;font-weight:700;background:#171717;border:1px solid #3a2e12;border-radius:10px;padding:16px;text-align:center;color:#f5c542">
            ${escapeHtml(input.code)}
          </div>
          <p style="color:#d8d8d8;line-height:1.6">
            Plan: <strong>${escapeHtml(input.plan)}</strong><br>
            Order: <strong>${escapeHtml(input.orderId)}</strong><br>
            Expires: <strong>${escapeHtml(expires)}</strong>
          </p>
          <a href="${siteUrl}/#/vip" style="display:inline-block;margin-top:10px;background:#e5b93d;color:#080808;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
            Open VIP
          </a>
          <p style="margin-top:22px;color:#9a9a9a;font-size:13px">Keep this code private. It unlocks your VIP access.</p>
        </div>
      </div>
    `,
  });

  return { sent: true };
}

/**
 * Send a 6-digit verification code (OTP) to a new user's email so we can
 * confirm they own the address before activating the account.
 */
export async function sendOtpEmail(to: string, code: string): Promise<EmailResult> {
  if (!isSmtpConfigured()) {
    console.warn("[Email] SMTP is not configured; OTP email was skipped");
    return { sent: false, reason: "SMTP is not configured" };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Your TradeVisor verification code",
    text: [
      "Your TradeVisor verification code is:",
      "",
      code,
      "",
      "This code expires in 10 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#080808;color:#f7f7f7;padding:24px">
        <div style="max-width:520px;margin:auto;border:1px solid #2d2412;border-radius:12px;padding:24px;background:#101010">
          <h1 style="margin:0 0 12px;color:#e5b93d">TradeVisor</h1>
          <p style="margin:0 0 18px;color:#d8d8d8">Use this code to verify your email and activate your account.</p>
          <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#171717;border:1px solid #3a2e12;border-radius:10px;padding:18px;text-align:center;color:#f5c542">
            ${escapeHtml(code)}
          </div>
          <p style="margin-top:18px;color:#9a9a9a;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
        </div>
      </div>
    `,
  });

  return { sent: true };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
