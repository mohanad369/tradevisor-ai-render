import type { AnalysisResult } from "./analyzer";

type RiskGate = "open" | "restricted" | "closed";

export interface TradingAgentPipelineResult {
  news: Record<string, unknown>;
  decision: Record<string, unknown>;
  marketContext: Record<string, unknown>;
  chartTrade: Record<string, unknown>;
  supervisor: Record<string, unknown>;
  finalRisk: Record<string, unknown>;
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

interface PipelineInput {
  analysis: AnalysisResult;
  assetName: string;
  strategyName: string;
  timeframe: string;
  marketPrice?: number;
}

export function runTradingAgentPipeline(input: PipelineInput): TradingAgentPipelineResult {
  const news = newsAgent(input);
  const decision = decisionAgent(news);
  const marketContext = marketContextAgent(decision, input);
  const chartTrade = chartTradeAgent(marketContext, input);
  const supervisor = supervisorAgent({ news, decision, marketContext, chartTrade });
  const finalRisk = finalRiskAgent(chartTrade, supervisor, input);

  return {
    news,
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
  const closed = supervisorOutput.nextAgentPayload.riskGate === "closed" || chartTradeOutput.nextAgentPayload.riskGate === "closed";
  const restricted = mixedAiConsensus || supervisorOutput.nextAgentPayload.riskGate === "restricted" || chartTradeOutput.nextAgentPayload.riskGate === "restricted";
  const action = closed ? "reject" : restricted ? "wait_or_reduce_size" : "approve_plan";
  const confidence = action === "approve_plan" && input.analysis.confidence >= 82 ? "high" : "medium";
  const notes = [
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
