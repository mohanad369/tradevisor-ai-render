import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface GoldPrice {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

export default function LivePriceTicker() {
  const [prices, setPrices] = useState<Record<string, GoldPrice>>({});
  const [loading, setLoading] = useState(true);

  // Use tRPC to fetch gold price from backend (Yahoo Finance, no CORS)
  const { data: goldData } = trpc.vip.getGoldPrice.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 2,
  });

  useEffect(() => {
    if (goldData) {
      setPrices({
        XAU: {
          price: goldData.price,
          change: goldData.change,
          changePercent: goldData.changePercent,
          high: goldData.high,
          low: goldData.low,
        },
      });
      setLoading(false);
    }
  }, [goldData]);

  // Client-side fallback if tRPC fails
  useEffect(() => {
    if (!loading || goldData) return;

    let mounted = true;

    async function fetchBinance() {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=XAUUSDT");
        if (!res.ok) return;
        const data = await res.json();
        const price = parseFloat(data.lastPrice) || 0;
        const open = parseFloat(data.openPrice) || price;
        const change = parseFloat(data.priceChange) || 0;
        const changePercent = parseFloat(data.priceChangePercent) || 0;

        if (mounted) {
          setPrices({
            XAU: {
              price,
              change,
              changePercent,
              high: parseFloat(data.highPrice) || price,
              low: parseFloat(data.lowPrice) || price,
            },
          });
          setLoading(false);
        }
      } catch {
        // silently fail
      }
    }

    fetchBinance();
    const interval = setInterval(fetchBinance, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [loading, goldData]);

  const gold = prices.XAU;
  const goldUp = (gold?.changePercent || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl px-4 py-2.5 flex items-center gap-4 flex-wrap"
    >
      {/* Gold */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#d4a843] text-sm font-bold">XAU/USD</span>
        <span className="text-[10px] bg-[#22c55e]/20 text-[#22c55e] px-1.5 py-0.5 rounded font-medium animate-pulse">LIVE</span>
      </div>

      {loading && !gold ? (
        <div className="flex items-center gap-1.5">
          <Activity size={14} className="text-[#d4a843] animate-spin" />
          <span className="text-white font-bold text-base">---</span>
        </div>
      ) : (
        <>
          <span className="text-white font-bold text-base">
            ${gold?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 text-xs font-medium ${goldUp ? "text-[#22c55e]" : "text-[#e11d48]"}`}>
            {goldUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{goldUp ? "+" : ""}{gold?.changePercent?.toFixed(2)}%</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#666666]">
            <span>H: <span className="text-[#a0a0a0]">${gold?.high?.toFixed(2)}</span></span>
            <span>L: <span className="text-[#a0a0a0]">${gold?.low?.toFixed(2)}</span></span>
          </div>
        </>
      )}

      {/* Pulse */}
      <div className="ml-auto">
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
      </div>
    </motion.div>
  );
}
