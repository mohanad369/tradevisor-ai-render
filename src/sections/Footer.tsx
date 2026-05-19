import { useLanguage } from "@/lib/language";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#020509] border-t border-[#18c8ff]/15 py-12">
      <div className="max-w-[1200px] mx-auto px-6 tv-neon-card rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="tv-glow-title text-white font-bold text-sm tracking-[0.1em] uppercase">
              TRADEVISOR
            </span>
            <span className="text-[#a0a0a0] text-xs">
              {t("footer.tools")}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <a
              href="/#/privacy"
              className="text-[#a0a0a0] text-sm hover:text-[#d4a843] transition-colors duration-200"
            >
              {t("footer.privacy")}
            </a>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[#666666] text-xs">
            &copy; 2026 Tradevisor. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
