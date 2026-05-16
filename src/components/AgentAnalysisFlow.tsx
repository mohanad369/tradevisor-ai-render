import { motion } from "framer-motion"
import { Activity, Bot, Building2, CheckCircle2, Crosshair, Gauge, Mail, Shield } from "lucide-react"
import type { AnalysisResult } from "@/lib/analyzer"
import { useLanguage } from "@/lib/language"

export default function AgentAnalysisFlow({ result }: { result: AnalysisResult }) {
  const { language } = useLanguage()
  const isArabic = language === "ar"
  const copy = isArabic ? arCopy : enCopy
  const finalAction = formatAgentOutput(result.agents?.finalPlan?.action || "trade plan ready", isArabic)
  const riskGate = formatAgentOutput(readAgentValue(result.agents?.finalRisk, "finalDecision", "riskGate") || "risk checked", isArabic)
  const agentRows = [
    {
      id: "01",
      name: copy.news.name,
      task: copy.news.task,
      output: formatAgentOutput(readAgentValue(result.agents?.news, "nextAgentPayload", "recommendedAction") || "news scored", isArabic),
      icon: Mail,
      color: "#38bdf8",
    },
    {
      id: "02",
      name: copy.bank.name,
      task: copy.bank.task,
      output: formatAgentOutput(readAgentValue(result.agents?.bankPolicy, "nextAgentPayload", "bankBias") || "bank context checked", isArabic),
      icon: Building2,
      color: "#60a5fa",
    },
    {
      id: "03",
      name: copy.validation.name,
      task: copy.validation.task,
      output: formatAgentOutput(readAgentValue(result.agents?.decision, "nextAgentPayload", "recommendedAction") || "data validated", isArabic),
      icon: CheckCircle2,
      color: "#22c55e",
    },
    {
      id: "04",
      name: copy.momentum.name,
      task: copy.momentum.task,
      output: formatAgentOutput(readAgentValue(result.agents?.marketContext, "nextAgentPayload", "recommendedAction") || "momentum aligned", isArabic),
      icon: Activity,
      color: "#f59e0b",
    },
    {
      id: "05",
      name: copy.chart.name,
      task: copy.chart.task,
      output: formatAgentOutput(readAgentValue(result.agents?.chartTrade, "nextAgentPayload", "recommendedAction") || "chart mapped", isArabic),
      icon: Crosshair,
      color: "#a78bfa",
    },
    {
      id: "06",
      name: copy.supervisor.name,
      task: copy.supervisor.task,
      output: formatAgentOutput(readAgentValue(result.agents?.supervisor, "nextAgentPayload", "supervisorStatus") || "workflow connected", isArabic),
      icon: Gauge,
      color: "#eab308",
    },
    {
      id: "07",
      name: copy.risk.name,
      task: copy.risk.task,
      output: riskGate,
      icon: Shield,
      color: "#fb7185",
    },
  ]

  return (
    <div className="border-t border-[#1f1f1f] pt-2 sm:pt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-white text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
          <Bot size={10} className="text-[#d4a843]" /> {copy.title}
        </h4>
        <span className="text-[8px] sm:text-[9px] text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full px-2 py-0.5">
          {copy.linked}
        </span>
      </div>

      <div className="rounded-xl border border-[#d4a843]/20 bg-[#0f0f0f] p-2 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[#a0a0a0] text-[9px] sm:text-[10px] leading-relaxed">
            {copy.summary}
          </div>
          <div className={`text-[9px] sm:text-[10px] font-bold capitalize ${isApprovedAction(result.agents?.finalPlan?.action) ? "text-[#22c55e]" : "text-[#d4a843]"}`}>
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
                      {agent.output}
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

function isApprovedAction(action: string | undefined) {
  return action === "approve_plan" || action === "approve" || action === "trade plan ready"
}

function formatAgentOutput(value: string, isArabic: boolean) {
  const normalized = value.replaceAll("_", " ").trim().toLowerCase()
  if (!isArabic) return normalized
  const translations: Record<string, string> = {
    "approve plan": "الخطة مقبولة",
    approve: "مقبول",
    reject: "مرفوض",
    wait: "انتظار",
    "wait or reduce size": "انتظار أو تخفيض حجم الصفقة",
    "trade plan ready": "خطة الصفقة جاهزة",
    "risk checked": "تم فحص المخاطر",
    "news scored": "تم تقييم الأخبار",
    "bank context checked": "تم فحص سياق البنوك",
    "data validated": "تم التحقق من البيانات",
    "momentum aligned": "الزخم متوافق",
    "chart mapped": "تم ربط الشارت",
    "workflow connected": "مسار الوكلاء متصل",
    bullish: "ميل صاعد",
    bearish: "ميل هابط",
    neutral: "حيادي",
    restricted: "مقيّد",
    degraded: "بحاجة مراجعة",
    connected: "متصل",
    valid: "صالح",
    "no trade": "لا توجد صفقة الآن",
    "pass to agent 2": "تم تمرير البيانات للوكيل التالي",
    "pass to agent 3": "تم تمرير القرار للزخم",
    "pass to agent 4": "تم تمرير الزخم لوكيل الشارت",
    "pass to agent 5": "تم تمرير الشارت للمشرف",
    "pass to agent 6": "تم تمرير الصفقة لإدارة المخاطر",
  }
  return translations[normalized] || normalized
}

const enCopy = {
  title: "How AI Agents Worked",
  linked: "Linked",
  summary: "The trade moved through news, bank-policy, validation, momentum, chart, supervisor, and risk agents before the final plan.",
  news: { name: "News Agent", task: "Scans market news and volatility context." },
  bank: { name: "Bank Agent", task: "Checks central-bank tone, USD pressure, yields, and institutional liquidity intent." },
  validation: { name: "Validation Agent", task: "Checks weak or conflicting data before the next step." },
  momentum: { name: "Momentum Agent", task: "Reads pressure, trend strength, and current market momentum." },
  chart: { name: "Chart Agent", task: "Maps asset, entry, stop loss, and take-profit levels." },
  supervisor: { name: "Supervisor Agent", task: "Checks that every agent output is connected and valid." },
  risk: { name: "Risk Agent", task: "Final gate for risk, position size, stop, and targets." },
}

const arCopy = {
  title: "كيف عمل وكلاء الذكاء",
  linked: "متصل",
  summary: "مرت الصفقة عبر وكيل الأخبار، وكيل البنوك، التحقق، الزخم، الشارت، المشرف، وإدارة المخاطر قبل إصدار الخطة النهائية.",
  news: { name: "وكيل الأخبار", task: "يفحص أخبار السوق وسياق التذبذب." },
  bank: { name: "وكيل البنوك", task: "يفحص لهجة البنوك المركزية، ضغط الدولار، العوائد، ونية السيولة المؤسسية." },
  validation: { name: "وكيل التحقق", task: "يتأكد من ضعف أو تعارض البيانات قبل الخطوة التالية." },
  momentum: { name: "وكيل الزخم", task: "يقرأ الضغط، قوة الاتجاه، وزخم السوق الحالي." },
  chart: { name: "وكيل الشارت", task: "يربط الأصل مع الدخول والستوب ومستويات الأهداف." },
  supervisor: { name: "وكيل المشرف", task: "يتأكد أن مخرجات كل الوكلاء متصلة وصالحة." },
  risk: { name: "وكيل المخاطر", task: "البوابة النهائية للمخاطر، حجم الصفقة، الستوب، والأهداف." },
}
