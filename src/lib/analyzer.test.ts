import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./openai", () => ({
  isOpenAIConfigured: vi.fn(async () => false),
  analyzeWithOpenAI: vi.fn(),
}));

describe("analyzeChartClientSide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns chart analysis with the six-agent final plan attached", async () => {
    const { analyzeChartClientSide } = await import("./analyzer");
    const image = `data:image/png;base64,${"a".repeat(6000)}`;

    const result = await analyzeChartClientSide(
      image,
      "XAU/USD (Gold)",
      "Day Trading",
      "1H",
      4724,
    );

    expect(["BUY", "SELL"]).toContain(result.signal);
    expect(result.entry).toBeGreaterThan(0);
    expect(result.stopLoss).toBeGreaterThan(0);
    expect(result.takeProfit1).toBeGreaterThan(0);
    expect(result.agents?.supervisor).toMatchObject({
      agent: "supervisor-agent",
    });
    expect(result.agents?.finalPlan).toMatchObject({
      entryPrice: result.entry,
      stopLoss: result.stopLoss,
      maxLossAmount: 100,
    });
    expect(result.agents?.finalPlan.takeProfits).toHaveLength(3);
  });
});
