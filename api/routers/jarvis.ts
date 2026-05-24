import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { env } from "../lib/env";

/**
 * Jarvis chat router.
 *
 * The assistant runs on the SERVER's Anthropic key — the user never
 * sees, enters, or needs an API key. Claude is natively multilingual,
 * so Jarvis answers in whatever language the visitor writes in.
 *
 * A per-conversation message cap is enforced on the CLIENT (it counts
 * the user's turns); this endpoint stays stateless and simply answers.
 * Cost control: keep max_tokens modest and the model on the lighter tier.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.JARVIS_MODEL || "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You are Jarvis, the AI trading assistant for TradeVisor.

You are fluent in EVERY language. Always reply in the SAME language the user
writes in (Arabic, English, French, etc.) — match their language exactly.

TRADEVISOR VIP PLANS:
- Monthly: $69
- 3 Months: $249
- Yearly: $669 (best value)
- $25 / 3-day trial plan also available
- Payment: USDT TRC20

VIP DASHBOARD FEATURES: AI chart analyzer, daily AI signals, live charts,
lot calculator, strategies, broker list, performance tracking, gold analysis,
and an education center (SMC, ICT, classic trading lessons).

TRADER DASHBOARD: capital tracker, trade journal, 1-month growth plan,
lot calculator, and agent memory that learns from logged trades.

STYLE:
- Be concise, friendly, and professional.
- Help users understand features and how to subscribe.
- You may discuss trading concepts and analysis educationally.
- Do NOT promise guaranteed profit — trading carries real risk.
- If a user needs human help, tell them they can reach live support on
  Telegram (the app shows them the button).`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export const jarvisRouter = createRouter({
  /**
   * Send the conversation so far and get Jarvis's next reply.
   * `history` is the recent turns; `message` is the new user message.
   */
  chat: publicQuery
    .input(z.object({
      message: z.string().min(1).max(2000),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })).max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!env.ANTHROPIC_API_KEY) {
        return {
          ok: false as const,
          reply: "",
          error: "assistant_unavailable",
        };
      }

      // Keep only the last 8 turns to bound token cost.
      const history: ChatMessage[] = (input.history || []).slice(-8);
      const messages = [
        ...history,
        { role: "user" as const, content: input.message.trim() },
      ];

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 700,
            system: SYSTEM_PROMPT,
            messages,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          console.error(`[jarvis] API error ${res.status}`);
          return { ok: false as const, reply: "", error: "api_error" };
        }

        const data = (await res.json()) as any;
        const reply = data?.content?.[0]?.text || "";
        if (!reply) {
          return { ok: false as const, reply: "", error: "empty_reply" };
        }
        return { ok: true as const, reply };
      } catch (err: any) {
        if (err?.name === "AbortError") console.error("[jarvis] request timed out");
        else console.error("[jarvis] request failed:", err?.message);
        return { ok: false as const, reply: "", error: "request_failed" };
      } finally {
        clearTimeout(timeout);
      }
    }),
});
