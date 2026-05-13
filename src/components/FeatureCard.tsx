import { motion } from "framer-motion";
import {
  Target,
  Zap,
  TrendingUp,
  BarChart3,
  Fish,
  Globe,
  Check,
  Sparkles,
} from "lucide-react";
import type { FeatureData } from "@/data/features";

const iconMap: Record<string, React.ElementType> = {
  Target,
  Zap,
  TrendingUp,
  BarChart3,
  Fish,
  Globe,
};

export default function FeatureCard({ data }: { data: FeatureData }) {
  const Icon = iconMap[data.icon] || Target;

  return (
    <motion.div
      whileHover={{ y: -4, borderColor: "#d4a843" }}
      transition={{ duration: 0.3 }}
      className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-8 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-shadow duration-300"
    >
      <div className="w-10 h-10 rounded-full bg-[#141414] flex items-center justify-center mb-4">
        <Icon size={20} className="text-[#d4a843]" />
      </div>

      <h3 className="text-white text-lg font-semibold mb-3">{data.title}</h3>
      <p className="text-[#a0a0a0] text-sm leading-relaxed mb-4">
        {data.description}
      </p>

      <ul className="space-y-2 mb-4">
        {data.bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2 text-sm">
            <Check size={14} className="text-[#22c55e] flex-shrink-0" />
            <span className="text-[#a0a0a0]">{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 text-[#d4a843] text-sm">
        <Sparkles size={14} />
        <span>{data.footer}</span>
      </div>
    </motion.div>
  );
}
