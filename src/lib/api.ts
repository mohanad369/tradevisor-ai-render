// Backend proxy base — all API calls go through here (keys hidden on server)
const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "");
const API_BASE_URL = `${configuredApiOrigin || ""}/api`;
const API_TIMEOUT_MS = 12_000;

export function isBackendConfigured(): boolean {
  return typeof window !== "undefined" && window.location.protocol.startsWith("http");
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify(body),
  }).finally(() => window.clearTimeout(timeout));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeout));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface AnalyzeChartPayload {
  imageBase64: string;
  assetName: string;
  strategyName: string;
  timeframe: string;
  currentPrice?: number;
}

export interface AnalyzeChartResult {
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
  riskAmount: number;
  strategyUsed: string;
  timeToHold: string;
  lotSize1000: string;
  lotSize5000: string;
  lotSize10000: string;
  maxRiskPercent: number;
  reasons: string[];
  srLevels: Array<{ level: number; type: "support" | "resistance" | "pivot"; strength: string }>;
  fibonacci: Array<{ level: number; price: number }>;
  candlePatterns: Array<{ name: string; signal: "bullish" | "bearish" | "neutral"; reliability: string }>;
  volume: { trend: "increasing" | "decreasing" | "normal"; signal: string };
  trend: string;
  marketStructure: string;
  keyLevel: string;
  confluenceScore: number;
  analysisSource?: string;
  aiConsensus?: {
    status: "aligned" | "mixed" | "single_model" | "fallback";
    models: string[];
    primaryModel: string;
    secondaryModel?: string;
    notes: string[];
  };
}

export async function analyzeChart(payload: AnalyzeChartPayload): Promise<AnalyzeChartResult> {
  return apiPost("/chart/analyze", payload);
}

export interface SupportAskPayload {
  question: string;
  language: string;
}

export interface SupportAskResult {
  reply: string;
}

export async function supportAsk(payload: SupportAskPayload): Promise<SupportAskResult> {
  return apiPost("/support/ask", payload);
}

export interface CreateOrderPayload {
  planName: string;
  amount: string;
  walletAddress: string;
}

export interface CreateOrderResult {
  orderId: string;
  status: string;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  return apiPost("/orders/create", payload);
}

export interface OrderStatusResult {
  status: string;
  createdAt: string;
}

export async function getOrderStatus(orderId: string): Promise<OrderStatusResult> {
  return apiGet(`/orders/status/${encodeURIComponent(orderId)}`);
}
