/**
 * Execution Plan Agent (11th agent)
 * ─────────────────────────────────
 * Reads everything the other agents produced — the analysis itself,
 * news, validation, momentum, chart trade, supervisor, risk, gold flow,
 * gold strategy, fractal patterns, AND the bull/bear debate — and
 * produces a concrete EXECUTION plan the user can act on:
 *
 *   - Order type: Buy Limit / Sell Limit / Market
 *   - Exact entry price (or zone)
 *   - Where to place the stop
 *   - Where to take profit (3 targets, same as the analysis)
 *   - Plain-language instructions: "wait for re-test, set Buy Limit at X,
 *     cancel if price exceeds Y before filling"
 *   - The reasoning, in the user's language
 *
 * Two key safety properties:
 *
 *   1) CONSENSUS GATE — a purely-mathematical pre-check that counts how
 *      many other agents lean bullish vs bearish vs neutral. If the
 *      agents don't agree strongly enough (≥ 65% directional consensus
 *      AND the debate must not have ruled bear_wins against a BUY, or
 *      vice versa), this agent returns a "WAIT" plan with no entry —
 *      protecting the user from a low-quality trade.
 *   2) LANGUAGE-AWARE — the prompt is built with the user's language
 *      so the explanation comes back in Arabic or English natively,
 *      not "translated" from English.
 *
 * The Sonnet 4.5 model is used (not Opus) because the work here is
 * synthesis and clear writing, not visual analysis — Sonnet does this
 * just as well at roughly 1/3 the cost.
 */

import { env } from "./env";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.EXECUTION_PLAN_MODEL || "claude-sonnet-4-5";
const TIMEOUT_MS = 30_000;
const CONSENSUS_THRESHOLD = 65; // percent — below this, WAIT

// ─── Types ─────────────────────────────────────────────────────────

export type OrderType = "BUY_LIMIT" | "SELL_LIMIT" | "BUY_MARKET" | "SELL_MARKET" | "WAIT";

export interface ExecutionPlanInput {
  /** User's language for the response. */
  language: "en" | "ar";
  /** Asset, strategy, timeframe — context. */
  assetName: string;
  strategyName: string;
  timeframe: string;
  /** Current live price (for deciding limit vs market). */
  currentPrice?: number;
  /** The main analysis result. */
  analysis: {
    signal: "BUY" | "SELL";
    confidence: number;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    trend?: string;
    marketStructure?: string;
    reasons?: string[];
  };
  /** All agent outputs from the pipeline. */
  agents?: {
    news?: { decision?: string; rationale?: string } | null;
    decision?: { stance?: string } | null;
    marketContext?: { regime?: string } | null;
    chartTrade?: { compliance?: string; strategyMatch?: string } | null;
    supervisor?: { verdict?: string } | null;
    finalRisk?: { gate?: string } | null;
    goldStrategyAgent?: { signal?: string; bias?: string } | null;
    fractalAgent?: {
      status?: string;
      combined?: { lean?: string; confidence?: number };
      agreementWithChart?: "confirms" | "conflicts" | "neutral";
    } | null;
  } | null;
  /** Optional debate outcome. */
  debate?: {
    verdict: "bull_wins" | "bear_wins" | "draw";
    confidence: number;
    recommendation?: string;
  } | null;
}

export interface ExecutionPlanResult {
  ok: boolean;
  reason?: string;
  /** "WAIT" if consensus is too weak — the user should not enter. */
  orderType: OrderType;
  /** The strict consensus reading the gate computed (always returned). */
  consensus: {
    bullishAgents: number;
    bearishAgents: number;
    neutralAgents: number;
    totalAgents: number;
    /** Score 0-100 — % of agents that agree with the analysis signal. */
    agreementPercent: number;
    /** Whether the consensus gate passed. */
    passedGate: boolean;
  };
  /** Plan details — only meaningful when orderType !== "WAIT". */
  plan?: {
    entry: number;
    stopLoss: number;
    targets: [number, number, number];
    instructions: string;        // 2-4 sentence plain-language plan
    cancelCondition: string;     // when to cancel the pending order
    confidenceLabel: string;     // e.g. "Strong setup" / "Moderate setup"
  };
  /** For WAIT plans, this carries the explanation. */
  waitReason?: string;
}

// ─── Consensus gate (pure math, no LLM) ────────────────────────────

/**
 * Count how many agents lean which way, given the analysis signal.
 * Returns a structured tally and a derived agreement percentage.
 *
 * This runs BEFORE we hit the LLM. If it fails, we return WAIT and
 * skip the API call entirely — that's both safer (no false greenlight
 * from the LLM) and cheaper.
 */
