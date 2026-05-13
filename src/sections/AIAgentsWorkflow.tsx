import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  CheckCircle2,
  Crosshair,
  Newspaper,
  Radar,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useLanguage } from "@/lib/language";

const agents = [
  {
    id: "01",
    name: { en: "News Agent", ar: "وكيل الاخبار" },
    role: { en: "Collects market-moving news and turns it into the first signal context.", ar: "يجمع الاخبار المؤثرة ويحولها الى اشارات اولية" },
    icon: Newspaper,
    status: "Scanning news",
    color: "#38bdf8",
  },
  {
    id: "02",
    name: { en: "Validation Agent", ar: "وكيل التحقق" },
    role: { en: "Checks the news, compares data, and blocks weak decision inputs.", ar: "يتأكد من الخبر ويقارن البيانات قبل تمرير القرار" },
    icon: CheckCircle2,
    status: "Validating data",
    color: "#22c55e",
  },
  {
    id: "03",
    name: { en: "Market Momentum Agent", ar: "وكيل زخم السوق" },
    role: { en: "Reads trend, liquidity, pressure, and current market strength.", ar: "يراقب الاتجاه، السيولة، وقوة الحركة الحالية" },
    icon: Activity,
    status: "Reading momentum",
    color: "#f59e0b",
  },
  {
    id: "04",
    name: { en: "Chart Trade Agent", ar: "وكيل الشارت" },
    role: { en: "Matches the trade with asset type, price levels, and chart structure.", ar: "يطابق الصفقة مع الاصل، المستويات، والهيكل الفني" },
    icon: Crosshair,
    status: "Mapping chart",
    color: "#a78bfa",
  },
  {
    id: "05",
    name: { en: "Supervisor Agent", ar: "وكيل المراقبة" },
    role: { en: "Monitors all agents and checks workflow errors around the clock.", ar: "يراقب كل الوكلاء ويفحص الاخطاء على مدار الساعة" },
    icon: Radar,
    status: "Supervising",
    color: "#eab308",
  },
  {
    id: "06",
    name: { en: "Risk Agent", ar: "وكيل المخاطر" },
    role: { en: "Finalizes stop loss, targets, position size, and trade risk.", ar: "يعطي القرار النهائي مع الستوب، الاهداف، وحجم المخاطرة" },
    icon: ShieldCheck,
    status: "Final risk gate",
    color: "#fb7185",
  },
];

export default function AIAgentsWorkflow() {
  const { language, t } = useLanguage();
  const steps = language === "ar"
    ? [
      "الاخبار تدخل الى الوكيل الاول ويتحدد تأثيرها.",
      "الوكيل الثاني يفلتر الخبر ويمنع القرارات الضعيفة.",
      "الزخم والاوردرات تضيف قوة السوق الحقيقية.",
      "الشارت يحدد الاصل، الدخول، الستوب، والاهداف.",
      "المراقب يفحص اتصال الوكلاء ويكشف الاخطاء.",
      "وكيل المخاطر يعطي القرار النهائي القابل للتنفيذ.",
    ]
    : [
      "News enters the first agent and its market impact is scored.",
      "The validation agent filters weak or conflicting inputs.",
      "Momentum and order pressure add real market context.",
      "The chart agent maps asset, entry, stop, and targets.",
      "The supervisor checks agent links and catches workflow errors.",
      "The risk agent produces the final executable trade plan.",
    ];

  return (
    <section id="ai-agents" className="relative bg-[#050505] py-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(212,168,67,0.03), rgba(34,197,94,0.02), transparent)" }} />
      <div className="relative max-w-[1300px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Bot size={20} className="text-[#d4a843]" />
            <span className="text-[#d4a843] text-xs font-medium uppercase tracking-wider">{t("agents.eyebrow")}</span>
          </div>
          <h2 className="text-white text-3xl sm:text-4xl font-bold mb-3">{t("agents.title")}</h2>
          <p className="text-[#a0a0a0] text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
            {t("agents.subtitle")}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-stretch">
          <div className="relative rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-4 sm:p-6 overflow-hidden">
            <motion.div
              className="absolute left-8 right-8 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-[#d4a843]/50 to-transparent lg:block"
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 relative">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  className="relative rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] p-4 min-h-[198px] overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ backgroundColor: agent.color }}
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 2.2, delay: index * 0.15, repeat: Infinity }}
                  />
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1">Agent {agent.id}</div>
                      <h3 className="text-white font-semibold text-base leading-tight">{agent.name[language]}</h3>
                    </div>
                    <RobotAvatar color={agent.color} index={index} />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#1f1f1f] flex items-center justify-center" style={{ color: agent.color }}>
                      <agent.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[#a0a0a0] text-xs font-medium truncate">{agent.status}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: agent.color }}
                            animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
                            transition={{ duration: 1.1, delay: dot * 0.16 + index * 0.08, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[#777777] text-xs leading-relaxed">{agent.role[language]}</p>

                  {index < agents.length - 1 && (
                    <motion.div
                      className="absolute bottom-3 right-4 text-[10px] text-[#d4a843]"
                      animate={{ x: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.12 }}
                    >
                      {t("agents.next")}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-[#d4a843]/25 bg-[#0f0f0f] p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target size={18} className="text-[#d4a843]" />
                <h3 className="text-white font-semibold">{t("agents.flowTitle")}</h3>
              </div>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step}
                    className="flex gap-3 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-3"
                    animate={{ borderColor: ["rgba(31,31,31,1)", "rgba(212,168,67,0.45)", "rgba(31,31,31,1)"] }}
                    transition={{ duration: 3, delay: index * 0.25, repeat: Infinity }}
                  >
                    <div className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full bg-[#d4a843]/15 border border-[#d4a843]/30 text-[#d4a843] text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    <p className="text-[#a0a0a0] text-xs leading-relaxed">{step}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#a0a0a0] text-xs">{t("agents.statusLabel")}</span>
                <span className="text-[#22c55e] text-xs font-bold">{t("agents.statusValue")}</span>
              </div>
              <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#22c55e] rounded-full"
                  animate={{ width: ["18%", "100%", "18%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function RobotAvatar({ color, index }: { color: string; index: number }) {
  return (
    <motion.div
      className="relative h-14 w-14 flex-shrink-0"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2.2, delay: index * 0.12, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2" style={{ backgroundColor: color }} />
      <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1 rounded-full" style={{ backgroundColor: color }} />
      <div className="absolute inset-x-1 top-3 h-10 rounded-xl border border-[#2a2a2a] bg-[#171717] shadow-[0_0_18px_rgba(212,168,67,0.08)]">
        <div className="absolute left-2 top-3 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <div className="absolute right-2 top-3 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <motion.div
          className="absolute left-1/2 bottom-2 h-1 w-5 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      </div>
      <div className="absolute left-0 top-6 h-4 w-1.5 rounded-full bg-[#2a2a2a]" />
      <div className="absolute right-0 top-6 h-4 w-1.5 rounded-full bg-[#2a2a2a]" />
    </motion.div>
  );
}
