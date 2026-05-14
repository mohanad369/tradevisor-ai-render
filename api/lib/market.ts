const TWELVE_DATA_URL = "https://api.twelvedata.com/quote";

const MARKET_SYMBOLS: Record<string, string> = {
  "XAU/USD": "XAU/USD",
  "BTC/USD": "BTC/USD",
  "ETH/USD": "ETH/USD",
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "USD/JPY": "USD/JPY",
};

type TwelveQuote = {
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  price?: string;
  previous_close?: string;
  percent_change?: string;
  change?: string;
  is_market_open?: boolean;
  last_quote_at?: number;
  message?: string;
  code?: number;
};

function toNumber(value: string | undefined, fallback = 0) {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuote(pair: string, quote: TwelveQuote) {
  const price = toNumber(quote.close || quote.price, NaN);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    pair,
    price,
    change: toNumber(quote.percent_change),
    changeAmount: toNumber(quote.change),
    open: toNumber(quote.open, price),
    high: toNumber(quote.high, price),
    low: toNumber(quote.low, price),
    previousClose: toNumber(quote.previous_close, price),
    isMarketOpen: quote.is_market_open ?? true,
    timestamp: quote.last_quote_at ? quote.last_quote_at * 1000 : Date.now(),
  };
}

export async function fetchServerMarketQuotes(pairs = Object.keys(MARKET_SYMBOLS)) {
  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY is not configured");

  const requestedPairs = pairs.filter((pair) => MARKET_SYMBOLS[pair]);
  if (requestedPairs.length === 0) return {};

  const url = new URL(TWELVE_DATA_URL);
  url.searchParams.set("symbol", requestedPairs.map((pair) => MARKET_SYMBOLS[pair]).join(","));
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("_", String(Date.now()));

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Market API failed: ${response.status}`);

  const data = await response.json() as Record<string, TwelveQuote> & TwelveQuote;
  const results: Record<string, ReturnType<typeof normalizeQuote>> = {};

  requestedPairs.forEach((pair) => {
    const symbol = MARKET_SYMBOLS[pair];
    const quote = requestedPairs.length === 1 ? data : data[symbol];
    if (!quote || quote.message || quote.code) return;
    const normalized = normalizeQuote(pair, quote);
    if (normalized) results[pair] = normalized;
  });

  return results;
}
