// VIP2 Gold Chart AI — Backend Router
// Status: INACTIVE (stored in addons)
// To activate: import and mount in api/router.ts

import { Hono } from "hono";
import { z } from "zod";
import OpenAI from "openai";

const app = new Hono();

const MODEL = process.env.VIP2_OPENAI_MODEL || "gpt-4o-mini";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Health check
app.get("/health", (c) => c.json({
  status: "ok",
  model: MODEL,
  openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
}));

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

// Chart AI Analysis
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

    const openai = getOpenAIClient();
    if (!openai) {
      return c.json({ error: "OPENAI_API_KEY is not configured" }, 503);
    }

    // Convert image to base64
    const arrayBuffer = await chartFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = chartFile.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = `Analyze this XAU/USD (Gold) chart${timeframe ? ` on ${timeframe} timeframe` : ""}.
${notes ? `Trader notes: ${notes}` : ""}

Provide a structured trading analysis including:
1. Overall trend direction
2. Key support and resistance levels
3. Entry signal (BUY/SELL/HOLD/NEUTRAL)
4. Suggested entry price
5. Stop loss level
6. Take profit level
7. Risk/Reward ratio
8. Confidence level (0-100)

Format as JSON with fields: signal, confidence, entryPrice, stopLoss, takeProfit, riskReward, analysis`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are an expert gold (XAU/USD) trading analyst. Respond ONLY with valid JSON." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return c.json({
      analysis: parsed.analysis || raw,
      signal: parsed.signal || "NEUTRAL",
      confidence: parsed.confidence || 0,
      entryPrice: parsed.entryPrice || "",
      stopLoss: parsed.stopLoss || "",
      takeProfit: parsed.takeProfit || "",
      riskReward: parsed.riskReward || "",
    });
  } catch (err: any) {
    console.error("[VIP2] Chart AI error:", err);
    return c.json({ error: err.message || "Analysis failed" }, 500);
  }
});

export default app;
