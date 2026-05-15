const TWELVE_DATA_URL = "https://api.twelvedata.com/quote";
const MASSIVE_API_BASE = (process.env.MASSIVE_API_BASE || "https://api.polygon.io").replace(/\/$/, "");

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

type MassiveLastQuote = {
  status?: string;
  symbol?: string;
  last?: {
    ask?: number;
    bid?: number;
    exchange?: number;
    timestamp?: number;
  };
  error?: string;
  message?: string;
};

type MassiveLastTrade = {
  status?: string;
  symbol?: string;
  last?: {
    price?: number;
    size?: number;
    exchange?: number;
    conditions?: number[];
    timestamp?: number;
  };
  error?: string;
  message?: string;
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
  const requestedPairs = pairs.filter((pair) => MARKET_SYMBOLS[pair]);
  if (requestedPairs.length === 0) return {};

  const massiveQuotes = await fetchMassiveQuotes(requestedPairs);
  const missingPairs = requestedPairs.filter((pair) => !massiveQuotes[pair]);
  if (missingPairs.length === 0) return massiveQuotes;

  const twelveQuotes = await fetchTwelveDataQuotes(missingPairs);
  return { ...massiveQuotes, ...twelveQuotes };
}

async function fetchTwelveDataQuotes(requestedPairs: string[]) {
  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) {
    if (requestedPairs.length > 0) console.warn("[Market] TWELVE_DATA_API_KEY is not configured");
    return {};
  }

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

async function fetchMassiveQuotes(requestedPairs: string[]) {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) return {};

  const entries = await Promise.all(requestedPairs.map(async (pair) => {
    try {
      if (pair === "BTC/USD" || pair === "ETH/USD") {
        return [pair, await fetchMassiveCryptoQuote(pair, apiKey)] as const;
      }
      return [pair, await fetchMassiveForexQuote(pair, apiKey)] as const;
    } catch (error) {
      console.warn("[Market] Massive quote failed", {
        pair,
        error: error instanceof Error ? error.message : String(error),
      });
      return [pair, null] as const;
    }
  }));

  const results: Record<string, ReturnType<typeof normalizeQuote>> = {};
  entries.forEach(([pair, quote]) => {
    if (quote) results[pair] = quote;
  });
  return results;
}

async function fetchMassiveForexQuote(pair: string, apiKey: string) {
  const [from, to] = pair.split("/");
  const url = new URL(`${MASSIVE_API_BASE}/v1/last_quote/currencies/${from}/${to}`);
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Massive forex API failed: ${response.status}`);

  const data = await response.json() as MassiveLastQuote;
  const bid = Number(data.last?.bid);
  const ask = Number(data.last?.ask);
  const price = Number.isFinite(bid) && Number.isFinite(ask)
    ? (bid + ask) / 2
    : Number.isFinite(ask)
      ? ask
      : bid;
  if (!Number.isFinite(price) || price <= 0) return null;

  return buildMarketQuote(pair, price, data.last?.timestamp);
}

async function fetchMassiveCryptoQuote(pair: string, apiKey: string) {
  const [from, to] = pair.split("/");
  const url = new URL(`${MASSIVE_API_BASE}/v1/last/crypto/${from}/${to}`);
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Massive crypto API failed: ${response.status}`);

  const data = await response.json() as MassiveLastTrade;
  const price = Number(data.last?.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  return buildMarketQuote(pair, price, data.last?.timestamp);
}

function buildMarketQuote(pair: string, price: number, timestamp?: number) {
  return {
    pair,
    price,
    change: 0,
    changeAmount: 0,
    open: price,
    high: price,
    low: price,
    previousClose: price,
    isMarketOpen: true,
    timestamp: normalizeMassiveTimestamp(timestamp),
  };
}

function normalizeMassiveTimestamp(timestamp?: number) {
  if (!timestamp) return Date.now();
  if (timestamp > 1_000_000_000_000_000) return Math.round(timestamp / 1_000_000);
  if (timestamp > 1_000_000_000_000) return timestamp;
  return timestamp * 1000;
}
