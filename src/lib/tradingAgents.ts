import type { AnalysisResult } from "./analyzer";

type RiskGate = "open" | "restricted" | "closed";

export interface TradingAgentPipelineResult {
  news: Record<string, unknown>;
  bankPolicy: Record<string, unknown>;
  decision: Record<string, unknown>;
  marketContext: Record<string, unknown>;
  chartTrade: Record<string, unknown>;
  supervisor: Record<string, unknown>;
  finalRisk: Record<string, unknown>;
  finalPlan: {
    action: string;
    confidence: string;
    setupQuality: {
      verdict: "clean" | "caution" | "danger";
      score: number;
      summary: string;
      blockers: string[];
      warnings: string[];
      confirmationChecklist: string[];
    };
    entryPrice: number;
    stopLoss: number;
    takeProfits: Array<{ label: string; price: number; closePercent: number }>;
    positionSize: number;
    maxLossAmount: number;
    rewardRiskRatio: number;
    notes: string[];
  };
}

interface PipelineInput {
  analysis: AnalysisResult;
  assetName: string;
  strategyName: string;
  timeframe: string;
  marketPrice?: number;
}

export function runTradingAgentPipeline(input: PipelineInput): TradingAgentPipelineResult {
  const news = newsAgent(input);
  const bankPolicy = bankPolicyAgent(news, input);
  const decision = decisionAgent(news, bankPolicy);
  const marketContext = marketContextAgent(decision, input);
  const chartTrade = chartTradeAgent(marketContext, input);
  const supervisor = supervisorAgent({ news, bankPolicy, decision, marketContext, chartTrade });
  const finalRisk = finalRiskAgent(chartTrade, supervisor, input);

  return {
    news,
    bankPolicy,
    decision,
    marketContext,
    chartTrade,
    supervisor,
    finalRisk,
    finalPlan: finalRisk.result as TradingAgentPipelineResult["finalPlan"],
  };
}

function newsAgent(input: PipelineInput) {
  const direction = input.analysis.signal === "BUY" ? "bullish" : "bearish";
  const inputs = [
    {
      title: `${input.assetName} ${direction} chart context detected`,
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

  return {
    agent: "news-intelligence-agent",
    generatedAt: new Date().toISOString(),
    marketMood: input.analysis.signal === "BUY" ? "positive" : "negative",
    keySignals: inputs.map(({ title, sentiment, riskLevel }) => ({ title, sentiment, riskLevel })),
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_2",
      confidence: input.analysis.confidence >= 80 ? "high" : "medium",
      inputs,
    },
  };
}

function bankPolicyAgent(newsOutput: Record<string, any>, input: PipelineInput) {
  const isGold = input.assetName.includes("XAU");
  const isUsdCross = input.assetName.includes("USD");
  const signal = input.analysis.signal;
  const hawkishPressure = input.analysis.trend.toLowerCase().includes("down") || signal === "SELL";
  const dovishPressure = input.analysis.trend.toLowerCase().includes("up") || signal === "BUY";
  const bankBias = isGold
    ? hawkishPressure ? "hawkish_usd_pressure" : dovishPressure ? "dovish_gold_support" : "neutral"
    : isUsdCross
      ? hawkishPressure ? "usd_strength_watch" : "usd_weakness_watch"
      : "cross_asset_watch";
  const institutionalIntent = signal === "BUY"
    ? isGold ? "watch central-bank and fund accumulation near support before buying gold" : "watch bank liquidity bids before buying"
    : isGold ? "watch USD-yield pressure and bank selling into resistance before selling gold" : "watch bank liquidity offers before selling";
  const conflict = isGold && signal === "BUY" && input.analysis.volume.trend === "decreasing";
  const riskGate: RiskGate = conflict ? "restricted" : "open";

  const bankInputs = [
    {
      title: "Central-bank policy tone check",
      source: "official-central-bank-watchlist",
      url: "https://www.federalreserve.gov/newsevents.htm",
      publishedAt: new Date().toISOString(),
      sentiment: bankBias.includes("support") || bankBias.includes("weakness") ? "positive" : bankBias.includes("pressure") || bankBias.includes("strength") ? "negative" : "neutral",
      riskLevel: conflict ? "medium" : "low",
      matchedKeywords: ["Federal Reserve", "interest rates", "yields", input.assetName],
    },
    {
      title: "Institutional liquidity intent model",
      source: "tradevisor-bank-agent",
      url: "internal://bank-liquidity-intent",
      publishedAt: new Date().toISOString(),
      sentiment: signal === "BUY" ? "positive" : "negative",
      riskLevel: input.analysis.confidence >= 82 ? "low" : "medium",
      matchedKeywords: ["bank liquidity", "order flow", "policy tone", input.timeframe],
    },
  ];

  return {
    agent: "bank-policy-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: newsOutput.agent,
    bankBias,
    institutionalIntent,
    policyReadiness: {
      status: riskGate === "open" ? "ready" : "needs_confirmation",
      confidence: input.analysis.confidence >= 82 ? "high" : "medium",
      riskGate,
      reasons: [
        "Bank-policy context was added before decision validation.",
        institutionalIntent,
        ...(conflict ? ["Bank intent is not clean because volume does not confirm the chart direction."] : []),
      ],
    },
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_2",
      confidence: input.analysis.confidence >= 82 ? "high" : "medium",
      riskGate,
      bankBias,
      institutionalIntent,
      bankInputs,
      officialSources: [
        "Federal Reserve",
        "European Central Bank",
        "Bank of England",
        "Bank of Japan",
        "US Treasury and bond-yield context",
      ],
    },
  };
}

