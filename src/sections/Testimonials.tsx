import { motion } from "framer-motion";
import { Star } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import TestimonialCard from "@/components/TestimonialCard";
import LivePulse from "@/components/LivePulse";
import { testimonialsData } from "@/data/testimonials";
import { useLanguage } from "@/lib/language";

export default function Testimonials() {
  const { t } = useLanguage();
  return (
    <section id="testimonials" className="tv-neon-section py-24">
      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <span className="text-[#666666] text-xs font-mono uppercase tracking-wider block mb-2">
            {t("testimonials.kicker")}
          </span>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="tv-glow-title text-white text-4xl font-bold mb-4">
            {t("testimonials.title")}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex items-center gap-4 mb-12">
            <div className="tv-neon-pill flex items-center gap-1 rounded-full px-3 py-1.5">
              <Star size={14} className="text-[#d4a843] fill-[#d4a843]" />
              <span className="text-white text-sm font-medium">{t("testimonials.rating")}</span>
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
      </div>
    </section>
  );
}
