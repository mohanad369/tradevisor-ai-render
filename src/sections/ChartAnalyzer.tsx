import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Loader2, ArrowDown, BarChart3, TrendingUp, DollarSign, Zap, Lock, Crown, Network, FileSearch, ShieldCheck, Cpu } from "lucide-react";
import { useNavigate } from "react-router";
import { analyzeChartClientSide, type AnalysisResult } from "@/lib/analyzer";
import { getCachedPrice } from "@/lib/goldapi";
import { getMetalsPrices } from "@/lib/metals";
import { getAssetMarketPair, formatAssetPrice } from "@/lib/assetMarket";
import { fetchMarketQuote } from "@/lib/marketPrices";
import ChartUpload from "@/components/ChartUpload";
import AnalysisResultPanel, { AnalysisOverlay } from "@/components/AnalysisOverlay";
import LivePriceTicker from "@/components/LivePriceTicker";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";
import { strategies, assets } from "@/data/strategies";
import type { Strategy, Asset } from "@/data/strategies";
import { useLanguage } from "@/lib/language";
import { trpc } from "@/lib/trpc";

const ANALYSIS_COUNT_KEY = "tradevisor_analysis_count";
const FREE_LIMIT = 4;
const DEV_MODE_KEY = "tradevisor_dev_mode";

// localStorage is only a fast UI hint — the SERVER is the source of
// truth for the free limit (see trial.* tRPC procedures). Clearing
// localStorage no longer grants extra free analyses.
function getAnalysisCount(): number {
  try {
    return parseInt(localStorage.getItem(ANALYSIS_COUNT_KEY) || "0", 10);
  } catch { return 0; }
}
function setAnalysisCountLocal(count: number): void {
  try {
    localStorage.setItem(ANALYSIS_COUNT_KEY, String(count));
  } catch { /* storage may be unavailable */ }
}
function isDeveloperMode(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === "true";
  } catch { return false; }
}

function getDefaultDecimals(asset: Asset): number {
  if (asset.type === "forex") return asset.id === "usdjpy" || asset.id === "gbpjpy" ? 3 : 5;
  if (asset.type === "gold") return 2;
  if (asset.type === "crypto") return asset.id === "btcusd" ? 0 : 2;
  return 2;
}

function AnalyzerAtmosphere() {
  const particles = ["#18c8ff", "#22c55e", "#d4a843", "#9b5cff", "#ff4f93"];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(24,200,255,0.15),transparent_30%),radial-gradient(circle_at_16%_46%,rgba(34,197,94,0.10),transparent_28%),radial-gradient(circle_at_86%_44%,rgba(255,79,147,0.10),transparent_30%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(24,200,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(212,168,67,0.05)_1px,transparent_1px)] [background-size:46px_46px]" />
      <motion.div
        className="absolute left-1/2 top-28 h-44 w-44 -translate-x-1/2 rounded-full border border-[#18c8ff]/25"
        animate={{ scale: [0.92, 1.12, 0.92], opacity: [0.22, 0.55, 0.22] }}
        transition={{ duration: 3.2, repeat: Infinity }}
      />
      {particles.map((color, index) => (
        <motion.span
          key={color}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: color,
            left: `${14 + index * 18}%`,
            top: `${18 + (index % 2) * 54}%`,
            boxShadow: `0 0 18px ${color}`,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2.4 + index * 0.25, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function StatusTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      className="rounded-2xl border bg-black/35 p-3 backdrop-blur-sm"
      style={{ borderColor: `${color}38` }}
      animate={{ boxShadow: [`0 0 10px ${color}10`, `0 0 26px ${color}24`, `0 0 10px ${color}10`] }}
      transition={{ duration: 2.8, repeat: Infinity }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} style={{ color }} />
        <span className="text-[9px] font-black uppercase tracking-wider text-[#7b8da3]">{label}</span>
      </div>
      <p className="truncate text-sm font-black" style={{ color }}>{value}</p>
    </motion.div>
  );
}

function LiveAnalyzerStatus({ selectedAsset, realPrice, manualPrice }: { selectedAsset: Asset; realPrice?: number; manualPrice: string }) {
  const quote = manualPrice || (realPrice ? formatAssetPrice(realPrice, selectedAsset) : "Connecting");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
      <StatusTile icon={Network} label="AI Network" value="Linked" color="#18c8ff" />
      <StatusTile icon={FileSearch} label="Chart Read" value="Vision Ready" color="#9b5cff" />
      <StatusTile icon={ShieldCheck} label="Risk Gate" value="Strict" color="#ff4f93" />
      <StatusTile icon={Cpu} label={selectedAsset.name} value={quote} color="#d4a843" />
    </div>
  );
}

