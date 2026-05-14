import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Loader2, ArrowDown, BarChart3, TrendingUp, DollarSign, Zap, Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router";
import { analyzeChartClientSide, type AnalysisResult } from "@/lib/analyzer";
import { getCachedPrice } from "@/lib/goldapi";
import { getMetalsPrices } from "@/lib/metals";
import ChartUpload from "@/components/ChartUpload";
import AnalysisResultPanel, { AnalysisOverlay } from "@/components/AnalysisOverlay";
import LivePriceTicker from "@/components/LivePriceTicker";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";
import { strategies, assets } from "@/data/strategies";
import type { Strategy, Asset } from "@/data/strategies";
import { useLanguage } from "@/lib/language";

const ANALYSIS_COUNT_KEY = "tradevisor_analysis_count";
const FREE_LIMIT = 4;

function getAnalysisCount(): number {
  try {
    return parseInt(localStorage.getItem(ANALYSIS_COUNT_KEY) || "0", 10);
  } catch { return 0; }
}
function incrementAnalysisCount(): number {
  const count = getAnalysisCount() + 1;
  localStorage.setItem(ANALYSIS_COUNT_KEY, String(count));
  return count;
}

function getDefaultDecimals(asset: Asset): number {
  if (asset.type === "forex") return asset.id === "usdjpy" || asset.id === "gbpjpy" ? 3 : 5;
  if (asset.type === "gold") return 2;
  if (asset.type === "crypto") return asset.id === "btcusd" ? 0 : 2;
  return 2;
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const assetDecimals = getDefaultDecimals(selectedAsset);

  // Fetch live gold price when gold is selected.
  useEffect(() => {
    if (selectedAsset.name === "XAU/USD (Gold)") {
      getCachedPrice("XAU", 30000)
        .then((p) => setRealPrice(p.price))
        .catch(() => setRealPrice(undefined));
    } else {
      setRealPrice(undefined);
    }
  }, [selectedAsset.name]);

  const handleAnalyze = async () => {
    if (!uploadedImage) return;

    // Check if user exceeded free limit
    const currentCount = getAnalysisCount();
    if (currentCount >= FREE_LIMIT) {
      setShowPaymentModal(true);
      return;
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

      // For gold, try to get fresh real price if no manual price
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

      // Increment analysis count
      const newCount = incrementAnalysisCount();
      setAnalysisCount(newCount);
    } catch (error: any) {
      alert(`Analysis failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section id="analyzer" className="bg-[#050505] py-24 relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 20%, rgba(212,168,67,0.04) 0%, transparent 50%)" }} />
      <div className="max-w-[1300px] mx-auto px-6 relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Brain size={20} className="text-[#d4a843]" />
            <span className="text-[#d4a843] text-xs font-medium uppercase tracking-wider">{t("analyzer.eyebrow")}</span>
            <span className="text-[10px] bg-[#d4a843]/20 text-[#d4a843] px-2 py-0.5 rounded-full font-medium">GPT-4o</span>
          </div>
          <h2 className="text-white text-4xl font-bold mb-3">{t("analyzer.title")}</h2>
          <p className="text-[#a0a0a0] text-base max-w-2xl mx-auto">
            {t("analyzer.subtitle")}
          </p>
        </motion.div>

        {/* Live Price Ticker + Manual Price Input — Gold only */}
        {selectedAsset.name === "XAU/USD (Gold)" && (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 space-y-3">
            <LivePriceTicker />

            {/* Manual Price Input — for chart price alignment */}
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center gap-3">
              <DollarSign size={16} className="text-[#d4a843] flex-shrink-0" />
              <label className="text-[#a0a0a0] text-xs whitespace-nowrap">
                {t("analyzer.currentPrice")}
              </label>
              <input
                type="number"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder={realPrice ? realPrice.toFixed(2) : "Live price"}
                className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#666666] focus:outline-none focus:border-[#d4a843] min-w-0"
              />
              <span className="text-[#666666] text-xs">USD</span>
              {manualPrice && (
                <button
                  onClick={() => setManualPrice("")}
                  className="text-[#666666] hover:text-white text-xs px-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Info text */}
            {!manualPrice && (
              <p className="text-[#666666] text-[11px] pl-1">
                {t("analyzer.tipPrice")}
              </p>
            )}
          </motion.div>
        )}

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Asset Selector */}
            <div className="relative">
              <button onClick={() => setShowAssetDropdown(!showAssetDropdown)} className="flex items-center gap-2 bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-white text-sm hover:border-[#d4a843] transition-colors">
                <BarChart3 size={14} className="text-[#d4a843]" />
                <span>{selectedAsset.name}</span>
                <ArrowDown size={12} className="text-[#666666]" />
              </button>
              <AnimatePresence>
                {showAssetDropdown && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute top-full mt-2 left-0 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-xl z-50 w-56 max-h-64 overflow-y-auto">
                    {assets.map((a) => (
                      <button key={a.id} onClick={() => { setSelectedAsset(a); setShowAssetDropdown(false); setResult(null); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#141414] transition-colors ${selectedAsset.id === a.id ? "text-[#d4a843]" : "text-[#a0a0a0]"}`}>
                        {a.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Strategies */}
            {strategies.map((s) => (
              <button key={s.id} onClick={() => { setSelectedStrategy(s); setResult(null); }} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${selectedStrategy.id === s.id ? "bg-[#d4a843] text-[#050505]" : "bg-[#141414] border border-[#1f1f1f] text-[#a0a0a0] hover:border-[#d4a843]/50 hover:text-white"}`}>
                {s.name}
              </button>
            ))}
          </div>
          {/* Timeframes */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#1f1f1f]">
            <span className="text-[#666666] text-xs mr-1">{t("analyzer.timeframe")}</span>
            {selectedStrategy.timeframes.map((tf) => (
              <button key={tf} onClick={() => { setSelectedTimeframe(tf); setResult(null); }} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${selectedTimeframe === tf ? "bg-[#d4a843]/15 text-[#d4a843] border border-[#d4a843]/30" : "bg-transparent text-[#666666] border border-transparent hover:text-[#a0a0a0]"}`}>
                {tf}
              </button>
            ))}
            <span className="text-[#666666] text-xs ml-3">{selectedStrategy.description} &bull; Win Rate: {selectedStrategy.winRate}</span>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Chart + Buttons */}
          <div className="lg:col-span-3">
            <div className="relative bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden" style={{ minHeight: 480 }}>
              {/* AI Analyzing Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 z-30 bg-[#050505]/95 flex flex-col items-center justify-center">
                  <Loader2 size={44} className="text-[#d4a843] animate-spin mb-4" />
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} className="text-[#d4a843]" />
                    <span className="text-[#d4a843] text-xs font-medium uppercase tracking-wider">Powered by GPT-4o Vision</span>
                  </div>
                  <p className="text-white font-semibold text-lg mb-1">{t("analyzer.analyzing")}</p>
                  <p className="text-[#666666] text-sm mb-1">{t("analyzer.analyzingSteps")}</p>
                  <p className="text-[#666666] text-xs">{selectedAsset.name} &bull; {selectedStrategy.name} &bull; {selectedTimeframe}</p>
                  <div className="mt-5 w-56 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                    <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "easeInOut" }} className="h-full bg-[#d4a843] rounded-full" />
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
            {analysisCount < FREE_LIMIT && (
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="text-[10px] text-[#666666] bg-[#141414] border border-[#1f1f1f] rounded-full px-3 py-1">
                  {FREE_LIMIT - analysisCount} free analysis{(FREE_LIMIT - analysisCount) !== 1 ? 'es' : ''} remaining
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4">
              {uploadedImage && !result && !isAnalyzing && analysisCount < FREE_LIMIT && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleAnalyze} className="w-full bg-[#d4a843] text-[#050505] font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#e8c76a] hover:scale-[1.01] transition-all duration-200">
                  <Sparkles size={18} />
                  {t("analyzer.analyze")}
                </motion.button>
              )}
              {uploadedImage && !result && !isAnalyzing && analysisCount >= FREE_LIMIT && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setShowPaymentModal(true)} className="w-full bg-gradient-to-r from-[#d4a843] to-[#f2a900] text-[#050505] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all duration-200 animate-pulse">
                  <Lock size={18} />
                  {t("analyzer.unlock")}
                  <Crown size={16} />
                </motion.button>
              )}
              {result && analysisCount < FREE_LIMIT && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleAnalyze} className="w-full border border-[#1f1f1f] text-[#a0a0a0] font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:border-[#d4a843] hover:text-white transition-all duration-200">
                  <Brain size={18} />
                  {t("analyzer.reanalyze")}
                  <span className="text-[10px] bg-[#141414] text-[#666666] px-2 py-0.5 rounded-full ml-1">{FREE_LIMIT - analysisCount} left</span>
                </motion.button>
              )}
              {result && analysisCount >= FREE_LIMIT && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setShowPaymentModal(true)} className="w-full bg-gradient-to-r from-[#d4a843] to-[#f2a900] text-[#050505] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all duration-200 animate-pulse">
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
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center" style={{ minHeight: 480 }}>
                  <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#1f1f1f] flex items-center justify-center mb-5">
                    <Brain size={28} className="text-[#d4a843]/40" />
                  </div>
                  <p className="text-white font-medium text-lg mb-2">
                    {uploadedImage ? t("analyzer.readyTitle") : t("analyzer.uploadTitle")}
                  </p>
                  <p className="text-[#666666] text-sm max-w-xs leading-relaxed mb-4">
                    {uploadedImage ? t("analyzer.readyText") : t("analyzer.uploadText")}
                  </p>
                  {uploadedImage && (
                    <div className="flex items-center gap-2 text-[#d4a843] text-xs">
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
