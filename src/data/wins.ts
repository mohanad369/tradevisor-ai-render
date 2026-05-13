export interface WinCardData {
  ticker: string;
  profit: string;
  signalType: string;
  entry: string;
  exit: string;
  totalProfit: string;
  handle: string;
}

export const winsData: WinCardData[] = [
  {
    ticker: "$PLTR",
    profit: "+$13,574.6",
    signalType: "Long Position",
    entry: "$49.85",
    exit: "$70.77",
    totalProfit: "+$4,111",
    handle: "@yvvz",
  },
  {
    ticker: "$ETH/USD",
    profit: "+$26,305.2",
    signalType: "Swing Trade",
    entry: "$2,552.47",
    exit: "$3,600.59",
    totalProfit: "+$7,967",
    handle: "@Testisatchel",
  },
  {
    ticker: "$TSLA",
    profit: "+$13,900",
    signalType: "Call Options",
    entry: "$274.35",
    exit: "$346.70",
    totalProfit: "+$4,210",
    handle: "@C00WPAW",
  },
  {
    ticker: "$HOOD",
    profit: "+$17,267",
    signalType: "Put Options",
    entry: "$48.53",
    exit: "$62.05",
    totalProfit: "+$7,746",
    handle: "@chop",
  },
  {
    ticker: "$NVDA",
    profit: "+$13,540",
    signalType: "Scalp Trade",
    entry: "$121.38",
    exit: "$135.00",
    totalProfit: "+$6,074",
    handle: "@cws",
  },
  {
    ticker: "$SPY",
    profit: "+$17,364",
    signalType: "Momentum Play",
    entry: "$512.22",
    exit: "$546.50",
    totalProfit: "+$7,790",
    handle: "@Astrwicks",
  },
];
