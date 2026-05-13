export interface FeatureData {
  icon: string;
  title: string;
  description: string;
  bullets: string[];
  footer: string;
}

export const featuresData: FeatureData[] = [
  {
    icon: "Target",
    title: "AI-Powered Entry & Exit Signals",
    description:
      "Know exactly when to BUY and when to SELL. Our AI analyzes 200+ indicators with confidence scores.",
    bullets: [
      "200+ indicators analyzed",
      "Confidence scoring",
      "Risk assessment",
    ],
    footer: "Remove emotion from trading",
  },
  {
    icon: "Zap",
    title: "Neural Network Momentum Engine",
    description:
      "Predict momentum shifts before they happen. Trained on 15+ years of market data, our ML engine spots trend reversals with precision.",
    bullets: [
      "15+ years training data",
      "Trend reversal detection",
      "Order flow analysis",
    ],
    footer: "Stay ahead of the market",
  },
  {
    icon: "TrendingUp",
    title: "Quantum Trend Analysis",
    description:
      "Multi-timeframe trend detection analyzing 50+ variables. Auto-adjusts sensitivity for market conditions — fewer false signals.",
    bullets: [
      "Multi-timeframe analysis",
      "Auto-adjusting sensitivity",
      "Market breadth tracking",
    ],
    footer: "Trade with the trend",
  },
  {
    icon: "BarChart3",
    title: "Algorithmic Entry Optimization",
    description:
      "Perfect entries every time. Our AI factors in volatility, order flow, and support/resistance to maximize your risk-reward ratio.",
    bullets: [
      "Slippage minimization",
      "R:R optimization",
      "Scaling recommendations",
    ],
    footer: "Maximize your profits",
  },
  {
    icon: "Fish",
    title: "Smart Money Breakout Detection",
    description:
      "Follow the whales. Track institutional flows, dark pool activity, and unusual options to catch breakouts before the crowd.",
    bullets: [
      "Dark pool monitoring",
      "Options flow analysis",
      "Pattern matching",
    ],
    footer: "Trade like the pros",
  },
  {
    icon: "Globe",
    title: "Multi-Asset Correlation Matrix",
    description:
      "Cross-market intelligence. Correlate forex, crypto, commodities, and indices to identify leading indicators early.",
    bullets: [
      "Leading indicator detection",
      "Regime adaptation",
      "Pairs trading support",
    ],
    footer: "See the bigger picture",
  },
];