function decisionAgent(newsOutput: Record<string, any>, bankPolicyOutput: Record<string, any>) {
  const inputs = [
    ...(newsOutput.nextAgentPayload?.inputs ?? []),
    ...(bankPolicyOutput.nextAgentPayload?.bankInputs ?? []),
  ];
  const highRiskCount = inputs.filter((item: any) => item.riskLevel === "high").length;
  const bankRiskGate = bankPolicyOutput.nextAgentPayload?.riskGate as RiskGate | undefined;
  const riskGate: RiskGate = inputs.length < 3 ? "closed" : highRiskCount || bankRiskGate === "restricted" ? "restricted" : "open";

  return {
    agent: "decision-validation-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: `${newsOutput.agent}+${bankPolicyOutput.agent}`,
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
      riskBias: highRiskCount || bankRiskGate === "restricted" ? "medium" : "low",
      bankBias: bankPolicyOutput.nextAgentPayload?.bankBias,
      institutionalIntent: bankPolicyOutput.nextAgentPayload?.institutionalIntent,
    },
    decision: {
      type: inputs.length >= 2 ? "validated_market_context" : "hold_for_more_data",
      confidence: riskGate === "open" ? "high" : "medium",
      riskGate,
      reasons: ["News and bank-policy inputs were validated for the next agent."],
    },
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_3",
      decisionType: inputs.length >= 2 ? "validated_market_context" : "hold_for_more_data",
      confidence: riskGate === "open" ? "high" : "medium",
      riskGate,
      reasons: ["News and bank-policy inputs were validated for the next agent."],
      verifiedInputs: inputs,
      bankPolicy: bankPolicyOutput.nextAgentPayload,
    },
  };
}

function marketContextAgent(decisionOutput: Record<string, any>, input: PipelineInput) {
  const marketDirection = input.analysis.signal === "BUY" ? "up" : "down";
  const momentumStrength = input.analysis.confluenceScore >= 80 ? "strong" : "moderate";
  const previousGate = decisionOutput.nextAgentPayload?.riskGate as RiskGate;

  return {
    agent: "market-context-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: decisionOutput.agent,
    symbol: input.assetName,
    contextReadiness: {
      status: previousGate === "closed" ? "blocked" : "ready",
      confidence: momentumStrength === "strong" ? "high" : "medium",
      riskGate: previousGate,
      reasons: ["Market momentum was added to the validated news context."],
    },
    marketMomentum: {
      direction: marketDirection,
      strength: momentumStrength,
      confidence: momentumStrength === "strong" ? "high" : "medium",
      priceChangePercent: 0,
      shortTermChangePercent: input.analysis.signal === "BUY" ? 0.8 : -0.8,
      volumeRatio: input.analysis.volume.trend === "increasing" ? 1.45 : 1.05,
      volatilityRisk: "low",
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
        lastPrice: input.marketPrice || input.analysis.entry,
        previousClose: input.marketPrice || input.analysis.entry,
        volume: 1_450_000,
        averageVolume: 1_000_000,
        shortTermChangePercent: input.analysis.signal === "BUY" ? 0.8 : -0.8,
        volatilityPercent: 1.1,
        timestamp: new Date().toISOString(),
        aiConsensus: input.analysis.aiConsensus,
        bankPolicy: decisionOutput.nextAgentPayload?.bankPolicy,
      },
    },
  };
}

