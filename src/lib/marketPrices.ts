export type MarketQuote = {
  pair: string;
  price: number;
  change: number;
  timestamp: number;
};

type TwelveQuote = {
  symbol?: string;
  close?: string;
  price?: string;
  percent_change?: string;
  change?: string;
  datetime?: string;
  message?: string;
  code?: number;
};

const TWELVE_DATA_URL = "https://api.twelvedata.com/quote";

const SYMBOLS: Record<string, string> = {
  "XAU/USD": "XAU/USD",
  "BTC/USD": "BTC/USD",
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "USD/JPY": "USD/JPY",
  US30: "DJI",
};

function normalizeQuote(pair: string, quote: TwelveQuote): MarketQuote | null {
  const rawPrice = quote.close || quote.price;
  const price = rawPrice ? Number(rawPrice) : NaN;
  if (!Number.isFinite(price) || price <= 0) return null;

  const percentChange = quote.percent_change ? Number(quote.percent_change) : NaN;
  const directChange = quote.change ? Number(quote.change) : NaN;
  const change = Number.isFinite(percentChange)
    ? percentChange
    : Number.isFinite(directChange)
      ? directChange
      : 0;

  return {
    pair,
    price,
    change,
    timestamp: Date.now(),
  };
}

export async function fetchMarketQuotes(pairs = Object.keys(SYMBOLS)): Promise<Record<string, MarketQuote>> {
  const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) return {};

  const requestedPairs = pairs.filter((pair) => SYMBOLS[pair]);
  if (requestedPairs.length === 0) return {};

  const symbols = requestedPairs.map((pair) => SYMBOLS[pair]).join(",");
  const url = new URL(TWELVE_DATA_URL);
  url.searchParams.set("symbol", symbols);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Market API failed: ${response.status}`);

  const data = await response.json();
  const results: Record<string, MarketQuote> = {};

  requestedPairs.forEach((pair) => {
    const symbol = SYMBOLS[pair];
    const quote = requestedPairs.length === 1 ? data : data[symbol];
    if (!quote || quote.message || quote.code) return;
    const normalized = normalizeQuote(pair, quote);
    if (normalized) results[pair] = normalized;
  });

  return results;
}

