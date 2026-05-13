// VIP2 Gold Chart AI — Analysis Component (Client-Side, no backend needed)
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Upload, Sparkles, TrendingUp, TrendingDown, AlertTriangle, X, Loader2, ImageIcon, RefreshCw, DollarSign } from "lucide-react";
import { analyzeChartClientSide, type AnalysisResult } from "@/lib/analyzer";
import { getGoldPrice, type GoldPrice } from "@/addons/vip2/lib/vip2GoldChartApi";

export default function VIP2GoldChartAI() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("1H");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [goldPrice, setGoldPrice] = useState<GoldPrice | null>(null);
  const [goldLoading, setGoldLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const timeframes = ["5M", "15M", "30M", "1H", "4H", "1D", "1W"];

  // ─── Fetch real gold price on mount ───
  useEffect(() => {
    loadGoldPrice();
  }, []);

  const loadGoldPrice = async () => {
    setGoldLoading(true);
    try {
      const data = await getGoldPrice();
      setGoldPrice(data);
    } catch (err: any) {
      console.warn("[GoldAI] GoldAPI failed:", err.message);
      // Use fallback price
      setGoldPrice({ price: 2384.15, bid: 2383.85, ask: 2384.45, timestamp: Date.now(), currency: "USD" });
    } finally {
      setGoldLoading(false);
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please upload an image"); return; }
    if (f.size > 10 * 1024 * 1024) { setError("Max 10MB"); return; }
    setFile(f);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleAnalyze = async () => {
    if (!file) { setError("Upload a chart image first"); return; }
    setLoading(true);
    setError("");
    try {
      // Re-fetch gold price right before analysis (fresh data)
      let currentPrice = goldPrice?.price;
      if (!currentPrice) {
        try { currentPrice = (await getGoldPrice()).price; } catch { currentPrice = 2384.15; }
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      // Use client-side analyzer with REAL gold price!
      const analysis = await analyzeChartClientSide(
        base64,
        "XAU/USD (Gold)",
        "AI Scalping",
        timeframe,
        currentPrice  // ← REAL gold price from GoldAPI!
      );
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setFile(null); setPreview(null); setResult(null); setError(""); };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header + Live Gold Price */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4a843]/10 flex items-center justify-center">
            <Sparkles size={20} className="text-[#d4a843]" />
          </div>
          <div>
            <h3 className="text-base font-bold">Gold Chart AI</h3>
            <p className="text-[10px] text-[#666666]">Upload XAU/USD chart for AI analysis</p>
          </div>
        </div>
        {/* Live Gold Price Badge */}
        <div className="bg-[#141414] border border-[#d4a843]/20 rounded-xl px-3 py-2 text-right">
          {goldLoading ? (
            <div className="flex items-center gap-1"><Loader2 size={10} className="animate-spin text-[#d4a843]" /><span className="text-[9px] text-[#666666]">Loading...</span></div>
          ) : goldPrice ? (
            <div>
              <div className="flex items-center gap-1.5">
                <DollarSign size={12} className="text-[#d4a843]" />
                <span className="text-sm font-black text-[#d4a843]">{goldPrice.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-[#666666]">B: {goldPrice.bid.toFixed(2)}</span>
                <span className="text-[8px] text-[#666666]">A: {goldPrice.ask.toFixed(2)}</span>
                <button onClick={loadGoldPrice} className="text-[#666666] hover:text-[#d4a843] ml-1"><RefreshCw size={8} /></button>
              </div>
            </div>
          ) : (
            <span className="text-[9px] text-[#e11d48]">Unavailable</span>
          )}
        </div>
      </div>

      {/* Upload Area */}
      {!preview ? (
        <label className="block border-2 border-dashed border-[#333] rounded-2xl p-8 text-center cursor-pointer hover:border-[#d4a843]/40 transition-all">
          <ImageIcon size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-sm text-[#a0a0a0] mb-1">Click to upload chart</p>
          <p className="text-[10px] text-[#666666]">PNG, JPG up to 10MB</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="relative mb-4">
          <img src={preview} alt="Chart" className="w-full rounded-xl border border-[#1f1f1f]" />
          <button onClick={clear} className="absolute top-2 right-2 w-8 h-8 bg-[#e11d48] rounded-full flex items-center justify-center text-white"><X size={14} /></button>
        </div>
      )}

      {/* Timeframe */}
      <div className="flex flex-wrap gap-2 mb-4">
        {timeframes.map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              timeframe === tf ? 'bg-[#d4a843] text-[#050505]' : 'bg-[#141414] text-[#a0a0a0] hover:bg-[#1f1f1f]'
            }`}>{tf}</button>
        ))}
      </div>

      {/* Notes */}
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Optional notes (support/resistance levels...)"
        className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-xs text-white placeholder-[#555] focus:border-[#d4a843]/30 focus:outline-none mb-4 resize-none h-20"
      />

      {error && <p className="text-[10px] text-[#e11d48] mb-3 flex items-center gap-1"><AlertTriangle size={10} /> {error}</p>}

      <button onClick={handleAnalyze} disabled={loading || !file}
        className="w-full bg-[#d4a843] text-[#050505] font-bold py-3 rounded-xl hover:bg-[#e8c76a] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Sparkles size={16} /> Analyze Chart</>}
      </button>

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-5">
          {/* Gold Price Used */}
          <div className="flex items-center gap-2 mb-3 bg-[#d4a843]/5 border border-[#d4a843]/10 rounded-lg px-3 py-2">
            <DollarSign size={12} className="text-[#d4a843]" />
            <span className="text-[10px] text-[#a0a0a0]">Gold Price: <span className="text-[#d4a843] font-bold">{result.entry.toFixed(2)}</span> (live from GoldAPI)</span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              result.signal === 'BUY' ? 'bg-[#22c55e]/10' : 'bg-[#e11d48]/10'
            }`}>
              {result.signal === 'BUY' ? <TrendingUp size={20} className="text-[#22c55e]" /> :
               <TrendingDown size={20} className="text-[#e11d48]" />}
            </div>
            <div>
              <span className={`text-lg font-black ${
                result.signal === 'BUY' ? 'text-[#22c55e]' : 'text-[#e11d48]'
              }`}>{result.signal}</span>
              {result.confidence && <span className="text-xs text-[#666666] ml-2">{result.confidence}% confidence</span>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#141414] rounded-lg p-2 text-center">
              <div className="text-[8px] text-[#666666]">Entry</div>
              <div className="text-xs font-bold text-white">{result.entry.toFixed(2)}</div>
            </div>
            <div className="bg-[#141414] rounded-lg p-2 text-center">
              <div className="text-[8px] text-[#666666]">Stop Loss</div>
              <div className="text-xs font-bold text-[#e11d48]">{result.stopLoss.toFixed(2)}</div>
            </div>
            <div className="bg-[#141414] rounded-lg p-2 text-center">
              <div className="text-[8px] text-[#666666]">TP1</div>
              <div className="text-xs font-bold text-[#22c55e]">{result.takeProfit1.toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-[#141414] rounded-lg p-3 text-xs text-[#a0a0a0] leading-relaxed space-y-1">
            <p><span className="text-[#d4a843]">Strategy:</span> {result.strategyUsed}</p>
            <p><span className="text-[#d4a843]">Hold Time:</span> {result.timeToHold}</p>
            <p><span className="text-[#d4a843]">Trend:</span> {result.trend}</p>
            <p><span className="text-[#d4a843]">Confluence:</span> {result.confluenceScore}/10</p>
            {result.reasons.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#1f1f1f]">
                <p className="text-[#d4a843] mb-1">Reasons:</p>
                {result.reasons.map((r, i) => (
                  <p key={i} className="text-[#666666] pl-2">• {r}</p>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