function computeConsensus(input: ExecutionPlanInput): ExecutionPlanResult["consensus"] {
  const signal = input.analysis.signal;
  let bull = 0, bear = 0, neut = 0;

  const a = input.agents || {};

  // News agent — bullish/bearish/neutral verdict
  const newsDecision = String(a.news?.decision || "").toLowerCase();
  if (newsDecision.includes("bull")) bull++;
  else if (newsDecision.includes("bear")) bear++;
  else if (newsDecision) neut++;

  // Decision agent (validation)
  const stance = String(a.decision?.stance || "").toLowerCase();
  if (stance.includes("bull") || stance === "buy") bull++;
  else if (stance.includes("bear") || stance === "sell") bear++;
  else if (stance) neut++;

  // Market context
  const regime = String(a.marketContext?.regime || "").toLowerCase();
  if (regime.includes("uptrend") || regime.includes("bull")) bull++;
  else if (regime.includes("downtrend") || regime.includes("bear")) bear++;
  else if (regime) neut++;

  // Chart trade (strategy compliance)
  const chartMatch = String(a.chartTrade?.strategyMatch || a.chartTrade?.compliance || "").toLowerCase();
  if (chartMatch.includes("aligned") || chartMatch.includes("approved")) {
    // Aligned with the analysis signal — counts as agreement
    if (signal === "BUY") bull++;
    else bear++;
  } else if (chartMatch.includes("conflict") || chartMatch.includes("reject")) {
    if (signal === "BUY") bear++;
    else bull++;
  } else if (chartMatch) {
    neut++;
  }

  // Supervisor
  const supervisor = String(a.supervisor?.verdict || "").toLowerCase();
  if (supervisor.includes("approved") || supervisor.includes("pass")) {
    if (signal === "BUY") bull++;
    else bear++;
  } else if (supervisor.includes("reject") || supervisor.includes("conflict")) {
    if (signal === "BUY") bear++;
    else bull++;
  } else if (supervisor) {
    neut++;
  }

  // Final risk gate
  const gate = String(a.finalRisk?.gate || "").toLowerCase();
  if (gate === "open") {
    if (signal === "BUY") bull++;
    else bear++;
  } else if (gate === "closed" || gate === "restricted") {
    if (signal === "BUY") bear++;
    else bull++;
  }

  // Gold strategy (gold only)
  const goldSig = String(a.goldStrategyAgent?.signal || "").toUpperCase();
  if (goldSig === "BUY") bull++;
  else if (goldSig === "SELL") bear++;
  else if (goldSig === "WAIT") neut++;

  // Fractal pattern (gold only)
  const fractalLean = String(a.fractalAgent?.combined?.lean || "").toLowerCase();
  if (fractalLean === "bullish") bull++;
  else if (fractalLean === "bearish") bear++;
  else if (fractalLean === "mixed") neut++;

  // Debate
  if (input.debate) {
    if (input.debate.verdict === "bull_wins") bull++;
    else if (input.debate.verdict === "bear_wins") bear++;
    else neut++;
  }

  const total = bull + bear + neut;
  if (total === 0) {
    return {
      bullishAgents: 0, bearishAgents: 0, neutralAgents: 0,
      totalAgents: 0, agreementPercent: 0, passedGate: false,
    };
  }

  // How many of the agents agree with the analysis signal?
  const agree = signal === "BUY" ? bull : bear;
  const agreementPercent = Math.round((agree / total) * 100);

  // Hard veto: if the debate explicitly ruled AGAINST the signal with
  // moderate-or-better confidence, the gate fails regardless of the
  // overall percentage. The debate exists precisely to catch the case
  // where many agents lean the same way for weak reasons but the bear
  // case is genuinely stronger.
  let debateVeto = false;
  if (input.debate && input.debate.confidence >= 60) {
    if (signal === "BUY" && input.debate.verdict === "bear_wins") debateVeto = true;
    if (signal === "SELL" && input.debate.verdict === "bull_wins") debateVeto = true;
  }

  const passedGate = !debateVeto && agreementPercent >= CONSENSUS_THRESHOLD;

  return {
    bullishAgents: bull,
    bearishAgents: bear,
    neutralAgents: neut,
    totalAgents: total,
    agreementPercent,
    passedGate,
  };
}

// ─── LLM execution plan ────────────────────────────────────────────

