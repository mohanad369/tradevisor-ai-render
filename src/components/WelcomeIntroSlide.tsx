import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const STORAGE_KEY = "tradevisor_intro_slide_seen";

export default function WelcomeIntroSlide() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) !== "true";
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setVisible(false);
    }, 5200);

    return () => window.clearTimeout(timer);
  }, [visible]);

  const close = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          <motion.img
            src="/assets/tradevisor-ai-welcome.jpg"
            alt="Welcome to TradeVisor AI"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.08, opacity: 0.74 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 4.8, ease: "easeOut" }}
          />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,200,255,0.12),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.82),rgba(0,0,0,0.12)_45%,rgba(0,0,0,0.86))]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.7),transparent_42%,rgba(0,0,0,0.78))]" />

          <motion.div
            className="absolute left-1/2 top-1/2 w-[min(92vw,920px)] -translate-x-1/2 -translate-y-1/2 text-center"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.25, ease: "easeOut" }}
          >
            <div className="mx-auto mb-5 h-px w-28 bg-gradient-to-r from-transparent via-[#18c8ff] to-transparent shadow-[0_0_26px_rgba(24,200,255,0.9)]" />
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.5em] text-[#18c8ff] drop-shadow-[0_0_14px_rgba(24,200,255,0.65)]">
              Smart Trading Intelligence
            </p>
            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-[0.08em] text-white drop-shadow-[0_0_30px_rgba(24,200,255,0.6)] sm:text-6xl lg:text-7xl">
              Welcome To
              <span className="mt-3 block bg-gradient-to-r from-[#18c8ff] via-white to-[#f03cff] bg-clip-text text-transparent">
                TradeVisor AI
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#c7d7e8] sm:text-base">
              AI agents, live market logic, and risk-first trade intelligence working together before every decision.
            </p>
          </motion.div>

          <motion.div
            className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#18c8ff]/25"
            animate={{ scale: [0.82, 1.28, 0.82], opacity: [0.22, 0.04, 0.22] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f03cff]/20"
            animate={{ scale: [1.18, 0.88, 1.18], opacity: [0.05, 0.18, 0.05] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/80 backdrop-blur-md transition hover:border-[#18c8ff]/50 hover:text-white"
            aria-label="Close welcome intro"
          >
            <X size={18} />
          </button>

          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#18c8ff] via-[#22c55e] to-[#f03cff]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5.2, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
