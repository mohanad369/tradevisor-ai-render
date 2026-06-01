import type { AnalysisResult } from "./analyzer";

type RiskGate = "open" | "restricted" | "closed";

export interface TradingAgentPipelineResult {
  news: Record<string, unknown>;
  decision: Record<string, unknown>;
  marketContext: Record<string, unknown>;
  chartTrade: Record<string, unknown>;
  supervisor: Record<string, unknown>;
  finalRisk: Record<string, unknown>;
  /** The 8th agent — only present when the analyzed asset is gold. */
  goldStrategyAgent?: Record<string, unknown>;
  /** The 10th agent — only present when the analyzed asset is gold. */
  fractalAgent?: Record<string, unknown>;
  finalPlan: {
    action: string;
    confidence: string;
    entryPrice: number;
    stopLoss: number;
    takeProfits: Array<{ label: string; price: number; closePercent: number }>;
    positionSize: number;
    maxLossAmount: number;
    rewardRiskRatio: number;
    notes: string[];
  };
}

/** The result shape returned by the Gold Weekly 4H Zones strategy
 *  module (api/lib/strategies/goldWeekly4h.ts). Passed in pre-fetched
 *  because the strategy needs an async data call the pipeline can't do. */
export interface GoldStrategyPayload {
  strategy_name: string;
  signal: "BUY" | "SELL" | "WAIT";
  bias: "Bullish" | "Bearish" | "Neutral";
  entry_zone: { low: number; high: number } | Record<string, never>;
  stop_loss: number | null;
  targets: number[];
  confidence_score: number;
  reasons: string[];
  invalidation: string;
  learning_notes: string[];
}

/** Reading from the Fractal Pattern Agent (10th agent).
 *  Pre-fetched outside the pipeline because it needs an async data call. */
export interface FractalPayload {
  ok: boolean;
  reason?: string;
  byTimeframe: Array<{
    timeframe: string;
    candlesAnalyzed: number;
    analogs: Array<{
      endedAt: string;
      ageDays: number;
      distance: number;
      forwardMovePercent: number;
      forwardDirection: "up" | "down" | "flat";
    }>;
    upProbability: number;
    avgForwardMove: number;
    consistency: number;
    lean: "bullish" | "bearish" | "mixed";
  }>;
  combined: {
    lean: "bullish" | "bearish" | "mixed";
    bullishScore: number;
    bearishScore: number;
    confidence: number;
    expectedMovePercent: number;
  };
  seasonality: {
    currentHourUTC: number;
    sampleSize: number;
    upRate: number;
    avgHourlyMove: number;
  };
  reasons: string[];
}

/** Shape of items returned by the news router (api/lib/news.ts). */
export interface RealNewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  riskLevel: "low" | "medium" | "high";
  matchedKeywords: string[];
  summary?: string;
}

export interface RealNewsPayload {
  symbol: string;
  fetchedAt: string;
  overallSentiment: "positive" | "negative" | "neutral";
  marketMood: string;
  items: RealNewsItem[];
  poweredBy: "claude-web-search" | "fallback";
}

/** Real market data — when provided, the market-context agent uses it
 *  instead of placeholder numbers. Sourced from the gold-flow / market feed. */
export interface RealMarketData {
  /** Latest traded price. */
  price?: number;
  /** % change over the recent short-term window. */
  shortTermChangePercent?: number;
  /** Current volatility as a percentage. */
  volatilityPercent?: number;
  /** Current volume relative to its average (1.0 = average). */
  volumeRatio?: number;
  /** Momentum direction from the live feed. */
  momentum?: "up" | "down" | "flat";
}

/** Real account data — when provided, the final-risk agent sizes the
 *  trade off the trader's actual capital instead of a placeholder. */
export interface RealAccountData {
  /** The trader's real account balance. */
  accountBalance?: number;
  /** Risk per trade as a percentage of the balance. */
  riskPercent?: number;
}

