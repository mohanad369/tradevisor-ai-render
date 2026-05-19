/*
 * api/lib/news.ts — Real-world News Agent via Claude + web_search tool
 *
 * Uses Anthropic's built-in web_search tool so Claude can fetch live news
 * for an asset (e.g. "XAU/USD", "BTC/USD", "EUR/USD") and return a
 * structured list of headlines + sentiment.
 *
 * Cache: in-memory, 5 min TTL per (symbol, lookbackHours) — search calls
 * are not free; this keeps cost reasonable.
 */

import { env } from "./env";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_NEWS_MODEL || "claude-sonnet-4-5";
const TIMEOUT_MS = 30_000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_SEARCH_USES = 3;

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  riskLevel: "low" | "medium" | "high";
  matchedKeywords: string[];
  summary?: string;
}

export interface NewsResult {
  symbol: string;
  fetchedAt: string;
  overallSentiment: "positive" | "negative" | "neutral";
  marketMood: string;
  items: NewsItem[];
  poweredBy: "claude-web-search" | "fallback";
}

const cache = new Map<string, { data: NewsResult; expiresAt: number }>();

function extractJson(text: string): any | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fall */ }
  }
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function fallback(symbol: string, reason: string): NewsResult {
  console.warn(`[news] fallback (${reason}) for ${symbol}`);
  return {
    symbol,
    fetchedAt: new Date().toISOString(),
    overallSentiment: "neutral",
    marketMood: "neutral",
    items: [],
    poweredBy: "fallback",
  };
}

/**
 * Fetch real news for an asset. Symbol can be "XAU/USD", "BTC", "EUR/USD",
 * "Gold", etc. — Claude will normalize during the search.
 */
export async function fetchAssetNews(
  symbol: string,
  lookbackHours = 24,
): Promise<NewsResult> {
  const key = `${symbol}::${lookbackHours}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  if (!env.ANTHROPIC_API_KEY) return fallback(symbol, "no API key");

  const system = `You are a financial news aggregator. Use the web_search tool to find the most relevant trading-impact news for the given asset published in the last ${lookbackHours} hours. Then return STRICT JSON only (no prose outside the JSON).

Sentiment rules:
- "positive" = bullish for the asset
- "negative" = bearish for the asset
- "neutral" = mixed or factual without directional bias

Risk rules:
- "high" = central bank decision, geopolitical shock, major regulatory news
- "medium" = data release (CPI, NFP), earnings, sector trend
- "low" = routine market commentary

Return between 3 and 6 items. Skip duplicates and low-quality sources.`;

  const userPrompt = `Find the latest market-moving news for ${symbol} from the last ${lookbackHours} hours.

Return EXACTLY this JSON shape:
{
  "symbol": "${symbol}",
  "overallSentiment": "positive" | "negative" | "neutral",
  "marketMood": "<one short sentence>",
  "items": [
    {
      "title": "<headline>",
      "source": "<publisher name>",
      "url": "<canonical URL>",
      "publishedAt": "<ISO 8601 datetime>",
      "sentiment": "positive" | "negative" | "neutral",
      "riskLevel": "low" | "medium" | "high",
      "matchedKeywords": ["<kw1>", "<kw2>"],
      "summary": "<1-2 sentence summary>"
    }
  ]
}`;

  const body = {
    model: MODEL,
    max_tokens: 4000,
    system,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: MAX_SEARCH_USES,
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[news] API error ${res.status}: ${t.slice(0, 300)}`);
      return fallback(symbol, `http ${res.status}`);
    }

    const data = (await res.json()) as any;

    // Claude returns an array of content blocks; the final assistant text
    // is the last block with type "text".
    const textBlocks: string[] = (data?.content || [])
      .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
      .map((b: any) => b.text);
    const fullText = textBlocks.join("\n");

    const parsed = extractJson(fullText);
    if (!parsed || !Array.isArray(parsed.items)) {
      console.error("[news] couldn't parse JSON. Raw:", fullText.slice(0, 500));
      return fallback(symbol, "parse error");
    }

    const result: NewsResult = {
      symbol,
      fetchedAt: new Date().toISOString(),
      overallSentiment: parsed.overallSentiment || "neutral",
      marketMood: parsed.marketMood || "neutral",
      items: parsed.items.slice(0, 6).map((it: any) => ({
        title: String(it.title || "").slice(0, 300),
        source: String(it.source || "unknown"),
        url: String(it.url || ""),
        publishedAt: String(it.publishedAt || new Date().toISOString()),
        sentiment: ["positive", "negative", "neutral"].includes(it.sentiment) ? it.sentiment : "neutral",
        riskLevel: ["low", "medium", "high"].includes(it.riskLevel) ? it.riskLevel : "medium",
        matchedKeywords: Array.isArray(it.matchedKeywords) ? it.matchedKeywords.slice(0, 6).map(String) : [],
        summary: it.summary ? String(it.summary).slice(0, 600) : undefined,
      })),
      poweredBy: "claude-web-search",
    };

    cache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err: any) {
    if (err?.name === "AbortError") return fallback(symbol, "timeout");
    console.error("[news] request failed:", err?.message || err);
    return fallback(symbol, "exception");
  } finally {
    clearTimeout(timeout);
  }
}
