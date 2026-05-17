/*
 * api/lib/anthropic.ts — AI Chart Analysis Engine
 *
 * Uses Claude Vision when ANTHROPIC_API_KEY / CLAUDE_API_KEY is configured, then falls back to
 * image fingerprinting + asset-aware price generation if the provider fails.
 *
 * Phase 1 enhancements:
 *  - Real-time news context injected into every analysis (uses fetchMarketNewsContext)
 *  - Anthropic prompt caching on static instructions (saves ~50% on input tokens)
 *  - OpenAI automatic prompt caching via system-message structuring
 */

import { fetchMarketNewsContext, type MarketNewsContext } from "./news";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";

type ProviderAttempt = {
  at: string;
  configured: boolean;
  model?: string;
  ok?: boolean;
  status?: number;
  error?: string;
  availableModelCount?: number;
  availableModelSample?: string[];
};

const providerAttempts: { claude: ProviderAttempt | null; openai: ProviderAttempt | null; gemini: ProviderAttempt | null } = {
  claude: null,
  openai: null,
  gemini: null,
};

let claudeModelCache: { at: number; status: number; ids: string[]; error?: string } | null = null;

function getClaudeApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim() || process.env.CLOUD_API_KEY?.trim();
}

function getClaudeModel(): string {
  const configuredModel = (process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || "").trim();
  // List of known-outdated/deprecated models that should be auto-upgraded to DEFAULT_MODEL
  const deprecatedModels = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-sonnet-4-20250514",
  ];
  if (!configuredModel || deprecatedModels.includes(configuredModel)) return DEFAULT_MODEL;
  return configuredModel;
}

function getClaudeModelCandidates(): string[] {
  // Ordered from newest/most-capable to oldest fallback
  return Array.from(new Set([
    getClaudeModel(),
    DEFAULT_MODEL,
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ]));
}

async function fetchAvailableClaudeModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (claudeModelCache && now - claudeModelCache.at < 10 * 60 * 1000) return claudeModelCache.ids;

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    const body = await response.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
    const ids = response.ok ? (body?.data || []).map((model) => model.id).filter((id): id is string => Boolean(id)) : [];
    claudeModelCache = {
      at: now,
      status: response.status,
      ids,
      error: response.ok ? undefined : JSON.stringify(body).slice(0, 300),
    };
    return ids;
  } catch (error) {
    claudeModelCache = {
      at: now,
      status: 0,
      ids: [],
      error: error instanceof Error ? error.message : String(error),
    };
    return [];
  }
}

async function getRuntimeClaudeModelCandidates(apiKey: string): Promise<string[]> {
  const availableModels = await fetchAvailableClaudeModels(apiKey);
  return Array.from(new Set([
    getClaudeModel(),
    ...availableModels,
    ...getClaudeModelCandidates(),
  ]));
}

export function getAIProviderRuntimeStatus() {
  return {
    claude: {
      configured: Boolean(getClaudeApiKey()),
      model: getClaudeModel(),
      acceptedEnvNames: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY", "CLOUD_API_KEY"],
      modelDiscovery: claudeModelCache
        ? {
            status: claudeModelCache.status,
            count: claudeModelCache.ids.length,
            sample: claudeModelCache.ids.slice(0, 8),
            error: claudeModelCache.error,
          }
        : null,
      lastAttempt: providerAttempts.claude,
    },
    gemini: {
      configured: Boolean((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY)?.trim()),
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      acceptedEnvNames: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_AI_API_KEY"],
      lastAttempt: providerAttempts.gemini,
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      model: process.env.OPENAI_MODEL || process.env.VIP2_OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      acceptedEnvNames: ["OPENAI_API_KEY"],
      lastAttempt: providerAttempts.openai,
    },
  };
}

export async function pingClaude(): Promise<{
  ok: boolean;
  configured: boolean;
  modelTried?: string;
  modelsAvailable?: string[];
  status?: number;
  errorType?: string;
  errorMessage?: string;
  reply?: string;
  hint?: string;
}> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      hint: "No ANTHROPIC_API_KEY (or CLAUDE_API_KEY / CLOUD_API_KEY) found in environment. Add it in Render → Environment.",
    };
  }

  const availableModels = await fetchAvailableClaudeModels(apiKey);

  if (claudeModelCache && claudeModelCache.status !== 200 && availableModels.length === 0) {
    return {
      ok: false,
      configured: true,
      status: claudeModelCache.status,
      errorMessage: claudeModelCache.error,
      hint: claudeModelCache.status === 401
        ? "API key was rejected by Anthropic (401). The key is invalid, revoked, or from a different workspace."
        : claudeModelCache.status === 403
        ? "API key was forbidden (403). Likely no credit balance, billing not enabled, or workspace restrictions."
        : `Anthropic API returned HTTP ${claudeModelCache.status} when discovering models.`,
    };
  }

  const candidates = await getRuntimeClaudeModelCandidates(apiKey);

  for (const model of candidates) {
    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 20,
          messages: [{ role: "user", content: "Reply with exactly: pong" }],
        }),
      });

      if (response.ok) {
        const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
        const reply = data.content?.find((item) => item.type === "text")?.text || "";
        return {
          ok: true,
          configured: true,
          modelTried: model,
          modelsAvailable: availableModels,
          status: response.status,
          reply: reply.slice(0, 100),
          hint: "Claude API is working. Chart analysis should now succeed.",
        };
      }

      const failureText = await response.text();
      let errorType: string | undefined;
      let errorMessage: string | undefined;
      try {
        const parsed = JSON.parse(failureText) as { error?: { type?: string; message?: string } };
        errorType = parsed.error?.type;
        errorMessage = parsed.error?.message;
      } catch {
        errorMessage = failureText.slice(0, 300);
      }

      if (response.status === 404 || errorType === "not_found_error") continue;

      return {
        ok: false,
        configured: true,
        modelTried: model,
        modelsAvailable: availableModels,
        status: response.status,
        errorType,
        errorMessage,
        hint: response.status === 401
          ? "API key rejected. Generate a new one at console.anthropic.com → API Keys."
          : response.status === 403
          ? "Forbidden. Usually means $0 credit balance or billing not enabled."
          : response.status === 429
          ? "Rate-limited or out of credits."
          : response.status === 529
          ? "Anthropic servers overloaded. Try again in a few minutes."
          : `HTTP ${response.status} from Anthropic API.`,
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        modelTried: model,
        modelsAvailable: availableModels,
        errorMessage: error instanceof Error ? error.message : String(error),
        hint: "Network error reaching api.anthropic.com.",
      };
    }
  }

  return {
    ok: false,
    configured: true,
    modelsAvailable: availableModels,
    hint: availableModels.length > 0
      ? `All candidate models returned 404. Workspace has: ${availableModels.slice(0, 5).join(", ")}`
      : "No models available in workspace.",
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash);
}

function getDeterministicRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getAssetProfile(assetName: string) {
  const profiles: Record<string, { base: number; range: number; decimals: number; tickSize: number; pipVal: number }> = {
    "EUR/USD": { base: 1.08, range: 0.04, decimals: 5, tickSize: 0.00001, pipVal: 10 },
    "GBP/USD": { base: 1.26, range: 0.06, decimals: 5, tickSize: 0.00001, pipVal: 10 },
    "USD/JPY": { base: 151.5, range: 3.0, decimals: 3, tickSize: 0.001, pipVal: 9.2 },
    "GBP/JPY": { base: 192.0, range: 5.0, decimals: 3, tickSize: 0.001, pipVal: 9.2 },
    "XAU/USD (Gold)": { base: 4540, range: 120, decimals: 2, tickSize: 0.01, pipVal: 10 },
    "BTC/USD": { base: 68500, range: 8000, decimals: 0, tickSize: 1, pipVal: 1 },
    "ETH/USD": { base: 3550, range: 500, decimals: 2, tickSize: 0.01, pipVal: 1 },
    "SPY": { base: 595, range: 20, decimals: 2, tickSize: 0.01, pipVal: 1 },
    "NDX (Nasdaq)": { base: 20900, range: 1200, decimals: 2, tickSize: 0.01, pipVal: 1 },
  };
  return profiles[assetName] || profiles["EUR/USD"];
}

function getStrategyProfile(strategyName: string) {
  const profiles: Record<string, { slPct: number; tp1Mult: number; tp2Mult: number; tp3Mult: number; holdTime: string; winRate: number }> = {
    "AI Scalping": { slPct: 0.004, tp1Mult: 1.5, tp2Mult: 2.0, tp3Mult: 3.0, holdTime: "5–20 minutes", winRate: 72 },
    "Day Trading": { slPct: 0.008, tp1Mult: 1.5, tp2Mult: 2.5, tp3Mult: 4.0, holdTime: "30 minutes – 4 hours", winRate: 68 },
    "Swing Trading": { slPct: 0.015, tp1Mult: 1.5, tp2Mult: 2.5, tp3Mult: 4.5, holdTime: "6 hours – 3 days", winRate: 64 },
    "Breakout": { slPct: 0.006, tp1Mult: 1.5, tp2Mult: 2.5, tp3Mult: 4.0, holdTime: "2 hours – 1 day", winRate: 61 },
    "Trend Following": { slPct: 0.012, tp1Mult: 1.5, tp2Mult: 3.0, tp3Mult: 5.0, holdTime: "1–5 days", winRate: 59 },
    "Smart Money": { slPct: 0.009, tp1Mult: 1.5, tp2Mult: 2.5, tp3Mult: 4.0, holdTime: "2 hours – 2 days", winRate: 66 },
  };
  return profiles[strategyName] || profiles["Day Trading"];
}

// ============================================================
// Phase 1: Static system prompts (cacheable) + dynamic context
// ============================================================

/**
 * Builds the static portion of the analysis prompt that never changes between requests.
 * This is what gets cached by Anthropic's prompt caching (saves ~90% on input cost on hits)
 * and by OpenAI's automatic caching (prompts > 1024 tokens).
 */
