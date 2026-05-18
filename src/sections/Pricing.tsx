import { useState } from "react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/ScrollReveal";
import PricingCard from "@/components/PricingCard";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";
import { pricingPlans } from "@/data/pricing";
import type { PricingPlan } from "@/data/pricing";

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openPayment = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <section id="pricing" className="bg-[#050505] py-24">
      <div className="max-w-[800px] mx-auto px-6">
        <ScrollReveal className="text-center mb-4"><p className="text-[#e11d48] text-sm mb-2">🌸 Sakura Spring Sale: Lock in current pricing before it ends.</p></ScrollReveal>
        <ScrollReveal delay={0.1} className="text-center"><h2 className="text-white text-4xl font-bold mb-2">Start Trading Smarter Today</h2><p className="text-[#a0a0a0] text-base">Cancel anytime.</p></ScrollReveal>
        <div className="mt-12">
          <div className="text-center mb-8"><span className="text-[#666666] text-xs font-mono uppercase tracking-wider">[ CHOOSE_YOUR_PATH ]</span><p className="text-[#a0a0a0] text-sm mt-2">Select the perfect plan to accelerate your trading journey.</p></div>
          <div className="grid md:grid-cols-2 gap-8">
            {pricingPlans.filter(p => !p.testOnly).map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: i * 0.15 }}>
                <PricingCard plan={plan} onPayCrypto={openPayment} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <CryptoPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} planName={selectedPlan?.name || ""} amount={selectedPlan?.salePrice.replace("$", "") || ""} />
    </section>
  );
}
