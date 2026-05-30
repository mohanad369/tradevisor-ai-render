import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import CountdownTimer from "./CountdownTimer";
import CryptoPaymentModal from "./CryptoPaymentModal";

export default function SpringSalePopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 12);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.4, ease: "easeOut" }} className="fixed bottom-6 right-6 z-50 w-[380px] bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-6">
            <button onClick={() => setIsVisible(false)} className="absolute top-4 right-4 text-[#666666] hover:text-white transition-colors"><X size={18} /></button>
            <div className="mb-4"><span className="text-[#e11d48] text-sm font-medium">🌸 Spring Sale</span><h3 className="text-white text-lg font-semibold mt-1">Sakura Spring Sale</h3></div>
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-4">Join <span className="text-white font-semibold">700+ members</span> already profiting. Our members hit a combined <span className="text-[#d4a843] font-semibold">$5M in profits</span> this month.</p>
            <div className="mb-4"><CountdownTimer targetDate={targetDate} /></div>
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 mb-4">
              <div className="flex items-baseline gap-2 mb-1"><span className="text-[#666666] text-sm line-through">$78</span><span className="text-white text-2xl font-bold">$33</span></div>
              <p className="text-[#22c55e] text-sm font-medium mb-3">2-Week VIP Access</p>
              <ul className="space-y-1.5">
                {["Professional Trading Signals", "Real-time Market Analysis", "Expert Community Access"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs"><Check size={12} className="text-[#22c55e]" /><span className="text-[#a0a0a0]">{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsVisible(false); setTimeout(() => setShowPayment(true), 400); }} className="flex-1 bg-[#d4a843] text-[#050505] py-2.5 rounded-full font-semibold text-sm hover:bg-[#e8c76a] hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2">Claim Offer Now<ArrowRight size={14} /></button>
              <button onClick={() => setIsVisible(false)} className="text-[#666666] text-sm hover:text-white transition-colors">Maybe later</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <CryptoPaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} planName="TradeVisor VIP 2 Weeks" amount="33" />
    </>
  );
}
