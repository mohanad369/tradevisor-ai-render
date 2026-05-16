export type MarketQuote = {
  pair: string;
  price: number;
  change: number;
  changeAmount: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  isMarketOpen: boolean;
  timestamp: number;
};

type TwelveQuote = {
  symbol?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  price?: string;
  previous_close?: string;
  percent_change?: string;
  change?: string;
  is_market_open?: boolean;
  datetime?: string;
  last_quote_at?: number;
  message?: string;
  code?: number;
};

const TWELVE_DATA_URL = "https://api.twelvedata.com/quote";
const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "");

export const MARKET_SYMBOLS: Record<string, string> = {
  "XAU/USD": "XAU/USD",
  "BTC/USD": "BTC/USD",
  "ETH/USD": "ETH/USD",
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "USD/JPY": "USD/JPY",
  "GBP/JPY": "GBP/JPY",
  "SPY": "SPY",
  "NDX": "NDX",
};

function toNumber(value: string | undefined, fallback = 0) {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuote(pair: string, quote: TwelveQuote): MarketQuote | null {
  const rawPrice = quote.close || quote.price;
  const price = rawPrice ? Number(rawPrice) : NaN;
  if (!Number.isFinite(price) || price <= 0) return null;

  const percentChange = toNumber(quote.percent_change);
  const changeAmount = toNumber(quote.change);
  const open = toNumber(quote.open, price);
  const high = toNumber(quote.high, price);
  const low = toNumber(quote.low, price);
  const previousClose = toNumber(quote.previous_close, price);

  return {
    pair,
    price,
    change: percentChange,
    changeAmount,
    open,
    high,
    low,
    previousClose,
    isMarketOpen: quote.is_market_open ?? true,
    timestamp: quote.last_quote_at ? quote.last_quote_at * 1000 : Date.now(),
  };
}

export async function fetchMarketQuotes(pairs = Object.keys(MARKET_SYMBOLS)): Promise<Record<string, MarketQuote>> {
  const serverQuotes = await fetchMarketQuotesFromServer(pairs);
  if (Object.keys(serverQuotes).length > 0) return serverQuotes;

  const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) return {};

  const requestedPairs = pairs.filter((pair) => MARKET_SYMBOLS[pair]);
  if (requestedPairs.length === 0) return {};

  const symbols = requestedPairs.map((pair) => MARKET_SYMBOLS[pair]).join(",");
  const url = new URL(TWELVE_DATA_URL);
  url.searchParams.set("symbol", symbols);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("_", String(Date.now()));

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Market API failed: ${response.status}`);

  const data = await response.json();
  const results: Record<string, MarketQuote> = {};

  requestedPairs.forEach((pair) => {
    const symbol = MARKET_SYMBOLS[pair];
    const quote = requestedPairs.length === 1 ? data : data[symbol];
    if (!quote || quote.message || quote.code) return;
    const normalized = normalizeQuote(pair, quote);
    if (normalized) results[pair] = normalized;
  });

  return results;
}

export async function fetchMarketQuote(pair: string): Promise<MarketQuote | null> {
  const quotes = await fetchMarketQuotes([pair]);
  return quotes[pair] ?? null;
}

async function fetchMarketQuotesFromServer(pairs: string[]): Promise<Record<string, MarketQuote>> {
  try {
    const url = new URL(`${configuredApiOrigin || window.location.origin}/api/market/quotes`);
    url.searchParams.set("pairs", pairs.join(","));
    const response = await fetch(url);
    if (!response.ok) return {};
    const data = await response.json() as { quotes?: Record<string, MarketQuote> };
    return data.quotes ?? {};
  } catch {
    return {};
  }
}
