import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, BookOpen, ScrollText, CheckCircle, Scale } from "lucide-react";

interface DisclaimerProps {
  onAccept: () => void;
}

export default function Disclaimer({ onAccept }: DisclaimerProps) {
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        setScrolled(true);
      }
    };
    const div = document.getElementById("disclaimer-scroll");
    div?.addEventListener("scroll", handleScroll);
    return () => div?.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAccept = () => {
    if (!checked) return;
    localStorage.setItem("tradevisor_disclaimer_accepted", "true");
    onAccept();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#d4a843]/5 border-b border-[#1f1f1f] px-6 py-5 flex items-center gap-3">
          <Shield size={24} className="text-[#d4a843]" />
          <div>
            <h1 className="text-base font-bold">Disclaimer & Risk Warning</h1>
            <p className="text-[#666666] text-[11px]">Please read carefully before using this website</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          id="disclaimer-scroll"
          className="max-h-[50vh] overflow-y-auto px-6 py-4 space-y-3"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#1f1f1f #050505" }}
        >
          {/* Section 1 */}
          <div className="border-l-2 border-[#d4a843]/30 pl-3">
            <h3 className="text-[#d4a843] text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BookOpen size={12} />
              1. Educational Nature of Content
            </h3>
            <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
              All information, data, analyses, indicators, strategies, tools, and services provided through this website are for educational and informational purposes only, and do not in any way constitute: investment advice, financial recommendation, an invitation to sell or buy, portfolio management, or a guarantee of achieving profits. The user must rely on his own evaluation and consult a licensed financial advisor before making any investment decision.
            </p>
          </div>

          {/* Section 2 */}
          <div className="border-l-2 border-[#d4a843]/30 pl-3">
            <h3 className="text-[#d4a843] text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              2. Risk Warning
            </h3>
            <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
              Trading in financial markets, including: Forex, Cryptocurrencies, Stocks, Precious Metals, CFDs, and Indices, involves a high level of risk and may not be suitable for all investors. The use of leverage can magnify both profits and losses, and it is possible for a trader to lose his entire capital or more in some cases. Past performance of any strategy, system, or indicator does not guarantee future results.
            </p>
          </div>

          {/* Section 3 */}
          <div className="border-l-2 border-[#d4a843]/30 pl-3">
            <h3 className="text-[#d4a843] text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield size={12} />
              3. Capital Management Disclaimer
            </h3>
            <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
              This website, its owner, employees, developers, or partners shall not bear any direct or indirect responsibility for how any user or trader manages his own capital. The user bears sole and full responsibility for: contract sizes, risk percentage, use of leverage, entry and exit points, stop-loss and take-profit levels, capital distribution, and any trading or investment decisions made based on the website content. The website shall not bear any responsibility for any financial losses or damages resulting from poor capital management or misuse of the information or tools provided.
            </p>
          </div>

          {/* Section 4 */}
          <div className="border-l-2 border-[#d4a843]/30 pl-3">
            <h3 className="text-[#d4a843] text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ScrollText size={12} />
              4. No Profit Guarantee
            </h3>
            <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
              This website does not provide any commitment or guarantee of profit or success for any strategy, indicator, or trading system. All displayed results — if any — are historical or hypothetical and do not represent a guarantee of achieving similar future results.
            </p>
          </div>

          {/* Section 5 */}
          <div className="border-l-2 border-[#d4a843]/30 pl-3">
            <h3 className="text-[#d4a843] text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Scale size={12} />
              5. Limitation of Liability
            </h3>
            <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
              The website and services are provided "as is" and "as available" without any express or implied warranties, including but not limited to: warranties of accuracy, reliability, fitness for a particular purpose, non-infringement, or availability. To the fullest extent permitted by applicable law, we disclaim all liability for any direct, indirect, incidental, consequential, or punitive damages, including but not limited to: loss of profits, revenue, data, trading capital, or business opportunities arising from the use or inability to use our services.
            </p>
          </div>

          {/* Section 6 */}
          <div className="border-l-2 border-[#d4a843]/30 pl-3">
            <h3 className="text-[#d4a843] text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BookOpen size={12} />
              6. Third-Party Services
            </h3>
            <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
              This website integrates with third-party APIs including OpenAI, GoldAPI.io, and cryptocurrency payment processors. We are not responsible for the availability, accuracy, or security of these third-party services. Your use of such services is subject to their respective terms of service.
            </p>
          </div>

          {/* Section 7 */}
          <div className="border-l-2 border-[#d4a843]/30 pl-3">
            <h3 className="text-[#d4a843] text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle size={12} />
              7. Acceptance
            </h3>
            <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
              By accessing and using this website, you acknowledge that you have read, understood, and agree to be bound by all terms and conditions stated above. If you do not agree with any part of these terms, you must immediately discontinue use of the website.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-[#1f1f1f] px-6 py-4 space-y-3">
          {/* Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-4 h-4 rounded border-[#1f1f1f] bg-[#141414] text-[#d4a843] mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-[#a0a0a0] text-[11px] leading-relaxed">
              I have read and understood the Disclaimer and Risk Warning above, and I agree to all terms and conditions. I acknowledge that trading involves significant risk and I am solely responsible for my trading decisions and capital management.
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={!checked}
              className="flex-1 bg-[#d4a843] text-[#050505] font-semibold text-xs py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle size={14} />
              I Agree & Accept
            </button>
          </div>

          {!scrolled && (
            <p className="text-[#666666] text-[10px] text-center">
              Please scroll down to read all terms before accepting
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
