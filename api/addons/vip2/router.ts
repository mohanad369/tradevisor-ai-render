// VIP2 Gold Chart AI — Backend Router (Claude-powered)
//
// Migrated from OpenAI gpt-4o-mini to Anthropic Claude vision.
// Reuses the same ANTHROPIC_API_KEY from env so a single key powers
// all AI features in the app.

import { Hono } from "hono";

const app = new Hono();

const MODEL = process.env.VIP2_ANTHROPIC_MODEL || "claude-sonnet-4-5";
const API_URL = "https://api.anthropic.com/v1/messages";
const REQUEST_TIMEOUT_MS = 45_000;

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ─── Helpers ───────────────────────────────────────────────────
function extractJson(text: string): any | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fall */ }
  }
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function bufferToBase64(buf: ArrayBuffer): string {
  // Avoid String.fromCharCode stack-overflow on large images.
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// ─── Health check ──────────────────────────────────────────────
app.get("/health", (c) => c.json({
  status: "ok",
  model: MODEL,
  provider: "anthropic",
  apiKeyConfigured: hasAnthropicKey(),
}));

// ─── Gold price (unchanged) ────────────────────────────────────
app.get("/gold/price", async (c) => {
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d");
    if (!res.ok) throw new Error("Yahoo error");
    const json = await res.json() as any;
    const meta = json.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice || meta?.previousClose || 0);
    if (!price) throw new Error("No price");

    return c.json({
      price: Number(price.toFixed(2)),
      bid: Number((price - 0.2).toFixed(2)),
      ask: Number((price + 0.2).toFixed(2)),
      timestamp: Math.floor(Date.now() / 1000),
      currency: "USD",
    });
  } catch {
    return c.json({ error: "Gold price unavailable" }, 503);
  }
});

// ─── Chart AI Analysis (Claude vision) ─────────────────────────
app.post("/gold/chart-ai", async (c) => {
  try {
    const body = await c.req.parseBody();
    const chartFile = body.chart as File;
    const timeframe = (body.timeframe as string) || "";
    const notes = (body.notes as string) || "";

    if (!chartFile || !chartFile.type.startsWith("image/")) {
      return c.json({ error: "Upload a valid image file" }, 400);
    }
    if (chartFile.size > 10 * 1024 * 1024) {
      return c.json({ error: "Max 10MB" }, 400);
    }
    if (!hasAnthropicKey()) {
      return c.json({ error: "ANTHROPIC_API_KEY is not configured" }, 503);
    }

    // Image → base64
    const arrayBuffer = await chartFile.arrayBuffer();
    const base64 = bufferToBase64(arrayBuffer);
    const mediaType = chartFile.type; // "image/png", "image/jpeg", etc.

    const system = `You are an expert XAU/USD (Gold) trading analyst. You analyze candlestick chart images and respond with STRICT JSON ONLY — no prose, no markdown, no explanation outside the JSON.`;

    const userText = `Analyze this XAU/USD (Gold) chart${timeframe ? ` on the ${timeframe} timeframe` : ""}.
${notes ? `Trader notes: ${notes}` : ""}

Return EXACTLY this JSON shape:
{
  "signal": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
  "confidence": <int 0-100>,
  "entryPrice": "<number as string, e.g. '2415.50'>",
  "stopLoss": "<number as string>",
  "takeProfit": "<number as string>",
  "riskReward": "<e.g. '1:2.5'>",
  "analysis": "<2-3 sentence explanation>"
}`;

    const reqBody = {
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[VIP2] Anthropic ${res.status}:`, errText.slice(0, 500));
      return c.json({ error: `Claude API error: ${res.status}` }, 502);
    }

    const data = (await res.json()) as any;
    const raw = data?.content?.[0]?.text || "{}";
    const parsed = extractJson(raw) || {};

    return c.json({
      analysis: parsed.analysis || raw,
      signal: parsed.signal || "NEUTRAL",
      confidence: parsed.confidence ?? 0,
      entryPrice: parsed.entryPrice || "",
      stopLoss: parsed.stopLoss || "",
      takeProfit: parsed.takeProfit || "",
      riskReward: parsed.riskReward || "",
      poweredBy: "claude",
      model: MODEL,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("[VIP2] Chart AI timeout");
      return c.json({ error: "Analysis timed out" }, 504);
    }
    console.error("[VIP2] Chart AI error:", err);
    return c.json({ error: err.message || "Analysis failed" }, 500);
  }
});

export default app;