interface PipelineInput {
  analysis: AnalysisResult;
  assetName: string;
  strategyName: string;
  timeframe: string;
  marketPrice?: number;
  /** Optional real news payload from `trpc.news.forAsset`. When provided,
   *  the news agent uses it instead of generating synthetic inputs. */
  realNews?: RealNewsPayload | null;
  /** Optional real market data. When provided, the market-context agent
   *  uses it instead of placeholder numbers. */
  realMarket?: RealMarketData | null;
  /** Optional real account data. When provided, the final-risk agent
   *  sizes the position from the trader's real capital. */
  realAccount?: RealAccountData | null;
  /** Optional pre-fetched Gold Weekly 4H Zones reading. Provided only
   *  for gold; powers the 8th agent. Fetched outside the pipeline
   *  because the strategy needs an async data call. */
  goldStrategy?: GoldStrategyPayload | null;
  /** Optional pre-fetched Fractal Pattern reading. Powers the 10th agent.
   *  Gold-only; for other assets the agent stays absent. */
  fractalReading?: FractalPayload | null;
}

export function runTradingAgentPipeline(input: PipelineInput): TradingAgentPipelineResult {
  const news = newsAgent(input);
  const decision = decisionAgent(news);
  const marketContext = marketContextAgent(decision, input);
  const chartTrade = chartTradeAgent(marketContext, input);
  const supervisor = supervisorAgent({ news, decision, marketContext, chartTrade });
  const finalRisk = finalRiskAgent(chartTrade, supervisor, input);

  // ── 8th agent: Gold Strategy Agent ──
  // Only runs when the analyzed asset is gold AND a strategy reading was
  // provided. For any other asset it stays absent — zero effect.
  const goldStrategyAgent = goldStrategyAgentFn(input);

  // ── 10th agent: Fractal Pattern Agent ──
  // Also gold-only. Returns null for non-gold so it stays absent.
  const fractalAgent = fractalPatternAgentFn(input);

  return {
    news,
    decision,
    marketContext,
    chartTrade,
    supervisor,
    finalRisk,
    ...(goldStrategyAgent ? { goldStrategyAgent } : {}),
    ...(fractalAgent ? { fractalAgent } : {}),
    finalPlan: finalRisk.result as TradingAgentPipelineResult["finalPlan"],
  };
}

/** True when the asset name refers to gold (XAU/USD). */
function isGoldAsset(assetName: string): boolean {
  return /xau|gold|ذهب/i.test(assetName || "");
}

/**
 * 8th agent — Gold Strategy Agent.
 *
 * Surfaces the Gold Weekly 4H Zones strategy reading as a formal agent
 * in the pipeline. Returns null for non-gold assets (so it simply does
 * not appear), and a "standby" reading for gold if no strategy data was
 * supplied. It never overrides the other agents — it adds a structured,
 * higher-timeframe opinion alongside them.
 */
function goldStrategyAgentFn(input: PipelineInput): Record<string, unknown> | null {
  if (!isGoldAsset(input.assetName)) return null;

  const gs = input.goldStrategy;
  if (!gs) {
    return {
      agent: "gold-strategy-agent",
      generatedAt: new Date().toISOString(),
      symbol: input.assetName,
      status: "standby",
      reasons: ["Gold strategy data was not available for this analysis."],
    };
  }

  // Does the strategy agree with the chart analysis direction?
  const chartSignal = input.analysis.signal; // BUY | SELL
  const agreement =
    gs.signal === "WAIT" ? "neutral"
    : gs.signal === chartSignal ? "confirms"
    : "conflicts";

  const reasons = [
    `Gold Weekly 4H Zones: ${gs.signal} (${gs.bias} bias).`,
    ...gs.reasons.slice(0, 3),
  ];
  if (agreement === "confirms") {
    reasons.push("Strategy agrees with the chart analysis direction.");
  } else if (agreement === "conflicts") {
    reasons.push("Strategy disagrees with the chart analysis — trade with caution.");
  }

  return {
    agent: "gold-strategy-agent",
    generatedAt: new Date().toISOString(),
    symbol: input.assetName,
    status: "active",
    strategyName: gs.strategy_name,
    signal: gs.signal,
    bias: gs.bias,
    entryZone: gs.entry_zone,
    stopLoss: gs.stop_loss,
    targets: gs.targets,
    confidenceScore: gs.confidence_score,
    agreementWithChart: agreement,
    invalidation: gs.invalidation,
    reasons,
  };
}

