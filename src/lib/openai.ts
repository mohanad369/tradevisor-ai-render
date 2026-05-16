/**
 * OpenAI Integration — SECURE via Backend Proxy
 * API key is hidden on server, frontend never sees it
 */


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
  void base64Image;
  void assetName;
  void strategyName;
  void timeframe;
  throw new Error("OpenAI chart analysis now runs through the Tradevisor backend ensemble.");
}

/**
 * Check if proxy is available
 */
export async function isOpenAIConfigured(): Promise<boolean> {
  return false;
}
