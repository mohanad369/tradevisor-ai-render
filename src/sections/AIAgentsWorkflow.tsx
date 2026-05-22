import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Crosshair,
  Gauge,
  Network,
  Newspaper,
  Radar,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useLanguage } from "@/lib/language";

const agents = [
  {
    id: "01",
    name: { en: "News Agent", ar: "وكيل الأخبار" },
    role: {
      en: "Collects market-moving news and turns it into the first signal context.",
      ar: "يجمع الأخبار المؤثرة ويحولها إلى سياق الإشارة الأول.",
    },
    status: { en: "Scanning news", ar: "يفحص الأخبار" },
    icon: Newspaper,
    color: "#38bdf8",
    position: "lg:col-start-1 lg:row-start-1",
  },
  {
    id: "02",
    name: { en: "Validation Agent", ar: "وكيل التحقق" },
    role: {
      en: "Checks the news, compares data, and blocks weak decision inputs.",
      ar: "يتأكد من الخبر ويمنع البيانات الضعيفة قبل القرار.",
    },
    status: { en: "Validating data", ar: "يتحقق من البيانات" },
    icon: CheckCircle2,
    color: "#22c55e",
    position: "lg:col-start-2 lg:row-start-1",
  },
  {
    id: "03",
    name: { en: "Market Momentum Agent", ar: "وكيل زخم السوق" },
    role: {
      en: "Reads trend, liquidity, pressure, and current market strength.",
      ar: "يقرأ الاتجاه والسيولة والضغط وقوة السوق الحالية.",
    },
    status: { en: "Reading momentum", ar: "يقرأ الزخم" },
    icon: Activity,
    color: "#f59e0b",
    position: "lg:col-start-3 lg:row-start-1",
  },
  {
    id: "04",
    name: { en: "Chart Trade Agent", ar: "وكيل الشارت" },
    role: {
      en: "Matches the trade with asset type, price levels, and chart structure.",
      ar: "يطابق الصفقة مع الأصل والمستويات وهيكل الشارت.",
    },
    status: { en: "Mapping chart", ar: "يرسم الشارت" },
    icon: Crosshair,
    color: "#a78bfa",
    position: "lg:col-start-1 lg:row-start-3",
  },
  {
    id: "05",
    name: { en: "Supervisor Agent", ar: "وكيل المراقبة" },
    role: {
      en: "Monitors all agents and checks workflow errors around the clock.",
      ar: "يراقب كل الوكلاء ويفحص أخطاء سير العمل.",
    },
    status: { en: "Supervising", ar: "يراقب النظام" },
    icon: Radar,
    color: "#eab308",
    position: "lg:col-start-2 lg:row-start-3",
  },
  {
    id: "06",
    name: { en: "Risk Agent", ar: "وكيل المخاطر" },
    role: {
      en: "Finalizes stop loss, targets, position size, and trade risk.",
      ar: "يعطي القرار النهائي مع الستوب والأهداف وحجم المخاطرة.",
    },
    status: { en: "Final risk gate", ar: "بوابة المخاطر" },
    icon: ShieldCheck,
    color: "#fb7185",
    position: "lg:col-start-3 lg:row-start-3",
  },
  {
    id: "07",
    name: { en: "Gold Flow Agent", ar: "ÙˆÙƒÙŠÙ„ ØªØ¯ÙÙ‘Ù‚ Ø§Ù„Ø°Ù‡Ø¨" },
    role: {
      en: "Specialised in XAU/USD — reads live gold momentum, pressure, and key levels.",
      ar: "Ù…ØªØ®ØµÙ‘Øµ ÙÙŠ Ø§Ù„Ø°Ù‡Ø¨ — ÙŠÙ‚Ø±Ø£ Ø²Ø®Ù… Ø§Ù„Ø°Ù‡Ø¨ ÙˆØ¶ØºØ· Ø§Ù„Ø³ÙˆÙ‚ ÙˆØ§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª Ø§Ù„Ø­ÙŠØ©.",
    },
    status: { en: "Tracking gold flow", ar: "ÙŠØªØ§Ø¨Ø¹ ØªØ¯ÙÙ‘Ù‚ Ø§Ù„Ø°Ù‡Ø¨" },
    icon: Gauge,
    color: "#f5c542",
    position: "lg:col-start-2 lg:row-start-2",
  },
];

