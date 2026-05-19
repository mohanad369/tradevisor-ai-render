import { motion } from "framer-motion";
import type { TestimonialData } from "@/data/testimonials";

export default function TestimonialCard({ data }: { data: TestimonialData }) {
  return (
    <motion.div
      whileHover={{ y: -6, borderColor: "rgba(155, 92, 255, 0.52)" }}
      transition={{ duration: 0.3 }}
      className="tv-neon-card rounded-2xl p-6 transition-all duration-300 flex flex-col"
    >
      <p className="text-white text-sm leading-relaxed mb-4 flex-grow">
        "{data.quote}"
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[#666666] text-sm">{data.handle}</span>
        <span className="tv-neon-pill text-[#d4a843] text-xs font-medium px-3 py-1.5 rounded-full">
          {data.profitTag}
        </span>
      </div>
    </motion.div>
  );
}
