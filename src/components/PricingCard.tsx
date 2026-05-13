import { motion } from "framer-motion";
import { Check, Bitcoin, ArrowRight } from "lucide-react";
import type { PricingPlan } from "@/data/pricing";

interface PricingCardProps {
  plan: PricingPlan;
  onPayCrypto: (plan: PricingPlan) => void;
}

export default function PricingCard({ plan, onPayCrypto }: PricingCardProps) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className={`relative bg-[#0d0d0d] rounded-2xl p-10 border ${plan.premium ? "border-[#d4a843]" : "border-[#1f1f1f]"} ${plan.premium ? "shadow-[0_0_40px_rgba(212,168,67,0.1)]" : ""}`}>
      {plan.premium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[#d4a843] text-xs font-semibold tracking-wider uppercase bg-[#0d0d0d] px-3 py-1 border border-[#d4a843] rounded-full">✦ Premium</span>
        </div>
      )}
      <div className="mb-2"><span className="text-white text-lg font-semibold">{plan.name}</span></div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[#666666] text-lg line-through">{plan.originalPrice}</span>
        <span className={`text-4xl font-bold ${plan.premium ? "text-[#d4a843]" : "text-white"}`}>{plan.salePrice}</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-[#e11d48] text-white text-xs font-medium px-2 py-1 rounded-full">🌸 Sakura Spring Sale</span>
        <span className="text-[#e11d48] text-sm font-semibold">{plan.discount}</span>
      </div>
      <p className="text-[#a0a0a0] text-sm mb-6">{plan.period}</p>
      <ul className="space-y-3 mb-8">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <Check size={16} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
            <span className="text-[#a0a0a0]">{f.includes("BUY") ? <>{f.split("BUY")[0]}<span className="text-[#22c55e] font-semibold">BUY</span>{" & "}<span className="text-[#e11d48] font-semibold">SELL</span>{f.split("SELL")[1]}</> : f}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        <button onClick={() => onPayCrypto(plan)} className={`w-full py-3 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${plan.premium ? "bg-[#d4a843] text-[#050505] hover:bg-[#e8c76a] hover:scale-[1.02]" : "bg-[#1f1f1f] text-white border border-[#1f1f1f] hover:border-[#d4a843]"}`}>
          {plan.cta}<ArrowRight size={16} />
        </button>
        <button onClick={() => onPayCrypto(plan)} className="w-full py-3 rounded-full font-semibold text-sm border border-[#1f1f1f] text-[#a0a0a0] hover:border-[#22c55e] hover:text-[#22c55e] transition-all duration-200 flex items-center justify-center gap-2">
          <Bitcoin size={16} />Pay with USDT (TRC20)
        </button>
      </div>
    </motion.div>
  );
}
