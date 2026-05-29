import { motion } from "framer-motion";
import { Activity, ShieldCheck, Star } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import TestimonialCard from "@/components/TestimonialCard";
import LivePulse from "@/components/LivePulse";
import { testimonialsData } from "@/data/testimonials";
import { useLanguage } from "@/lib/language";

export default function Testimonials() {
  const { t, language } = useLanguage();
  const sectionCopy =
    language === "ar"
      ? {
          kicker: "نتائج محللة بالذكاء الاصطناعي",
          title: "لقطات صفقات من نظام TradeVisor",
          subtitle:
            "بطاقات مصممة من مخرجات التحليل داخل الموقع: دخول، وقف، أهداف، مخاطرة، وثقة الوكلاء.",
          verified: "نماذج تحليل احترافية",
          disclaimer:
            "النتائج المعروضة أمثلة واجهة مبنية على شكل مخرجات تحليل TradeVisor ولا تضمن أرباحا مستقبلية.",
        }
      : {
          kicker: "Verified AI Trade Results",
          title: "Trade setups shown like real platform analysis",
          subtitle:
            "Each card mirrors a professional TradeVisor analysis output: entry, stop, targets, risk, and agent confidence.",
          verified: "Professional analysis snapshots",
          disclaimer:
            "Displayed results are interface examples based on TradeVisor analysis outputs and do not guarantee future performance.",
        };

  return (
    <section id="testimonials" className="tv-neon-section py-24">
      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <span className="text-[#666666] text-xs font-mono uppercase tracking-wider block mb-2">
            {sectionCopy.kicker}
          </span>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="tv-glow-title text-white text-4xl font-bold mb-4 max-w-3xl">
            {sectionCopy.title}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-[#9fb0bc]">
            {sectionCopy.subtitle}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex flex-wrap items-center gap-4 mb-12 mt-6">
            <div className="tv-neon-pill flex items-center gap-1 rounded-full px-3 py-1.5">
              <Star size={14} className="text-[#d4a843] fill-[#d4a843]" />
              <span className="text-white text-sm font-medium">{t("testimonials.rating")}</span>
            </div>
            <div className="tv-neon-pill flex items-center gap-2 rounded-full px-3 py-1.5">
              <ShieldCheck size={14} className="text-[#22c55e]" />
              <span className="text-white text-sm font-medium">{sectionCopy.verified}</span>
            </div>
            <div className="flex items-center gap-2">
              <LivePulse size={6} />
              <span className="text-[#22c55e] text-sm">{t("testimonials.live")}</span>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonialsData.map((testimonial, index) => (
            <motion.div
              key={`${testimonial.handle}-${index}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <TestimonialCard data={testimonial} />
            </motion.div>
          ))}
        </div>

        <ScrollReveal delay={0.15}>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#123548] bg-[#041018]/70 p-4 text-xs leading-relaxed text-[#8ea0ac]">
            <Activity size={16} className="mt-0.5 shrink-0 text-[#22d3ee]" />
            <span>{sectionCopy.disclaimer}</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