function buildPrompt(input: ExecutionPlanInput, consensus: ExecutionPlanResult["consensus"]): { system: string; user: string } {
  const isAr = input.language === "ar";
  const a = input.analysis;
  const dir = a.signal;
  const opposite = dir === "BUY" ? "SELL" : "BUY";

  const reasonsList = (a.reasons || []).slice(0, 6).map((r, i) => `  ${i + 1}. ${r}`).join("\n");
  const fractal = input.agents?.fractalAgent;
  const fractalLine = fractal?.status === "active" && fractal.combined
    ? `Fractal pattern lean: ${fractal.combined.lean} (${fractal.combined.confidence}%), agreement with chart: ${fractal.agreementWithChart || "n/a"}.`
    : "";
  const goldLine = input.agents?.goldStrategyAgent?.signal
    ? `Gold strategy agent: ${input.agents.goldStrategyAgent.signal} (bias ${input.agents.goldStrategyAgent.bias || "?"}).`
    : "";
  const debateLine = input.debate
    ? `Debate verdict: ${input.debate.verdict} at ${input.debate.confidence}% confidence. Recommendation: ${input.debate.recommendation || "n/a"}.`
    : "";

  const system = `You are the execution-planning agent for a trading platform. Your job is to translate the analysis + agent panel + debate into a concrete execution plan a retail trader can place on MT4/MT5.

CRITICAL OUTPUT REQUIREMENTS
- Output STRICT JSON only — no prose, no markdown outside the JSON.
- ${isAr ? "Write all human-readable text in ARABIC (clear, professional Arabic — Modern Standard with simple language)." : "Write all human-readable text in clear, simple ENGLISH."}
- Numbers (prices) stay as numbers — never translate the digits.

DECISION RULES
- Look at the current live price vs the analysis entry to decide the order type:
  • If currentPrice is within 0.05% of entry → use BUY_MARKET or SELL_MARKET (price is already there).
  • Otherwise use BUY_LIMIT or SELL_LIMIT — the user waits for price to re-test the entry.
- The plan must EXACTLY use the entry / stop / TPs from the analysis. Do not invent your own levels.
- The "cancelCondition" tells the user when to cancel the pending limit order. For BUY_LIMIT: cancel if price drops to or below the stop before filling. For SELL_LIMIT: cancel if price rises to or above the stop before filling. For market orders, cancelCondition can be "Not applicable — market order".
- "instructions" is 2-4 sentences telling the user EXACTLY what to do: where to place the limit, that they should wait for re-test, where the stop and TPs go.
- "confidenceLabel" is one short phrase. Use Arabic phrases for ar (إعداد قوي / إعداد متوسط / إعداد ضعيف) and English for en (Strong setup / Moderate setup / Weak setup).

OUTPUT SHAPE (strict JSON, all fields required):
{
  "orderType": "BUY_LIMIT" | "SELL_LIMIT" | "BUY_MARKET" | "SELL_MARKET",
  "entry": <number>,
  "stopLoss": <number>,
  "targets": [<tp1>, <tp2>, <tp3>],
  "instructions": "<2-4 sentences in ${isAr ? "Arabic" : "English"}>",
  "cancelCondition": "<one sentence in ${isAr ? "Arabic" : "English"}>",
  "confidenceLabel": "<one phrase in ${isAr ? "Arabic" : "English"}>"
}`;

  const user = `ANALYSIS UNDER EXECUTION
Asset: ${input.assetName}
Strategy: ${input.strategyName}
Timeframe: ${input.timeframe}
Signal: ${dir} (would be ${opposite} if reversed)
Confidence: ${a.confidence}%
Current live price: ${input.currentPrice ?? "n/a"}
Entry: ${a.entry}
Stop loss: ${a.stopLoss}
Targets: ${a.takeProfit1} / ${a.takeProfit2} / ${a.takeProfit3}
Trend (higher TF): ${a.trend || "n/a"}
Market structure: ${a.marketStructure || "n/a"}

REASONS THE AI GAVE FOR THIS TRADE:
${reasonsList || "  (none provided)"}

AGENT PANEL READINGS:
${fractalLine}
${goldLine}
${debateLine}

CONSENSUS (already computed): ${consensus.agreementPercent}% of agents agree with the ${dir} signal (${consensus.bullishAgents} bullish, ${consensus.bearishAgents} bearish, ${consensus.neutralAgents} neutral out of ${consensus.totalAgents}).

Produce the execution plan now. Output ONLY the JSON object specified.`;

  return { system, user };
}

