import { motion } from "framer-motion";
import ScrollReveal from "@/components/ScrollReveal";
import FeatureCard from "@/components/FeatureCard";
import { featuresData } from "@/data/features";

export default function Features() {
  return (
    <section id="features" className="bg-[#050505] py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <h2 className="text-white text-4xl font-bold mb-4">
            AI-Powered Trading Tools
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-[#a0a0a0] text-base mb-12 max-w-2xl">
            Stop guessing. Start winning. Our AI analyzes millions of data points
            per second to give you unfair advantages in the market.
          </p>
        </ScrollReveal>

        {/* Top Metrics Bar */}
        <ScrollReveal delay={0.2}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16"
          >
            {[
              { value: "94.7%", label: "Win Rate", context: "Last 90 days" },
              { value: "$100→$3,400", label: "Average Return", context: "34× gain" },
              { value: "0.7s", label: "Alert Speed", context: "Lightning fast" },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="text-[#d4a843] text-3xl font-bold">
                  {metric.value}
                </div>
                <div className="text-white text-sm font-medium mt-1">
                  {metric.label}
                </div>
                <div className="text-[#666666] text-xs">{metric.context}</div>
              </div>
            ))}
          </motion.div>
        </ScrollReveal>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresData.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            >
              <FeatureCard data={feature} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
