import type { Asset } from "@/data/strategies";

export function getAssetMarketPair(asset: Asset | string): string {
  const id = typeof asset === "string" ? asset.toLowerCase() : asset.id;
  const name = typeof asset === "string" ? asset : asset.name;

  if (id === "xauusd" || name.includes("XAU/USD")) return "XAU/USD";
  if (id === "btcusd" || name.includes("BTC/USD")) return "BTC/USD";
  if (id === "ethusd" || name.includes("ETH/USD")) return "ETH/USD";
  if (id === "eurusd" || name.includes("EUR/USD")) return "EUR/USD";
  if (id === "gbpusd" || name.includes("GBP/USD")) return "GBP/USD";
  if (id === "usdjpy" || name.includes("USD/JPY")) return "USD/JPY";
  if (id === "gbpjpy" || name.includes("GBP/JPY")) return "GBP/JPY";
  if (id === "spy" || name === "SPY") return "SPY";
  if (id === "ndx" || name.includes("NDX")) return "NDX";
  return name.replace(" (Gold)", "");
}

export function formatAssetPrice(price: number, asset: Asset) {
  if (asset.type === "forex") return price.toFixed(asset.id === "usdjpy" || asset.id === "gbpjpy" ? 3 : 5);
  if (asset.type === "crypto") return asset.id === "btcusd" ? price.toFixed(0) : price.toFixed(2);
  return price.toFixed(2);
}
