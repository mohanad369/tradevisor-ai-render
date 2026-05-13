import { motion } from "framer-motion";
import type { TestimonialData } from "@/data/testimonials";

export default function TestimonialCard({ data }: { data: TestimonialData }) {
  return (
    <motion.div
      whileHover={{ y: -4, borderColor: "#d4a843" }}
      transition={{ duration: 0.3 }}
      className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-shadow duration-300 flex flex-col"
    >
      <p className="text-white text-sm leading-relaxed mb-4 flex-grow">
        "{data.quote}"
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[#666666] text-sm">{data.handle}</span>
        <span className="bg-[#141414] border border-[#1f1f1f] text-[#d4a843] text-xs font-medium px-3 py-1.5 rounded-full">
          {data.profitTag}
        </span>
      </div>
    </motion.div>
  );
}
