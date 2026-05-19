/**
 * Chart AI Integration — routes ALL chart analysis through the backend
 * (`/api/trpc/chart.analyze`) which is powered by Claude vision.
 *
 * The file keeps its old name (`openai.ts`) and the same exported signatures
 * (`analyzeWithOpenAI`, `isOpenAIConfigured`, `OpenAIAnalysisResult`) so
 * `analyzer.ts` doesn't need to change. Under the hood it now talks to
 * Claude — the "OpenAI" naming is just legacy.
 */

import superjson from "superjson";

const TRPC_ENDPOINT = "/api/trpc/chart.analyze";
const PING_ENDPOINT = "/api/trpc/ping";
const REQUEST_TIMEOUT_MS = 45_000;
const PING_TIMEOUT_MS = 1500;

export interface OpenAIAnalysisResult {
  signal: "BUY" | "SELL";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward1: string;
  riskReward2: string;
  riskReward3: string;
  riskPips: number;
  strategyUsed: string;
  timeToHold: string;
  reasons: string[];
  trend: string;
  marketStructure: string;
  confluenceScore: number;
}

/**
 * Send the chart image to our backend (which calls Claude vision).
 * Keeps the same return shape `analyzer.ts` already consumes.
 */
export async function analyzeWithOpenAI(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
): Promise<OpenAIAnalysisResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // tRPC mutation over HTTP. With superjson transformer, payload goes under
  // `json` and the response sits at `result.data.json`.
  const payload = superjson.serialize({
    imageBase64: base64Image,
    assetName,
    strategyName,
    timeframe,
  });

  try {
    const res = await fetch(TRPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-trpc-source": "chart-analyzer" },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({} as any));
      const msg = errBody?.error?.message || errBody?.message || `Server error: ${res.status}`;
      throw new Error(msg);
    }

    const json = (await res.json()) as any;
    // tRPC response: { result: { data: <superjson-encoded> } } OR
    //                { result: { data: { json, meta } } } depending on version.
    const dataNode = json?.result?.data;
    const raw = dataNode?.json !== undefined
      ? superjson.deserialize<any>({ json: dataNode.json, meta: dataNode.meta })
      : dataNode;

    if (!raw) throw new Error("Empty response from analyzer");

    // Normalize into the shape analyzer.ts expects.
    return {
      signal: raw.signal,
      confidence: Number(raw.confidence) || 0,
      entry: Number(raw.entry) || 0,
      stopLoss: Number(raw.stopLoss) || 0,
      takeProfit1: Number(raw.takeProfit1) || 0,
      takeProfit2: Number(raw.takeProfit2) || 0,
      takeProfit3: Number(raw.takeProfit3) || 0,
      riskReward1: String(raw.riskReward1 || "1:1.5"),
      riskReward2: String(raw.riskReward2 || "1:2.5"),
      riskReward3: String(raw.riskReward3 || "1:4.0"),
      riskPips: Number(raw.riskPips) || 0,
      strategyUsed: String(raw.strategyUsed || strategyName),
      timeToHold: String(raw.timeToHold || "1-4 hrs"),
      reasons: Array.isArray(raw.reasons) ? raw.reasons : [],
      trend: String(raw.trend || ""),
      marketStructure: String(raw.marketStructure || ""),
      confluenceScore: Number(raw.confluenceScore) || Number(raw.confidence) || 0,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Lightweight backend availability check. Pings the tRPC root.
 * Returns false quickly when the backend isn't reachable so the
 * client-side deterministic fallback in analyzer.ts can take over.
 */
export async function isOpenAIConfigured(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(PING_ENDPOINT, { method: "GET", signal: controller.signal })
      .finally(() => window.clearTimeout(timeout));
    return res.ok;
  } catch {
    return false;
  }
}