function extractJson(text: string): any | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildWaitReason(input: ExecutionPlanInput, consensus: ExecutionPlanResult["consensus"]): string {
  const isAr = input.language === "ar";
  const debateBlocked = input.debate && input.debate.confidence >= 60 &&
    ((input.analysis.signal === "BUY" && input.debate.verdict === "bear_wins") ||
     (input.analysis.signal === "SELL" && input.debate.verdict === "bull_wins"));

  if (debateBlocked) {
    return isAr
      ? `وكيل المناظرة حكم ضد اتجاه الصفقة بثقة ${input.debate!.confidence}%. الأفضل الانتظار حتى يصبح السياق أوضح بدلاً من الدخول مع مخاطرة معروفة.`
      : `The debate ruled against this direction with ${input.debate!.confidence}% confidence. Better to wait for clarity than enter against a known concern.`;
  }

  return isAr
    ? `الوكلاء غير متفقين بشكل كافٍ — فقط ${consensus.agreementPercent}% من ${consensus.totalAgents} وكلاء يؤيدون الاتجاه. الحد الأدنى المطلوب للدخول هو ${CONSENSUS_THRESHOLD}%. انتظر حتى تتضح الإشارات قبل الدخول.`
    : `Agents don't agree strongly enough — only ${consensus.agreementPercent}% of ${consensus.totalAgents} agents back the direction, below the ${CONSENSUS_THRESHOLD}% threshold. Wait for clearer alignment before entering.`;
}

// ─── Public entry ──────────────────────────────────────────────────

export async function buildExecutionPlan(input: ExecutionPlanInput): Promise<ExecutionPlanResult> {
  const consensus = computeConsensus(input);

  // Gate failed → return WAIT immediately, skip the LLM (saves cost + time).
  if (!consensus.passedGate) {
    return {
      ok: true,
      orderType: "WAIT",
      consensus,
      waitReason: buildWaitReason(input, consensus),
    };
  }

  if (!env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      orderType: "WAIT",
      consensus,
      reason: "AI key is not configured on the server.",
      waitReason: "AI key is not configured on the server.",
    };
  }

  const { system, user } = buildPrompt(input, consensus);
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
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[executionPlan] API error ${res.status}: ${txt.slice(0, 200)}`);
      return {
        ok: false,
        orderType: "WAIT",
        consensus,
        reason: `API error ${res.status}`,
        waitReason: "Execution plan unavailable — defaulting to wait.",
      };
    }

    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text || "";
    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[executionPlan] could not parse JSON:", text.slice(0, 300));
      return {
        ok: false,
        orderType: "WAIT",
        consensus,
        reason: "Could not parse the execution plan output.",
        waitReason: "Execution plan unavailable — defaulting to wait.",
      };
    }

    // Validate the order type matches the analysis direction.
    const sig = input.analysis.signal;
    const ot = String(parsed.orderType || "").toUpperCase();
    const validOrderTypes = sig === "BUY"
      ? ["BUY_LIMIT", "BUY_MARKET"]
      : ["SELL_LIMIT", "SELL_MARKET"];
    if (!validOrderTypes.includes(ot)) {
      return {
        ok: false,
        orderType: "WAIT",
        consensus,
        reason: "Execution plan produced an inconsistent order type.",
        waitReason: "Execution plan inconsistent — defaulting to wait.",
      };
    }

    // Validate numbers — defensive parse.
    const num = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const entry = num(parsed.entry);
    const stop = num(parsed.stopLoss);
    const t1 = num(parsed.targets?.[0]);
    const t2 = num(parsed.targets?.[1]);
    const t3 = num(parsed.targets?.[2]);
    if (entry === null || stop === null || t1 === null || t2 === null || t3 === null) {
      return {
        ok: false,
        orderType: "WAIT",
        consensus,
        reason: "Execution plan returned invalid numbers.",
        waitReason: "Execution plan invalid — defaulting to wait.",
      };
    }

    return {
      ok: true,
      orderType: ot as OrderType,
      consensus,
      plan: {
        entry,
        stopLoss: stop,
        targets: [t1, t2, t3],
        instructions: String(parsed.instructions || "").trim(),
        cancelCondition: String(parsed.cancelCondition || "").trim(),
        confidenceLabel: String(parsed.confidenceLabel || "").trim(),
      },
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("[executionPlan] timed out");
      return {
        ok: false,
        orderType: "WAIT",
        consensus,
        reason: "Execution plan timed out.",
        waitReason: "Execution plan timed out — defaulting to wait.",
      };
    }
    console.error("[executionPlan] failed:", err?.message || err);
    return {
      ok: false,
      orderType: "WAIT",
      consensus,
      reason: "Execution plan failed.",
      waitReason: "Execution plan unavailable — defaulting to wait.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
