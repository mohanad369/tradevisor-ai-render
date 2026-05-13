/**
 * OpenAI Integration — SECURE via Backend Proxy
 * API key is hidden on server, frontend never sees it
 */

const PROXY_BASE = "https://56d482e2b32b1ba7-182-92-80-50.serveousercontent.com/api/proxy";
const PROXY_TIMEOUT_MS = 3500;

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
 * Analyze chart via backend proxy (OpenAI API key hidden on server)
 */
export async function analyzeWithOpenAI(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
): Promise<OpenAIAnalysisResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  const res = await fetch(`${PROXY_BASE}/openai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      imageBase64: base64Image,
      assetName,
      strategyName,
      timeframe,
    }),
  }).finally(() => window.clearTimeout(timeout));

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Proxy error" }));
    throw new Error(err.detail || `Proxy error: ${res.status}`);
  }

  return await res.json();
}

/**
 * Check if proxy is available
 */
export async function isOpenAIConfigured(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${PROXY_BASE}/openai/analyze`, {
      method: "OPTIONS",
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timeout));
    return res.status !== 404;
  } catch {
    return false;
  }
}
