import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { fetchServerMarketQuotes } from "./market";

export type LiveGoldQuote = {
  pair: "XAU/USD";
  price: number;
  bid: number;
  ask: number;
  change: number;
  changeAmount: number;
  high: number;
  low: number;
  timestamp: number;
  source: "massive-ws" | "rest";
};

const emitter = new EventEmitter();
let latestQuote: LiveGoldQuote | null = null;
let ws: WebSocket | null = null;
let started = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let restTimer: ReturnType<typeof setInterval> | null = null;
let reconnectAttempt = 0;

const MASSIVE_WS_URLS = Array.from(new Set([
  process.env.MASSIVE_WS_URL,
  "wss://socket.massive.com/forex",
  "wss://socket.polygon.io/forex",
].filter(Boolean) as string[]));

export function startLiveGoldFeed() {
  if (started) return;
  started = true;
  connectMassiveWs();
  startRestFallback();
}

export function getLatestGoldQuote() {
  return latestQuote;
}

export function onGoldQuote(listener: (quote: LiveGoldQuote) => void) {
  emitter.on("quote", listener);
  return () => emitter.off("quote", listener);
}

async function connectMassiveWs(urlIndex = 0) {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey || urlIndex >= MASSIVE_WS_URLS.length) return;

  const wsUrl = MASSIVE_WS_URLS[urlIndex];
  ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    reconnectAttempt = 0;
    ws?.send(JSON.stringify({ action: "auth", params: apiKey }));
  });

  ws.on("message", (raw) => {
    let payload: unknown;
    try {
      payload = JSON.parse(String(raw));
    } catch {
      return;
    }

    const messages = Array.isArray(payload) ? payload : [payload];
    for (const message of messages as any[]) {
      const status = String(message.status || "").toLowerCase();
      const text = String(message.message || "").toLowerCase();
      if (status === "auth_success" || text.includes("authenticated")) {
        subscribeGold();
        continue;
      }

      const quote = parseMassiveQuote(message);
      if (quote) publishQuote(quote);
    }
  });

  ws.on("error", () => {
    // The close handler schedules reconnects. Keeping this quiet avoids noisy logs.
  });

  ws.on("close", () => {
    ws = null;
    const nextUrlIndex = urlIndex + 1 < MASSIVE_WS_URLS.length ? urlIndex + 1 : 0;
    scheduleReconnect(nextUrlIndex);
  });
}

function subscribeGold() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ action: "subscribe", params: "C.XAU/USD,C.XAU-USD" }));
}

function scheduleReconnect(urlIndex: number) {
  if (reconnectTimer) return;
  const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectMassiveWs(urlIndex);
  }, delay);
}

function parseMassiveQuote(message: any): LiveGoldQuote | null {
  const event = String(message.ev || message.event || "");
  const pair = String(message.p || message.pair || message.sym || message.symbol || "");
  if (event && event !== "C") return null;
  if (pair && !/XAU[/-]?USD/i.test(pair)) return null;

  const bid = Number(message.b ?? message.bid ?? message.bp);
  const ask = Number(message.a ?? message.ask ?? message.ap);
  const price = Number.isFinite(bid) && Number.isFinite(ask)
    ? (bid + ask) / 2
    : Number.isFinite(ask)
      ? ask
      : bid;
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    pair: "XAU/USD",
    price,
    bid: Number.isFinite(bid) ? bid : price,
    ask: Number.isFinite(ask) ? ask : price,
    change: latestQuote?.change ?? 0,
    changeAmount: latestQuote?.changeAmount ?? 0,
    high: latestQuote?.high ?? price,
    low: latestQuote?.low ?? price,
    timestamp: normalizeTimestamp(Number(message.t || message.timestamp || Date.now())),
    source: "massive-ws",
  };
}

function startRestFallback() {
  if (restTimer) return;
  const refresh = async () => {
    if (latestQuote && Date.now() - latestQuote.timestamp < 2_500 && latestQuote.source === "massive-ws") return;

    try {
      const quotes = await fetchServerMarketQuotes(["XAU/USD"]);
      const quote = quotes["XAU/USD"];
      if (!quote) return;

      publishQuote({
        pair: "XAU/USD",
        price: quote.price,
        bid: quote.price - 0.2,
        ask: quote.price + 0.2,
        change: quote.change,
        changeAmount: quote.changeAmount,
        high: quote.high,
        low: quote.low,
        timestamp: quote.timestamp,
        source: "rest",
      });
    } catch (error) {
      console.warn("[Market] Live gold REST fallback failed", error instanceof Error ? error.message : String(error));
    }
  };

  void refresh();
  restTimer = setInterval(refresh, 1_000);
}

function publishQuote(quote: LiveGoldQuote) {
  const adjustedQuote = applyGoldOffset(quote);
  latestQuote = adjustedQuote;
  emitter.emit("quote", adjustedQuote);
}

function normalizeTimestamp(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return Date.now();
  if (timestamp > 1_000_000_000_000_000) return Math.round(timestamp / 1_000_000);
  if (timestamp > 1_000_000_000_000) return timestamp;
  return timestamp * 1000;
}

function applyGoldOffset(quote: LiveGoldQuote): LiveGoldQuote {
  const offset = Number(process.env.GOLD_PRICE_OFFSET || 0);
  if (!Number.isFinite(offset) || offset === 0) return quote;

  return {
    ...quote,
    price: quote.price + offset,
    bid: quote.bid + offset,
    ask: quote.ask + offset,
    high: quote.high + offset,
    low: quote.low + offset,
  };
}