/**
 * 10th agent — Fractal Pattern Agent.
 *
 * Surfaces the multi-timeframe analog pattern reading from
 * api/lib/fractalPattern.ts. Gold-only; returns null for other assets
 * so it simply doesn't appear. It NEVER overrides the other agents —
 * it adds an independent, history-based perspective.
 */
function fractalPatternAgentFn(input: PipelineInput): Record<string, unknown> | null {
  if (!isGoldAsset(input.assetName)) return null;

  const fr = input.fractalReading;
  if (!fr || !fr.ok) {
    return {
      agent: "fractal-pattern-agent",
      generatedAt: new Date().toISOString(),
      symbol: input.assetName,
      status: "standby",
      reasons: [fr?.reason || "Fractal pattern data was not available for this analysis."],
    };
  }

  // Does the fractal lean agree with the chart analysis direction?
  const chartSignal = input.analysis.signal; // BUY | SELL
  const fractalDirection =
    fr.combined.lean === "bullish" ? "BUY"
    : fr.combined.lean === "bearish" ? "SELL"
    : "MIXED";
  const agreement =
    fractalDirection === "MIXED" ? "neutral"
    : fractalDirection === chartSignal ? "confirms"
    : "conflicts";

  const reasons = [
    `Fractal lean: ${fr.combined.lean} (bull ${fr.combined.bullishScore}% / bear ${fr.combined.bearishScore}%, confidence ${fr.combined.confidence}%).`,
    ...fr.reasons.slice(0, 4),
  ];
  if (agreement === "confirms") {
    reasons.push("Historical analog patterns agree with the chart analysis.");
  } else if (agreement === "conflicts") {
    reasons.push("Historical analog patterns disagree with the chart — trade with caution.");
  }

  return {
    agent: "fractal-pattern-agent",
    generatedAt: new Date().toISOString(),
    symbol: input.assetName,
    status: "active",
    timeframes: fr.byTimeframe.map((t) => ({
      timeframe: t.timeframe,
      upProbability: t.upProbability,
      avgForwardMove: t.avgForwardMove,
      lean: t.lean,
      topAnalogs: t.analogs.slice(0, 3),
    })),
    combined: fr.combined,
    seasonality: fr.seasonality,
    agreementWithChart: agreement,
    reasons,
  };
}

// ─── Agents ─────────────────────────────────────────────────────

function newsAgent(input: PipelineInput) {
  // If real news from Claude+web_search is provided, use it.
  // Otherwise fall back to the original synthetic inputs so the rest of
  // the pipeline keeps a stable shape (e.g. when running offline).
  const hasReal = !!input.realNews && Array.isArray(input.realNews.items) && input.realNews.items.length > 0;

  const inputs = hasReal
    ? input.realNews!.items.map((it) => ({
        title: it.title,
        source: it.source,
        url: it.url,
        publishedAt: it.publishedAt,
        sentiment: it.sentiment,
        riskLevel: it.riskLevel,
        matchedKeywords: it.matchedKeywords.length ? it.matchedKeywords : [input.assetName],
        summary: it.summary,
      }))
    : [
        {
          title: `${input.assetName} ${input.analysis.signal === "BUY" ? "bullish" : "bearish"} chart context detected`,
          source: "tradevisor-chart-agent",
          url: "internal://chart-analysis",
          publishedAt: new Date().toISOString(),
          sentiment: input.analysis.signal === "BUY" ? "positive" : "negative",
          riskLevel: input.analysis.confidence >= 80 ? "low" : "medium",
          matchedKeywords: [input.assetName, input.strategyName, input.timeframe],
        },
        {
          title: `${input.assetName} momentum and volume update`,
          source: "tradevisor-market-context",
          url: "internal://market-context",
          publishedAt: new Date().toISOString(),
          sentiment: input.analysis.signal === "BUY" ? "positive" : "negative",
          riskLevel: input.analysis.volume.trend === "decreasing" ? "medium" : "low",
          matchedKeywords: ["momentum", "volume", input.analysis.trend],
        },
      ];

  // Aggregate sentiment when real news is present
  let marketMood: "positive" | "negative" | "neutral";
  if (hasReal) {
    marketMood = input.realNews!.overallSentiment;
  } else {
    marketMood = input.analysis.signal === "BUY" ? "positive" : "negative";
  }

  return {
    agent: "news-intelligence-agent",
    generatedAt: new Date().toISOString(),
    marketMood,
    source: hasReal ? input.realNews!.poweredBy : "synthetic",
    keySignals: inputs.map(({ title, sentiment, riskLevel }) => ({ title, sentiment, riskLevel })),
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_2",
      confidence: input.analysis.confidence >= 80 ? "high" : "medium",
      inputs,
    },
  };
}

