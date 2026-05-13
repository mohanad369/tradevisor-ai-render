import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, ChevronLeft, Trash2, Cookie, Mail } from "lucide-react";
import { useNavigate } from "react-router";

export default function Privacy() {
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
            <Lock size={16} className="text-[#d4a843]" />
            <span className="text-sm font-semibold">Privacy Policy</span>
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
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-[#666666] text-sm">How we collect, use, and protect your data</p>
            <p className="text-[#d4a843] text-xs mt-2">Last Updated: May 2026</p>
          </div>

          {/* Sections */}
          <Section
            number="01"
            title="Information We Collect"
            icon={<Eye size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              We collect minimal information necessary to provide our services:
            </p>
            <ul className="space-y-2 text-[#a0a0a0] text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span><strong className="text-white">Chart Images:</strong> Images you upload for AI analysis are processed in real-time and are not permanently stored on our servers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span><strong className="text-white">Local Storage:</strong> We use browser localStorage to save your preferences, order history, and session tokens locally on your device.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span><strong className="text-white">Usage Statistics:</strong> Anonymous usage data to improve our services (page views, feature usage).</span>
              </li>
            </ul>
          </Section>

          <Section
            number="02"
            title="How We Use Your Information"
            icon={<Database size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              Your information is used solely for:
            </p>
            <ul className="space-y-2 text-[#a0a0a0] text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Providing AI-powered chart analysis services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Processing cryptocurrency payment orders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Maintaining your session and preferences</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Improving our AI models and user experience</span>
              </li>
            </ul>
          </Section>

          <Section
            number="03"
            title="Data Storage & Security"
            icon={<Lock size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              We take data security seriously:
            </p>
            <ul className="space-y-2 text-[#a0a0a0] text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>All API keys are stored server-side and never exposed to the frontend</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Chart images are processed in real-time and not retained</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Passwords are hashed using SHA-256 with secure comparison</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>We do not sell, trade, or share your personal data with third parties</span>
              </li>
            </ul>
          </Section>

          <Section
            number="04"
            title="Cookies & Local Storage"
            icon={<Cookie size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              We use browser localStorage to enhance your experience by remembering your preferences and session data. This data remains on your device and is not transmitted to our servers unless necessary for the service you requested.
            </p>
          </Section>

          <Section
            number="05"
            title="Third-Party Services"
            icon={<Database size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              We use the following third-party services:
            </p>
            <ul className="space-y-2 text-[#a0a0a0] text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span><strong className="text-white">OpenAI:</strong> For AI chart analysis processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span><strong className="text-white">GoldAPI.io:</strong> For real-time precious metals pricing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span><strong className="text-white">ExchangeRate-API:</strong> For metals price data fallback</span>
              </li>
            </ul>
            <p className="text-[#a0a0a0] text-sm leading-relaxed mt-3">
              Each third-party service operates under its own privacy policy. We recommend reviewing their respective policies for complete information.
            </p>
          </Section>

          <Section
            number="06"
            title="Your Rights"
            icon={<Eye size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-3">
              You have the right to:
            </p>
            <ul className="space-y-2 text-[#a0a0a0] text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Access and view any data we have about you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Request deletion of your data at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Opt-out of data collection by clearing localStorage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d4a843] mt-1">•</span>
                <span>Contact us with any privacy-related concerns</span>
              </li>
            </ul>
          </Section>

          <Section
            number="07"
            title="Data Retention & Deletion"
            icon={<Trash2 size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              Uploaded chart images are processed in real-time and immediately discarded. Order and preference data stored in your browser's localStorage can be cleared at any time by clearing your browser data. Server logs are retained for 30 days for debugging purposes only.
            </p>
          </Section>

          <Section
            number="08"
            title="Changes to This Policy"
            icon={<Lock size={18} className="text-[#d4a843]" />}
          >
            <p className="text-[#a0a0a0] text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify users of any significant changes by updating the "Last Updated" date. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          {/* Contact */}
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 text-center mt-10">
            <Mail size={20} className="text-[#d4a843] mx-auto mb-2" />
            <h3 className="text-white font-semibold text-sm mb-2">Contact Us</h3>
            <p className="text-[#666666] text-xs mb-3">
              If you have any questions about this Privacy Policy, please contact us.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-[#d4a843] text-[#050505] text-xs font-semibold px-5 py-2 rounded-full hover:bg-[#e8c76a] transition-colors"
            >
              Back to Website
            </button>
          </div>

          {/* Legal Disclaimer */}
          <p className="text-[#444444] text-[10px] text-center leading-relaxed max-w-2xl mx-auto">
            This Privacy Policy is provided as a general template. It is recommended to consult with a legal professional to ensure compliance with applicable data protection laws including GDPR, CCPA, and other relevant regulations in your jurisdiction.
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
