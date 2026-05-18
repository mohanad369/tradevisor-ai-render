import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import PricingCard from "@/components/PricingCard";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";
import { pricingPlans } from "@/data/pricing";
import type { PricingPlan } from "@/data/pricing";

/**
 * Hidden developer test payment page.
 * Only accessible via direct URL: /#/test-pay-2026
 * Not linked from any public page or navigation.
 *
 * Purpose: Test the full payment flow (NOWPayments invoice → IPN webhook
 * → VIP code generation → Gmail SMTP delivery → code activation)
 * without using real high-priced plans ($69 / $669).
 *
 * After verifying everything works, delete the testOnly plan from pricing.ts
 * (or just stop sharing this URL).
 */
export default function TestPay() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show plans marked as testOnly
  const testPlans = pricingPlans.filter((p) => p.testOnly);

  const openPayment = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to home</span>
        </button>

        {/* Warning banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-medium mb-1">Developer Test Page</p>
            <p className="text-amber-200/70">
              This is a private test page used to verify the payment system. Real
              users cannot access this URL. The $10 plan here is for testing only.
            </p>
          </div>
        </motion.div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#333] mb-4">
            <Shield className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="text-[#10b981] text-xs font-mono uppercase tracking-wider">
              DEV_TEST_MODE
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-3">Test Payment Flow</h1>
          <p className="text-[#a0a0a0] text-sm max-w-md mx-auto">
            Use this page to verify NOWPayments invoice creation, IPN webhook,
            VIP code generation, and Gmail SMTP delivery end-to-end.
          </p>
        </div>

        {/* Test plans */}
        {testPlans.length === 0 ? (
          <div className="text-center text-[#666] text-sm py-12">
            No test plans configured. Add a plan with{" "}
            <code className="text-[#10b981]">testOnly: true</code> in{" "}
            <code className="text-[#10b981]">src/data/pricing.ts</code>.
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-6">
            {testPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <PricingCard plan={plan} onPayCrypto={openPayment} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Checklist */}
        <div className="mt-12 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-sm font-mono uppercase tracking-wider text-[#666] mb-4">
            [ TEST_CHECKLIST ]
          </h3>
          <ul className="space-y-2 text-sm text-[#a0a0a0]">
            <li className="flex items-start gap-2">
              <span className="text-[#10b981] mt-0.5">○</span>
              <span>NOWPayments invoice created successfully</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10b981] mt-0.5">○</span>
              <span>Payment processed (USDT TRC-20 recommended for low fees)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10b981] mt-0.5">○</span>
              <span>IPN webhook received in Render logs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10b981] mt-0.5">○</span>
              <span>Signature verification passed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10b981] mt-0.5">○</span>
              <span>VIP code generated in database</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10b981] mt-0.5">○</span>
              <span>Gmail SMTP delivered the code to user inbox</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#10b981] mt-0.5">○</span>
              <span>Code activates VIP access on /login</span>
            </li>
          </ul>
        </div>
      </div>

      <CryptoPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planName={selectedPlan?.name || ""}
        amount={selectedPlan?.salePrice.replace("$", "") || ""}
      />
    </div>
  );
}