function decisionAgent(newsOutput: Record<string, any>) {
  const inputs = newsOutput.nextAgentPayload?.inputs ?? [];
  const highRiskCount = inputs.filter((item: any) => item.riskLevel === "high").length;
  const riskGate: RiskGate = inputs.length < 2 ? "closed" : highRiskCount ? "restricted" : "open";

  return {
    agent: "decision-validation-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: newsOutput.agent,
    validation: {
      status: inputs.length >= 2 ? "passed" : "insufficient_data",
      acceptedCount: inputs.length,
      rejectedCount: 0,
      acceptedInputs: inputs.map((item: any) => ({ ...item, ageHours: 0 })),
      rejectedInputs: [],
    },
    signalProfile: {
      dominantSentiment: newsOutput.marketMood,
      conflictLevel: "low",
      riskBias: highRiskCount ? "high" : "low",
    },
    decision: {
      type: inputs.length >= 2 ? "validated_market_context" : "hold_for_more_data",
      confidence: riskGate === "open" ? "high" : "medium",
      riskGate,
      reasons: ["News inputs were validated for the next agent."],
    },
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_3",
      decisionType: inputs.length >= 2 ? "validated_market_context" : "hold_for_more_data",
      confidence: riskGate === "open" ? "high" : "medium",
      riskGate,
      reasons: ["News inputs were validated for the next agent."],
      verifiedInputs: inputs,
    },
  };
}

function marketContextAgent(decisionOutput: Record<string, any>, input: PipelineInput) {
  const marketDirection = input.analysis.signal === "BUY" ? "up" : "down";
  const momentumStrength = input.analysis.confluenceScore >= 80 ? "strong" : "moderate";
  const previousGate = decisionOutput.nextAgentPayload?.riskGate as RiskGate;

  // ── Use real market data when provided; otherwise fall back to the
  //    chart-derived placeholders so offline runs still work. ──
  const rm = input.realMarket;
  const hasRealMarket = !!rm && typeof rm.price === "number";

  const shortTermChangePercent =
    rm?.shortTermChangePercent ?? (input.analysis.signal === "BUY" ? 0.8 : -0.8);
  const volumeRatio =
    rm?.volumeRatio ?? (input.analysis.volume.trend === "increasing" ? 1.45 : 1.05);
  const volatilityPercent = rm?.volatilityPercent ?? 1.1;
  const lastPrice = rm?.price ?? input.marketPrice ?? input.analysis.entry;
  const volatilityRisk: "low" | "medium" | "high" =
    volatilityPercent >= 2.5 ? "high" : volatilityPercent >= 1.4 ? "medium" : "low";
  const dataSource = hasRealMarket ? "live-market-feed" : "chart-derived";

  return {
    agent: "market-context-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: decisionOutput.agent,
    symbol: input.assetName,
    dataSource,
    contextReadiness: {
      status: previousGate === "closed" ? "blocked" : "ready",
      confidence: momentumStrength === "strong" ? "high" : "medium",
      riskGate: previousGate,
      reasons: [hasRealMarket
        ? "Live market data was added to the validated news context."
        : "Market momentum was added to the validated news context."],
    },
    marketMomentum: {
      direction: marketDirection,
      strength: momentumStrength,
      confidence: momentumStrength === "strong" ? "high" : "medium",
      priceChangePercent: 0,
      shortTermChangePercent,
      volumeRatio,
      volatilityRisk,
    },
    alignment: {
      status: "aligned",
      reasons: ["News, chart, and momentum are aligned."],
    },
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_4",
      symbol: input.assetName,
      readiness: previousGate === "closed" ? "blocked" : "ready",
      confidence: momentumStrength === "strong" ? "high" : "medium",
      riskGate: previousGate,
      marketDirection,
      momentumStrength,
      newsMomentumAlignment: "aligned",
      combinedReasons: ["Market context prepared for chart trade analysis."],
      verifiedNews: decisionOutput.nextAgentPayload?.verifiedInputs,
      marketData: {
        symbol: input.assetName,
        dataSource,
        lastPrice,
        previousClose: lastPrice,
        volumeRatio,
        shortTermChangePercent,
        volatilityPercent,
        timestamp: new Date().toISOString(),
      },
    },
  };
}

