import { motion } from "framer-motion";
import ScrollReveal from "@/components/ScrollReveal";
import WinCard from "@/components/WinCard";
import { winsData } from "@/data/wins";
import { useLanguage } from "@/lib/language";

export default function CommunityWins() {
  const { t } = useLanguage();
  return (
    <section id="wins" className="bg-[#050505] py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-[#666666] text-xs font-mono uppercase tracking-wider">
              {t("wins.kicker1")}
            </span>
            <span className="text-[#666666] text-xs font-mono uppercase tracking-wider">
              {t("wins.kicker2")}
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-white text-4xl font-bold mb-2">
            {t("wins.titleA")} <span className="text-[#d4a843]">{t("wins.titleB")}</span> {t("wins.titleC")}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-[#a0a0a0] text-base mb-12">
            {t("wins.subtitle")}
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {winsData.map((win, index) => (
            <motion.div
              key={win.handle}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            >
              <WinCard data={win} />
            </motion.div>
          ))}
        </div>

        <ScrollReveal className="flex flex-col items-center mt-12 gap-4">
          <button className="border border-[#1f1f1f] text-[#a0a0a0] px-6 py-3 rounded-full hover:border-[#d4a843] hover:text-white transition-all duration-200 text-sm">
            {t("wins.viewMore")}
          </button>
          <p className="text-[#a0a0a0] text-sm text-center">
            {t("wins.cta")}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
