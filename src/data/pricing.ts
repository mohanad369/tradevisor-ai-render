export interface PricingPlan {
  name: string;
  originalPrice: string;
  salePrice: string;
  discount: string;
  period: string;
  features: string[];
  cta: string;
  premium?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    name: "TradeVisor Monthly",
    originalPrice: "$99",
    salePrice: "$69",
    discount: "30% OFF",
    period: "Monthly subscription • Cancel anytime",
    features: [
      "AI-powered BUY & SELL signals",
      "Advanced AI-powered market analysis",
      "TradingView premium indicator integration",
      "Multi-timeframe market analysis",
      "24/7 automated market monitoring",
      "Risk management & stop-loss alerts",
      "Custom indicator settings & optimization",
      "Mobile & desktop notifications",
    ],
    cta: "Get Monthly Access",
  },
  {
    name: "TradeVisor Yearly",
    originalPrice: "$1,200",
    salePrice: "$669",
    discount: "44% OFF",
    period: "Yearly subscription • Save $531",
    features: [
      "AI-powered BUY & SELL signals",
      "Advanced AI-powered market analysis",
      "TradingView premium indicator integration",
      "Multi-timeframe market analysis",
      "24/7 automated market monitoring",
      "Risk management & stop-loss alerts",
      "Custom indicator settings & optimization",
      "Mobile & desktop notifications",
      "Priority VIP support",
      "Exclusive market insights",
    ],
    cta: "Get Yearly Access",
    premium: true,
  },
];