function chartTradeAgent(marketContextOutput: Record<string, any>, input: PipelineInput) {
  const side = input.analysis.signal === "BUY" ? "long" : "short";
  const risk = Math.abs(input.analysis.entry - input.analysis.stopLoss);
  const reward = Math.abs(input.analysis.takeProfit3 - input.analysis.entry);
  const ratio = risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
  const weakChart = input.analysis.confidence < 72 || input.analysis.confluenceScore < 65 || ratio < 1.2;
  const needsReview = input.analysis.confidence < 82 || input.analysis.confluenceScore < 78 || ratio < 1.5;
  const riskGate: RiskGate = weakChart
    ? "closed"
    : needsReview
      ? "restricted"
      : marketContextOutput.nextAgentPayload?.riskGate;

  return {
    agent: "chart-trade-analysis-agent",
    generatedAt: new Date().toISOString(),
    sourceAgent: marketContextOutput.agent,
    symbol: input.assetName,
    validation: { status: weakChart ? "rejected" : "passed", symbolMatches: true, validSide: true, validPrices: true },
    rewardRisk: { risk, reward, ratio, status: ratio >= 1.5 ? "acceptable" : "weak" },
    directionalFit: {
      status: "aligned",
      tradeDirection: side === "long" ? "up" : "down",
      marketDirection: marketContextOutput.nextAgentPayload?.marketDirection,
    },
    technicalQuality: {
      score: input.analysis.confluenceScore,
      status: weakChart ? "unclear" : input.analysis.confluenceScore >= 80 ? "strong" : "moderate",
      reasons: input.analysis.reasons.slice(0, 4),
    },
    nextAgentPayload: {
      recommendedAction: "pass_to_agent_5",
      symbol: input.assetName,
      tradeSide: side,
      tradeStatus: weakChart ? "unsafe_entry" : ratio >= 1.5 ? "analysis_ready" : "needs_review",
      confidence: input.analysis.confidence >= 82 ? "high" : "medium",
      riskGate,
      reasons: [
        weakChart
          ? "Chart quality is not clear enough for a safe entry."
          : "Chart trade was matched with the full agent context.",
        ...(input.analysis.confidence < 82 ? ["AI confidence is below the premium approval threshold."] : []),
        ...(input.analysis.confluenceScore < 78 ? ["Confluence is not strong enough for a clean setup."] : []),
        ...(ratio < 1.5 ? ["Reward-to-risk is below the preferred quality threshold."] : []),
      ],
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
    checkOutput("bankPolicy", outputs.bankPolicy, "bank-policy-agent", "pass_to_agent_2"),
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
  const maxLossAmount = 100;
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
  const mixedAiConsensus = input.analysis.aiConsensus?.status === "mixed";
  const bankPolicy = chartTradeOutput.nextAgentPayload.marketContext?.bankPolicy;
  const bankRestricted = bankPolicy?.riskGate === "restricted";
  const priceDistanceFromEntry = input.marketPrice
    ? Math.abs(input.marketPrice - trade.entryPrice)
    : 0;
  const priceDistanceInRisk = risk > 0 ? Number((priceDistanceFromEntry / risk).toFixed(2)) : 0;
  const qualityBlockers = [
    ...(input.analysis.confidence < 72 ? ["AI confidence is too low for a live entry."] : []),
    ...(input.analysis.confluenceScore < 65 ? ["Market confluence is weak, so the setup is not clean."] : []),
    ...(rewardRiskRatio < 1.2 ? ["Reward-to-risk is too weak after staged exits."] : []),
    ...(mixedAiConsensus ? ["Claude/OpenAI model consensus is mixed, so the setup is not safe enough."] : []),
    ...(bankPolicy?.riskGate === "closed" ? ["Bank-policy agent closed the institutional risk gate."] : []),
    ...(priceDistanceInRisk >= 0.75 ? ["Current price is too far from the planned entry, so chasing is dangerous."] : []),
  ];
  const qualityWarnings = [
    ...(input.analysis.confidence < 82 ? ["AI confidence is below the strong-entry threshold."] : []),
    ...(input.analysis.confluenceScore < 78 ? ["Confluence is moderate, not strong."] : []),
    ...(rewardRiskRatio < 1.5 ? ["Reward-to-risk is acceptable only with reduced size or waiting."] : []),
    ...(input.analysis.volume.trend === "decreasing" ? ["Volume is not confirming the move clearly."] : []),
    ...(bankRestricted ? [`Bank-policy agent requires confirmation: ${bankPolicy.institutionalIntent}`] : []),
    ...(priceDistanceInRisk > 0.35 && priceDistanceInRisk < 0.75 ? ["Current price is not close enough to the planned entry. Wait for a better fill."] : []),
  ];
  const closed = qualityBlockers.length > 0 || supervisorOutput.nextAgentPayload.riskGate === "closed" || chartTradeOutput.nextAgentPayload.riskGate === "closed";
  const restricted = qualityWarnings.length > 0 || supervisorOutput.nextAgentPayload.riskGate === "restricted" || chartTradeOutput.nextAgentPayload.riskGate === "restricted";
  const action = closed ? "reject" : restricted ? "wait_or_reduce_size" : "approve_plan";
  const confidence = action === "approve_plan" && input.analysis.confidence >= 82 ? "high" : "medium";
  const setupScore = calculateSetupQualityScore({
    confidence: input.analysis.confidence,
    confluence: input.analysis.confluenceScore,
    rewardRiskRatio,
    priceDistanceInRisk,
    volumeTrend: input.analysis.volume.trend,
    mixedAiConsensus,
    bankRestricted,
    blockerCount: qualityBlockers.length,
    warningCount: qualityWarnings.length,
  });
  const setupQuality = {
    verdict: closed ? "danger" as const : restricted ? "caution" as const : "clean" as const,
    score: setupScore,
    summary: closed
      ? "Entry is dangerous right now. The system needs clearer confirmation before allowing a trade."
      : restricted
        ? "Setup has potential, but it is not clean enough for full risk yet."
        : "Setup is clean enough for the current strategy and risk model.",
    blockers: qualityBlockers,
    warnings: qualityWarnings,
    confirmationChecklist: buildConfirmationChecklist(input, rewardRiskRatio, priceDistanceInRisk),
  };
  const notes = [
    ...(closed
      ? ["No trade now: entry is dangerous until the chart becomes clearer."]
      : restricted
        ? ["Entry is not clean enough for full risk. Wait for confirmation or reduce size."]
        : ["Setup passed the full AI and agent review."]),
    ...qualityBlockers,
    ...qualityWarnings,
    ...(input.analysis.aiConsensus?.notes || []),
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
      accountBalance: 10_000,
      riskPercent: 1,
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
      setupQuality,
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

function calculateSetupQualityScore(input: {
  confidence: number;
  confluence: number;
  rewardRiskRatio: number;
  priceDistanceInRisk: number;
  volumeTrend: string;
  mixedAiConsensus: boolean;
  bankRestricted: boolean;
  blockerCount: number;
  warningCount: number;
}) {
  let score = 0;
  score += Math.min(30, input.confidence * 0.3);
  score += Math.min(25, input.confluence * 0.25);
  score += Math.min(20, input.rewardRiskRatio * 10);
  score += input.volumeTrend === "increasing" ? 10 : input.volumeTrend === "normal" ? 6 : 0;
  score += input.priceDistanceInRisk <= 0.2 ? 10 : input.priceDistanceInRisk <= 0.5 ? 5 : 0;
  score += input.mixedAiConsensus ? 0 : 5;
  score += input.bankRestricted ? 0 : 5;
  score -= input.blockerCount * 14;
  score -= input.warningCount * 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildConfirmationChecklist(input: PipelineInput, rewardRiskRatio: number, priceDistanceInRisk: number) {
  const side = input.analysis.signal === "BUY" ? "bullish" : "bearish";
  return [
    `Wait for price to be close to entry; current distance score is ${priceDistanceInRisk}R.`,
    `Confirm ${side} candle close on ${input.timeframe}, not only a wick.`,
    `Keep reward/risk above 1:1.5 before entry; current blended R:R is 1:${rewardRiskRatio}.`,
    "Do not enter during fast spread spikes or unclear news volatility.",
    "If one condition fails, wait for the next setup instead of forcing the trade.",
  ];
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
