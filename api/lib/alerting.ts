import nodemailer from "nodemailer";
import { isSmtpConfigured } from "./email";

/**
 * Alerting
 * ────────
 * Emails the site owner when something critical happens server-side:
 * an unhandled exception, an unhandled promise rejection, or a failed
 * backup.
 *
 * Honest scope note: a process that has fully crashed cannot email
 * about itself. This module catches *recoverable* critical errors and
 * fatal signals just before exit. For true "the whole server is down"
 * detection, an EXTERNAL uptime monitor pinging /api/health is the
 * correct tool — see the deployment notes. This covers everything an
 * in-process alerter realistically can.
 *
 * Alerts go to ALERT_EMAIL (falls back to SMTP_FROM). To avoid an inbox
 * flood, identical alerts are throttled.
 */

const ALERT_TO = process.env.ALERT_EMAIL || process.env.SMTP_FROM || "";
const THROTTLE_MS = 10 * 60 * 1000; // same alert at most once per 10 min

const lastSent = new Map<string, number>();

/** Send a critical alert email. Safe to call from anywhere; never throws. */
export async function sendAlert(subject: string, detail: string): Promise<void> {
  try {
    if (!isSmtpConfigured() || !ALERT_TO) {
      console.error(`[Alert] (email not configured) ${subject}: ${detail}`);
      return;
    }

    // Throttle duplicates.
    const key = subject.slice(0, 80);
    const now = Date.now();
    const prev = lastSent.get(key) || 0;
    if (now - prev < THROTTLE_MS) return;
    lastSent.set(key, now);

    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: ALERT_TO,
      subject: `🚨 TradeVisor Alert — ${subject}`,
      text: [
        `A critical server event occurred on TradeVisor.`,
        ``,
        `Event : ${subject}`,
        `Time  : ${new Date().toISOString()}`,
        ``,
        `Details:`,
        detail,
        ``,
        `— TradeVisor automated alerting`,
      ].join("\n"),
    });
    console.log(`[Alert] Sent: ${subject}`);
  } catch (err) {
    // Never let alerting itself crash the app.
    console.error("[Alert] failed to send:", (err as Error)?.message);
  }
}

/**
 * Install global handlers for uncaught errors. Called once at startup.
 * On a fatal error we email, then exit cleanly so Render restarts us.
 */
export function installCrashHandlers(): void {
  process.on("uncaughtException", (err) => {
    console.error("[FATAL] uncaughtException:", err);
    void sendAlert("Uncaught exception", String(err?.stack || err));
    // Give the email a moment, then exit so the platform restarts us.
    setTimeout(() => process.exit(1), 3000);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL] unhandledRejection:", reason);
    void sendAlert("Unhandled promise rejection", String(reason));
  });

  console.log("[Alert] Crash handlers installed.");
}
