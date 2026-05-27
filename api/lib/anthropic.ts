/*
 * api/lib/anthropic.ts — REAL Claude-powered Chart Analyzer
 *
 * Calls the Anthropic Messages API with vision input. Uses ANTHROPIC_API_KEY
 * from env. Falls back to deterministic mock ONLY if the API key is missing
 * or the request fails — so dev environments without a key keep working.
 *
 * Endpoint: https://api.anthropic.com/v1/messages
 * Model:    overridable via ANTHROPIC_MODEL env var
 */

import { env } from "./env";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const API_TIMEOUT_MS = 45_000;

interface AssetProfile {
  base: number;
  range: number;
  decimals: number;
  tickSize: number;
  pipVal: number;
}

const ASSET_PROFILES: Record<string, AssetProfile> = {
  "EUR/USD":          { base: 1.08, range: 0.04, decimals: 5, tickSize: 0.00001, pipVal: 10 },
  "GBP/USD":          { base: 1.26, range: 0.06, decimals: 5, tickSize: 0.00001, pipVal: 10 },
  "USD/JPY":          { base: 151.5, range: 3.0, decimals: 3, tickSize: 0.001,  pipVal: 9.2 },
  "GBP/JPY":          { base: 192.0, range: 5.0, decimals: 3, tickSize: 0.001,  pipVal: 9.2 },
  "XAU/USD (Gold)":   { base: 2400,  range: 120, decimals: 2, tickSize: 0.01,   pipVal: 10 },
  "BTC/USD":          { base: 68500, range: 8000, decimals: 0, tickSize: 1,      pipVal: 1 },
  "ETH/USD":          { base: 3550,  range: 500, decimals: 2, tickSize: 0.01,   pipVal: 1 },
  "SPY":              { base: 595,   range: 20,  decimals: 2, tickSize: 0.01,   pipVal: 1 },
  "NDX (Nasdaq)":     { base: 20900, range: 1200, decimals: 2, tickSize: 0.01,   pipVal: 1 },
};

interface StrategyProfile {
  slPct: number; tp1Mult: number; tp2Mult: number; tp3Mult: number;
  winRate: number; holdTime: string;
}

const STRATEGY_PROFILES: Record<string, StrategyProfile> = {
  "Scalping":     { slPct: 0.0015, tp1Mult: 1.2, tp2Mult: 1.8, tp3Mult: 2.5, winRate: 65, holdTime: "5-15 min" },
  "Day Trading":  { slPct: 0.0035, tp1Mult: 1.5, tp2Mult: 2.5, tp3Mult: 4.0, winRate: 62, holdTime: "1-4 hrs" },
  "Swing Trading":{ slPct: 0.0075, tp1Mult: 2.0, tp2Mult: 3.5, tp3Mult: 5.5, winRate: 60, holdTime: "1-5 days" },
  "Position":     { slPct: 0.015,  tp1Mult: 2.5, tp2Mult: 4.5, tp3Mult: 8.0, winRate: 58, holdTime: "1-4 weeks" },
};

function getAssetProfile(name: string) { return ASSET_PROFILES[name] || ASSET_PROFILES["EUR/USD"]; }
function getStrategyProfile(name: string) { return STRATEGY_PROFILES[name] || STRATEGY_PROFILES["Day Trading"]; }

/** Extract the first valid JSON object found anywhere in a string. */
function extractJson(text: string): any | null {
  // Try fenced ```json ... ``` first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fall through */ }
  }
  // Try first balanced { ... }
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

/** Detect base64 image media type from raw base64. */
function detectMediaType(b64: string): string {
  if (b64.startsWith("/9j/"))     return "image/jpeg";
  if (b64.startsWith("iVBORw0"))  return "image/png";
  if (b64.startsWith("R0lGOD"))   return "image/gif";
  if (b64.startsWith("UklGR"))    return "image/webp";
  return "image/jpeg";
}

interface ClaudeAnalysis {
  signal: "BUY" | "SELL";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  trend: string;
  marketStructure: string;
  reasons: string[];
  candlePatterns?: Array<{ name: string; signal: string; reliability: string }>;
  confluenceScore?: number;
}