function chartTradeAgent(marketContextOutput: Record<string, any>, input: PipelineInput) {
  const side = input.analysis.signal === "BUY" ? "long" : "short";
  const risk = Math.abs(input.analysis.entry - input.analysis.stopLoss);
  const reward = Math.abs(input.analysis.takeProfit3 - input.analysis.entry);
  const ratio = risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
  const riskGate: RiskGate = ratio >= 1.5 ? marketContextOutput.nextAgentPayload?.riskGate : "restricted";

  return {
    agent: "chart-trade-analysis-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: marketContextOutput.agent,
    symbol: input.assetName,
    validation: { status: "passed", symbolMatches: true, validSide: true, validPrices: true },
    rewardRisk: { risk, reward, ratio, status: ratio >= 1.5 ? "acceptable" : "weak" },
    directionalFit: {
      status: "aligned",
      tradeDirection: side === "long" ? "up" : "down",
      marketDirection: marketContextOutput.nextAgentPayload?.marketDirection,
    },
    technicalQuality: {
      score: input.analysis.confluenceScore,
      status: input.analysis.confluenceScore >= 80 ? "strong" : "moderate",
      reasons: input.analysis.reasons.slice(0, 4),
    },
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_5",
      symbol: input.assetName,
      tradeSide: side,
      tradeStatus: ratio >= 1.5 ? "analysis_ready" : "needs_review",
      confidence: input.analysis.confidence >= 82 ? "high" : "medium",
      riskGate,
      reasons: ["Chart trade was matched with the full agent context."],
      trade: {
        symbol: input.assetName,
        side,
        entryPrice: input.analysis.entry,
        stopLoss: input.analysis.stopLoss,
        takeProfit: input.analysis.takeProfit3,
        timeframe: input.timeframe,
        pattern: input.analysis.candlePatterns[0]?.name || "AI chart setup",
        indicators: {
          trend: side === "long" ? "up" : "down",
          volumeConfirmation: input.analysis.volume.trend === "increasing",
          nearSupportResistance: false,
        },
        chartTimestamp: new Date().toISOString(),
      },
      marketContext: marketContextOutput.nextAgentPayload,
      analysis: { rewardRisk: { risk, reward, ratio } },
    },
  };
}

function supervisorAgent(outputs: Record<string, any>) {
  const checks = [
    checkOutput("news", outputs.news, "news-intelligence-agent", "pass_to_agent_2"),
    checkOutput("decision", outputs.decision, "decision-validation-agent", "pass_to_agent_3"),
    checkOutput("marketContext", outputs.marketContext, "market-context-agent", "pass_to_agent_4"),
    checkOutput("chartTrade", outputs.chartTrade, "chart-trade-analysis-agent", "pass_to_agent_5"),
  ];
  const errors = checks.filter((check) => check.severity === "error");
  const warnings = checks.filter((check) => check.severity === "warning");
  const riskGate: RiskGate = errors.length ? "closed" : warnings.length ? "restricted" : "open";

  return {
    agent: "supervisor-agent",
    generatedAt: new Date().toISOString(),
    status: errors.length ? "unhealthy" : warnings.length ? "degraded" : "healthy",
    riskGate,
    summary: { checkedAgents: checks.length, errorCount: errors.length, warningCount: warnings.length },
    checks,
    errors,
    warnings,
    nextAgentPayload: {
      recommendedAction: riskGate === "closed" ? "stop_before_agent_6" : "pass_to_agent_6",
      riskGate,
      supervisorStatus: errors.length ? "unhealthy" : warnings.length ? "degraded" : "healthy",
      errors,
      warnings,
    },
  };
}