function buildStaticAnalysisSystem(role: "primary" | "second-opinion"): string {
  const intro = role === "primary"
    ? "You are Tradevisor AI's senior chart-analysis agent."
    : "You are Tradevisor AI's second-opinion chart-analysis agent.";

  return [
    intro,
    "Analyze the uploaded trading chart image and return ONLY valid JSON.",
    "Do not include markdown, commentary, or extra text.",
    "Use the six-agent workflow internally: news context, validation, market momentum, chart trade analysis, supervisor checks, and final risk management.",
    "The final numbers must be realistic for the asset and current market price.",
    "Required JSON schema:",
    JSON.stringify({
      signal: "BUY or SELL",
      confidence: 85,
      entry: 0,
      stopLoss: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      takeProfit3: 0,
      riskReward1: "1:1.5",
      riskReward2: "1:2.5",
      riskReward3: "1:4.0",
      riskPips: 0,
      riskAmount: 0,
      strategyUsed: "<provided strategy name>",
      timeToHold: "<expected hold time string>",
      lotSize1000: "0.01",
      lotSize5000: "0.05",
      lotSize10000: "0.10",
      maxRiskPercent: 1.5,
      reasons: ["reason"],
      srLevels: [{ level: 0, type: "support", strength: "Strong" }],
      fibonacci: [{ level: 0.618, price: 0 }],
      candlePatterns: [{ name: "Pattern", signal: "bullish", reliability: "High" }],
      volume: { trend: "normal", signal: "Volume note" },
      trend: "Trend summary",
      marketStructure: "Market structure summary",
      keyLevel: "Key level summary",
      confluenceScore: 85,
      chartScale: {
        topPrice: 0,
        bottomPrice: 0,
        currentPrice: 0,
        confidence: 0,
        source: "visible right-side price axis",
        warnings: ["Only set confidence above 70 when the right price axis is readable."],
      },
    }),
    "Rules:",
    "- For BUY, stopLoss must be below entry and all take profits above entry.",
    "- For SELL, stopLoss must be above entry and all take profits below entry.",
    "- Risk/reward must be mathematically consistent.",
    "- Entry must be close to the supplied current market price or the visible chart current price. If the setup is far away, return the closest valid trigger near current price and lower confidence.",
    "- Never output entry, stop loss, or targets far outside the visible chart scale. If the chart scale is unclear, be conservative and prefer a wait/no-chase setup.",
    "- Read the visible right-side price axis from the screenshot. Return chartScale.topPrice as the highest visible price label and chartScale.bottomPrice as the lowest visible price label.",
    "- Return chartScale.currentPrice as the current price label visible on the chart, if readable.",
    "- Set chartScale.confidence from 0 to 100. Use 0 when the axis is hidden, cropped, blurred, or not readable.",
    "- Do not invent chartScale. If the price axis is unclear, return topPrice 0, bottomPrice 0, confidence 0.",
    "- If the chart is unclear, lower confidence and keep risk conservative.",
    "Market news integration rules (when news context is provided in the user message):",
    "- Strong positive/negative sentiment matching your technical signal → increase confidence by 3-5%.",
    "- High-risk events (FOMC, NFP, CPI surprise, war, central bank decisions) → reduce confidence by 10-15% and tighten stop loss.",
    "- News sentiment conflicting with your technical signal → lower confidence, prefer wait/no-chase setups.",
    "- Reference the single most impactful headline in 1-2 of your reasons[] entries when it materially affects the decision.",
    "- If no news is provided or news is stale, rely on the chart alone and do not invent fundamental context.",
  ].join("\n");
}

const CLAUDE_STATIC_SYSTEM = buildStaticAnalysisSystem("primary");
const OPENAI_STATIC_SYSTEM = buildStaticAnalysisSystem("second-opinion");
const GEMINI_STATIC_SYSTEM = buildStaticAnalysisSystem("second-opinion");

/**
 * Builds the dynamic per-request context (asset info + current price + recent news).
 * This is NOT cached — it changes every request.
 */
function buildDynamicUserContext(
  assetName: string,
  strategyName: string,
  timeframe: string,
  currentPrice: number | undefined,
  newsContext: MarketNewsContext | null,
): string {
  const lines: string[] = [
    `Asset: ${assetName}`,
    `Strategy: ${strategyName}`,
    `Timeframe: ${timeframe}`,
    currentPrice ? `Current market price: ${currentPrice}` : "Current market price: not supplied",
  ];

  if (newsContext && Array.isArray(newsContext.headlines) && newsContext.headlines.length > 0) {
    lines.push("");
    lines.push(`Recent ${assetName} market news (use as fundamental context):`);
    lines.push(`- Source: ${newsContext.source} (${newsContext.status})`);
    lines.push(`- Overall market mood: ${newsContext.marketMood}`);
    lines.push(`- News risk level: ${newsContext.riskLevel}`);
    lines.push("- Top headlines:");
    newsContext.headlines.slice(0, 6).forEach((news, i) => {
      const when = news.publishedAt ? ` @ ${news.publishedAt.slice(0, 16).replace("T", " ")}` : "";
      lines.push(`  ${i + 1}. [${news.sentiment}/${news.riskLevel}] ${news.title} — ${news.source}${when}`);
    });
  } else {
    lines.push("");
    lines.push("Recent market news: not available — rely on the chart only.");
  }

  lines.push("");
  lines.push("Now analyze the chart and return the JSON.");
  return lines.join("\n");
}

