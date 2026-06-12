import { useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff,
  KeyRound, Loader2, Lock, Mail,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Forgot Password flow — two steps in a single component:
 *   1. enter email → receive a 6-digit reset code by email
 *   2. enter the code + new password → done, redirected to login
 *
 * Mirrors the visual language of the Account / OTP screens so it feels
 * native. Failures fall back gracefully — the backend returns generic
 * "if an account exists, a code has been sent" so we never leak which
 * emails are registered.
 */

type Step = "request" | "reset" | "done";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");

  // request step
  const [email, setEmail] = useState("");

  // reset step
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // shared
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const forgotMutation = trpc.auth.forgotPassword.useMutation();
  const resetMutation = trpc.auth.resetPasswordWithOtp.useMutation();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      const res = await forgotMutation.mutateAsync({ email: email.trim() });
      setInfo(res?.message || "Check your email for the reset code.");
      setStep("reset");
    } catch (err: any) {
      setError(err?.message || "Could not send the reset code. Please try again.");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      const res = await resetMutation.mutateAsync({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      if (!res.success) {
        setError(res.error || "Could not reset password.");
        return;
      }
      setStep("done");
      // Auto-redirect to login after a brief moment.
      setTimeout(() => navigate("/account"), 2400);
    } catch (err: any) {
      setError(err?.message || "Could not reset password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back link */}
        <button
          onClick={() => navigate("/account")}
          className="text-[#a0a0a0] text-sm flex items-center gap-1.5 mb-6 hover:text-[#d4a843] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </button>

        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
          {step === "request" && (
            <>
              <div className="mb-5">
                <div className="w-10 h-10 rounded-lg bg-[#d4a843]/15 flex items-center justify-center mb-3">
                  <KeyRound size={18} className="text-[#d4a843]" />
                </div>
                <h1 className="text-xl font-bold">Forgot your password?</h1>
                <p className="text-[#a0a0a0] text-sm mt-1">
                  Enter the email on your TradeVisor account and we'll send you a 6-digit
                  reset code.
                </p>
              </div>

              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="text-[#a0a0a0] text-sm mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-lg p-3 text-[#e11d48] text-xs flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotMutation.isPending || !email.trim()}
                  className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forgotMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                    : <>Send reset code <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="mb-5">
                <div className="w-10 h-10 rounded-lg bg-[#d4a843]/15 flex items-center justify-center mb-3">
                  <Lock size={18} className="text-[#d4a843]" />
                </div>
                <h1 className="text-xl font-bold">Enter your reset code</h1>
                <p className="text-[#a0a0a0] text-sm mt-1">
                  We sent a 6-digit code to <span className="text-white">{email}</span>.
                </p>
              </div>

              {/* Prominent spam/check banner — many users miss the email */}
              <div className="mb-5 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/[0.06] p-3.5">
                <div className="flex gap-2.5">
                  <AlertTriangle size={16} className="text-[#d4a843] shrink-0 mt-0.5" />
                  <div className="text-[12px] leading-relaxed">
                    <p className="text-[#e8c76a] font-semibold mb-1">
                      Don't see the email?
                    </p>
                    <p className="text-[#a0a0a0]">
                      Check your <span className="text-white font-semibold">Spam / Junk folder</span>
                      {" "}— reset emails often land there. Codes expire in 10 minutes.
                    </p>
                  </div>
                </div>
              </div>

              {info && (
                <div className="mb-4 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 p-3 text-[#22c55e] text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} /> {info}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-[#a0a0a0] text-sm mb-1.5 block">6-digit code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                    className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-lg tracking-widest text-center placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                  />
                </div>

                <div>
                  <label className="text-[#a0a0a0] text-sm mb-1.5 block">New password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-11 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#d4a843] transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-lg p-3 text-[#e11d48] text-xs flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetMutation.isPending || !otp.trim() || !newPassword}
                  className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Updating…</>
                    : <>Set new password <ArrowRight size={16} /></>}
                </button>
              </form>

              <button
                onClick={() => { setStep("request"); setOtp(""); setNewPassword(""); setError(""); setInfo(""); }}
                className="w-full mt-3 text-xs text-[#666666] hover:text-[#d4a843] transition-colors"
              >
                Didn't receive a code? Try again
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-[#22c55e]" />
              </div>
              <h1 className="text-xl font-bold mb-2">Password updated</h1>
              <p className="text-[#a0a0a0] text-sm">
                You can now sign in with your new password.
              </p>
              <p className="text-[#666666] text-xs mt-3">Redirecting…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
