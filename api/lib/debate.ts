/**
 * Bull vs Bear Debate Agent
 * ─────────────────────────
 * The 9th agent. Takes the chart analysis and stages a real debate
 * between two opposing analysts:
 *   - The Bull builds the strongest case FOR the trade.
 *   - The Bear builds the strongest case AGAINST it.
 *   - A Judge weighs both arguments and returns a verdict.
 *
 * This is a real LLM call using the server's Anthropic key — three
 * sequential rounds in a single request (bull → bear → judge), so the
 * latency stays reasonable. The output is a structured transcript the
 * UI can render.
 *
 * Why this matters: the other agents tend to confirm the AI's signal.
 * A bear that's REQUIRED to argue the other side surfaces weaknesses
 * the user would otherwise miss. The trade that survives the bear is
 * a stronger trade.
 */

import { env } from "./env";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.DEBATE_MODEL || "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 30_000;

export type DebateVerdict = "bull_wins" | "bear_wins" | "draw";

export interface DebateResult {
  ok: boolean;
  reason?: string;
  bullArgument: string;
  bearArgument: string;
  judgeReasoning: string;
  verdict: DebateVerdict;
  /** 0-100 — how confident the judge is in the verdict. */
  confidence: number;
  /** A one-line recommendation distilled from the debate. */
  recommendation: string;
}

export interface DebateInputAnalysis {
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
}

export interface DebateContext {
  assetName: string;
  strategyName: string;
  timeframe: string;
  /** Optional Gold Flow Agent reading (8th agent companion). */
  goldFlow?: { signal?: string; confidence?: number; notes?: string[] } | null;
  /** Optional Gold Strategy Agent reading. */
  goldStrategy?: { signal?: string; bias?: string } | null;
}

function emptyResult(reason: string): DebateResult {
  return {
    ok: false,
    reason,
    bullArgument: "",
    bearArgument: "",
    judgeReasoning: "",
    verdict: "draw",
    confidence: 0,
    recommendation: "Debate unavailable — defaulting to neutral stance.",
  };
}

/** Try to pull a JSON object out of an LLM response that may have prose around it. */
function extractJson(text: string): any | null {
  if (!text) return null;
  // Strip code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  // Find the outermost { ... }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Run the debate. Pure function — no DB writes, no side effects.
 * Returns a DebateResult; failures degrade gracefully to a non-blocking
 * neutral output rather than throwing.
 */
export async function runBullBearDebate(
  analysis: DebateInputAnalysis,
  context: DebateContext,
): Promise<DebateResult> {
  if (!env.ANTHROPIC_API_KEY) {
    return emptyResult("AI key is not configured on the server.");
  }

  const direction = analysis.signal;
  const opposite = direction === "BUY" ? "SELL" : "BUY";
  const reasonsList = (analysis.reasons || []).slice(0, 6).map((r, i) => `  ${i + 1}. ${r}`).join("\n");
  const flowLine = context.goldFlow?.signal
    ? `Gold Flow Agent says: ${context.goldFlow.signal} (${context.goldFlow.confidence ?? 0}%).`
    : "";
  const stratLine = context.goldStrategy?.signal
    ? `Gold Strategy Agent says: ${context.goldStrategy.signal} (bias ${context.goldStrategy.bias || "?"}).`
    : "";

  const system = `You are running a structured debate between three roles to evaluate a trade. You will speak as each role in turn. Be specific, cite the numbers, and stay in character.

Roles:
1. BULL  — argue strongly that the ${direction} trade should be TAKEN. Cite the strongest 3-5 reasons. Be honest but persuasive.
2. BEAR  — argue strongly that the trade should be REJECTED (or a ${opposite} considered). Cite the strongest 3-5 counter-reasons. Be honest but persuasive.
3. JUDGE — weigh both sides objectively. Pick a verdict (bull_wins / bear_wins / draw) and give ONE recommendation line.

Rules:
- Each side must reference the actual numbers (entry / stop / targets) and the trade context.
- Never invent data not in the prompt.
- The judge must be willing to side with the bear when the bear's case is genuinely stronger — do not default to the AI's original signal.

Output STRICT JSON only, no prose outside the JSON:
{
  "bullArgument": "<bull's full case, 3-6 sentences>",
  "bearArgument": "<bear's full case, 3-6 sentences>",
  "judgeReasoning": "<judge's reasoning, 2-4 sentences>",
  "verdict": "bull_wins" | "bear_wins" | "draw",
  "confidence": <integer 0-100>,
  "recommendation": "<one concise line, e.g. 'Take the trade with reduced size' or 'Skip — wait for confirmation'>"
}`;

  const user = `TRADE UNDER REVIEW
Asset: ${context.assetName}
Strategy: ${context.strategyName}
Timeframe: ${context.timeframe}
Signal: ${direction}
Confidence: ${analysis.confidence}%
Entry: ${analysis.entry}
Stop loss: ${analysis.stopLoss}
Targets: ${analysis.takeProfit1} / ${analysis.takeProfit2} / ${analysis.takeProfit3}
Trend (higher TF): ${analysis.trend || "n/a"}
Market structure: ${analysis.marketStructure || "n/a"}

REASONS THE AI GAVE FOR THE TRADE:
${reasonsList || "  (none provided)"}

OTHER AGENT INPUT:
${flowLine}
${stratLine}

Run the debate now. Return ONLY the JSON object specified.`;

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
        max_tokens: 1400,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[debate] API error ${res.status}: ${txt.slice(0, 200)}`);
      return emptyResult(`API error ${res.status}`);
    }

    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text || "";
    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[debate] could not parse JSON:", text.slice(0, 300));
      return emptyResult("Could not parse the debate output.");
    }

    const verdict: DebateVerdict =
      parsed.verdict === "bull_wins" || parsed.verdict === "bear_wins" || parsed.verdict === "draw"
        ? parsed.verdict
        : "draw";

    return {
      ok: true,
      bullArgument: String(parsed.bullArgument || "").trim(),
      bearArgument: String(parsed.bearArgument || "").trim(),
      judgeReasoning: String(parsed.judgeReasoning || "").trim(),
      verdict,
      confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
      recommendation: String(parsed.recommendation || "").trim() || "No clear recommendation.",
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("[debate] timed out");
      return emptyResult("Debate timed out.");
    }
    console.error("[debate] failed:", err?.message || err);
    return emptyResult("Debate failed.");
  } finally {
    clearTimeout(timeout);
  }
}