async function callClaudeVision(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
): Promise<ClaudeAnalysis | null> {
  if (!env.ANTHROPIC_API_KEY) {
    console.warn("[anthropic] ANTHROPIC_API_KEY missing — using local fallback");
    return null;
  }

  const mediaType = detectMediaType(base64Image);
  const asset = getAssetProfile(assetName);

  const system = `You are a professional trading chart analyst. You will receive a candlestick chart image and must produce a complete trading plan as STRICT JSON only — no prose, no markdown, no explanation outside the JSON.

Rules:
- Read price levels directly from the chart axes when visible.
- "signal" must be "BUY" or "SELL" (never HOLD).
- "confidence" is an integer 60-98.
- Prices must respect the asset's tick size; round to ${asset.decimals} decimals.
- Stop loss must be on the opposite side of entry from take-profits.
- TP1 < TP2 < TP3 for BUY; TP1 > TP2 > TP3 for SELL (in absolute distance from entry).
- "reasons" is an array of 3-5 short bullet strings citing what you actually see on the chart.
- "candlePatterns" lists 1-2 patterns you actually identify, with reliability "High" or "Medium".
- "confluenceScore" is an integer 60-98.`;

  const user = `Analyze this ${assetName} chart on the ${timeframe} timeframe using a ${strategyName} approach.

Return EXACTLY this JSON shape (no extra keys, no trailing commas):
{
  "signal": "BUY" | "SELL",
  "confidence": <int 60-98>,
  "entry": <number>,
  "stopLoss": <number>,
  "takeProfit1": <number>,
  "takeProfit2": <number>,
  "takeProfit3": <number>,
  "trend": "<short description, e.g. 'Bullish uptrend'>",
  "marketStructure": "<short description, e.g. 'Higher highs and higher lows'>",
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "candlePatterns": [{"name":"<pattern>","signal":"bullish"|"bearish","reliability":"High"|"Medium"}],
  "confluenceScore": <int 60-98>
}`;

  const body = {
    model: DEFAULT_MODEL,
    max_tokens: 1500,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          { type: "text", text: user },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[anthropic] API error ${res.status}: ${errText}`);
      return null;
    }

    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text || "";
    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[anthropic] Couldn't parse JSON from Claude response:", text.slice(0, 500));
      return null;
    }

    // Basic validation
    if (parsed.signal !== "BUY" && parsed.signal !== "SELL") return null;
    if (typeof parsed.entry !== "number" || typeof parsed.stopLoss !== "number") return null;

    return parsed as ClaudeAnalysis;
  } catch (err: any) {
    if (err?.name === "AbortError") console.error("[anthropic] Request timed out");
    else console.error("[anthropic] Request failed:", err?.message || err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * PUBLIC ENTRY POINT — kept the same signature so chart.ts router doesn't change.
 *
 * Behavior:
 *   1. Try real Claude vision call.
 *   2. If it fails or no API key, fall back to deterministic mock so the app
 *      keeps working in dev / offline scenarios.
 */
/**
 * Multi-timeframe scalping analysis.
 *
 * Real scalpers read top-down: the higher frame sets the bias, the
 * middle frame confirms structure, the lowest frame times the entry.
 * This sends all three chart images to Claude in ONE request so it can
 * reason across them together — the 15m for trend, the 5m for the
 * setup, the 1m for the precise entry, stop, and targets.
 *
 * `frames` must be ordered highest -> lowest timeframe.
 */
export async function analyzeScalpingMultiFrame(
  frames: Array<{ timeframe: string; base64: string }>,
  assetName: string,
): Promise<Record<string, unknown> | null> {
  const asset = getAssetProfile(assetName);

  if (!env.ANTHROPIC_API_KEY) {
    console.warn("[anthropic] ANTHROPIC_API_KEY missing — multi-frame needs the AI");
    return null;
  }
  if (!frames.length) return null;

  const system = `You are an elite scalping analyst. You will receive ${frames.length} candlestick chart images of the SAME asset on DIFFERENT timeframes, ordered from highest to lowest.

Analyze them TOP-DOWN like a professional scalper:
- The HIGHEST timeframe sets the directional bias and trend.
- The MIDDLE timeframe confirms market structure and the setup.
- The LOWEST timeframe gives the precise entry, stop loss, and targets.

The three timeframes MUST agree for a high-confidence signal. If the
higher timeframe trend contradicts the lower timeframe setup, lower the
confidence and say so in the reasons.

Output STRICT JSON only — no prose, no markdown outside the JSON.

Rules:
- Read price levels directly from the chart axes.
- "signal" must be "BUY" or "SELL" (never HOLD).
- "confidence" is an integer 60-98. Only exceed 85 when ALL THREE
  timeframes clearly align.
- The entry, stop loss, and targets must come from the LOWEST timeframe
  for a precise scalping execution.
- Round prices to ${asset.decimals} decimals.
- Stop loss on the opposite side of entry from the take-profits.
- For BUY: TP1<TP2<TP3. For SELL: TP1>TP2>TP3 (distance from entry).
- "timeframeBias" describes what EACH timeframe shows.
- "reasons" cites what you actually see across the frames.`;

  const user = `Analyze this ${assetName} scalping setup across all ${frames.length} timeframes (${frames.map(f => f.timeframe).join(", ")}).

Return EXACTLY this JSON shape:
{
  "signal": "BUY" | "SELL",
  "confidence": <int 60-98>,
  "entry": <number>,
  "stopLoss": <number>,
  "takeProfit1": <number>,
  "takeProfit2": <number>,
  "takeProfit3": <number>,
  "trend": "<overall trend from the highest timeframe>",
  "marketStructure": "<structure from the middle timeframe>",
  "timeframeBias": [
    {"timeframe": "<tf>", "bias": "bullish"|"bearish"|"neutral", "note": "<short>"}
  ],
  "alignment": "<aligned|partial|conflicting>",
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>", "<reason 4>"],
  "candlePatterns": [{"name":"<pattern>","signal":"bullish"|"bearish","reliability":"High"|"Medium"}],
  "confluenceScore": <int 60-98>
}`;

  // Build the message: each image preceded by a label so Claude knows
  // which timeframe is which.
  const content: any[] = [];
  for (const f of frames) {
    content.push({ type: "text", text: `-- Timeframe: ${f.timeframe} --` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: detectMediaType(f.base64), data: f.base64 },
    });
  }
  content.push({ type: "text", text: user });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[anthropic] multi-frame API error ${res.status}: ${errText}`);
      return null;
    }

    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text || "";
    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[anthropic] multi-frame: couldn't parse JSON:", text.slice(0, 400));
      return null;
    }
    if (parsed.signal !== "BUY" && parsed.signal !== "SELL") return null;
    if (typeof parsed.entry !== "number" || typeof parsed.stopLoss !== "number") return null;

    // Shape the result like analyzeChartWithAI so the UI/pipeline is unchanged.
    const strategy = getStrategyProfile("Scalping");
    const riskAmount = Math.abs(parsed.entry - parsed.stopLoss);
    const rr = (tp: number) =>
      riskAmount > 0 ? (Math.abs(tp - parsed.entry) / riskAmount).toFixed(1) : "1.5";
    const riskPips = Number(riskAmount.toFixed(asset.decimals));

    const baseResult: Record<string, unknown> = {
      signal: parsed.signal,
      confidence: parsed.confidence,
      entry: Number(parsed.entry.toFixed(asset.decimals)),
      stopLoss: Number(parsed.stopLoss.toFixed(asset.decimals)),
      takeProfit1: Number(parsed.takeProfit1.toFixed(asset.decimals)),
      takeProfit2: Number(parsed.takeProfit2.toFixed(asset.decimals)),
      takeProfit3: Number(parsed.takeProfit3.toFixed(asset.decimals)),
      riskReward1: `1:${rr(parsed.takeProfit1)}`,
      riskReward2: `1:${rr(parsed.takeProfit2)}`,
      riskReward3: `1:${rr(parsed.takeProfit3)}`,
      riskPips,
      riskAmount: Number((riskPips * asset.pipVal).toFixed(2)),
      strategyUsed: "Scalping (multi-timeframe)",
      timeToHold: strategy.holdTime,
      lotSize1000: riskPips > 0 ? (15 / (riskPips * asset.pipVal)).toFixed(2) : "0.01",
      lotSize5000: riskPips > 0 ? (75 / (riskPips * asset.pipVal)).toFixed(2) : "0.05",
      lotSize10000: riskPips > 0 ? (150 / (riskPips * asset.pipVal)).toFixed(2) : "0.10",
      maxRiskPercent: 1.5,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      trend: parsed.trend || "",
      marketStructure: parsed.marketStructure || "",
      timeframeBias: Array.isArray(parsed.timeframeBias) ? parsed.timeframeBias : [],
      alignment: parsed.alignment || "partial",
      candlePatterns: parsed.candlePatterns || [],
      volume: { trend: "normal", signal: parsed.trend || "" },
      keyLevel: `${parsed.signal === "BUY" ? "Support" : "Resistance"} at ${parsed.entry}`,
      confluenceScore: parsed.confluenceScore ?? parsed.confidence,
      poweredBy: "claude-multiframe",
    };

    // ── Run the 6-agent pipeline on this result ──
    // The multi-frame scalping analysis now passes through the same
    // agents as the normal analyzer, so the Scalping strategy rules,
    // the risk gate, and the agent verdict all apply here too.
    try {
      const { runTradingAgentPipeline } = await import("../../src/lib/tradingAgents");

      // For gold, also run the Weekly 4H Zones strategy so the 8th
      // agent appears in the scalping result too. Called directly —
      // this code already runs server-side.
      let goldStrategy = null;
      if (/xau|gold|ذهب/i.test(assetName)) {
        try {
          const { runGoldWeekly4hZones } = await import("./strategies/goldWeekly4h");
          const { getStrategyWeights } = await import("./strategies/learning");
          goldStrategy = await runGoldWeekly4hZones(getStrategyWeights("gold_weekly_4h"));
        } catch (e) {
          console.error("[anthropic] gold strategy for scalping failed:", (e as Error)?.message);
        }
      }

      baseResult.agents = runTradingAgentPipeline({
        analysis: baseResult as any,
        assetName,
        strategyName: "AI Scalping",
        timeframe: frames[frames.length - 1]?.timeframe || "1m",
        goldStrategy,
      });
    } catch (err) {
      console.error("[anthropic] multi-frame agent pipeline failed:", (err as Error)?.message);
      // Non-fatal — the analysis is still returned without the agent layer.
    }

    return baseResult;
  } catch (err: any) {
    if (err?.name === "AbortError") console.error("[anthropic] multi-frame timed out");
    else console.error("[anthropic] multi-frame failed:", err?.message || err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeChartWithAI(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
): Promise<Record<string, unknown> | null> {
  const asset = getAssetProfile(assetName);
  const strategy = getStrategyProfile(strategyName);

  // ─── Attempt real Claude analysis first ───
  const real = await callClaudeVision(base64Image, assetName, strategyName, timeframe);

  if (real) {
    const riskAmount = Math.abs(real.entry - real.stopLoss);
    const rr1 = riskAmount > 0 ? (Math.abs(real.takeProfit1 - real.entry) / riskAmount).toFixed(1) : "1.5";
    const rr2 = riskAmount > 0 ? (Math.abs(real.takeProfit2 - real.entry) / riskAmount).toFixed(1) : "2.5";
    const rr3 = riskAmount > 0 ? (Math.abs(real.takeProfit3 - real.entry) / riskAmount).toFixed(1) : "4.0";
    const riskPips = Number(riskAmount.toFixed(asset.decimals));

    return {
      signal: real.signal,
      confidence: real.confidence,
      entry: Number(real.entry.toFixed(asset.decimals)),
      stopLoss: Number(real.stopLoss.toFixed(asset.decimals)),
      takeProfit1: Number(real.takeProfit1.toFixed(asset.decimals)),
      takeProfit2: Number(real.takeProfit2.toFixed(asset.decimals)),
      takeProfit3: Number(real.takeProfit3.toFixed(asset.decimals)),
      riskReward1: `1:${rr1}`,
      riskReward2: `1:${rr2}`,
      riskReward3: `1:${rr3}`,
      riskPips,
      riskAmount: Number((riskPips * asset.pipVal).toFixed(2)),
      strategyUsed: strategyName,
      timeToHold: strategy.holdTime,
      lotSize1000: riskPips > 0 ? (15 / (riskPips * asset.pipVal)).toFixed(2) : "0.01",
      lotSize5000: riskPips > 0 ? (75 / (riskPips * asset.pipVal)).toFixed(2) : "0.05",
      lotSize10000: riskPips > 0 ? (150 / (riskPips * asset.pipVal)).toFixed(2) : "0.10",
      maxRiskPercent: 1.5,
      reasons: real.reasons,
      trend: real.trend,
      marketStructure: real.marketStructure,
      candlePatterns: real.candlePatterns || [
        { name: real.signal === "BUY" ? "Bullish Engulfing" : "Bearish Engulfing",
          signal: real.signal === "BUY" ? "bullish" : "bearish",
          reliability: "High" },
      ],
      volume: { trend: "normal", signal: real.trend },
      keyLevel: `${real.signal === "BUY" ? "Support" : "Resistance"} at ${real.entry}`,
      confluenceScore: real.confluenceScore ?? real.confidence,
      poweredBy: "claude",
    };
  }

  // ─── Fallback: deterministic local mock (unchanged from original) ───
  console.warn("[anthropic] Using local deterministic fallback");
  await new Promise((r) => setTimeout(r, 800));

  function hashString(s: string) {
    let h = 0;
    for (let i = 0; i < Math.min(s.length, 5000); i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function rngFrom(seed: number) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  const rng = rngFrom(hashString(base64Image.slice(0, 5000)));
  const isBuy = rng() > 0.42;
  const signal = isBuy ? "BUY" : "SELL";
  const currentPrice = asset.base + (rng() - 0.5) * asset.range;
  const entry = Math.round(currentPrice / asset.tickSize) * asset.tickSize;
  const slDist = entry * strategy.slPct;
  const sl = isBuy
    ? Math.round((entry - slDist) / asset.tickSize) * asset.tickSize
    : Math.round((entry + slDist) / asset.tickSize) * asset.tickSize;
  const r = Math.abs(entry - sl);
  const tp = (mult: number) => isBuy
    ? Math.round((entry + r * mult) / asset.tickSize) * asset.tickSize
    : Math.round((entry - r * mult) / asset.tickSize) * asset.tickSize;
  const tp1 = tp(strategy.tp1Mult), tp2 = tp(strategy.tp2Mult), tp3 = tp(strategy.tp3Mult);
  const riskPips = Number(r.toFixed(asset.decimals));
  return {
    signal, confidence: 75 + Math.floor(rng() * 15),
    entry: Number(entry.toFixed(asset.decimals)),
    stopLoss: Number(sl.toFixed(asset.decimals)),
    takeProfit1: Number(tp1.toFixed(asset.decimals)),
    takeProfit2: Number(tp2.toFixed(asset.decimals)),
    takeProfit3: Number(tp3.toFixed(asset.decimals)),
    riskReward1: `1:${(r > 0 ? Math.abs(tp1 - entry) / r : 1.5).toFixed(1)}`,
    riskReward2: `1:${(r > 0 ? Math.abs(tp2 - entry) / r : 2.5).toFixed(1)}`,
    riskReward3: `1:${(r > 0 ? Math.abs(tp3 - entry) / r : 4.0).toFixed(1)}`,
    riskPips, riskAmount: Number((riskPips * asset.pipVal).toFixed(2)),
    strategyUsed: strategyName, timeToHold: strategy.holdTime,
    lotSize1000: riskPips > 0 ? (15 / (riskPips * asset.pipVal)).toFixed(2) : "0.01",
    lotSize5000: riskPips > 0 ? (75 / (riskPips * asset.pipVal)).toFixed(2) : "0.05",
    lotSize10000: riskPips > 0 ? (150 / (riskPips * asset.pipVal)).toFixed(2) : "0.10",
    maxRiskPercent: 1.5,
    reasons: ["Fallback analysis — Claude API unreachable", "Levels generated from asset profile"],
    trend: isBuy ? "Uptrend" : "Downtrend",
    marketStructure: isBuy ? "Higher highs / higher lows" : "Lower highs / lower lows",
    candlePatterns: [{ name: isBuy ? "Bullish Engulfing" : "Bearish Engulfing", signal: isBuy ? "bullish" : "bearish", reliability: "Medium" }],
    volume: { trend: "normal", signal: isBuy ? "Uptrend" : "Downtrend" },
    keyLevel: `${isBuy ? "Support" : "Resistance"} at ${entry}`,
    confluenceScore: 70 + Math.floor(rng() * 15),
    poweredBy: "fallback",
  };
}