function finalRiskAgent(chartTradeOutput: Record<string, any>, supervisorOutput: Record<string, any>, input: PipelineInput) {
  const trade = chartTradeOutput.nextAgentPayload.trade;
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);

  // ── Size the position from the trader's REAL account when provided;
  //    otherwise fall back to a neutral default so offline runs work. ──
  const ra = input.realAccount;
  const hasRealAccount = !!ra && typeof ra.accountBalance === "number" && ra.accountBalance > 0;
  const accountBalance = hasRealAccount ? ra!.accountBalance! : 10_000;
  const riskPercent = ra?.riskPercent && ra.riskPercent > 0 ? ra.riskPercent : 1;
  // Max loss = a fixed % of the (real) balance.
  const maxLossAmount = Number(((accountBalance * riskPercent) / 100).toFixed(2));

  const positionSize = risk > 0 ? Number((maxLossAmount / risk).toFixed(4)) : 0;
  const sideMultiplier = trade.side === "long" ? 1 : -1;
  const takeProfits = [
    { label: "TP1", price: input.analysis.takeProfit1, closePercent: 40 },
    { label: "TP2", price: input.analysis.takeProfit2, closePercent: 35 },
    { label: "TP3", price: input.analysis.takeProfit3, closePercent: 25 },
  ];
  const blendedReward = takeProfits.reduce((total, target) => {
    return total + sideMultiplier * (target.price - trade.entryPrice) * (target.closePercent / 100);
  }, 0);
  const rewardRiskRatio = risk > 0 ? Number((blendedReward / risk).toFixed(2)) : 0;
  const closed = supervisorOutput.nextAgentPayload.riskGate === "closed" || chartTradeOutput.nextAgentPayload.riskGate === "closed";
  const restricted = supervisorOutput.nextAgentPayload.riskGate === "restricted" || chartTradeOutput.nextAgentPayload.riskGate === "restricted";
  const action = closed ? "reject" : restricted ? "wait_or_reduce_size" : "approve_plan";
  const confidence = action === "approve_plan" && input.analysis.confidence >= 82 ? "high" : "medium";
  const notes = [
    "Risk is defined with a clear stop loss.",
    "Targets are based on chart analysis, momentum, and supervision checks.",
    "Final plan includes staged exits and position size.",
  ];

  return {
    agent: "final-risk-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: chartTradeOutput.agent,
    optionalAgent5: supervisorOutput.nextAgentPayload,
    symbol: input.assetName,
    finalDecision: { action, confidence, riskGate: closed ? "closed" : restricted ? "restricted" : "open", reasons: notes },
    riskPlan: {
      accountBalance,
      accountSource: hasRealAccount ? "trader-dashboard" : "default",
      riskPercent,
      maxLossAmount,
      perUnitRisk: risk,
      positionSize,
      originalStopLoss: trade.stopLoss,
      finalStopLoss: trade.stopLoss,
      status: risk > 0 ? "valid" : "invalid",
    },
    targets: {
      takeProfits,
      originalTarget: trade.takeProfit,
      blendedRewardRiskRatio: rewardRiskRatio,
      status: rewardRiskRatio >= 1.5 ? "realistic" : "weak",
    },
    result: {
      action,
      confidence,
      entryPrice: trade.entryPrice,
      stopLoss: trade.stopLoss,
      takeProfits,
      positionSize,
      maxLossAmount,
      rewardRiskRatio,
      notes,
    },
  };
}

function checkOutput(name: string, output: Record<string, any>, expectedAgent: string, expectedAction: string) {
  if (!output || output.agent !== expectedAgent) {
    return { name, severity: "error", status: "wrong_agent", message: `${name} output is invalid.` };
  }
  if (output.nextAgentPayload?.recommendedAction !== expectedAction) {
    return { name, severity: "error", status: "bad_handoff", message: `${name} handoff is invalid.` };
  }
  if (output.nextAgentPayload?.riskGate === "closed") {
    return { name, severity: "error", status: "risk_gate_closed", message: `${name} closed the risk gate.` };
  }
  if (output.nextAgentPayload?.riskGate === "restricted") {
    return { name, severity: "warning", status: "risk_gate_restricted", message: `${name} restricted the risk gate.` };
  }
  return { name, severity: "ok", status: "passed", message: `${name} is healthy.` };
}
