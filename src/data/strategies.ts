export interface Strategy {
  id: string;
  name: string;
  description: string;
  timeframes: string[];
  bestFor: string[];
  minRR: string;
  winRate: string;
}

export interface Asset {
  id: string;
  name: string;
  type: "forex" | "crypto" | "gold" | "indices";
  tickSize: number;
  avgRange: number;
}

export interface SRLLevel {
  level: number;
  type: "support" | "resistance" | "pivot";
  strength: string;
}

export interface FibLevel {
  level: number;
  price: number;
}

export interface CandlePattern {
  name: string;
  signal: "bullish" | "bearish" | "neutral";
  reliability: string;
}

export interface VolumeAnalysis {
  trend: "increasing" | "decreasing" | "normal";
  signal: string;
}

export interface AnalysisResult {
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
  srLevels: SRLLevel[];
  fibonacci: FibLevel[];
  candlePatterns: CandlePattern[];
  volume: VolumeAnalysis;
  trend: string;
  marketStructure: string;
  keyLevel: string;
  confluenceScore: number;
}

export const strategies: Strategy[] = [
  {
    id: "scalping",
    name: "AI Scalping",
    description: "Fast 3-10 pip targets. Tight 5-8 pip stops. 1:1.5 to 1:2 R:R. Momentum-based.",
    timeframes: ["1m", "5m", "15m"],
    bestFor: ["EUR/USD", "GBP/USD", "XAU/USD"],
    minRR: "1:1.5",
    winRate: "72%",
  },
  {
    id: "daytrading",
    name: "Day Trading",
    description: "15-40 pip targets. 8-15 pip stops. 1:2 to 1:3 R:R. Breakout & pullback.",
    timeframes: ["15m", "30m", "1H"],
    bestFor: ["EUR/USD", "GBP/JPY", "XAU/USD"],
    minRR: "1:2",
    winRate: "68%",
  },
  {
    id: "swing",
    name: "Swing Trading",
    description: "50-150 pip targets. 15-30 pip stops. 1:3 to 1:5 R:R. Trend structure.",
    timeframes: ["1H", "4H", "Daily"],
    bestFor: ["EUR/USD", "USD/JPY", "XAU/USD"],
    minRR: "1:3",
    winRate: "64%",
  },
  {
    id: "breakout",
    name: "Breakout",
    description: "20-60 pip targets. 8-12 pip stops. 1:2.5 to 1:4 R:R. Volatility expansion.",
    timeframes: ["15m", "1H", "4H"],
    bestFor: ["GBP/USD", "XAU/USD", "BTC/USD"],
    minRR: "1:3",
    winRate: "61%",
  },
  {
    id: "trend",
    name: "Trend Following",
    description: "80-200 pip targets. 20-35 pip stops. 1:3 to 1:6 R:R. Multi-TF alignment.",
    timeframes: ["1H", "4H", "Daily"],
    bestFor: ["EUR/USD", "USD/JPY", "NDX"],
    minRR: "1:4",
    winRate: "59%",
  },
  {
    id: "smartmoney",
    name: "Smart Money",
    description: "30-80 pip targets. 10-18 pip stops. 1:2.5 to 1:4 R:R. Liquidity + order blocks.",
    timeframes: ["5m", "15m", "1H", "4H"],
    bestFor: ["XAU/USD", "BTC/USD", "ETH/USD"],
    minRR: "1:3",
    winRate: "66%",
  },
];

export const assets: Asset[] = [
  { id: "eurusd", name: "EUR/USD", type: "forex", tickSize: 0.00001, avgRange: 0.0080 },
  { id: "gbpusd", name: "GBP/USD", type: "forex", tickSize: 0.00001, avgRange: 0.0100 },
  { id: "usdjpy", name: "USD/JPY", type: "forex", tickSize: 0.001, avgRange: 1.20 },
  { id: "gbpjpy", name: "GBP/JPY", type: "forex", tickSize: 0.001, avgRange: 1.80 },
  { id: "xauusd", name: "XAU/USD (Gold)", type: "gold", tickSize: 0.01, avgRange: 25.0 },
  { id: "btcusd", name: "BTC/USD", type: "crypto", tickSize: 1, avgRange: 2000 },
  { id: "ethusd", name: "ETH/USD", type: "crypto", tickSize: 0.01, avgRange: 100 },
  { id: "spy", name: "SPY", type: "indices", tickSize: 0.01, avgRange: 5 },
  { id: "ndx", name: "NDX (Nasdaq)", type: "indices", tickSize: 0.01, avgRange: 200 },
];
