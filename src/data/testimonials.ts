export interface TestimonialData {
  quote: string;
  handle: string;
  profitTag: string;
  asset: string;
  direction: "BUY" | "SELL";
  strategy: string;
  status: string;
  confidence: number;
  entry: string;
  stopLoss: string;
  tp1: string;
  tp2: string;
  tp3: string;
  risk: string;
  rr: string;
  holdTime: string;
}

export const testimonialsData: TestimonialData[] = [
  {
    quote:
      "Gold analysis was clear: tight stop, realistic targets, and no chasing. I waited for the retest and TP2 was hit clean.",
    handle: "@GoldDesk",
    profitTag: "TP2 hit on XAU/USD",
    asset: "XAU/USD",
    direction: "BUY",
    strategy: "Day Trading",
    status: "AI verified",
    confidence: 91,
    entry: "4568.40",
    stopLoss: "4566.00",
    tp1: "4570.00",
    tp2: "4572.00",
    tp3: "4574.00",
    risk: "1.5%",
    rr: "1:2.3",
    holdTime: "1-4 hrs",
  },
  {
    quote:
      "BTC setup rejected the first entry, then gave a cleaner continuation plan. That warning saved me from buying the top.",
    handle: "@CryptoRami",
    profitTag: "BTC risk filtered",
    asset: "BTC/USD",
    direction: "SELL",
    strategy: "Smart Money",
    status: "Danger avoided",
    confidence: 86,
    entry: "109,240",
    stopLoss: "109,880",
    tp1: "108,640",
    tp2: "108,050",
    tp3: "107,420",
    risk: "1.0%",
    rr: "1:2.1",
    holdTime: "2-6 hrs",
  },
  {
    quote:
      "EUR/USD came with a clean entry and the agents agreed with the momentum. I liked that the system showed the invalidation first.",
    handle: "@LondonSession",
    profitTag: "EUR/USD TP3 reached",
    asset: "EUR/USD",
    direction: "BUY",
    strategy: "Breakout",
    status: "Momentum aligned",
    confidence: 88,
    entry: "1.08420",
    stopLoss: "1.08290",
    tp1: "1.08555",
    tp2: "1.08690",
    tp3: "1.08845",
    risk: "1.2%",
    rr: "1:3.0",
    holdTime: "4-8 hrs",
  },
  {
    quote:
      "US30 was moving fast, but the plan stayed simple. Entry, stop, and targets were already mapped before I clicked anything.",
    handle: "@VivianaFX",
    profitTag: "US30 structured setup",
    asset: "US30",
    direction: "BUY",
    strategy: "AI Scalping",
    status: "Fast setup",
    confidence: 84,
    entry: "39,820",
    stopLoss: "39,760",
    tp1: "39,890",
    tp2: "39,945",
    tp3: "40,020",
    risk: "0.8%",
    rr: "1:2.4",
    holdTime: "15-45 min",
  },
  {
    quote:
      "The gold flow agent called seller pressure before the drop. I took partials at TP1 and let the rest move.",
    handle: "@MatthewL",
    profitTag: "Gold flow confirmed",
    asset: "XAU/USD",
    direction: "SELL",
    strategy: "Gold Flow",
    status: "Flow confirmed",
    confidence: 93,
    entry: "4549.80",
    stopLoss: "4553.20",
    tp1: "4546.60",
    tp2: "4543.10",
    tp3: "4538.90",
    risk: "1.4%",
    rr: "1:3.2",
    holdTime: "1-3 hrs",
  },
  {
    quote:
      "ETH long waited for confirmation instead of rushing. The debate panel showed the bear case too, which helped me size smaller.",
    handle: "@DBOETrader",
    profitTag: "ETH plan validated",
    asset: "ETH/USD",
    direction: "BUY",
    strategy: "Swing Trading",
    status: "Debate passed",
    confidence: 89,
    entry: "3,915.50",
    stopLoss: "3,872.00",
    tp1: "3,958.00",
    tp2: "4,006.00",
    tp3: "4,075.00",
    risk: "1.1%",
    rr: "1:2.7",
    holdTime: "1-2 days",
  },
  {
    quote:
      "SOL was choppy, but the analysis gave a no-trade warning first. Next setup was much cleaner and hit TP1 quickly.",
    handle: "@moneymaykah",
    profitTag: "SOL no-chase filter",
    asset: "SOL/USD",
    direction: "BUY",
    strategy: "Trend Following",
    status: "Clean follow-up",
    confidence: 82,
    entry: "168.40",
    stopLoss: "165.90",
    tp1: "171.20",
    tp2: "174.60",
    tp3: "178.30",
    risk: "1.0%",
    rr: "1:2.6",
    holdTime: "6-18 hrs",
  },
  {
    quote:
      "GBP/USD had a tight London-session setup. The stop was close enough to keep risk controlled and the target path was realistic.",
    handle: "@NewTrader2024",
    profitTag: "GBP/USD TP2 reached",
    asset: "GBP/USD",
    direction: "SELL",
    strategy: "Day Trading",
    status: "London session",
    confidence: 87,
    entry: "1.27640",
    stopLoss: "1.27810",
    tp1: "1.27490",
    tp2: "1.27320",
    tp3: "1.27110",
    risk: "1.3%",
    rr: "1:3.1",
    holdTime: "2-5 hrs",
  },
  {
    quote:
      "Oil had news risk, so the agents reduced confidence and widened the invalidation. That context made the trade easier to manage.",
    handle: "@CommodityWins",
    profitTag: "WTI risk adjusted",
    asset: "WTI/USD",
    direction: "SELL",
    strategy: "News + Momentum",
    status: "Risk adjusted",
    confidence: 80,
    entry: "77.42",
    stopLoss: "78.05",
    tp1: "76.88",
    tp2: "76.20",
    tp3: "75.40",
    risk: "0.9%",
    rr: "1:3.2",
    holdTime: "3-10 hrs",
  },
];
