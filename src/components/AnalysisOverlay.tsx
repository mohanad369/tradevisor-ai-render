import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Target, Shield, Layers, Activity, BarChart3,
  Crosshair, Zap, MessageCircle, X, Send, Bot, User,
} from "lucide-react";
import type { AnalysisResult } from "@/lib/analyzer";

/* ═══════════════════════════════════════════════════════════
   AnalysisResultPanel — displays AI-generated analysis
   ═══════════════════════════════════════════════════════════ */

export default function AnalysisResultPanel({ result, assetDecimals }: { result: AnalysisResult; assetDecimals: number }) {
  const isBuy = result.signal === "BUY";
  const formatPrice = (price: number) => price.toFixed(assetDecimals);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden relative">
      {/* Signal Header */}
      <div className={`p-5 border-b border-[#1f1f1f] ${isBuy ? "bg-[#22c55e]/5" : "bg-[#e11d48]/5"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isBuy ? "bg-[#22c55e]/20" : "bg-[#e11d48]/20"}`}>
              <Zap size={22} className={isBuy ? "text-[#22c55e]" : "text-[#e11d48]"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${isBuy ? "text-[#22c55e]" : "text-[#e11d48]"}`}>{result.signal}</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isBuy ? "bg-[#22c55e]" : "bg-[#e11d48]"}`} />
                </span>
              </div>
              <div className="text-[#666666] text-xs">{result.strategyUsed} • AI-Detected</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white text-lg font-bold">{result.confidence}%</div>
            <div className="text-[#666666] text-[10px]">AI Confidence</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5 max-h-[600px] overflow-y-auto custom-scrollbar">
        {/* Price Levels */}
        <div>
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target size={13} className="text-[#d4a843]" /> AI-Detected Price Levels
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#141414] border border-[#d4a843]/30 rounded-xl p-3">
              <div className="flex items-center gap-2"><Crosshair size={14} className="text-[#d4a843]" /><span className="text-[#a0a0a0] text-sm">Entry</span></div>
              <span className="text-[#d4a843] font-bold text-sm">{formatPrice(result.entry)}</span>
            </div>
            <div className="flex items-center justify-between bg-[#141414] border border-[#e11d48]/30 rounded-xl p-3">
              <div className="flex items-center gap-2"><Shield size={14} className="text-[#e11d48]" /><span className="text-[#a0a0a0] text-sm">Stop Loss</span></div>
              <div className="text-right">
                <span className="text-[#e11d48] font-bold text-sm">{formatPrice(result.stopLoss)}</span>
                <span className="text-[#666666] text-xs ml-2">(-{result.riskPips})</span>
              </div>
            </div>
            {[
              { label: "TP1", price: result.takeProfit1, rr: result.riskReward1 },
              { label: "TP2", price: result.takeProfit2, rr: result.riskReward2 },
              { label: "TP3", price: result.takeProfit3, rr: result.riskReward3 },
            ].map((tp, i) => (
              <div key={tp.label} className={`flex items-center justify-between bg-[#141414] border ${i === 2 ? "border-[#22c55e]/40" : "border-[#22c55e]/20"} rounded-xl p-3`}>
                <div className="flex items-center gap-2"><TrendingUp size={14} className="text-[#22c55e]" /><span className="text-[#a0a0a0] text-sm">{tp.label}</span><span className="text-[#666666] text-xs">({tp.rr})</span></div>
                <span className="text-[#22c55e] font-bold text-sm">{formatPrice(tp.price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Management */}
        <div className="border-t border-[#1f1f1f] pt-4">
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Shield size={13} className="text-[#d4a843]" /> Risk Management</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Max Risk", value: `${result.maxRiskPercent}%`, color: "text-[#d4a843]" },
              { label: "Risk Distance", value: `${result.riskPips}`, color: "text-white" },
              { label: "Hold Time", value: result.timeToHold, color: "text-white" },
              { label: "Best R:R", value: result.riskReward3, color: "text-[#22c55e]" },
            ].map((item) => (
              <div key={item.label} className="bg-[#141414] rounded-xl p-3">
                <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`${item.color} font-bold text-sm`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {result.agents?.finalPlan && (
          <div className="border-t border-[#1f1f1f] pt-4">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bot size={13} className="text-[#d4a843]" /> 6-Agent Decision
            </h4>
            <div className="bg-[#141414] border border-[#d4a843]/20 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0a0] text-xs">Final Action</span>
                <span className={`text-xs font-bold ${result.agents.finalPlan.action === "approve_plan" ? "text-[#22c55e]" : "text-[#d4a843]"}`}>
                  {result.agents.finalPlan.action.replaceAll("_", " ")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "1 News", value: getAgentValue(result.agents.news, "nextAgentPayload", "recommendedAction") },
                  { label: "2 Validate", value: getAgentValue(result.agents.decision, "nextAgentPayload", "recommendedAction") },
                  { label: "3 Momentum", value: getAgentValue(result.agents.marketContext, "nextAgentPayload", "recommendedAction") },
                  { label: "4 Chart", value: getAgentValue(result.agents.chartTrade, "nextAgentPayload", "recommendedAction") },
                  { label: "5 Supervisor", value: getAgentValue(result.agents.supervisor, "nextAgentPayload", "supervisorStatus") },
                  { label: "6 Risk", value: getAgentValue(result.agents.finalRisk, "finalDecision", "riskGate") },
                ].map((agent) => (
                  <div key={agent.label} className="rounded-lg bg-[#0d0d0d] border border-[#1f1f1f] px-2 py-1.5">
                    <div className="text-[#666666] text-[9px] uppercase tracking-wider">{agent.label}</div>
                    <div className="text-[#22c55e] text-[10px] font-bold truncate">
                      {String(agent.value || "ok").replaceAll("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[#666666] text-[10px] uppercase tracking-wider">Agent Confidence</div>
                  <div className="text-white text-sm font-bold capitalize">{result.agents.finalPlan.confidence}</div>
                </div>
                <div>
                  <div className="text-[#666666] text-[10px] uppercase tracking-wider">Position Size</div>
                  <div className="text-white text-sm font-bold">{result.agents.finalPlan.positionSize}</div>
                </div>
                <div>
                  <div className="text-[#666666] text-[10px] uppercase tracking-wider">Max Loss</div>
                  <div className="text-[#e11d48] text-sm font-bold">${result.agents.finalPlan.maxLossAmount}</div>
                </div>
                <div>
                  <div className="text-[#666666] text-[10px] uppercase tracking-wider">Blended R:R</div>
                  <div className="text-[#22c55e] text-sm font-bold">1:{result.agents.finalPlan.rewardRiskRatio}</div>
                </div>
              </div>
              <div className="space-y-1">
                {result.agents.finalPlan.notes.slice(0, 2).map((note) => (
                  <div key={note} className="text-[#a0a0a0] text-[11px] leading-relaxed">{note}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lot Size */}
        <div className="border-t border-[#1f1f1f] pt-4">
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Layers size={13} className="text-[#d4a843]" /> Lot Size by Account</h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { balance: "$1,000", lot: result.lotSize1000, risk: "$15" },
              { balance: "$5,000", lot: result.lotSize5000, risk: "$75" },
              { balance: "$10,000", lot: result.lotSize10000, risk: "$150" },
            ].map((item) => (
              <div key={item.balance} className="bg-[#141414] rounded-xl p-3 text-center">
                <div className="text-[#666666] text-[10px] mb-1">{item.balance}</div>
                <div className="text-[#d4a843] font-bold text-sm">{item.lot}</div>
                <div className="text-[#666666] text-[10px]">Risk {item.risk}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Technicals */}
        <div className="border-t border-[#1f1f1f] pt-4">
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><BarChart3 size={13} className="text-[#d4a843]" /> Technical Analysis</h4>
          <div className="space-y-2">
            {[
              { label: "Trend", value: result.trend },
              { label: "Structure", value: result.marketStructure },
              { label: "Key Level", value: result.keyLevel, color: "text-[#d4a843]" },
              { label: "Confluence", value: `${result.confluenceScore}/100`, color: "text-[#22c55e]" },
              { label: "Volume", value: result.volume.signal, color: "text-[#22c55e]" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between bg-[#141414] rounded-xl px-3 py-2">
                <span className="text-[#a0a0a0] text-xs">{item.label}</span>
                <span className={`text-xs font-medium ${item.color || "text-white"}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Candle Patterns */}
        <div className="border-t border-[#1f1f1f] pt-4">
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Activity size={13} className="text-[#d4a843]" /> AI-Detected Patterns</h4>
          {result.candlePatterns.map((pattern, i) => (
            <div key={i} className="flex items-center gap-2 bg-[#141414] rounded-xl px-3 py-2 mb-1">
              <span className={pattern.signal === "bullish" ? "text-[#22c55e]" : "text-[#e11d48]"}>{pattern.signal === "bullish" ? "▲" : "▼"}</span>
              <span className="text-white text-xs font-medium">{pattern.name}</span>
              <span className="text-[#666666] text-xs ml-auto">Reliability: {pattern.reliability}</span>
            </div>
          ))}
        </div>

        {/* SR Levels */}
        <div className="border-t border-[#1f1f1f] pt-4">
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Support / Resistance</h4>
          {result.srLevels.map((level, i) => (
            <div key={i} className="flex items-center justify-between bg-[#141414] rounded-xl px-3 py-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${level.type === "support" ? "bg-[#22c55e]" : level.type === "resistance" ? "bg-[#e11d48]" : "bg-[#d4a843]"}`} />
                <span className="text-[#a0a0a0] text-xs capitalize">{level.type}</span>
              </div>
              <span className="text-white text-xs font-medium">{formatPrice(level.level)}</span>
            </div>
          ))}
        </div>

        {/* Fibonacci */}
        <div className="border-t border-[#1f1f1f] pt-4">
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">AI Fibonacci Levels</h4>
          <div className="flex gap-1">
            {result.fibonacci.map((fib) => (
              <div key={fib.level} className="flex-1 bg-[#141414] rounded-lg px-2 py-2 text-center">
                <div className="text-[#666666] text-[10px]">{fib.level.toFixed(3)}</div>
                <div className="text-[#d4a843] text-[10px] font-bold">{formatPrice(fib.price)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Reasons */}
        <div className="border-t border-[#1f1f1f] pt-4">
          <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Why This Signal?</h4>
          <ul className="space-y-2">
            {result.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[#d4a843] mt-0.5 flex-shrink-0">•</span>
                <span className="text-[#a0a0a0] leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Support Chat FAB */}
      <button onClick={() => setChatOpen(!chatOpen)} className="absolute bottom-4 right-4 w-12 h-12 bg-[#d4a843] text-[#050505] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50">
        {chatOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
      <AnimatePresence>{chatOpen && <SupportChat onClose={() => setChatOpen(false)} />}</AnimatePresence>
    </motion.div>
  );
}

function getAgentValue(agent: Record<string, unknown>, section: string, key: string) {
  const value = agent[section];
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

/* ═══════════════════════════════════════════════════════════
   Support Chat (mini panel inside result card)
   ═══════════════════════════════════════════════════════════ */

function SupportChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: "bot" | "user"; text: string }[]>([{ role: "bot", text: "Ask me about this AI analysis!" }]);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user" as const, text: input.trim() }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot" as const, text: "I can explain Entry/SL/TP, risk management, and strategy selection." }]);
    }, 600);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="absolute bottom-16 right-0 w-80 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden z-50">
      <div className="bg-[#d4a843] text-[#050505] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><Bot size={18} /><span className="font-semibold text-sm">AI Support</span></div>
        <button onClick={onClose} className="hover:opacity-70"><X size={16} /></button>
      </div>
      <div className="h-72 overflow-y-auto p-3 space-y-3">{messages.map((msg, i) => (<div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}><div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "bot" ? "bg-[#d4a843]/20" : "bg-[#1f1f1f]"}`}>{msg.role === "bot" ? <Bot size={14} className="text-[#d4a843]" /> : <User size={14} className="text-[#a0a0a0]" />}</div><div className={`text-xs p-2.5 rounded-xl max-w-[85%] whitespace-pre-line ${msg.role === "bot" ? "bg-[#141414] text-[#a0a0a0]" : "bg-[#d4a843] text-[#050505]"}`}>{msg.text}</div></div>))}</div>
      <div className="p-3 border-t border-[#1f1f1f] flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask..." className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 py-2 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#d4a843]" /><button onClick={handleSend} className="w-8 h-8 bg-[#d4a843] rounded-lg flex items-center justify-center text-[#050505] hover:bg-[#e8c76a] transition-colors"><Send size={14} /></button></div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Chart Overlay — draws AI-detected price levels on chart
   Lines are positioned proportionally based on price range
   ═══════════════════════════════════════════════════════════ */

export function AnalysisOverlay({ result, assetDecimals }: { result: AnalysisResult; assetDecimals: number }) {
  const isBuy = result.signal === "BUY";
  const formatPrice = (price: number) => price.toFixed(assetDecimals);

  // Calculate vertical positions from AI-detected prices
  // Use a wider "chart context" price range for better visual spacing
  const tradePrices = [result.entry, result.stopLoss, result.takeProfit1, result.takeProfit2, result.takeProfit3];
  const tradeMin = Math.min(...tradePrices);
  const tradeMax = Math.max(...tradePrices);
  // Add padding: extend range by 25% above max and below min
  const pricePadding = (tradeMax - tradeMin) * 0.25;
  const minPrice = tradeMin - pricePadding;
  const maxPrice = tradeMax + pricePadding;
  const range = maxPrice - minPrice || 1;

  const getPos = (price: number) => {
    const normalized = (price - minPrice) / range;
    // Map to 6%-90% of container height (leaves room for labels)
    const pct = normalized * 84 + 6;
    return 96 - pct; // invert: higher price = higher on chart
  };

  const entryPos = getPos(result.entry);
  const slPos = getPos(result.stopLoss);
  const tp1Pos = getPos(result.takeProfit1);
  const tp2Pos = getPos(result.takeProfit2);
  const tp3Pos = getPos(result.takeProfit3);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="absolute inset-0 pointer-events-none z-10">
      {/* Signal Badge */}
      <div className={`absolute top-3 left-3 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs shadow-lg ${isBuy ? "bg-[#22c55e] text-white" : "bg-[#e11d48] text-white"}`}>
        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-white" /></span>
        AI {result.signal} — {result.confidence}%
      </div>

      {/* Entry Line */}
      <div className="absolute left-0 right-0 pointer-events-auto" style={{ top: `${entryPos}%` }}>
        <div className="relative">
          <div className="border-t-2 border-dashed border-[#d4a843] w-full shadow-[0_0_10px_rgba(212,168,67,0.3)]" />
          <div className="absolute -top-6 right-3 bg-[#d4a843] text-[#050505] text-[10px] font-bold px-2 py-0.5 rounded-full shadow">ENTRY {formatPrice(result.entry)}</div>
        </div>
      </div>

      {/* SL Line */}
      <div className="absolute left-0 right-0 pointer-events-auto" style={{ top: `${slPos}%` }}>
        <div className="relative">
          <div className="border-t-2 border-[#e11d48] w-full shadow-[0_0_10px_rgba(225,29,72,0.3)]" />
          <div className="absolute -top-6 right-3 bg-[#e11d48] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">SL {formatPrice(result.stopLoss)}</div>
        </div>
      </div>

      {/* TP1 Line */}
      <div className="absolute left-0 right-0 pointer-events-auto" style={{ top: `${tp1Pos}%` }}>
        <div className="relative">
          <div className="border-t border-[#22c55e]/60 w-full" />
          <div className="absolute -top-6 left-3 bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#22c55e] text-[10px] font-bold px-2 py-0.5 rounded-full">TP1 {formatPrice(result.takeProfit1)} {result.riskReward1}</div>
        </div>
      </div>

      {/* TP2 Line */}
      <div className="absolute left-0 right-0 pointer-events-auto" style={{ top: `${tp2Pos}%` }}>
        <div className="relative">
          <div className="border-t border-[#22c55e]/80 w-full" />
          <div className="absolute -top-6 left-3 bg-[#22c55e]/30 border border-[#22c55e]/50 text-[#22c55e] text-[10px] font-bold px-2 py-0.5 rounded-full">TP2 {formatPrice(result.takeProfit2)} {result.riskReward2}</div>
        </div>
      </div>

      {/* TP3 Line */}
      <div className="absolute left-0 right-0 pointer-events-auto" style={{ top: `${tp3Pos}%` }}>
        <div className="relative">
          <div className="border-t-2 border-[#22c55e] w-full shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
          <div className="absolute -top-6 left-3 bg-[#22c55e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">TP3 {formatPrice(result.takeProfit3)} {result.riskReward3}</div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-2 left-2 right-2 pointer-events-auto">
        <div className="bg-[#0d0d0d]/90 backdrop-blur-sm border border-[#1f1f1f] rounded-xl p-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#666666] text-[10px]">Strategy: <span className="text-[#d4a843]">{result.strategyUsed}</span></span>
            <span className="text-[#666666] text-[10px]">R:R: <span className="text-[#22c55e]">{result.riskReward3}</span></span>
          </div>
          <span className="text-[#666666] text-[10px]">Risk: <span className="text-[#e11d48]">{result.maxRiskPercent}%</span></span>
        </div>
      </div>
    </motion.div>
  );
}
