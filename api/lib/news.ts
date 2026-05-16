type NewsSentiment = "positive" | "negative" | "neutral";
type NewsRiskLevel = "low" | "medium" | "high";

export interface MarketNewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: NewsSentiment;
  riskLevel: NewsRiskLevel;
  matchedKeywords: string[];
}

export interface MarketNewsContext {
  assetName: string;
  generatedAt: string;
  source: string;
  status: "live" | "fallback";
  marketMood: NewsSentiment;
  riskLevel: NewsRiskLevel;
  headlines: MarketNewsItem[];
  officialSources: string[];
}

type GdeltArticle = {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
  sourcecountry?: string;
  language?: string;
};

const GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const NEWS_CACHE_MS = 2 * 60 * 1000;
const newsCache = new Map<string, { value: MarketNewsContext; fetchedAt: number }>();

export async function fetchMarketNewsContext(assetName: string): Promise<MarketNewsContext> {
  const normalizedAsset = normalizeAssetName(assetName);
  const cached = newsCache.get(normalizedAsset);
  if (cached && Date.now() - cached.fetchedAt < NEWS_CACHE_MS) {
    return cached.value;
  }

  try {
    const query = buildNewsQuery(normalizedAsset);
    const url = new URL(GDELT_DOC_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("mode", "ArtList");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxrecords", "12");
    url.searchParams.set("sort", "HybridRel");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      headers: { "user-agent": "TradevisorAI/1.0 market-news-agent" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) throw new Error(`GDELT ${response.status}`);
    const data = await response.json() as { articles?: GdeltArticle[] };
    const headlines = (data.articles || [])
      .filter((article) => article.title && article.url)
      .slice(0, 8)
      .map((article) => classifyArticle(article, normalizedAsset));

    const context = buildContext(normalizedAsset, headlines, "live");
    newsCache.set(normalizedAsset, { value: context, fetchedAt: Date.now() });
    return context;
  } catch (error) {
    console.warn("[NewsAgent] live news fetch failed", error instanceof Error ? error.message : String(error));
    const context = buildContext(normalizedAsset, buildFallbackHeadlines(normalizedAsset), "fallback");
    newsCache.set(normalizedAsset, { value: context, fetchedAt: Date.now() });
    return context;
  }
}

function normalizeAssetName(assetName: string) {
  return assetName || "XAU/USD";
}

function buildNewsQuery(assetName: string) {
  if (assetName.toUpperCase().includes("XAU") || assetName.toLowerCase().includes("gold")) {
    return `("gold" OR XAUUSD OR "XAU/USD") ("Federal Reserve" OR inflation OR yields OR dollar OR "central bank" OR "US Treasury")`;
  }
  if (assetName.toUpperCase().includes("BTC")) {
    return `("bitcoin" OR BTC) ("ETF" OR regulation OR liquidity OR dollar OR "Federal Reserve")`;
  }
  if (assetName.toUpperCase().includes("ETH")) {
    return `("ethereum" OR ETH) ("ETF" OR regulation OR liquidity OR dollar OR "Federal Reserve")`;
  }
  return `("${assetName}" OR forex OR currency) ("central bank" OR inflation OR rates OR dollar OR yields)`;
}

function classifyArticle(article: GdeltArticle, assetName: string): MarketNewsItem {
  const title = cleanText(article.title || "Market update");
  const text = title.toLowerCase();
  const positiveWords = ["dovish", "cut", "support", "rally", "rise", "gains", "safe haven", "weak dollar", "inflation fears"];
  const negativeWords = ["hawkish", "hike", "strong dollar", "yields rise", "selloff", "falls", "drops", "pressure", "risk-on"];
  const highRiskWords = ["fed", "federal reserve", "cpi", "inflation", "jobs", "payrolls", "war", "geopolitical", "rate decision"];
  const matchedKeywords = [
    assetName,
    ...positiveWords.filter((word) => text.includes(word)),
    ...negativeWords.filter((word) => text.includes(word)),
    ...highRiskWords.filter((word) => text.includes(word)),
  ].slice(0, 8);
  const positiveScore = positiveWords.filter((word) => text.includes(word)).length;
  const negativeScore = negativeWords.filter((word) => text.includes(word)).length;
  const sentiment: NewsSentiment = positiveScore > negativeScore ? "positive" : negativeScore > positiveScore ? "negative" : "neutral";
  const riskLevel: NewsRiskLevel = highRiskWords.some((word) => text.includes(word)) ? "high" : matchedKeywords.length > 2 ? "medium" : "low";

  return {
    title,
    source: article.domain || "gdelt-news",
    url: article.url || "",
    publishedAt: normalizeGdeltDate(article.seendate),
    sentiment,
    riskLevel,
    matchedKeywords,
  };
}

function buildContext(assetName: string, headlines: MarketNewsItem[], status: "live" | "fallback"): MarketNewsContext {
  const positive = headlines.filter((item) => item.sentiment === "positive").length;
  const negative = headlines.filter((item) => item.sentiment === "negative").length;
  const highRisk = headlines.filter((item) => item.riskLevel === "high").length;
  const mediumRisk = headlines.filter((item) => item.riskLevel === "medium").length;
  const marketMood: NewsSentiment = positive > negative ? "positive" : negative > positive ? "negative" : "neutral";
  const riskLevel: NewsRiskLevel = highRisk ? "high" : mediumRisk >= 2 ? "medium" : "low";
  const officialSources = headlines
    .map((item) => item.source)
    .filter((source) => /federalreserve|ecb\.europa|bankofengland|boj\.or|treasury\.gov/i.test(source))
    .slice(0, 4);

  return {
    assetName,
    generatedAt: new Date().toISOString(),
    source: "gdelt-doc-api",
    status,
    marketMood,
    riskLevel,
    headlines,
    officialSources,
  };
}

function buildFallbackHeadlines(assetName: string): MarketNewsItem[] {
  return [
    {
      title: `${assetName} news feed temporarily unavailable; using conservative internal risk mode`,
      source: "tradevisor-news-fallback",
      url: "internal://news-fallback",
      publishedAt: new Date().toISOString(),
      sentiment: "neutral",
      riskLevel: "medium",
      matchedKeywords: [assetName, "fallback", "risk"],
    },
  ];
}

function normalizeGdeltDate(value: string | undefined) {
  if (!value) return new Date().toISOString();
  const compact = value.replace(/\D/g, "");
  if (compact.length >= 14) {
    const iso = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:${compact.slice(12, 14)}Z`;
    return Number.isNaN(Date.parse(iso)) ? new Date().toISOString() : iso;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}
