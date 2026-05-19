import { motion } from "framer-motion";
import { Check, Bitcoin, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language";

export interface PricingCardPlan {
  name: string;
  originalPrice: string;
  salePrice: string;
  discount: string;
  period: string;
  features: string[];
  cta: string;
  premium?: boolean;
}

interface PricingCardProps {
  plan: PricingCardPlan;
  onPayCrypto: (plan: PricingCardPlan) => void;
}

export default function PricingCard({ plan, onPayCrypto }: PricingCardProps) {
  const { t } = useLanguage();

  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.3 }} className={`relative tv-neon-card rounded-2xl p-10 ${plan.premium ? "tv-gold-card" : ""}`}>
      {plan.premium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="tv-neon-pill text-[#d4a843] text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full">{t("pricing.premium")}</span>
        </div>
      )}
      <div className="mb-2"><span className="text-white text-lg font-semibold">{plan.name}</span></div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[#666666] text-lg line-through">{plan.originalPrice}</span>
        <span className={`text-4xl font-bold ${plan.premium ? "text-[#d4a843]" : "text-white"}`}>{plan.salePrice}</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-[#e11d48] text-white text-xs font-medium px-2 py-1 rounded-full">{t("pricing.spring")}</span>
        <span className="text-[#e11d48] text-sm font-semibold">{plan.discount}</span>
      </div>
      <p className="text-[#a0a0a0] text-sm mb-6">{plan.period}</p>
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check size={16} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
            <span className="text-[#a0a0a0]">{feature}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        <button onClick={() => onPayCrypto(plan)} className={`w-full py-3 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${plan.premium ? "bg-[#d4a843] text-[#050505] hover:bg-[#e8c76a] hover:scale-[1.02] tv-button-glow" : "bg-[#18c8ff]/10 text-white border border-[#18c8ff]/25 hover:border-[#18c8ff]/60"}`}>
          {plan.cta}<ArrowRight size={16} />
        </button>
        <button onClick={() => onPayCrypto(plan)} className="w-full py-3 rounded-full font-semibold text-sm border border-[#22c55e]/20 text-[#a0a0a0] hover:border-[#22c55e] hover:text-[#22c55e] transition-all duration-200 flex items-center justify-center gap-2">
          <Bitcoin size={16} />{t("pricing.payUsdt")}
        </button>
      </div>
    </motion.div>
  );
}
