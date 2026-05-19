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
const iconMap: Record<string, React.ElementType> = {
  Target,
  Zap,
  TrendingUp,
  BarChart3,
  Fish,
  Globe,
};

type FeatureCardData = {
  icon: string;
  title: string;
  description: string;
  bullets: string[];
  footer: string;
};

export default function FeatureCard({ data }: { data: FeatureCardData }) {
  const Icon = iconMap[data.icon] || Target;

  return (
    <motion.div
      whileHover={{ y: -6, borderColor: "rgba(24, 200, 255, 0.55)" }}
      transition={{ duration: 0.3 }}
      className="tv-neon-card rounded-2xl p-8 transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-full bg-[#18c8ff]/10 border border-[#18c8ff]/25 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(24,200,255,0.18)]">
        <Icon size={20} className="text-[#18c8ff]" />
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