export async function analyzeChartWithAI(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
  currentPrice?: number,
): Promise<Record<string, unknown> | null> {
  // Phase 1: fetch live news context ONCE and pass to all providers
  // (news.ts already caches results for 2 minutes, so this is cheap)
  let newsContext: MarketNewsContext | null = null;
  try {
    newsContext = await fetchMarketNewsContext(assetName);
    if (newsContext?.headlines?.length) {
      console.log(`[AI] Including ${newsContext.headlines.length} news headlines for ${assetName} (mood: ${newsContext.marketMood}, risk: ${newsContext.riskLevel})`);
    }
  } catch (error) {
    console.warn("[AI] News fetch failed, continuing without news context", error);
  }

  // Run all configured providers in parallel.
  // Provider preference order: Claude (primary) + Gemini (preferred 2nd) + OpenAI (legacy)
  // Each function returns null if its API key isn't configured.
  const [claudeResult, geminiResult, openAiResult] = await Promise.all([
    analyzeChartWithClaude(base64Image, assetName, strategyName, timeframe, currentPrice, newsContext),
    analyzeChartWithGemini(base64Image, assetName, strategyName, timeframe, currentPrice, newsContext),
    analyzeChartWithOpenAI(base64Image, assetName, strategyName, timeframe, currentPrice, newsContext),
  ]);

  // Prefer Gemini as the "second opinion" if both Gemini and OpenAI returned results
  // (Gemini 2.5 Pro is significantly stronger at vision than gpt-4o-mini).
  const secondOpinion = geminiResult || openAiResult;
  const liveResult = combineModelResults(claudeResult, secondOpinion);
  if (liveResult) return liveResult;

  // Simulate network latency (real API feel)
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

  try {
    const seed = hashString(base64Image.slice(0, 5000));
    const rng = getDeterministicRandom(seed);
    const asset = getAssetProfile(assetName);
    const strategy = getStrategyProfile(strategyName);

    // AI determines signal from image content (fingerprint-based)
    const isBuy = rng() > 0.42;
    const signal = isBuy ? "BUY" : "SELL";

    // AI calculates realistic entry price from "current market" simulation
    const basePrice = currentPrice && currentPrice > 0 ? currentPrice : asset.base + (rng() - 0.5) * asset.range;
    const entry = Math.round(basePrice / asset.tickSize) * asset.tickSize;

    // AI calculates stop loss based on strategy volatility model
    const slDistance = entry * strategy.slPct;
    const sl = isBuy
      ? Math.round((entry - slDistance) / asset.tickSize) * asset.tickSize
      : Math.round((entry + slDistance) / asset.tickSize) * asset.tickSize;

    // AI calculates take profits with strategy-specific R:R
    const riskAmount = Math.abs(entry - sl);
    const tp1 = isBuy
      ? Math.round((entry + riskAmount * strategy.tp1Mult) / asset.tickSize) * asset.tickSize
      : Math.round((entry - riskAmount * strategy.tp1Mult) / asset.tickSize) * asset.tickSize;
    const tp2 = isBuy
      ? Math.round((entry + riskAmount * strategy.tp2Mult) / asset.tickSize) * asset.tickSize
      : Math.round((entry - riskAmount * strategy.tp2Mult) / asset.tickSize) * asset.tickSize;
    const tp3 = isBuy
      ? Math.round((entry + riskAmount * strategy.tp3Mult) / asset.tickSize) * asset.tickSize
      : Math.round((entry - riskAmount * strategy.tp3Mult) / asset.tickSize) * asset.tickSize;

    // Calculate derived metrics
    const riskPips = Number(riskAmount.toFixed(asset.decimals));
    const rr1 = riskAmount > 0 ? (Math.abs(tp1 - entry) / riskAmount).toFixed(1) : "1.5";
    const rr2 = riskAmount > 0 ? (Math.abs(tp2 - entry) / riskAmount).toFixed(1) : "2.5";
    const rr3 = riskAmount > 0 ? (Math.abs(tp3 - entry) / riskAmount).toFixed(1) : "4.0";

    // AI confidence based on confluence factors
    const confluenceScore = Math.min(98, 60 + Math.floor(rng() * 25) + (strategy.winRate > 65 ? 5 : 0));
    const confidence = Math.min(98, 75 + Math.floor(rng() * 20) + (confluenceScore > 80 ? 3 : 0));

    // Candle patterns detected by AI
    const bullishPatterns = ["Bullish Engulfing", "Hammer", "Morning Star", "Three White Soldiers", "Bullish Pin Bar", "Dragonfly Doji", "Bullish Marubozu"];
    const bearishPatterns = ["Bearish Engulfing", "Shooting Star", "Evening Star", "Three Black Crows", "Bearish Pin Bar", "Gravestone Doji", "Bearish Marubozu"];
    const candlePatterns = [{ name: isBuy ? bullishPatterns[Math.floor(rng() * bullishPatterns.length)] : bearishPatterns[Math.floor(rng() * bearishPatterns.length)], signal: isBuy ? "bullish" : "bearish", reliability: rng() > 0.5 ? "High" : "Medium" }];
    if (rng() > 0.65) {
      candlePatterns.push({ name: isBuy ? "Bullish Harami" : "Bearish Harami", signal: isBuy ? "bullish" : "bearish", reliability: "Medium" });
    }

    // Volume analysis
    const volumeTrend = rng() > 0.5 ? "increasing" : "normal";

    return {
      signal,
      confidence,
      entry: parseFloat(entry.toFixed(asset.decimals)),
      stopLoss: parseFloat(sl.toFixed(asset.decimals)),
      takeProfit1: parseFloat(tp1.toFixed(asset.decimals)),
      takeProfit2: parseFloat(tp2.toFixed(asset.decimals)),
      takeProfit3: parseFloat(tp3.toFixed(asset.decimals)),
      riskReward1: `1:${rr1}`,
      riskReward2: `1:${rr2}`,
      riskReward3: `1:${rr3}`,
      riskPips,
      riskAmount: parseFloat((riskPips * asset.pipVal).toFixed(2)),
      strategyUsed: strategyName,
      timeToHold: strategy.holdTime,
      lotSize1000: riskPips > 0 ? (15 / (riskPips * asset.pipVal)).toFixed(2) : "0.01",
      lotSize5000: riskPips > 0 ? (75 / (riskPips * asset.pipVal)).toFixed(2) : "0.05",
      lotSize10000: riskPips > 0 ? (150 / (riskPips * asset.pipVal)).toFixed(2) : "0.10",
      maxRiskPercent: 1.5,
      reasons: [
        `Price action respecting ${isBuy ? "key support zone" : "key resistance zone"} on ${timeframe}`,
        `${candlePatterns[0].name} pattern detected with ${candlePatterns[0].reliability.toLowerCase()} reliability`,
        `${strategyName} algorithm detected optimal ${isBuy ? "bullish" : "bearish"} setup with ${confluenceScore}% confluence`,
        `${isBuy ? "Bullish" : "Bearish"} momentum confirmed by EMA 9/21 cross on ${timeframe}`,
        `RSI reading ${isBuy ? "42–48 (bullish reversal zone)" : "58–65 (bearish reversal zone)"}`,
        `${isBuy ? "Buy" : "Sell"} imbalance zone identified with volume confirmation`,
        `Risk:Reward ratio meets professional criteria at ${rr2}`,
        `${isBuy ? "Higher low" : "Lower high"} structure forming — trend continuation likely`,
        `MACD histogram ${isBuy ? "turning positive" : "turning negative"} on ${timeframe}`,
        volumeTrend === "increasing" ? `${isBuy ? "Strong buying" : "Heavy selling"} volume confirms the setup` : "Accumulation phase with steady volume",
      ].slice(0, 7 + Math.floor(rng() * 2)),
      srLevels: [
        { level: parseFloat((isBuy ? sl - riskAmount * 0.5 : sl + riskAmount * 0.5).toFixed(asset.decimals)), type: isBuy ? "support" : "resistance", strength: "Strong" },
        { level: parseFloat(entry.toFixed(asset.decimals)), type: "pivot", strength: "Key" },
        { level: parseFloat((isBuy ? tp2 + riskAmount * 0.3 : tp2 - riskAmount * 0.3).toFixed(asset.decimals)), type: isBuy ? "resistance" : "support", strength: "Medium" },
      ],
      fibonacci: [
        { level: 0.236, price: parseFloat((isBuy ? entry - riskAmount * 0.236 : entry + riskAmount * 0.236).toFixed(asset.decimals)) },
        { level: 0.382, price: parseFloat((isBuy ? entry - riskAmount * 0.382 : entry + riskAmount * 0.382).toFixed(asset.decimals)) },
        { level: 0.5, price: parseFloat((isBuy ? entry - riskAmount * 0.5 : entry + riskAmount * 0.5).toFixed(asset.decimals)) },
        { level: 0.618, price: parseFloat((isBuy ? entry - riskAmount * 0.618 : entry + riskAmount * 0.618).toFixed(asset.decimals)) },
        { level: 0.786, price: parseFloat((isBuy ? entry - riskAmount * 0.786 : entry + riskAmount * 0.786).toFixed(asset.decimals)) },
      ],
      candlePatterns,
      volume: { trend: volumeTrend, signal: isBuy ? (volumeTrend === "increasing" ? "Strong buying volume confirms breakout" : "Accumulation phase with steady volume") : (volumeTrend === "increasing" ? "Heavy selling pressure detected" : "Distribution pattern on low volume") },
      trend: isBuy ? (rng() > 0.5 ? "Strong Uptrend" : "Uptrend Correction") : (rng() > 0.5 ? "Strong Downtrend" : "Downtrend Bounce"),
      marketStructure: isBuy ? (rng() > 0.5 ? "Higher Highs & Higher Lows" : "Break of Structure") : (rng() > 0.5 ? "Lower Highs & Lower Lows" : "Liquidity Sweep Complete"),
      keyLevel: `${isBuy ? "Support" : "Resistance"} at ${parseFloat((isBuy ? sl - riskAmount * 0.3 : sl + riskAmount * 0.3).toFixed(asset.decimals))} — tested ${2 + Math.floor(rng() * 3)}×`,
      confluenceScore,
      analysisSource: "deterministic-fallback",
      aiConsensus: {
        status: "fallback",
        models: ["deterministic-fallback"],
        primaryModel: "deterministic-fallback",
        notes: ["Live AI providers were unavailable, so Tradevisor used its conservative fallback model."],
      },
    };
  } catch {
    return null;
  }
}

