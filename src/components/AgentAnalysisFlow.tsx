import { motion } from "framer-motion"
import { Activity, Bot, Building2, CheckCircle2, Crosshair, Gauge, Mail, Shield } from "lucide-react"
import type { AnalysisResult } from "@/lib/analyzer"

export default function AgentAnalysisFlow({ result }: { result: AnalysisResult }) {
  const finalAction = result.agents?.finalPlan?.action?.replaceAll("_", " ") || "trade plan ready"
  const riskGate = readAgentValue(result.agents?.finalRisk, "finalDecision", "riskGate") || "risk checked"
  const agentRows = [
    {
      id: "01",
      name: "News Agent",
      task: "Scans market news and volatility context.",
      output: readAgentValue(result.agents?.news, "nextAgentPayload", "recommendedAction") || "news scored",
      icon: Mail,
      color: "#38bdf8",
    },
    {
      id: "02",
      name: "Bank Agent",
      task: "Checks central-bank tone, USD pressure, yields, and institutional liquidity intent.",
      output: readAgentValue(result.agents?.bankPolicy, "nextAgentPayload", "bankBias") || "bank context checked",
      icon: Building2,
      color: "#60a5fa",
    },
    {
      id: "03",
      name: "Validation Agent",
      task: "Checks weak or conflicting data before the next step.",
      output: readAgentValue(result.agents?.decision, "nextAgentPayload", "recommendedAction") || "data validated",
      icon: CheckCircle2,
      color: "#22c55e",
    },
    {
      id: "04",
      name: "Momentum Agent",
      task: "Reads pressure, trend strength, and current market momentum.",
      output: readAgentValue(result.agents?.marketContext, "nextAgentPayload", "recommendedAction") || "momentum aligned",
      icon: Activity,
      color: "#f59e0b",
    },
    {
      id: "05",
      name: "Chart Agent",
      task: "Maps asset, entry, stop loss, and take-profit levels.",
      output: readAgentValue(result.agents?.chartTrade, "nextAgentPayload", "recommendedAction") || "chart mapped",
      icon: Crosshair,
      color: "#a78bfa",
    },
    {
      id: "06",
      name: "Supervisor Agent",
      task: "Checks that every agent output is connected and valid.",
      output: readAgentValue(result.agents?.supervisor, "nextAgentPayload", "supervisorStatus") || "workflow connected",
      icon: Gauge,
      color: "#eab308",
    },
    {
      id: "07",
      name: "Risk Agent",
      task: "Final gate for risk, position size, stop, and targets.",
      output: riskGate,
      icon: Shield,
      color: "#fb7185",
    },
  ]

  return (
    <div className="border-t border-[#1f1f1f] pt-2 sm:pt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
          <Bot size={10} className="text-[#d4a843]" /> How AI Agents Worked
        </h4>
        <span className="text-[8px] sm:text-[9px] text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full px-2 py-0.5">
          Linked
        </span>
      </div>

      <div className="rounded-xl border border-[#d4a843]/20 bg-[#0f0f0f] p-2 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[#a0a0a0] text-[9px] sm:text-[10px] leading-relaxed">
            The trade moved through news, bank-policy, validation, momentum, chart, supervisor, and risk agents before the final plan.
          </div>
          <div className={`text-[9px] sm:text-[10px] font-bold capitalize ${finalAction.includes("approve") ? "text-[#22c55e]" : "text-[#d4a843]"}`}>
            {finalAction}
          </div>
        </div>

        <div className="relative mb-3 h-1.5 rounded-full bg-[#141414] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] via-[#d4a843] to-[#22c55e]"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "55%" }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
          {agentRows.map((agent, index) => {
            const Icon = agent.icon
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="relative rounded-lg border border-[#1f1f1f] bg-[#141414] p-2 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ backgroundColor: agent.color }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.12 }}
                />
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-lg bg-[#0d0d0d] border border-[#1f1f1f] flex items-center justify-center" style={{ color: agent.color }}>
                    <Icon size={12} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#666666] text-[8px]">{agent.id}</span>
                      <span className="text-white text-[10px] sm:text-[11px] font-bold truncate">{agent.name}</span>
                    </div>
                    <p className="text-[#777777] text-[9px] leading-relaxed mt-0.5">{agent.task}</p>
                    <div className="text-[9px] font-bold mt-1 truncate" style={{ color: agent.color }}>
                      {String(agent.output).replaceAll("_", " ")}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function readAgentValue(agent: unknown, section: string, key: string): string | undefined {
  if (!agent || typeof agent !== "object") return undefined
  const value = (agent as Record<string, unknown>)[section]
  if (!value || typeof value !== "object") return undefined
  const nested = (value as Record<string, unknown>)[key]
  return typeof nested === "string" ? nested : undefined
}
