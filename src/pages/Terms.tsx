import { motion } from "framer-motion";
import { Shield, AlertTriangle, Scale, FileText, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="bg-[#0d0d0d] border-b border-[#1f1f1f] px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[#a0a0a0] hover:text-[#d4a843] text-sm transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          <div className="w-px h-4 bg-[#1f1f1f]" />
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-[#d4a843]" />
            <span className="text-sm font-semibold">Terms of Service & Disclaimer</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Title */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-[#d4a843]" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
            <p className="text-[#666666] text-sm">User Agreement & Liability Disclaimer</p>
            <p className="text-[#d4a843] text-xs mt-2">Last Updated: May 2026</p>
          </div>

          {/* Warning Box */}
          <div className="bg-[#e11d48]/5 border border-[#e11d48]/20 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#e11d48] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[#e11d48] font-semibold text-sm mb-1">Important Legal Notice</h3>
              <p className="text-[#a0a0a0] text-xs leading-relaxed">
                Trading foreign exchange, cryptocurrencies, gold, and other financial instruments carries a high level of risk and may not be suitable for all investors. Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite. The possibility exists that you could sustain a loss of some or all of your initial investment.
              </p>
            </div>
          </div>

          {/* Sections */}
          <Section
            number="01"
            title="Not Financial Advice"
            icon={<FileText size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              The content provided by Tradevisor AI, including but not limited to AI-generated trading signals, chart analyses, price predictions, and market commentary, is for <strong className="text-white">informational and educational purposes only</strong>. It does not constitute financial advice, investment recommendations, or a solicitation to buy or sell any financial instrument.
            </p>
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              We are <strong className="text-white">NOT</strong> a licensed financial advisor, broker, or investment firm. Our AI-generated analysis is algorithmic output and should not be considered professional financial guidance.
            </p>
          </Section>

          <Section
            number="02"
            title="No Guarantees of Accuracy"
            icon={<AlertTriangle size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              While we strive for accuracy, we make <strong className="text-white">no representations or warranties</strong> of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the AI analysis, signals, or information provided on this platform.
            </p>
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              The AI system may produce incorrect, outdated, or misleading analysis. Market conditions change rapidly, and past performance of any trading strategy <strong className="text-white">does not guarantee future results</strong>.
            </p>
          </Section>

          <Section
            number="03"
            title="Full User Responsibility"
            icon={<Shield size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              You acknowledge and agree that <strong className="text-white">you are solely responsible</strong> for all trading decisions you make. Any trades executed based on our AI analysis are done entirely at your own risk and discretion.
            </p>
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              You should <strong className="text-white">never trade with money you cannot afford to lose</strong>. The use of leverage in trading can work against you as well as for you, and the degree of leverage can lead to large losses as well as gains.
            </p>
          </Section>

          <Section
            number="04"
            title="Limitation of Liability"
            icon={<Scale size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              To the fullest extent permitted by applicable law, Tradevisor AI and its operators, affiliates, partners, and agents shall <strong className="text-white">not be liable</strong> for any:
            </p>
            <ul className="space-y-2 text-[#a0a0a0] text-sm mb-3">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Direct, indirect, incidental, special, consequential, or punitive damages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Loss of profits, revenue, data, or trading capital</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Damages arising from the use or inability to use our services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Damages resulting from reliance on any AI-generated signal or analysis</span>
              </li>
            </ul>
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              This limitation applies regardless of whether the claim is based on warranty, contract, tort, or any other legal theory, and even if we have been advised of the possibility of such damages.
            </p>
          </Section>

          <Section
            number="05"
            title="Consult a Professional"
            icon={<FileText size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              We strongly recommend that you <strong className="text-white">consult with a qualified financial advisor</strong>, licensed broker, or investment professional before making any financial decisions. Our AI tools should be used as one of many sources of information, not as the sole basis for any investment.
            </p>
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              Different types of investments involve varying degrees of risk, and there can be no assurance that any specific investment will either be suitable or profitable for a particular user's investment portfolio.
            </p>
          </Section>

          <Section
            number="06"
            title="Third-Party Services"
            icon={<AlertTriangle size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              Our platform may integrate with third-party APIs and services (including but not limited to GoldAPI.io, OpenAI, and cryptocurrency payment processors). We are not responsible for the availability, accuracy, or security of these third-party services. Your use of such services is subject to their respective terms of service and privacy policies.
            </p>
          </Section>

          <Section
            number="07"
            title="Acceptance of Terms"
            icon={<Shield size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              By accessing and using Tradevisor AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and Disclaimer. If you do not agree with any part of these terms, you must immediately discontinue use of the platform.
            </p>
          </Section>

          <Section
            number="08"
            title="Changes to Terms"
            icon={<Scale size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              We reserve the right to modify these terms at any time without prior notice. Your continued use of the platform following any changes constitutes acceptance of the revised terms. We encourage you to review this page periodically.
            </p>
          </Section>

          {/* Contact */}
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 text-center mt-10">
            <h3 className="text-white font-semibold text-sm mb-2">Questions?</h3>
            <p className="text-[#666666] text-xs mb-3">
              If you have any questions about these Terms of Service, please contact us.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-[#d4a843] text-[#050505] text-xs font-semibold px-5 py-2 rounded-full hover:bg-[#e8c76a] transition-colors"
            >
              Back to Website
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-[#444444] text-[10px] text-center leading-relaxed max-w-2xl mx-auto">
            <strong className="text-[#666666]">Disclaimer:</strong> This document is provided as a general template and does not constitute legal advice. It is strongly recommended that you consult with a qualified attorney in your jurisdiction to ensure these terms comply with all applicable laws and regulations. Trade laws, financial regulations, and liability rules vary significantly by country and region.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function Section({
  number,
  title,
  icon,
  children,
}: {
  number: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[#d4a843]/40 text-xs font-mono font-bold">{number}</span>
        <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#1f1f1f] flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      <div className="pl-0">{children}</div>
    </div>
  );
}
