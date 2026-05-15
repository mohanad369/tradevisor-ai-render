const TWELVE_DATA_URL = "https://api.twelvedata.com/quote";
const OANDA_API_BASE = (process.env.OANDA_API_BASE || "https://api-fxpractice.oanda.com").replace(/\/$/, "");
const MASSIVE_API_BASES = Array.from(new Set([
  process.env.MASSIVE_API_BASE,
  "https://api.massive.com",
  "https://api.polygon.io",
].filter(Boolean).map((base) => base!.replace(/\/$/, ""))));

const MARKET_SYMBOLS: Record<string, string> = {
  "XAU/USD": "XAU/USD",
  "BTC/USD": "BTC/USD",
  "ETH/USD": "ETH/USD",
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "USD/JPY": "USD/JPY",
};

const MARKET_CACHE_TTL_MS = clampNumber(process.env.MARKET_CACHE_TTL_MS, 5_000, 1_000, 60_000);
const STALE_MARKET_CACHE_MS = clampNumber(process.env.STALE_MARKET_CACHE_MS, 120_000, 10_000, 600_000);

type MarketQuote = {
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

const marketCache = new Map<string, { quote: MarketQuote; fetchedAt: number }>();
let inFlightQuotes: Promise<Record<string, MarketQuote>> | null = null;

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

type OandaPricingResponse = {
  prices?: Array<{
    instrument?: string;
    time?: string;
    status?: string;
    bids?: Array<{ price?: string }>;
    asks?: Array<{ price?: string }>;
    closeoutBid?: string;
    closeoutAsk?: string;
  }>;
  errorMessage?: string;
};

function clampNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = value ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function toNumber(value: string | undefined, fallback = 0) {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuote(pair: string, quote: TwelveQuote): MarketQuote | null {
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

export async function fetchServerMarketQuotes(pairs = Object.keys(MARKET_SYMBOLS)): Promise<Record<string, MarketQuote>> {
  const requestedPairs = pairs.filter((pair) => MARKET_SYMBOLS[pair]);
  if (requestedPairs.length === 0) return {};

  const now = Date.now();
  const results: Record<string, MarketQuote> = {};
  const staleResults: Record<string, MarketQuote> = {};
  const missingPairs: string[] = [];

  for (const pair of requestedPairs) {
    const cached = marketCache.get(pair);
    if (!cached) {
      missingPairs.push(pair);
      continue;
    }

    const age = now - cached.fetchedAt;
    if (age <= MARKET_CACHE_TTL_MS) {
      results[pair] = cached.quote;
    } else {
      staleResults[pair] = cached.quote;
      missingPairs.push(pair);
    }
  }

  if (missingPairs.length === 0) return results;

  try {
    const freshQuotes = await fetchFreshMarketQuotes(missingPairs);
    const fetchedAt = Date.now();
    for (const [pair, quote] of Object.entries(freshQuotes)) {
      marketCache.set(pair, { quote, fetchedAt });
      results[pair] = quote;
    }
  } catch (error) {
    console.warn("[Market] fresh quote fetch failed, using stale cache when possible", error instanceof Error ? error.message : String(error));
  }

  for (const pair of missingPairs) {
    if (results[pair]) continue;
    const cached = marketCache.get(pair);
    if (cached && Date.now() - cached.fetchedAt <= STALE_MARKET_CACHE_MS) {
      results[pair] = cached.quote;
    } else if (staleResults[pair]) {
      results[pair] = staleResults[pair];
    }
  }

  return results;
}

async function fetchFreshMarketQuotes(requestedPairs: string[]): Promise<Record<string, MarketQuote>> {
  if (inFlightQuotes) {
    const quotes = await inFlightQuotes;
    return pickQuotes(quotes, requestedPairs);
  }

  inFlightQuotes = fetchFreshMarketQuotesUncached(requestedPairs);
  try {
    return await inFlightQuotes;
  } finally {
    inFlightQuotes = null;
  }
}

async function fetchFreshMarketQuotesUncached(requestedPairs: string[]): Promise<Record<string, MarketQuote>> {
  const oandaQuotes = await fetchOandaQuotes(requestedPairs);
  const massivePairs = requestedPairs.filter((pair) => !oandaQuotes[pair]);
  if (massivePairs.length === 0) return oandaQuotes;

  const massiveQuotes = await fetchMassiveQuotes(massivePairs);
  const missingPairs = massivePairs.filter((pair) => !massiveQuotes[pair]);
  if (missingPairs.length === 0) return { ...oandaQuotes, ...massiveQuotes };

  const twelveQuotes = await fetchTwelveDataQuotes(missingPairs);
  const stillMissingPairs = missingPairs.filter((pair) => !twelveQuotes[pair]);
  const publicQuotes = await fetchPublicFallbackQuotes(stillMissingPairs);
  return { ...oandaQuotes, ...massiveQuotes, ...twelveQuotes, ...publicQuotes };
}

function pickQuotes(quotes: Record<string, MarketQuote>, pairs: string[]): Record<string, MarketQuote> {
  const results: Record<string, MarketQuote> = {};
  for (const pair of pairs) {
    if (quotes[pair]) results[pair] = quotes[pair];
  }
  return results;
}

async function fetchOandaQuotes(requestedPairs: string[]): Promise<Record<string, MarketQuote>> {
  const token = process.env.OANDA_API_KEY;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  if (!token || !accountId) return {};

  const instruments = requestedPairs
    .map((pair) => pair === "XAU/USD" ? "XAU_USD" : pair.replace("/", "_"))
    .join(",");

  const url = new URL(`${OANDA_API_BASE}/v3/accounts/${accountId}/pricing`);
  url.searchParams.set("instruments", instruments);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    console.warn("[Market] OANDA pricing failed", response.status);
    return {};
  }

  const data = await response.json() as OandaPricingResponse;
  const results: Record<string, MarketQuote> = {};

  for (const price of data.prices || []) {
    const instrument = price.instrument || "";
    const pair = instrument.replace("_", "/");
    if (!requestedPairs.includes(pair)) continue;

    const bid = Number(price.bids?.[0]?.price || price.closeoutBid);
    const ask = Number(price.asks?.[0]?.price || price.closeoutAsk);
    const mid = Number.isFinite(bid) && Number.isFinite(ask)
      ? (bid + ask) / 2
      : Number.isFinite(ask)
        ? ask
        : bid;
    if (!Number.isFinite(mid) || mid <= 0) continue;

    results[pair] = applyGoldOffset({
      pair,
      price: mid,
      change: 0,
      changeAmount: 0,
      open: mid,
      high: mid,
      low: mid,
      previousClose: mid,
      isMarketOpen: price.status !== "non-tradeable",
      timestamp: price.time ? Date.parse(price.time) : Date.now(),
    });
  }

  return results;
}

async function fetchTwelveDataQuotes(requestedPairs: string[]): Promise<Record<string, MarketQuote>> {
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
  const results: Record<string, MarketQuote> = {};

  requestedPairs.forEach((pair) => {
    const symbol = MARKET_SYMBOLS[pair];
    const quote = requestedPairs.length === 1 ? data : data[symbol];
    if (!quote || quote.message || quote.code) return;
    const normalized = normalizeQuote(pair, quote);
    if (normalized) results[pair] = applyGoldOffset(normalized);
  });

  return results;
}

async function fetchMassiveQuotes(requestedPairs: string[]): Promise<Record<string, MarketQuote>> {
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

  const results: Record<string, MarketQuote> = {};
  entries.forEach(([pair, quote]) => {
    if (quote) results[pair] = applyGoldOffset(quote);
  });
  return results;
}

async function fetchMassiveForexQuote(pair: string, apiKey: string) {
  const [from, to] = pair.split("/");
  let lastError: unknown;

  for (const apiBase of MASSIVE_API_BASES) {
    try {
      const url = new URL(`${apiBase}/v1/last_quote/currencies/${from}/${to}`);
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
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Massive forex API failed");
}

async function fetchMassiveCryptoQuote(pair: string, apiKey: string) {
  const [from, to] = pair.split("/");
  let lastError: unknown;

  for (const apiBase of MASSIVE_API_BASES) {
    try {
      const url = new URL(`${apiBase}/v1/last/crypto/${from}/${to}`);
      url.searchParams.set("apiKey", apiKey);

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Massive crypto API failed: ${response.status}`);

      const data = await response.json() as MassiveLastTrade;
      const price = Number(data.last?.price);
      if (!Number.isFinite(price) || price <= 0) return null;

      return buildMarketQuote(pair, price, data.last?.timestamp);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Massive crypto API failed");
}

function buildMarketQuote(pair: string, price: number, timestamp?: number): MarketQuote {
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

function applyGoldOffset<T extends { pair: string; price: number; open: number; high: number; low: number; previousClose: number }>(quote: T): T {
  if (quote.pair !== "XAU/USD") return quote;
  const offset = Number(process.env.GOLD_PRICE_OFFSET || 0);
  if (!Number.isFinite(offset) || offset === 0) return quote;

  return {
    ...quote,
    price: quote.price + offset,
    open: quote.open + offset,
    high: quote.high + offset,
    low: quote.low + offset,
    previousClose: quote.previousClose + offset,
  };
}

async function fetchPublicFallbackQuotes(requestedPairs: string[]): Promise<Record<string, MarketQuote>> {
  const results: Record<string, MarketQuote> = {};
  if (requestedPairs.includes("XAU/USD")) {
    const goldQuote = await fetchStooqGoldQuote().catch((error) => {
      console.warn("[Market] Stooq spot gold fallback failed", error instanceof Error ? error.message : String(error));
      return null;
    }) || await fetchYahooGoldQuote().catch((error) => {
      console.warn("[Market] Yahoo gold fallback failed", error instanceof Error ? error.message : String(error));
      return null;
    });
    if (goldQuote) results["XAU/USD"] = applyGoldOffset(goldQuote);
  }
  return results;
}

async function fetchStooqGoldQuote(): Promise<MarketQuote | null> {
  const response = await fetch("https://stooq.com/q/l/?s=xauusd&f=sd2t2ohlcv&h&e=csv", {
    headers: { "user-agent": "Mozilla/5.0 Tradevisor Market Data" },
  });
  if (!response.ok) throw new Error(`Stooq gold API failed: ${response.status}`);

  const csv = await response.text();
  const [, row] = csv.trim().split(/\r?\n/);
  if (!row) return null;

  const [symbol, date, time, openRaw, highRaw, lowRaw, closeRaw] = row.split(",");
  if (symbol !== "XAUUSD") return null;

  const price = Number(closeRaw);
  if (!Number.isFinite(price) || price <= 0) return null;

  const open = Number(openRaw);
  const high = Number(highRaw);
  const low = Number(lowRaw);
  const timestamp = Date.parse(`${date}T${time}Z`);
  const changeAmount = Number.isFinite(open) ? price - open : 0;
  const change = Number.isFinite(open) && open > 0 ? (changeAmount / open) * 100 : 0;

  return {
    pair: "XAU/USD",
    price,
    change,
    changeAmount,
    open: Number.isFinite(open) ? open : price,
    high: Number.isFinite(high) ? high : price,
    low: Number.isFinite(low) ? low : price,
    previousClose: Number.isFinite(open) ? open : price,
    isMarketOpen: true,
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
  };
}

async function fetchYahooGoldQuote(): Promise<MarketQuote | null> {
  const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d", {
    headers: { "user-agent": "Mozilla/5.0 Tradevisor Market Data" },
  });
  if (!response.ok) throw new Error(`Yahoo gold API failed: ${response.status}`);

  const data = await response.json() as any;
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  const price = Number(meta?.regularMarketPrice || meta?.previousClose || meta?.chartPreviousClose);
  if (!Number.isFinite(price) || price <= 0) return null;

  const previousClose = Number(meta?.previousClose || meta?.chartPreviousClose || price);
  const changeAmount = price - previousClose;
  const change = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0;

  return {
    pair: "XAU/USD",
    price,
    change,
    changeAmount,
    open: Number(meta?.regularMarketOpen || previousClose || price),
    high: Number(meta?.regularMarketDayHigh || price),
    low: Number(meta?.regularMarketDayLow || price),
    previousClose,
    isMarketOpen: true,
    timestamp: Number(meta?.regularMarketTime || 0) > 0 ? Number(meta.regularMarketTime) * 1000 : Date.now(),
  };
}
