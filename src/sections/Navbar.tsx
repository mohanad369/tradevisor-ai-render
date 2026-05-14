import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Crown, Menu, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useLanguage } from "@/lib/language";
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const links = [
    { label: t("nav.aiAgents"), sectionId: "ai-agents" },
    { label: t("nav.analyzer"), sectionId: "analyzer" },
    { label: t("nav.wins"), sectionId: "wins" },
    { label: t("nav.features"), sectionId: "features" },
    { label: t("nav.testimonials"), sectionId: "testimonials" },
    { label: t("nav.pricing"), sectionId: "pricing" },
  ];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className={`fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 border-b transition-all duration-300 ${scrolled ? "bg-[#0d0d0d]/90 backdrop-blur-xl border-[#1f1f1f]" : "bg-transparent border-transparent"}`}>
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 top-14 bg-[#050505]/95 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="bg-[#0d0d0d] border-b border-[#1f1f1f] p-4" onClick={e => e.stopPropagation()}>
              {links.map((l) => (
                <button key={l.sectionId} onClick={() => scrollToSection(l.sectionId)}
                  className="block w-full text-left text-[#a0a0a0] text-sm font-medium py-3 px-2 hover:text-[#d4a843] transition-colors border-b border-[#1f1f1f] last:border-0 bg-transparent border-x-0 border-t-0 cursor-pointer">
                  {l.label}
                </button>
              ))}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setMobileMenuOpen(false); navigate("/candles"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[#d4a843] text-xs border border-[#d4a843]/20 px-3 py-2.5 rounded-full cursor-pointer">
                  <Flame size={12} /> Candle AI
                </button>
                <button onClick={() => { setMobileMenuOpen(false); navigate("/vip"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[#d4a843] text-xs border border-[#d4a843]/30 px-3 py-2.5 rounded-full cursor-pointer bg-[#d4a843]/5">
                  <Crown size={12} /> VIP
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between px-3 sm:px-6">
        {/* Logo */}
        <div className="flex flex-col cursor-pointer" onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <span className="text-white font-bold text-xs sm:text-sm tracking-[0.1em] uppercase">TRADEVISOR</span>
          <span className="text-[#a0a0a0] text-[9px] sm:text-[10px]">{t("nav.subtitle")}</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button key={l.sectionId} onClick={() => scrollToSection(l.sectionId)}
              className="text-[#a0a0a0] text-sm font-medium hover:text-[#d4a843] transition-colors bg-transparent border-none cursor-pointer">
              {l.label}
            </button>
          ))}
        </div>

        {/* Right Side Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Candle AI - desktop */}
          <button onClick={() => navigate("/candles")}
            className="hidden md:flex items-center gap-1.5 text-[#d4a843] hover:text-[#e8c76a] text-xs border border-[#d4a843]/20 px-3 py-1.5 rounded-full cursor-pointer hover:border-[#d4a843]/40 bg-transparent transition-colors">
            <Flame size={12} /> {t("nav.candle")}
          </button>

          {/* VIP button - VISIBLE on ALL screens */}
          <button onClick={() => navigate("/vip")}
            className="flex items-center gap-1 text-[#d4a843] hover:text-[#e8c76a] text-[10px] sm:text-xs border border-[#d4a843]/30 px-2 sm:px-3 py-1.5 rounded-full cursor-pointer hover:border-[#d4a843]/60 hover:bg-[#d4a843]/5 bg-transparent transition-colors">
            <Crown size={11} className="sm:hidden" /><Crown size={12} className="hidden sm:block" />
            <span className="font-semibold">{t("nav.vip")}</span>
          </button>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#a0a0a0] hover:text-white p-1 bg-transparent border-none cursor-pointer">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
