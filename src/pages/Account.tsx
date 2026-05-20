import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle, Loader2, Mail, Lock, User as UserIcon,
  LogIn, UserPlus, ShieldCheck, Crown, ArrowRight, LogOut,
  Phone as PhoneIcon, KeyRound, CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";

type Mode = "login" | "signup";

export default function Account() {
  const navigate = useNavigate();
  const { user, vip, isLoggedIn, loading, setSession, logout } = useUserAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // OTP step state — when `otpStage` is true we show the code entry screen.
  const [otpStage, setOtpStage] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [info, setInfo] = useState("");

  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();
  const resendOtpMutation = trpc.auth.resendOtp.useMutation();

  // If already logged in, this page becomes the account dashboard.
  useEffect(() => {
    setError("");
    setInfo("");
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signup") {
        // Step 1 — request signup; the server emails an OTP code.
        const res = await signupMutation.mutateAsync({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
          phone: phone.trim(),
        });
        if (!res.success) {
          setError(res.error || "Could not start signup");
          return;
        }
        // Move to the OTP entry screen.
        setOtpEmail(email.trim().toLowerCase());
        setOtpStage(true);
        setInfo("We sent a 6-digit code to your email. Enter it below to finish.");
      } else {
        const res = await loginMutation.mutateAsync({
          email: email.trim().toLowerCase(),
          password,
        });
        if (!res.success || !res.sessionToken) {
          setError(res.error || "Invalid email or password");
          return;
        }
        setSession(res.sessionToken, res.user);
        setPassword("");
      }
    } catch {
      setError("Secure server is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await verifyOtpMutation.mutateAsync({
        email: otpEmail,
        otp: otpCode.trim(),
      });
      if (!res.success || !res.sessionToken) {
        setError(res.error || "Invalid code");
        return;
      }
      // Account created + logged in.
      setSession(res.sessionToken, res.user);
      setPassword("");
      setOtpStage(false);
      setOtpCode("");
    } catch {
      setError("Secure server is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await resendOtpMutation.mutateAsync({ email: otpEmail });
      if (!res.success) {
        setError(res.error || "Could not resend the code");
        return;
      }
      setInfo("A new code has been sent to your email.");
    } catch {
      setError("Secure server is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Logged-in view: account dashboard
  // ─────────────────────────────────────────────────────────────
  if (isLoggedIn && user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
              <UserIcon size={30} className="text-[#d4a843]" />
            </div>
            <h1 className="text-2xl font-bold mb-1">My Account</h1>
            <p className="text-[#666666] text-sm">{user.email}</p>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 space-y-4">
            {user.name && (
              <div className="flex items-center justify-between">
                <span className="text-[#a0a0a0] text-sm">Name</span>
                <span className="text-white text-sm">{user.name}</span>
              </div>
            )}

            {/* VIP status banner */}
            {vip?.active ? (
              <div className="bg-[#d4a843]/10 border border-[#d4a843]/25 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={16} className="text-[#d4a843]" />
                  <span className="text-[#d4a843] font-semibold text-sm">VIP Active</span>
                </div>
                <p className="text-[#a0a0a0] text-xs">
                  Plan: {vip.plan || "VIP"}
                  {vip.expiresAt ? ` · expires ${new Date(vip.expiresAt as string).toLocaleDateString()}` : ""}
                </p>
                <button
                  onClick={() => navigate("/vip")}
                  className="mt-3 w-full bg-[#d4a843] text-[#050505] font-semibold py-2.5 rounded-xl hover:bg-[#e8c76a] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Open VIP Dashboard <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="mt-2 w-full border border-[#a78bfa]/40 text-[#a78bfa] font-semibold py-2.5 rounded-xl hover:bg-[#a78bfa]/10 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Open Trader Dashboard <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <p className="text-white text-sm font-medium mb-1">You don't have a VIP subscription</p>
                <p className="text-[#666666] text-xs mb-3">
                  Subscribing is optional — your account works without it. Upgrade anytime to unlock VIP tools.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="w-full bg-[#d4a843] text-[#050505] font-semibold py-2.5 rounded-xl hover:bg-[#e8c76a] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  View Plans <ArrowRight size={15} />
                </button>
              </div>
            )}

            <button
              onClick={async () => { await logout(); }}
              className="w-full border border-[#1f1f1f] text-[#a0a0a0] py-2.5 rounded-xl hover:border-[#e11d48]/40 hover:text-[#e11d48] transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>

          <div className="mt-4 text-center">
            <button onClick={() => navigate("/")} className="text-[#666666] text-sm hover:text-[#d4a843] transition-colors">
              Back to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Loading the session
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <Loader2 size={28} className="text-[#d4a843] animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // OTP verification screen — shown after a signup request
  // ─────────────────────────────────────────────────────────────
  if (otpStage) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
              <KeyRound size={30} className="text-[#d4a843]" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Verify Your Email</h1>
            <p className="text-[#666666] text-sm">
              Enter the 6-digit code we sent to<br />
              <span className="text-[#d4a843]">{otpEmail}</span>
            </p>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-[#a0a0a0] text-sm mb-1.5 block">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.4em] font-bold placeholder-[#3a3a3a] focus:outline-none focus:border-[#d4a843]"
                />
              </div>

              {info && (
                <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-3 text-[#22c55e] text-sm flex items-center gap-2">
                  <CheckCircle2 size={14} /> <span>{info}</span>
                </div>
              )}
              {error && (
                <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl p-3 text-[#e11d48] text-sm flex items-center gap-2">
                  <AlertTriangle size={14} /> <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || otpCode.length < 4}
                className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {busy ? "Verifying..." : "Verify & Create Account"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button onClick={handleResendOtp} disabled={busy}
                className="text-[#d4a843] hover:underline disabled:opacity-50">
                Resend code
              </button>
              <button onClick={() => { setOtpStage(false); setOtpCode(""); setError(""); setInfo(""); }}
                className="text-[#666666] hover:text-[#a0a0a0]">
                Back to signup
              </button>
            </div>
          </div>

          <p className="text-center text-[#666666] text-[11px] mt-4">
            The code expires in 10 minutes. Check your spam folder if you don't see it.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Logged-out view: login / signup form
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={30} className="text-[#d4a843]" />
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {mode === "signup" ? "Create Your Account" : "Welcome Back"}
          </h1>
          <p className="text-[#666666] text-sm">
            {mode === "signup"
              ? "Sign up free — subscribe to VIP whenever you want"
              : "Log in to your TradeVisor account"}
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
          {/* Tab switch */}
          <div className="flex bg-[#141414] rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                mode === "login" ? "bg-[#d4a843] text-[#050505]" : "text-[#a0a0a0]"
              }`}
            >
              <LogIn size={14} /> Log In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                mode === "signup" ? "bg-[#d4a843] text-[#050505]" : "text-[#a0a0a0]"
              }`}
            >
              <UserPlus size={14} /> Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-[#a0a0a0] text-sm mb-1.5 block">Name (optional)</label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="text-[#a0a0a0] text-sm mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <PhoneIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    required
                    className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                  />
                </div>
                <p className="text-[#666666] text-[11px] mt-1">Each phone number can register one account only.</p>
              </div>
            )}

            <div>
              <label className="text-[#a0a0a0] text-sm mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[#a0a0a0] text-sm mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  required
                  className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                />
              </div>
            </div>

            {error && (
              <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl p-3 text-[#e11d48] text-sm flex items-center gap-2">
                <AlertTriangle size={14} /> <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : mode === "signup" ? <UserPlus size={16} /> : <LogIn size={16} />}
              {busy ? "Please wait..." : mode === "signup" ? "Send Verification Code" : "Log In"}
            </button>
          </form>

          <p className="text-center text-[#666666] text-xs mt-4">
            {mode === "signup" ? "Already have an account? " : "New to TradeVisor? "}
            <button
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              className="text-[#d4a843] hover:underline"
            >
              {mode === "signup" ? "Log in" : "Create one free"}
            </button>
          </p>

          <div className="mt-4 pt-4 border-t border-[#1f1f1f] text-center">
            <button onClick={() => navigate("/")} className="text-[#666666] text-sm hover:text-[#d4a843] transition-colors">
              Back to Website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
