import { motion } from "framer-motion";
import { Activity, Shield, Star, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { TestimonialData } from "@/data/testimonials";
import { useLanguage } from "@/lib/language";

const label = {
  en: {
    entry: "Entry",
    stop: "Stop Loss",
    risk: "Risk",
    rr: "Best R:R",
    hold: "Hold",
    confidence: "AI Confidence",
    verified: "Verified AI result",
  },
  ar: {
    entry: "الدخول",
    stop: "وقف الخسارة",
    risk: "المخاطرة",
    rr: "أفضل R:R",
    hold: "مدة الصفقة",
    confidence: "ثقة الذكاء",
    verified: "نتيجة تحليل موثقة",
  },
};

function LevelRow({
  name,
  value,
  tone,
}: {
  name: string;
  value: string;
  tone: "entry" | "danger" | "target";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#ff2f68]"
      : tone === "target"
        ? "text-[#2cff91]"
        : "text-[#f3c84b]";

  return (
    <div className="flex items-center justify-between rounded-lg border border-[#083143] bg-[#031018]/80 px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-[#9fb0bc]">
        {tone === "danger" ? (
          <Shield size={13} className="text-[#ff2f68]" />
        ) : tone === "target" ? (
          <TrendingUp size={13} className="text-[#2cff91]" />
        ) : (
          <Target size={13} className="text-[#f3c84b]" />
        )}
        {name}
      </span>
      <span className={`font-mono text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

export default function TestimonialCard({ data }: { data: TestimonialData }) {
  const { language } = useLanguage();
  const copy = label[language];
  const isBuy = data.direction === "BUY";

  return (
    <motion.div
      whileHover={{ y: -6, borderColor: "rgba(34, 211, 238, 0.52)" }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-2xl border border-[#123548] bg-[#050912]/90 shadow-[0_0_36px_rgba(34,211,238,0.08)] transition-all duration-300"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent opacity-70" />
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#22d3ee]/10 blur-3xl transition-opacity group-hover:opacity-80" />

      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={15} className="fill-[#f3c84b] text-[#f3c84b]" />
              ))}
            </div>
            <p className="min-h-[72px] text-sm leading-relaxed text-[#d7e5ee]">"{data.quote}"</p>
          </div>
          <div className="rounded-full border border-[#f3c84b]/25 bg-[#f3c84b]/10 p-2 text-[#f3c84b]">
            {isBuy ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between border-t border-[#123548] pt-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-[#f3c84b]/30 bg-[#f3c84b]/10 text-sm font-bold text-[#f3c84b]">
              {data.handle.replace("@", "").slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{data.handle}</p>
              <p className="text-xs font-medium text-[#2cff91]">{data.profitTag}</p>
            </div>
          </div>
          <span className="rounded-full border border-[#22c55e]/25 bg-[#052315] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2cff91]">
            {copy.verified}
          </span>
        </div>
      </div>

      <div className="border-t border-[#123548] bg-[#020811] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b7f8c]">{data.asset}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-1 text-xs font-black ${
                  isBuy ? "bg-[#052f1d] text-[#2cff91]" : "bg-[#310715] text-[#ff2f68]"
                }`}
              >
                AI {data.direction}
              </span>
              <span className="text-xs text-[#9fb0bc]">{data.strategy}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">{data.confidence}%</p>
            <p className="text-[10px] uppercase tracking-wide text-[#6b7f8c]">{copy.confidence}</p>
          </div>
        </div>

        <div className="space-y-2">
          <LevelRow name={copy.entry} value={data.entry} tone="entry" />
          <LevelRow name={copy.stop} value={data.stopLoss} tone="danger" />
          <LevelRow name="TP1" value={data.tp1} tone="target" />
          <LevelRow name="TP2" value={data.tp2} tone="target" />
          <LevelRow name="TP3" value={data.tp3} tone="target" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[#071019] p-3">
            <p className="text-[10px] uppercase text-[#6b7f8c]">{copy.risk}</p>
            <p className="font-mono text-sm font-bold text-[#f3c84b]">{data.risk}</p>
          </div>
          <div className="rounded-lg bg-[#071019] p-3">
            <p className="text-[10px] uppercase text-[#6b7f8c]">{copy.rr}</p>
            <p className="font-mono text-sm font-bold text-[#2cff91]">{data.rr}</p>
          </div>
          <div className="rounded-lg bg-[#071019] p-3">
            <p className="text-[10px] uppercase text-[#6b7f8c]">{copy.hold}</p>
            <p className="font-mono text-sm font-bold text-white">{data.holdTime}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-[#123548] bg-[#031018] px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-[#9fb0bc]">
            <Activity size={13} className="text-[#22d3ee]" />
            {data.status}
          </span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#10202b]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[#22d3ee] via-[#2cff91] to-[#f3c84b]"
              style={{ width: `${data.confidence}%` }}
            />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
