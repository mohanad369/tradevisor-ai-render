// VIP2 Gold Chart AI - Frontend API Client
// Fetches gold prices through backend-safe sources only.

import { getCachedPrice } from "../../../lib/goldapi";

export interface GoldPrice {
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
  currency: string;
}

export async function getGoldPrice(): Promise<GoldPrice> {
  try {
    const res = await fetch("/api/vip2/gold/price");
    if (res.ok) return res.json();
  } catch {
    // Use shared safe fallback below.
  }

  const data = await getCachedPrice("XAU", 5000);
  return {
    price: data.price,
    bid: data.bid,
    ask: data.ask,
    timestamp: data.timestamp,
    currency: "USD",
  };
}

export async function isGoldPriceAvailable(): Promise<boolean> {
  try {
    const price = await getGoldPrice();
    return price.price > 0;
  } catch {
    return false;
  }
}