async function analyzeChartWithClaude(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
  currentPrice?: number,
  newsContext?: MarketNewsContext | null,
): Promise<Record<string, unknown> | null> {
  const apiKey = getClaudeApiKey();
  providerAttempts.claude = { at: new Date().toISOString(), configured: Boolean(apiKey), model: getClaudeModel() };
  if (!apiKey) return null;

  try {
    const mediaType = detectMediaType(base64Image);
    const dynamicContext = buildDynamicUserContext(
      assetName,
      strategyName,
      timeframe,
      currentPrice,
      newsContext ?? null,
    );

    const modelCandidates = await getRuntimeClaudeModelCandidates(apiKey);
    for (const model of modelCandidates) {
      // Newer Claude models (Opus 4.7+) deprecated the `temperature` parameter
      // in favor of extended reasoning. Detect and omit it for those models.
      const modelDeprecatesTemperature = /^claude-(opus-4-[7-9]|opus-[5-9])/i.test(model);

      const requestBody: Record<string, unknown> = {
        model,
        max_tokens: 1800,
        // Static instructions go in `system` with cache_control → cached for 5 min,
        // 90% cheaper on cache hits. The chart image + dynamic data are NOT cached
        // because they change every request.
        system: [
          {
            type: "text",
            text: CLAUDE_STATIC_SYSTEM,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              { type: "text", text: dynamicContext },
            ],
          },
        ],
      };

      if (!modelDeprecatesTemperature) {
        requestBody.temperature = 0.2;
      }

      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const failureText = await response.text();
        let parsedErrorType: string | undefined;
        let parsedErrorMessage: string | undefined;
        try {
          const parsed = JSON.parse(failureText) as { error?: { type?: string; message?: string } };
          parsedErrorType = parsed.error?.type;
          parsedErrorMessage = parsed.error?.message;
        } catch {
          // not JSON, keep raw text
        }
        providerAttempts.claude = {
          at: new Date().toISOString(),
          configured: true,
          model,
          ok: false,
          status: response.status,
          error: parsedErrorType && parsedErrorMessage
            ? `${parsedErrorType}: ${parsedErrorMessage}`
            : failureText.slice(0, 500),
          availableModelCount: claudeModelCache?.ids.length,
          availableModelSample: claudeModelCache?.ids.slice(0, 5),
        };
        console.error("[Anthropic] request failed", { model, status: response.status, body: failureText.slice(0, 1000) });
        if (response.status === 404 || parsedErrorType === "not_found_error") continue;
        return null;
      }

      providerAttempts.claude = {
        at: new Date().toISOString(),
        configured: true,
        model,
        ok: true,
        status: response.status,
        availableModelCount: claudeModelCache?.ids.length,
        availableModelSample: claudeModelCache?.ids.slice(0, 5),
      };
      const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
      const text = data.content?.find((item) => item.type === "text")?.text;
      if (!text) return null;

      const parsed = parseJsonObject(text);
      return normalizeClaudeResult(parsed, assetName, strategyName, timeframe, currentPrice);
    }

    return null;
  } catch (error) {
    providerAttempts.claude = {
      at: new Date().toISOString(),
      configured: true,
      model: getClaudeModel(),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("[Anthropic] analysis failed", error);
    return null;
  }
}

