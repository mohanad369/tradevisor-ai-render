import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import LivePulse from "./LivePulse";
import type { WinCardData } from "@/data/wins";

export default function WinCard({ data }: { data: WinCardData }) {
  return (
    <motion.div
      whileHover={{ y: -4, borderColor: "#d4a843" }}
      transition={{ duration: 0.3 }}
      className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-shadow duration-300"
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

      <div className="border-t border-[#1f1f1f] pt-4">
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
          <div className="w-6 h-6 rounded-full bg-[#1f1f1f] flex items-center justify-center text-[#a0a0a0] text-xs font-medium">
            {data.handle.charAt(1).toUpperCase()}
          </div>
          <span className="text-[#666666] text-sm">{data.handle}</span>
        </div>
      </div>
    </motion.div>
  );
}
