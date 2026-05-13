// Backend proxy base — all API calls go through here (keys hidden on server)
const API_BASE_URL = "https://56d482e2b32b1ba7-182-92-80-50.serveousercontent.com/api";

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
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
