import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { fetchMarketQuotes } from "@/lib/marketPrices";

interface GoldPrice {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

const PRICE_REFRESH_MS = 10_000;
const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "");

export default function LivePriceTicker() {
  const [prices, setPrices] = useState<Record<string, GoldPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const streamHealthyRef = useRef(false);

  // Client-side live price fallback for static hosting and Android builds.
  useEffect(() => {
    let mounted = true;
    let eventSource: EventSource | null = null;

    async function fetchGoldQuote() {
      if (streamHealthyRef.current) return;
      try {
        const quotes = await fetchMarketQuotes();
        const quote = quotes["XAU/USD"];
        if (!quote) throw new Error("Gold quote unavailable");

        if (mounted) {
          setPrices({
            XAU: {
              price: quote.price,
              change: quote.changeAmount,
              changePercent: quote.change,
              high: quote.high,
              low: quote.low,
            },
          });
          setLoading(false);
          setError(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
          setError(true);
        }
      }
    }

    fetchGoldQuote();
    const interval = setInterval(fetchGoldQuote, PRICE_REFRESH_MS);

    try {
      const streamUrl = `${configuredApiOrigin || window.location.origin}/api/market/gold/stream`;
      eventSource = new EventSource(streamUrl);
      eventSource.addEventListener("quote", (event) => {
        if (!mounted) return;
        streamHealthyRef.current = true;
        const quote = JSON.parse((event as MessageEvent).data);
        setPrices({
          XAU: {
            price: quote.price,
            change: quote.changeAmount,
            changePercent: quote.change,
            high: quote.high,
            low: quote.low,
          },
        });
        setLoading(false);
        setError(false);
      });
      eventSource.onerror = () => {
        streamHealthyRef.current = false;
        eventSource?.close();
        eventSource = null;
      };
    } catch {
      // Polling fallback remains active.
    }

    return () => {
      mounted = false;
      streamHealthyRef.current = false;
      clearInterval(interval);
      eventSource?.close();
    };
  }, []);

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
          <span className="text-white font-bold text-base">Connecting</span>
        </div>
      ) : error && !gold ? (
        <span className="text-[#e11d48] text-xs font-bold">PRICE API OFFLINE</span>
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
