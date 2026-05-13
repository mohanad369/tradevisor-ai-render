import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/language";

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="fixed right-3 bottom-24 z-[70] rounded-full border border-[#d4a843]/30 bg-[#0d0d0d]/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-1 p-1">
        <div className="hidden sm:flex items-center gap-1.5 px-2 text-[#d4a843] text-[10px] font-semibold">
          <Languages size={13} />
          <span>{t("language.label")}</span>
        </div>
        <button
          onClick={() => setLanguage("en")}
          className={`h-8 rounded-full px-3 text-[11px] font-bold transition-all ${language === "en" ? "bg-[#d4a843] text-[#050505]" : "text-[#a0a0a0] hover:text-white"}`}
          aria-label={t("language.english")}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage("ar")}
          className={`h-8 rounded-full px-3 text-[11px] font-bold transition-all ${language === "ar" ? "bg-[#d4a843] text-[#050505]" : "text-[#a0a0a0] hover:text-white"}`}
          aria-label={t("language.arabic")}
        >
          AR
        </button>
      </div>
    </div>
  );
}