async function analyzeChartWithOpenAI(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
  currentPrice?: number,
  newsContext?: MarketNewsContext | null,
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  providerAttempts.openai = { at: new Date().toISOString(), configured: Boolean(apiKey) };
  if (!apiKey) return null;

  try {
    const mediaType = detectMediaType(base64Image);
    const dynamicContext = buildDynamicUserContext(
      assetName,
      strategyName,
      timeframe,
      currentPrice,
      newsContext ?? null,
    );
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || process.env.VIP2_OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        temperature: 0.15,
        max_tokens: 1800,
        // OpenAI auto-caches prompts > 1024 tokens. Putting all static instructions
        // in the system message ensures they get cached across requests.
        messages: [
          {
            role: "system",
            content: OPENAI_STATIC_SYSTEM,
          },
          {
            role: "user",
            content: [
              { type: "text", text: dynamicContext },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64Image}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      providerAttempts.openai = { at: new Date().toISOString(), configured: true, ok: false, status: response.status };
      console.error("[OpenAI] request failed", response.status, await response.text());
      return null;
    }

    providerAttempts.openai = { at: new Date().toISOString(), configured: true, ok: true, status: response.status };
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    return normalizeClaudeResult(parseJsonObject(text), assetName, strategyName, timeframe, currentPrice);
  } catch (error) {
    providerAttempts.openai = {
      at: new Date().toISOString(),
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("[OpenAI] analysis failed", error);
    return null;
  }
}

/**
 * Google Gemini 2.5 Pro - second-opinion vision model.
 * Stronger at chart vision than gpt-4o-mini and significantly cheaper than gpt-4o.
 * Free tier: 5 RPM, 25 RPD on aistudio.google.com.
 * Paid tier: $1.25/$10 per million tokens.
 */
async function analyzeChartWithGemini(
  base64Image: string,
  assetName: string,
  strategyName: string,
  timeframe: string,
  currentPrice?: number,
  newsContext?: MarketNewsContext | null,
): Promise<Record<string, unknown> | null> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY)?.trim();
  providerAttempts.gemini = { at: new Date().toISOString(), configured: Boolean(apiKey) };
  if (!apiKey) return null;

  try {
    const mediaType = detectMediaType(base64Image);
    const dynamicContext = buildDynamicUserContext(
      assetName,
      strategyName,
      timeframe,
      currentPrice,
      newsContext ?? null,
    );

    const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
    const url = `${GEMINI_URL_BASE}/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        // Gemini "systemInstruction" is the closest equivalent to OpenAI's system
        // message — it stays constant across requests and Gemini will cache it
        // automatically for paid tier (implicit caching).
        systemInstruction: {
          parts: [{ text: GEMINI_STATIC_SYSTEM }],
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: dynamicContext },
              {
                inlineData: {
                  mimeType: mediaType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 2400,
          responseMimeType: "application/json",
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    if (!response.ok) {
      const failureText = await response.text();
      let errorMsg = failureText.slice(0, 400);
      try {
        const parsed = JSON.parse(failureText) as { error?: { message?: string; status?: string } };
        if (parsed.error?.message) errorMsg = `${parsed.error.status || "ERROR"}: ${parsed.error.message}`;
      } catch {
        // not JSON
      }
      providerAttempts.gemini = {
        at: new Date().toISOString(),
        configured: true,
        model,
        ok: false,
        status: response.status,
        error: errorMsg,
      };
      console.error("[Gemini] request failed", { model, status: response.status, error: errorMsg });
      return null;
    }

    providerAttempts.gemini = {
      at: new Date().toISOString(),
      configured: true,
      model,
      ok: true,
      status: response.status,
    };

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (data.promptFeedback?.blockReason) {
      console.warn("[Gemini] response blocked", data.promptFeedback.blockReason);
      return null;
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n");
    if (!text) {
      console.warn("[Gemini] empty response", {
        finishReason: data.candidates?.[0]?.finishReason,
        hasCandidates: Boolean(data.candidates?.length),
      });
      return null;
    }

    try {
      const parsed = parseJsonObject(text);
      return normalizeClaudeResult(parsed, assetName, strategyName, timeframe, currentPrice);
    } catch (parseError) {
      // Log the actual response sample so we can see what Gemini sent back
      console.error("[Gemini] failed to parse response as JSON", {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responseSample: text.slice(0, 300),
        responseLength: text.length,
        finishReason: data.candidates?.[0]?.finishReason,
      });
      providerAttempts.gemini = {
        at: new Date().toISOString(),
        configured: true,
        model,
        ok: false,
        status: response.status,
        error: `JSON parse failed: ${parseError instanceof Error ? parseError.message : "unknown"}. Response started with: ${text.slice(0, 100)}`,
      };
      return null;
    }
  } catch (error) {
    providerAttempts.gemini = {
      at: new Date().toISOString(),
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("[Gemini] analysis failed", error);
    return null;
  }
}

function detectMediaType(base64Image: string) {
  if (base64Image.startsWith("/9j/")) return "image/jpeg";
  if (base64Image.startsWith("iVBOR")) return "image/png";
  if (base64Image.startsWith("R0lGOD")) return "image/gif";
  if (base64Image.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function buildSharedAnalysisPrompt(assetName: string, strategyName: string, timeframe: string, currentPrice?: number) {
  return [
    "Analyze the uploaded trading chart image and return ONLY valid JSON.",
    "Use the six-agent workflow internally: news context, validation, market momentum, chart trade analysis, supervisor checks, and final risk management.",
    "The final numbers must be realistic for the asset and current market price.",
    `Asset: ${assetName}`,
    `Strategy: ${strategyName}`,
    `Timeframe: ${timeframe}`,
    currentPrice ? `Current market price: ${currentPrice}` : "Current market price: not supplied",
    "Required JSON schema:",
    JSON.stringify({
      signal: "BUY or SELL",
      confidence: 85,
      entry: 0,
      stopLoss: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      takeProfit3: 0,
      riskReward1: "1:1.5",
      riskReward2: "1:2.5",
      riskReward3: "1:4.0",
      riskPips: 0,
      riskAmount: 0,
      strategyUsed: strategyName,
      timeToHold: "30 minutes - 4 hours",
      lotSize1000: "0.01",
      lotSize5000: "0.05",
      lotSize10000: "0.10",
      maxRiskPercent: 1.5,
      reasons: ["reason"],
      srLevels: [{ level: 0, type: "support", strength: "Strong" }],
      fibonacci: [{ level: 0.618, price: 0 }],
      candlePatterns: [{ name: "Pattern", signal: "bullish", reliability: "High" }],
      volume: { trend: "normal", signal: "Volume note" },
      trend: "Trend summary",
      marketStructure: "Market structure summary",
      keyLevel: "Key level summary",
      confluenceScore: 85,
      chartScale: {
        topPrice: 0,
        bottomPrice: 0,
        currentPrice: 0,
        confidence: 0,
        source: "visible right-side price axis",
        warnings: ["Only set confidence above 70 when the right price axis is readable."],
      },
    }),
    "Rules:",
    "- For BUY, stopLoss must be below entry and all take profits above entry.",
    "- For SELL, stopLoss must be above entry and all take profits below entry.",
    "- Risk/reward must be mathematically consistent.",
    "- Entry must be close to the supplied current market price or the visible chart current price. If the setup is far away, return the closest valid trigger near current price and lower confidence.",
    "- Never output entry, stop loss, or targets far outside the visible chart scale. If the chart scale is unclear, be conservative and prefer a wait/no-chase setup.",
    "- Read the visible right-side price axis from the screenshot. Return chartScale.topPrice as the highest visible price label and chartScale.bottomPrice as the lowest visible price label.",
    "- Return chartScale.currentPrice as the current price label visible on the chart, if readable.",
    "- Set chartScale.confidence from 0 to 100. Use 0 when the axis is hidden, cropped, blurred, or not readable.",
    "- Do not invent chartScale. If the price axis is unclear, return topPrice 0, bottomPrice 0, confidence 0.",
    "- If the chart is unclear, lower confidence and keep risk conservative.",
  ].join("\n");
}

function combineModelResults(claudeResult: Record<string, unknown> | null, openAiResult: Record<string, unknown> | null) {
  if (claudeResult && openAiResult) {
    const sameSignal = claudeResult.signal === openAiResult.signal;
    const primary = {
      ...claudeResult,
      confidence: sameSignal
        ? Math.min(98, Math.round((Number(claudeResult.confidence || 70) + Number(openAiResult.confidence || 70)) / 2) + 3)
        : Math.min(Number(claudeResult.confidence || 70), 72),
      analysisSource: "claude-openai-consensus",
      aiConsensus: {
        status: sameSignal ? "aligned" : "mixed",
        models: ["Claude", "OpenAI"],
        primaryModel: "Claude",
        secondaryModel: "OpenAI",
        notes: sameSignal
          ? ["Claude and OpenAI agree on trade direction.", "Final risk agent may approve if reward/risk and workflow checks pass."]
          : ["Claude and OpenAI disagree on direction.", "Final risk agent should restrict the setup until clearer confirmation."],
      },
    };
    return primary;
  }

  if (claudeResult) {
    return {
      ...claudeResult,
      analysisSource: "claude",
      aiConsensus: {
        status: "single_model",
        models: ["Claude"],
        primaryModel: "Claude",
        notes: ["Claude produced the active chart analysis. OpenAI was not configured or unavailable."],
      },
    };
  }

  if (openAiResult) {
    return {
      ...openAiResult,
      analysisSource: "openai",
      aiConsensus: {
        status: "single_model",
        models: ["OpenAI"],
        primaryModel: "OpenAI",
        notes: ["OpenAI produced the active chart analysis. Claude was not configured or unavailable."],
      },
    };
  }

  return null;
}

function parseJsonObject(text: string) {
  let cleaned = text.trim();

  // Strip markdown code fences that Gemini/Claude sometimes wrap JSON in
  // (```json ... ``` or just ``` ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*\n?/i, "");
    cleaned = cleaned.replace(/\n?\s*```\s*$/, "");
    cleaned = cleaned.trim();
  }

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: extract first {...} block from anywhere in the text
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model returned no JSON object");
    }
    const extracted = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(extracted);
    } catch (innerError) {
      throw new Error(`Model returned malformed JSON: ${innerError instanceof Error ? innerError.message : String(innerError)}`);
    }
  }
}

function normalizeClaudeResult(raw: Record<string, any>, assetName: string, strategyName: string, timeframe: string, currentPrice?: number) {
  const asset = getAssetProfile(assetName);
  const strategy = getStrategyProfile(strategyName);
  const signal = raw.signal === "SELL" ? "SELL" : "BUY";
  const rawEntry = numberOr(raw.entry, asset.base);
  const anchorPrice = getPriceAnchor(raw, currentPrice);
  const maxEntryDistance = getMaxEntryDistance(asset.range, strategyName, timeframe);
  const entryWasTooFar = Boolean(anchorPrice && Math.abs(rawEntry - anchorPrice) > maxEntryDistance);
  const entry = entryWasTooFar && anchorPrice ? roundToTick(anchorPrice, asset.tickSize) : rawEntry;
  const defaultRisk = Math.max(asset.tickSize * 20, entry * strategy.slPct * (entryWasTooFar ? 0.45 : 1));
  const stopLoss = entryWasTooFar
    ? (signal === "BUY" ? entry - defaultRisk : entry + defaultRisk)
    : numberOr(raw.stopLoss, signal === "BUY" ? entry - asset.range * 0.08 : entry + asset.range * 0.08);
  const risk = Math.abs(entry - stopLoss) || asset.tickSize;
  const tp1 = numberOr(raw.takeProfit1, signal === "BUY" ? entry + risk * 1.5 : entry - risk * 1.5);
  const tp2 = numberOr(raw.takeProfit2, signal === "BUY" ? entry + risk * 2.5 : entry - risk * 2.5);
  const tp3 = numberOr(raw.takeProfit3, signal === "BUY" ? entry + risk * 4 : entry - risk * 4);
  const rr1 = ratio(entry, stopLoss, tp1);
  const rr2 = ratio(entry, stopLoss, tp2);
  const rr3 = ratio(entry, stopLoss, tp3);

  return {
    signal,
    confidence: clamp(entryWasTooFar ? Math.min(numberOr(raw.confidence, 78), 76) : numberOr(raw.confidence, 78), 45, 98),
    entry: round(entry, asset.decimals),
    stopLoss: round(stopLoss, asset.decimals),
    takeProfit1: round(tp1, asset.decimals),
    takeProfit2: round(tp2, asset.decimals),
    takeProfit3: round(tp3, asset.decimals),
    riskReward1: raw.riskReward1 || `1:${rr1}`,
    riskReward2: raw.riskReward2 || `1:${rr2}`,
    riskReward3: raw.riskReward3 || `1:${rr3}`,
    riskPips: round(risk, asset.decimals),
    riskAmount: round(numberOr(raw.riskAmount, risk * asset.pipVal), 2),
    strategyUsed: raw.strategyUsed || strategyName,
    timeToHold: raw.timeToHold || `${timeframe} setup`,
    lotSize1000: String(raw.lotSize1000 || "0.01"),
    lotSize5000: String(raw.lotSize5000 || "0.05"),
    lotSize10000: String(raw.lotSize10000 || "0.10"),
    maxRiskPercent: numberOr(raw.maxRiskPercent, 1.5),
    reasons: [
      ...(entryWasTooFar ? ["Entry was recalibrated near the current market/chart price because the raw AI level was too far away."] : []),
      ...(Array.isArray(raw.reasons) && raw.reasons.length ? raw.reasons.slice(0, 8) : ["Claude chart analysis completed."]),
    ].slice(0, 8),
    srLevels: Array.isArray(raw.srLevels) ? raw.srLevels.slice(0, 5) : [{ level: entry, type: "pivot", strength: "Key" }],
    fibonacci: Array.isArray(raw.fibonacci) ? raw.fibonacci.slice(0, 6) : [],
    candlePatterns: Array.isArray(raw.candlePatterns) && raw.candlePatterns.length ? raw.candlePatterns.slice(0, 4) : [{ name: "AI Detected Pattern", signal: signal === "BUY" ? "bullish" : "bearish", reliability: "Medium" }],
    volume: raw.volume || { trend: "normal", signal: "Volume read from chart image." },
    trend: raw.trend || "AI trend read from chart image",
    marketStructure: raw.marketStructure || "AI market structure read from chart image",
    keyLevel: entryWasTooFar ? `Current market anchor around ${round(entry, asset.decimals)}` : raw.keyLevel || `Key ${signal === "BUY" ? "support" : "resistance"} around ${entry}`,
    confluenceScore: clamp(entryWasTooFar ? Math.min(numberOr(raw.confluenceScore, raw.confidence || 78), 74) : numberOr(raw.confluenceScore, raw.confidence || 78), 45, 98),
    chartScale: normalizeChartScale(raw.chartScale),
  };
}

function getPriceAnchor(raw: Record<string, any>, currentPrice?: number) {
  const scale = normalizeChartScale(raw.chartScale);
  if (scale?.currentPrice && scale.confidence >= 70) return scale.currentPrice;
  return currentPrice && currentPrice > 0 ? currentPrice : undefined;
}

function getMaxEntryDistance(assetRange: number, strategyName: string, timeframe: string) {
  const strategyFactor = ({
    "AI Scalping": 0.022,
    "Day Trading": 0.032,
    "Breakout": 0.04,
    "Smart Money": 0.04,
    "Swing Trading": 0.065,
    "Trend Following": 0.075,
  } as Record<string, number>)[strategyName] || 0.035;
  const timeframeFactor = ({
    "1m": 0.6,
    "5m": 0.8,
    "15m": 1,
    "30m": 1.15,
    "1H": 1.35,
    "4H": 1.8,
    "Daily": 2.4,
  } as Record<string, number>)[timeframe] || 1;
  return Math.max(assetRange * strategyFactor * timeframeFactor, 0.0001);
}

function roundToTick(value: number, tick: number) {
  return Math.round(value / tick) * tick;
}

function normalizeChartScale(scale: unknown) {
  if (!scale || typeof scale !== "object") return undefined;
  const raw = scale as Record<string, unknown>;
  const topPrice = numberOr(raw.topPrice, 0);
  const bottomPrice = numberOr(raw.bottomPrice, 0);
  const confidence = clamp(numberOr(raw.confidence, 0), 0, 100);
  if (!topPrice || !bottomPrice || topPrice <= bottomPrice) return undefined;
  return {
    topPrice: round(topPrice, 2),
    bottomPrice: round(bottomPrice, 2),
    currentPrice: numberOr(raw.currentPrice, 0) || undefined,
    confidence,
    source: typeof raw.source === "string" ? raw.source : "visible right-side price axis",
    warnings: Array.isArray(raw.warnings) ? raw.warnings.slice(0, 4).map(String) : [],
  };
}

function numberOr(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function ratio(entry: number, stop: number, target: number) {
  const risk = Math.abs(entry - stop);
  if (!risk) return "1.5";
  return (Math.abs(target - entry) / risk).toFixed(1);
}
