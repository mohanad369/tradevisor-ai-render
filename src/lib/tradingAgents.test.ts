import { describe, expect, it } from "vitest";
import { runTradingAgentPipeline } from "./tradingAgents";
import type { AnalysisResult } from "./analyzer";

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    signal: "BUY",
    confidence: 88,
    entry: 100,
    stopLoss: 95,
    takeProfit1: 107.5,
    takeProfit2: 110,
    takeProfit3: 115,
    riskReward1: "1:1.5",
    riskReward2: "1:2.0",
    riskReward3: "1:3.0",
    riskPips: 5,
    riskAmount: 50,
    strategyUsed: "Day Trading",
    timeToHold: "30 minutes - 4 hours",
    lotSize1000: "0.30",
    lotSize5000: "1.50",
    lotSize10000: "3.00",
    maxRiskPercent: 1.5,
    reasons: [
      "Bullish momentum confirmed.",
      "Volume supports the setup.",
      "Risk reward is acceptable.",
      "Market structure is aligned.",
    ],
    srLevels: [{ level: 100, type: "pivot", strength: "Key" }],
    fibonacci: [],
    candlePatterns: [{ name: "Bullish Engulfing", signal: "bullish", reliability: "High" }],
    volume: { trend: "increasing", signal: "Strong buying volume confirms breakout" },
    trend: "Strong Uptrend",
    marketStructure: "Higher Highs & Higher Lows",
    keyLevel: "Support at 95",
    confluenceScore: 86,
    ...overrides,
  };
}

describe("runTradingAgentPipeline", () => {
  it("connects all six agents and approves a strong BUY setup", () => {
    const result = runTradingAgentPipeline({
      analysis: makeAnalysis(),
      assetName: "XAU/USD (Gold)",
      strategyName: "Day Trading",
      timeframe: "1H",
      marketPrice: 100,
    });

    expect(result.news.agent).toBe("news-intelligence-agent");
    expect(result.decision.agent).toBe("decision-validation-agent");
    expect(result.marketContext.agent).toBe("market-context-agent");
    expect(result.chartTrade.agent).toBe("chart-trade-analysis-agent");
    expect(result.supervisor.agent).toBe("supervisor-agent");
    expect(result.finalRisk.agent).toBe("final-risk-agent");

    expect(result.news.nextAgentPayload).toMatchObject({ recommendedAction: "pass_to_agent_2" });
    expect(result.decision.nextAgentPayload).toMatchObject({ recommendedAction: "pass_to_agent_3" });
    expect(result.marketContext.nextAgentPayload).toMatchObject({ recommendedAction: "pass_to_agent_4" });
    expect(result.chartTrade.nextAgentPayload).toMatchObject({ recommendedAction: "pass_to_agent_5" });
    expect(result.supervisor.nextAgentPayload).toMatchObject({ recommendedAction: "pass_to_agent_6" });

    expect(result.finalPlan).toMatchObject({
      action: "approve_plan",
      confidence: "high",
      entryPrice: 100,
      stopLoss: 95,
      maxLossAmount: 100,
    });
    expect(result.finalPlan.setupQuality).toMatchObject({
      verdict: "clean",
    });
    expect(result.finalPlan.setupQuality.score).toBeGreaterThanOrEqual(80);
    expect(result.finalPlan.setupQuality.confirmationChecklist.length).toBeGreaterThan(0);
    expect(result.finalPlan.takeProfits).toHaveLength(3);
    expect(result.finalPlan.rewardRiskRatio).toBeGreaterThanOrEqual(1.5);
  });

  it("rejects the final plan when reward-to-risk is unsafe", () => {
    const result = runTradingAgentPipeline({
      analysis: makeAnalysis({
        takeProfit1: 101,
        takeProfit2: 102,
        takeProfit3: 103,
        riskReward1: "1:0.2",
        riskReward2: "1:0.4",
        riskReward3: "1:0.6",
      }),
      assetName: "EUR/USD",
      strategyName: "Scalping",
      timeframe: "15M",
    });

    expect(result.chartTrade.nextAgentPayload).toMatchObject({
      tradeStatus: "unsafe_entry",
      riskGate: "closed",
    });
    expect(result.supervisor.nextAgentPayload).toMatchObject({
      supervisorStatus: "unhealthy",
      riskGate: "closed",
    });
    expect(result.finalPlan.action).toBe("reject");
    expect(result.finalPlan.setupQuality.verdict).toBe("danger");
    expect(result.finalPlan.setupQuality.blockers.length).toBeGreaterThan(0);
    expect(result.finalPlan.notes[0]).toContain("No trade now");
  });
});