const featureStrip = [
  {
    icon: Network,
    title: { en: "Linked Intelligence", ar: "ذكاء مترابط" },
    text: { en: "Agents work as one connected system.", ar: "كل الوكلاء يعملون كنظام واحد." },
  },
  {
    icon: BrainCircuit,
    title: { en: "Real-Time Analysis", ar: "تحليل مباشر" },
    text: { en: "Market data is processed in live cycles.", ar: "تتم معالجة بيانات السوق بدورات مباشرة." },
  },
  {
    icon: ShieldCheck,
    title: { en: "Risk First", ar: "المخاطر أولا" },
    text: { en: "Every trade passes a strict risk gate.", ar: "كل صفقة تمر عبر بوابة مخاطر صارمة." },
  },
  {
    icon: Target,
    title: { en: "Precision Execution", ar: "تنفيذ دقيق" },
    text: { en: "Focused on high-probability setups.", ar: "يركز على الصفقات الأعلى احتمالا." },
  },
];

export default function AIAgentsWorkflow() {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const steps = isArabic
    ? [
        "الأخبار تدخل إلى الوكيل الأول ويتم تقييم تأثيرها على السوق.",
        "وكيل التحقق يفلتر البيانات الضعيفة أو المتعارضة.",
        "الزخم وضغط الأوامر يضيفان سياق السوق الحقيقي.",
        "وكيل الشارت يحدد الأصل والدخول والستوب والأهداف.",
        "المراقب يفحص اتصال الوكلاء ويلتقط أخطاء سير العمل.",
        "وكيل المخاطر ينتج خطة الصفقة النهائية القابلة للتنفيذ.",
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
    <section id="ai-agents" className="relative overflow-hidden bg-[#03070d] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_18%_28%,rgba(34,197,94,0.08),transparent_24%),radial-gradient(circle_at_77%_36%,rgba(234,179,8,0.08),transparent_24%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.05)_1px,transparent_1px)] [background-size:54px_54px]" />
      <EnergyDust />

      <div className="relative mx-auto max-w-[1480px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 flex items-center justify-center gap-2">
            <Bot size={20} className="text-[#38bdf8]" />
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#38bdf8]">
              {isArabic ? "شبكة وكلاء الذكاء المالي" : "AI Financial Agent Network"}
            </span>
          </div>
          <h2 className="mx-auto max-w-5xl text-3xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_0_18px_rgba(125,211,252,0.45)] sm:text-5xl lg:text-6xl">
            {isArabic ? "وكلاء الذكاء المالي" : "AI Financial Intelligence Agents"}
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-sm leading-relaxed text-[#b8c6d6] sm:text-lg">
            {isArabic
              ? "كل صفقة تمر عبر وكلاء مترابطين: الأخبار، التحقق، الزخم، منطق الشارت، المراقبة، وإدارة المخاطر قبل ظهور القرار النهائي."
              : "Every trade moves through linked agents: news, validation, momentum, chart logic, supervision, and risk management before the final decision appears."}
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
          <div className="relative min-h-[760px] overflow-hidden rounded-[28px] border border-[#123554] bg-[#06101a]/82 p-4 shadow-[0_0_70px_rgba(14,165,233,0.12)] backdrop-blur sm:p-7 lg:min-h-[690px]">
            <CircuitLines />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
              <AIHub />
            </div>

            <div className="relative z-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[1fr_auto_1fr]">
              {agents.map((agent, index) => (
                <AgentCard key={agent.id} agent={agent} index={index} language={language} />
              ))}
            </div>
          </div>

          <motion.aside
            initial={{ opacity: 0, x: isArabic ? -24 : 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="relative overflow-hidden rounded-[28px] border border-[#38bdf8]/45 bg-[#06101a]/88 p-5 shadow-[0_0_50px_rgba(56,189,248,0.16)]"
          >
            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent" />
            <div className="mb-5 rounded-2xl border border-[#1e5a82] bg-[#071827] px-4 py-4 shadow-[inset_0_0_28px_rgba(56,189,248,0.08)]">
              <h3 className="text-lg font-black uppercase tracking-wide text-white">
                {isArabic ? "كيف تتحرك الصفقة داخل النظام" : "How the trade moves inside the system"}
              </h3>
            </div>

            <div className="relative space-y-4">
              <div className="absolute bottom-7 top-7 w-px bg-gradient-to-b from-[#38bdf8] via-[#eab308] to-[#fb7185] ltr:left-[22px] rtl:right-[22px]" />
              {steps.map((step, index) => {
                const agent = agents[Math.min(index, agents.length - 1)];
                const Icon = agent.icon;
                return (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className="relative flex gap-3 rounded-2xl border px-3 py-4 shadow-[inset_0_0_24px_rgba(255,255,255,0.025)]"
                    style={{
                      borderColor: `${agent.color}66`,
                      background: `linear-gradient(90deg, ${agent.color}12, rgba(5,5,5,0.54))`,
                    }}
                  >
                    <motion.div
                      className="relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border bg-[#06101a] text-sm font-black"
                      style={{ borderColor: agent.color, color: agent.color, boxShadow: `0 0 22px ${agent.color}55` }}
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.16 }}
                    >
                      {index + 1}
                    </motion.div>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#d4dee8]">{step}</p>
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black/35" style={{ color: agent.color }}>
                      <Icon size={22} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-[#22c55e]/40 bg-[#052113]/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wider text-[#9fb3c8]">{isArabic ? "حالة الشبكة" : "Network status"}</span>
                <span className="text-xs font-black uppercase text-[#22c55e]">{isArabic ? "كل الوكلاء متصلون" : "All agents linked"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#07110b]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#22c55e] via-[#86efac] to-[#22c55e]"
                  animate={{ x: ["-15%", "0%", "-15%"], opacity: [0.65, 1, 0.65] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: "112%" }}
                />
              </div>
            </div>
          </motion.aside>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mt-6 grid gap-4 rounded-[24px] border border-[#16415f] bg-[#06101a]/88 p-5 shadow-[0_0_42px_rgba(56,189,248,0.1)] sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_320px]"
        >
          {featureStrip.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title.en} className="flex items-center gap-4 border-[#123554] xl:border-r xl:pr-5 rtl:xl:border-l rtl:xl:border-r-0 rtl:xl:pl-5 rtl:xl:pr-0">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-[#38bdf8]/35 bg-[#082033] text-[#38bdf8] shadow-[0_0_24px_rgba(56,189,248,0.16)]">
                  <Icon size={25} />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-wide text-[#38bdf8]">{feature.title[language]}</div>
                  <p className="mt-1 text-sm leading-relaxed text-[#9fb3c8]">{feature.text[language]}</p>
                </div>
              </div>
            );
          })}
          <div className="flex min-h-[96px] items-center justify-center rounded-2xl border border-[#16415f] bg-black/25 px-6 text-center">
            <div>
              <div className="text-2xl font-black uppercase tracking-[0.2em] text-white">Tradevisor</div>
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#38bdf8]">
                {isArabic ? "مدعوم بالذكاء والبيانات" : "AI-powered. Data-driven. Built to win."}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AgentCard({
  agent,
  index,
  language,
}: {
  agent: (typeof agents)[number];
  index: number;
  language: "en" | "ar";
}) {
  const Icon = agent.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      whileHover={{ y: -6, scale: 1.015 }}
      className={`relative min-h-[220px] overflow-hidden rounded-3xl border bg-[#06101a]/86 p-5 shadow-[inset_0_0_34px_rgba(255,255,255,0.03)] ${agent.position}`}
      style={{ borderColor: `${agent.color}88`, boxShadow: `0 0 34px ${agent.color}22, inset 0 0 30px ${agent.color}0f` }}
    >
      <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 85% 18%, ${agent.color}2b, transparent 32%)` }} />
      <motion.div
        className="absolute inset-x-8 top-0 h-px"
        style={{ backgroundColor: agent.color }}
        animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.75, 1, 0.75] }}
        transition={{ duration: 2.1, repeat: Infinity, delay: index * 0.12 }}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8aa1b7]">Agent {agent.id}</div>
          <h3 className="max-w-[210px] text-xl font-black uppercase leading-tight text-white">{agent.name[language]}</h3>
        </div>
        <RobotAvatar color={agent.color} index={index} />
      </div>

      <div className="relative z-10 mt-7 flex items-center gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border bg-black/30"
          style={{ borderColor: `${agent.color}55`, color: agent.color, boxShadow: `0 0 22px ${agent.color}22` }}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <div className="text-base font-black" style={{ color: agent.color }}>
            {agent.status[language]}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[0, 1, 2, 3].map((dot) => (
              <motion.span
                key={dot}
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: agent.color }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 1.2, delay: dot * 0.12 + index * 0.08, repeat: Infinity }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-5 text-sm leading-relaxed text-[#b5c2cf]">{agent.role[language]}</p>
    </motion.div>
  );
}

function AIHub() {
  return (
    <motion.div className="relative h-44 w-44" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
      <motion.div
        className="absolute inset-0 rounded-full border border-[#38bdf8]/35"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-4 rounded-full border border-dashed border-[#67e8f9]/45"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-8 flex items-center justify-center rounded-full border border-[#38bdf8]/45 bg-[#062033] shadow-[0_0_50px_rgba(34,211,238,0.45),inset_0_0_38px_rgba(34,211,238,0.18)]">
        <div className="text-5xl font-black tracking-widest text-white drop-shadow-[0_0_18px_rgba(125,211,252,0.95)]">AI</div>
      </div>
      {[0, 1, 2, 3, 4, 5].map((dot) => (
        <motion.span
          key={dot}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-[#67e8f9]"
          style={{ transformOrigin: `${dot % 2 ? 78 : 88}px ${dot % 3 ? 82 : 72}px` }}
          animate={{ rotate: 360, opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 5 + dot, repeat: Infinity, ease: "linear", delay: dot * 0.2 }}
        />
      ))}
    </motion.div>
  );
}

function CircuitLines() {
  const lineColor = "rgba(103,232,249,0.95)";
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block" viewBox="0 0 1000 660" preserveAspectRatio="none">
      <defs>
        <filter id="agentGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="flowBlue" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="flowGold" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#eab308" stopOpacity="1" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {[
        "M150 170 C260 170 300 320 500 330",
        "M500 330 C535 210 585 170 715 170",
        "M500 330 C385 330 320 480 160 500",
        "M500 330 C500 430 500 480 500 530",
        "M500 330 C615 350 650 490 820 500",
        "M290 190 C330 285 390 315 500 330",
        "M720 190 C690 280 620 315 500 330",
      ].map((path, index) => (
        <g key={path}>
          <path d={path} fill="none" stroke={index % 2 ? "url(#flowGold)" : "url(#flowBlue)"} strokeWidth="2" strokeDasharray="5 9" opacity="0.5" />
          <motion.path
            d={path}
            fill="none"
            stroke={index % 2 ? "#facc15" : lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="34 220"
            filter="url(#agentGlow)"
            animate={{ strokeDashoffset: [260, 0] }}
            transition={{ duration: 2.6 + index * 0.18, repeat: Infinity, ease: "linear" }}
          />
        </g>
      ))}
    </svg>
  );
}

function RobotAvatar({ color, index }: { color: string; index: number }) {
  return (
    <motion.div
      className="relative h-16 w-16 flex-shrink-0"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.2, delay: index * 0.12, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: `${color}88`, boxShadow: `0 0 24px ${color}44` }}
        animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
      />
      <div className="absolute left-1/2 top-2 h-3 w-px -translate-x-1/2" style={{ backgroundColor: color }} />
      <div className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full" style={{ backgroundColor: color }} />
      <div className="absolute inset-x-3 top-5 h-9 rounded-xl border border-white/10 bg-[#111827]">
        <motion.div className="absolute left-2.5 top-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.4, repeat: Infinity }} />
        <motion.div className="absolute right-2.5 top-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
        <div className="absolute left-1/2 bottom-2 h-1.5 w-7 -translate-x-1/2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="absolute left-1 top-8 h-4 w-2 rounded-full bg-white/10" />
      <div className="absolute right-1 top-8 h-4 w-2 rounded-full bg-white/10" />
    </motion.div>
  );
}

function EnergyDust() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 26 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-1 w-1 rounded-full bg-[#38bdf8]"
          style={{
            left: `${(index * 37) % 100}%`,
            top: `${(index * 19) % 100}%`,
            opacity: 0.22,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.1, 0.7, 0.1], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: 3.5 + (index % 5) * 0.45, repeat: Infinity, delay: index * 0.11 }}
        />
      ))}
      <motion.div
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#38bdf8]/45 to-transparent"
        animate={{ opacity: [0, 0.75, 0], scaleX: [0.45, 1, 0.45] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
