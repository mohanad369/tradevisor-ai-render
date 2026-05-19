import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import LivePulse from "./LivePulse";
import type { WinCardData } from "@/data/wins";

export default function WinCard({ data }: { data: WinCardData }) {
  return (
    <motion.div
      whileHover={{ y: -6, borderColor: "rgba(34, 226, 116, 0.55)" }}
      transition={{ duration: 0.3 }}
      className="tv-neon-card tv-green-card rounded-2xl p-6 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-3">
        <LivePulse size={6} />
        <span className="text-[#22c55e] text-xs font-medium uppercase tracking-wider">
          Live
        </span>
      </div>

      <div className="text-white text-xl font-bold mb-1">{data.ticker}</div>
      <div className="text-[#22c55e] text-2xl font-bold mb-2">{data.profit}</div>
      <div className="text-[#a0a0a0] text-sm mb-4">
        AI Signal - {data.signalType}
      </div>

      <div className="border-t border-[#22e274]/15 pt-4">
        <div className="flex justify-between text-sm mb-2">
          <div>
            <span className="text-[#666666]">Entry: </span>
            <span className="text-white">{data.entry}</span>
          </div>
          <div>
            <span className="text-[#666666]">Exit: </span>
            <span className="text-white">{data.exit}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#22c55e] font-semibold text-sm mb-3">
          <TrendingUp size={16} />
          <span>Profit {data.totalProfit}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#22e274]/10 border border-[#22e274]/20 flex items-center justify-center text-[#a0a0a0] text-xs font-medium">
            {data.handle.charAt(1).toUpperCase()}
          </div>
          <span className="text-[#666666] text-sm">{data.handle}</span>
        </div>
      </div>
    </motion.div>
  );
}