function AnalyzerFeatureStrip() {
  return (
    <div className="mt-2 grid w-full max-w-sm grid-cols-3 gap-2">
      {[
        ["News", "#18c8ff"],
        ["Momentum", "#22c55e"],
        ["Risk", "#ff4f93"],
      ].map(([label, color]) => (
        <div key={label} className="rounded-xl border bg-black/30 px-3 py-2 text-center" style={{ borderColor: `${color}35` }}>
          <motion.div
            className="mx-auto mb-1 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
            animate={{ scale: [0.8, 1.45, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <p className="text-[9px] font-black uppercase text-[#9aa7b8]">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function ChartAnalyzer() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[4]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(strategies[1]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1H");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [realPrice, setRealPrice] = useState<number | undefined>(undefined);
  const [manualPrice, setManualPrice] = useState<string>("");
  const [usedOpenAI, setUsedOpenAI] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(getAnalysisCount());
  const [developerMode, setDeveloperMode] = useState(isDeveloperMode());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Server-backed free-trial state (source of truth — survives a
  // localStorage wipe or a fresh browser).
  const [serverUnlimited, setServerUnlimited] = useState(false);

  const trialStatus = trpc.trial.status.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const consumeTrial = trpc.trial.consume.useMutation();

  // Sync the server count into local UI state once it loads.
  useEffect(() => {
    const data = trialStatus.data;
    if (!data) return;
    if (data.unlimited) {
      setServerUnlimited(true);
      return;
    }
    setServerUnlimited(false);
    setAnalysisCount(data.used);
    setAnalysisCountLocal(data.used);
  }, [trialStatus.data]);

  const assetDecimals = getDefaultDecimals(selectedAsset);

  // Fetch live market price for the selected asset when available.
  useEffect(() => {
    setDeveloperMode(isDeveloperMode());
    let cancelled = false;
    setRealPrice(undefined);

    if (selectedAsset.name === "XAU/USD (Gold)") {
      getCachedPrice("XAU", 30000)
        .then((p) => { if (!cancelled) setRealPrice(p.price); })
        .catch(() => {
          fetchMarketQuote("XAU/USD")
            .then((quote) => { if (!cancelled) setRealPrice(quote?.price); })
            .catch(() => { if (!cancelled) setRealPrice(undefined); });
        });
    } else {
      fetchMarketQuote(getAssetMarketPair(selectedAsset))
        .then((quote) => { if (!cancelled) setRealPrice(quote?.price); })
        .catch(() => { if (!cancelled) setRealPrice(undefined); });
    }

    return () => { cancelled = true; };
  }, [selectedAsset.name]);

  const handleAnalyze = async () => {
    if (!uploadedImage) return;

    const hasDeveloperAccess = isDeveloperMode();
    setDeveloperMode(hasDeveloperAccess);

    // VIP / developer / unlimited accounts skip the limit entirely.
    const unlimited = hasDeveloperAccess || serverUnlimited;

    // Check the free limit against the SERVER (the localStorage count is
    // only a hint and can be wiped). If the server says the visitor is
    // out of free analyses, show the subscribe modal.
    if (!unlimited) {
      try {
        const status = await trialStatus.refetch();
        if (status.data && !status.data.unlimited && status.data.remaining <= 0) {
          setAnalysisCount(status.data.used);
          setAnalysisCountLocal(status.data.used);
          setShowPaymentModal(true);
          return;
        }
      } catch {
        // If the server check fails, fall back to the local hint so a
        // network blip doesn't hand out unlimited free analyses.
        if (getAnalysisCount() >= FREE_LIMIT) {
          setShowPaymentModal(true);
          return;
        }
      }
    }

    setResult(null);
    setIsAnalyzing(true);
    try {
      // Priority: 1) Manual price input, 2) API price, 3) Asset base price
      let priceBase: number | undefined;

      // Check if user entered a manual price
      const manual = parseFloat(manualPrice);
      if (!isNaN(manual) && manual > 0) {
        priceBase = manual;
      } else if (realPrice && realPrice > 0) {
        priceBase = realPrice;
      }

      // Try to get a fresh real price for any supported asset before analysis.
      if (!priceBase) {
        try {
          const quote = await fetchMarketQuote(getAssetMarketPair(selectedAsset));
          if (quote?.price) {
            priceBase = quote.price;
            setRealPrice(quote.price);
          }
        } catch { /* analysis can still use chart structure without a live price */ }
      }

      if (selectedAsset.name === "XAU/USD (Gold)" && !priceBase) {
        try {
          const metals = await getMetalsPrices();
          priceBase = metals.USDXAU;
          setRealPrice(metals.USDXAU);
        } catch {
          try {
            const fresh = await getCachedPrice("XAU", 30000);
            priceBase = fresh.price;
            setRealPrice(fresh.price);
          } catch { /* analysis can still use chart structure without a live price */ }
        }
      }

      const data = await analyzeChartClientSide(
        uploadedImage,
        selectedAsset.name,
        selectedStrategy.name,
        selectedTimeframe,
        priceBase,
      );
      // Check if OpenAI was used (has specific OpenAI response characteristics)
      setUsedOpenAI(data.reasons.length > 0 && data.reasons[0].includes("price action"));
      setResult(data);

      // Record the consumed analysis on the SERVER for non-unlimited users.
      if (!unlimited) {
        try {
          const res = await consumeTrial.mutateAsync({});
          if (!res.unlimited) {
            setAnalysisCount(res.used);
            setAnalysisCountLocal(res.used);
          }
        } catch {
          // Server unreachable — bump the local hint so the UI still moves.
          const fallback = getAnalysisCount() + 1;
          setAnalysisCount(fallback);
          setAnalysisCountLocal(fallback);
        }
      }
    } catch (error: any) {
      alert(`Analysis failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section id="analyzer" className="relative overflow-hidden bg-[#020509] py-24 text-white">
      <AnalyzerAtmosphere />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Brain size={20} className="text-[#18c8ff] drop-shadow-[0_0_12px_rgba(24,200,255,0.75)]" />
            <span className="text-[#d4a843] text-xs font-black uppercase tracking-[0.28em]">{t("analyzer.eyebrow")}</span>
            <span className="text-[10px] bg-[#18c8ff]/10 text-[#bfefff] border border-[#18c8ff]/25 px-2 py-0.5 rounded-full font-bold">Claude + GPT-4o</span>
          </div>
          <h2 className="text-white text-4xl md:text-5xl font-black mb-3 drop-shadow-[0_0_22px_rgba(24,200,255,0.35)]">{t("analyzer.title")}</h2>
          <p className="text-[#b8c7d9] text-base max-w-2xl mx-auto leading-relaxed">
            {t("analyzer.subtitle")}
          </p>
        </motion.div>

        {/* Live Price + Manual Price Input */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 rounded-[28px] border border-[#18c8ff]/20 bg-[#06101a]/80 p-3 sm:p-4 shadow-[0_0_90px_rgba(24,200,255,0.09)] backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[0.9fr_1.5fr]">
            <LiveAnalyzerStatus selectedAsset={selectedAsset} realPrice={realPrice} manualPrice={manualPrice} />
            <div className="space-y-3">
            {selectedAsset.name === "XAU/USD (Gold)" && <LivePriceTicker />}

            {/* Manual Price Input — for chart price alignment */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#d4a843]/20 bg-black/35 px-4 py-3 shadow-[inset_0_0_24px_rgba(212,168,67,0.04)]">
              <DollarSign size={16} className="text-[#d4a843] flex-shrink-0 drop-shadow-[0_0_10px_rgba(212,168,67,0.6)]" />
              <label className="text-[#b8c7d9] text-xs whitespace-nowrap">
                {t("analyzer.currentPrice")}
              </label>
              <input
                type="number"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder={realPrice ? formatAssetPrice(realPrice, selectedAsset) : "Live price"}
                className="flex-1 bg-[#081018] border border-[#18c8ff]/15 rounded-xl px-3 py-2 text-sm text-white placeholder-[#607085] focus:outline-none focus:border-[#18c8ff] focus:shadow-[0_0_18px_rgba(24,200,255,0.18)] min-w-0"
              />
              <span className="text-[#607085] text-xs">USD</span>
              {manualPrice && (
                <button
                  onClick={() => setManualPrice("")}
                  className="text-[#7b8da3] hover:text-white text-xs px-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Info text */}
            {!manualPrice && (
              <p className="text-[#6f8197] text-[11px] pl-1">
                {realPrice
                  ? `${getAssetMarketPair(selectedAsset)} live price: ${formatAssetPrice(realPrice, selectedAsset)}. ${t("analyzer.tipPrice")}`
                  : t("analyzer.tipPrice")}
              </p>
            )}
            </div>
          </div>
          </motion.div>

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }} className="relative mb-6 overflow-hidden rounded-[28px] border border-[#d4a843]/20 bg-[#070b10]/85 p-4 shadow-[0_0_80px_rgba(212,168,67,0.06)] backdrop-blur-xl">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/70 to-transparent" />
          <div className="flex flex-wrap items-center gap-3">
            {/* Asset Selector */}
            <div className="relative">
              <button onClick={() => setShowAssetDropdown(!showAssetDropdown)} className="flex items-center gap-2 bg-[#081018] border border-[#18c8ff]/15 rounded-xl px-4 py-2.5 text-white text-sm hover:border-[#18c8ff]/60 hover:shadow-[0_0_18px_rgba(24,200,255,0.18)] transition-all">
                <BarChart3 size={14} className="text-[#18c8ff]" />
                <span>{selectedAsset.name}</span>
                <ArrowDown size={12} className="text-[#666666]" />
              </button>
              <AnimatePresence>
                {showAssetDropdown && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute top-full mt-2 left-0 bg-[#06101a] border border-[#18c8ff]/20 rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] z-50 w-56 max-h-64 overflow-y-auto">
                    {assets.map((a) => (
                      <button key={a.id} onClick={() => { setSelectedAsset(a); setManualPrice(""); setShowAssetDropdown(false); setResult(null); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#18c8ff]/10 transition-colors ${selectedAsset.id === a.id ? "text-[#d4a843]" : "text-[#a0a0a0]"}`}>
                        {a.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Strategies */}
            {strategies.map((s) => (
              <button key={s.id} onClick={() => { setSelectedStrategy(s); setResult(null); }} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${selectedStrategy.id === s.id ? "bg-[#d4a843] text-[#050505] shadow-[0_0_22px_rgba(212,168,67,0.28)]" : "bg-[#081018] border border-[#18c8ff]/10 text-[#a0a0a0] hover:border-[#d4a843]/50 hover:text-white hover:shadow-[0_0_16px_rgba(212,168,67,0.12)]"}`}>
                {s.name}
              </button>
            ))}
          </div>
          {/* Timeframes */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#18c8ff]/10">
            <span className="text-[#7b8da3] text-xs mr-1">{t("analyzer.timeframe")}</span>
            {selectedStrategy.timeframes.map((tf) => (
              <button key={tf} onClick={() => { setSelectedTimeframe(tf); setResult(null); }} className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${selectedTimeframe === tf ? "bg-[#d4a843]/15 text-[#d4a843] border border-[#d4a843]/30 shadow-[0_0_14px_rgba(212,168,67,0.16)]" : "bg-transparent text-[#66778c] border border-transparent hover:text-[#b8c7d9]"}`}>
                {tf}
              </button>
            ))}
            <span className="text-[#6f8197] text-xs ml-3">{selectedStrategy.description} &bull; Win Rate: {selectedStrategy.winRate}</span>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Chart + Buttons */}
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden rounded-[28px] border border-[#18c8ff]/20 bg-[#050b12]/90 shadow-[0_0_100px_rgba(24,200,255,0.08)]" style={{ minHeight: 480 }}>
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_12%,rgba(24,200,255,0.12),transparent_32%),radial-gradient(circle_at_82%_70%,rgba(155,92,255,0.12),transparent_34%)]" />
              <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#18c8ff]/80 to-transparent" />
              {/* AI Analyzing Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 z-30 bg-[#020509]/95 flex flex-col items-center justify-center backdrop-blur-md">
                  <motion.div
                    className="mb-5 rounded-full border border-[#18c8ff]/35 p-5 shadow-[0_0_44px_rgba(24,200,255,0.22)]"
                    animate={{ scale: [0.96, 1.04, 0.96], boxShadow: ["0 0 24px rgba(24,200,255,0.15)", "0 0 56px rgba(24,200,255,0.35)", "0 0 24px rgba(24,200,255,0.15)"] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    <Loader2 size={44} className="text-[#18c8ff] animate-spin" />
                  </motion.div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} className="text-[#d4a843]" />
                    <span className="text-[#d4a843] text-xs font-black uppercase tracking-wider">Powered by Claude + GPT-4o Vision</span>
                  </div>
                  <p className="text-white font-semibold text-lg mb-1">{t("analyzer.analyzing")}</p>
                  <p className="text-[#7b8da3] text-sm mb-1">{t("analyzer.analyzingSteps")}</p>
                  <p className="text-[#7b8da3] text-xs">{selectedAsset.name} &bull; {selectedStrategy.name} &bull; {selectedTimeframe}</p>
                  <div className="mt-5 w-64 h-1 bg-[#0d1824] rounded-full overflow-hidden">
                    <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "easeInOut" }} className="h-full bg-gradient-to-r from-[#18c8ff] via-[#d4a843] to-[#ff4f93] rounded-full" />
                  </div>
                </div>
              )}
              <ChartUpload
                onImageUpload={(src) => { setUploadedImage(src); setResult(null); }}
                uploadedImage={uploadedImage}
                onClear={() => { setUploadedImage(null); setResult(null); }}
              />
              {/* AI Lines Overlay */}
              {uploadedImage && result && (
                <AnalysisOverlay result={result} assetDecimals={assetDecimals} />
              )}
            </div>

            {/* Free Analysis Counter */}
            {(developerMode || serverUnlimited) ? (
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="text-[10px] text-[#d4a843] bg-[#d4a843]/10 border border-[#d4a843]/20 rounded-full px-3 py-1">
                  {developerMode ? "Developer unlimited analysis" : "VIP unlimited analysis"}
                </span>
              </div>
            ) : analysisCount < FREE_LIMIT && (
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="text-[10px] text-[#666666] bg-[#141414] border border-[#1f1f1f] rounded-full px-3 py-1">
                  {FREE_LIMIT - analysisCount} free analysis{(FREE_LIMIT - analysisCount) !== 1 ? 'es' : ''} remaining
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4">
              {uploadedImage && !result && !isAnalyzing && (developerMode || serverUnlimited || analysisCount < FREE_LIMIT) && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleAnalyze} className="w-full bg-gradient-to-r from-[#18c8ff] via-[#d4a843] to-[#22c55e] text-[#020509] font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all duration-200 shadow-[0_0_34px_rgba(24,200,255,0.18)]">
                  <Sparkles size={18} />
                  {t("analyzer.analyze")}
                </motion.button>
              )}
              {uploadedImage && !result && !isAnalyzing && !developerMode && !serverUnlimited && analysisCount >= FREE_LIMIT && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setShowPaymentModal(true)} className="w-full bg-gradient-to-r from-[#d4a843] to-[#f2a900] text-[#050505] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all duration-200 animate-pulse shadow-[0_0_30px_rgba(212,168,67,0.22)]">
                  <Lock size={18} />
                  {t("analyzer.unlock")}
                  <Crown size={16} />
                </motion.button>
              )}
              {result && (developerMode || serverUnlimited || analysisCount < FREE_LIMIT) && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleAnalyze} className="w-full border border-[#18c8ff]/20 bg-[#06101a]/75 text-[#b8c7d9] font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:border-[#d4a843]/60 hover:text-white hover:shadow-[0_0_24px_rgba(212,168,67,0.12)] transition-all duration-200">
                  <Brain size={18} />
                  {t("analyzer.reanalyze")}
                  <span className="text-[10px] bg-[#141414] text-[#666666] px-2 py-0.5 rounded-full ml-1">{(developerMode || serverUnlimited) ? "∞" : `${FREE_LIMIT - analysisCount} left`}</span>
                </motion.button>
              )}
              {result && !developerMode && !serverUnlimited && analysisCount >= FREE_LIMIT && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setShowPaymentModal(true)} className="w-full bg-gradient-to-r from-[#d4a843] to-[#f2a900] text-[#050505] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all duration-200 animate-pulse shadow-[0_0_30px_rgba(212,168,67,0.22)]">
                  <Lock size={18} />
                  {t("analyzer.unlock")}
                  <Crown size={16} />
                </motion.button>
              )}
            </div>

            {/* Tips */}
            {uploadedImage && !result && !isAnalyzing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-wrap gap-2">
                {["Clear price action", "Visible candlesticks", "No heavy filters", "Include price scale"].map((tip) => (
                  <span key={tip} className="text-[#666666] text-[11px] bg-[#0d0d0d] border border-[#1f1f1f] rounded-full px-3 py-1">&check; {tip}</span>
                ))}
              </motion.div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {result ? (
                <AnalysisResultPanel key="result" result={result} assetDecimals={assetDecimals} />
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative overflow-hidden rounded-[28px] border border-[#d4a843]/20 bg-[#070b10]/90 p-6 h-full flex flex-col items-center justify-center text-center shadow-[0_0_90px_rgba(212,168,67,0.07)]" style={{ minHeight: 480 }}>
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_34%,rgba(212,168,67,0.13),transparent_34%),radial-gradient(circle_at_78%_72%,rgba(24,200,255,0.10),transparent_28%)]" />
                  <motion.div
                    className="relative w-20 h-20 rounded-full bg-[#081018] border border-[#18c8ff]/25 flex items-center justify-center mb-5 shadow-[0_0_32px_rgba(24,200,255,0.14)]"
                    animate={{ scale: [0.96, 1.04, 0.96] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                  >
                    <Brain size={30} className="text-[#18c8ff]/70" />
                  </motion.div>
                  <div className="relative">
                    <p className="text-white font-bold text-lg mb-2">
                      {uploadedImage ? t("analyzer.readyTitle") : t("analyzer.uploadTitle")}
                    </p>
                    <p className="text-[#7b8da3] text-sm max-w-xs leading-relaxed mb-4">
                      {uploadedImage ? t("analyzer.readyText") : t("analyzer.uploadText")}
                    </p>
                  </div>
                  <AnalyzerFeatureStrip />
                  {uploadedImage && (
                    <div className="relative mt-4 flex items-center gap-2 text-[#d4a843] text-xs">
                      <TrendingUp size={12} />
                      <span>{selectedAsset.name} &bull; {selectedStrategy.name} &bull; {selectedTimeframe}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Payment Modal after limit reached */}
      <CryptoPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        planName="TradeVisor VIP"
        amount="69"
        yearlyAmount="669"
      />
    </section>
  );
}
