import { useMemo } from "react";
import { motion } from "framer-motion";
import { Newspaper, CheckCircle2, Activity, Crosshair, Radar } from "lucide-react";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useLanguage } from "@/lib/language";

/**
 * WelcomeBanner — shown at the top of the homepage when a user is
 * logged in. The five TradeVisor AI agents orbit the user's name in a
 * living, glowing ring with the tagline "take your next trade".
 *
 * Renders nothing for logged-out visitors.
 */

// The five agents that orbit the name — same identities and colors as
// the AI Agents Workflow section, kept consistent on purpose.
const ORBIT_AGENTS = [
  { icon: Newspaper, color: "#38bdf8" },
  { icon: CheckCircle2, color: "#22c55e" },
  { icon: Activity, color: "#f59e0b" },
  { icon: Crosshair, color: "#a78bfa" },
  { icon: Radar, color: "#eab308" },
] as const;

export default function WelcomeBanner() {
  const { user, isLoggedIn, vip } = useUserAuth();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  // Friendly first name (fall back to the part before @ in the email).
  const displayName = useMemo(() => {
    if (!user) return "";
    const name = user.name?.trim();
    if (name) return name.split(" ")[0];
    return user.email.split("@")[0];
  }, [user]);

  if (!isLoggedIn || !user) return null;

  const ORBIT_RADIUS = 86; // px — distance of agents from the name center

  return (
    <section className="relative isolate overflow-hidden bg-[#03070d] px-4 pt-24 pb-10 sm:pt-28">
      {/* Soft living agent-network artwork behind the welcome stage. */}
      <motion.img
        src="/assets/tradevisor-ai-agents-bg.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-[0.13] mix-blend-screen"
        animate={{ scale: [1.02, 1.07, 1.02], opacity: [0.1, 0.16, 0.1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[#03070d]/55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0%,rgba(3,7,13,0.18)_33%,rgba(3,7,13,0.92)_82%)]" />

      {/* Ambient color wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(24,200,255,0.16),transparent_42%),radial-gradient(circle_at_18%_70%,rgba(34,197,94,0.12),transparent_38%),radial-gradient(circle_at_84%_64%,rgba(212,168,67,0.12),transparent_40%)]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* Orbit stage */}
        <div className="relative mb-5 flex h-[230px] w-[230px] items-center justify-center sm:h-[260px] sm:w-[260px]">
          <motion.div
            className="absolute h-[246px] w-[246px] rounded-full border border-[#18c8ff]/12 sm:h-[276px] sm:w-[276px]"
            animate={{ rotate: 360, opacity: [0.25, 0.7, 0.25] }}
            transition={{ rotate: { duration: 32, repeat: Infinity, ease: "linear" }, opacity: { duration: 4, repeat: Infinity } }}
          >
            {[0, 90, 180, 270].map((angle) => (
              <motion.span
                key={angle}
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-[#18c8ff] shadow-[0_0_14px_rgba(24,200,255,0.9)]"
                style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-122px)` }}
                animate={{ scale: [0.7, 1.45, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: angle / 360 }}
              />
            ))}
          </motion.div>

          {/* Rotating ring of agents */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            {ORBIT_AGENTS.map((agent, index) => {
              const angle = (index / ORBIT_AGENTS.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * ORBIT_RADIUS;
              const y = Math.sin(angle) * ORBIT_RADIUS;
              const Icon = agent.icon;
              return (
                <motion.div
                  key={index}
                  className="absolute left-1/2 top-1/2"
                  style={{ x, y, translateX: "-50%", translateY: "-50%" }}
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.45 }}
                >
                  {/* Counter-rotate so the icons stay upright while orbiting */}
                  <motion.div
                    className="flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm"
                    style={{
                      borderColor: `${agent.color}55`,
                      backgroundColor: `${agent.color}1f`,
                      boxShadow: `0 0 18px ${agent.color}44`,
                    }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  >
                    <Icon size={18} style={{ color: agent.color }} />
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Pulsing orbit guide rings */}
          <motion.div
            className="absolute h-[176px] w-[176px] rounded-full border border-[#18c8ff]/15"
            animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 3.4, repeat: Infinity }}
          />
          <motion.div
            className="absolute h-[194px] w-[194px] rounded-full border border-dashed border-[#22c55e]/15"
            animate={{ rotate: -360, scale: [1, 1.04, 1] }}
            transition={{ rotate: { duration: 26, repeat: Infinity, ease: "linear" }, scale: { duration: 3.8, repeat: Infinity } }}
          />
          <div className="absolute h-[210px] w-[210px] rounded-full border border-[#d4a843]/10" />

          {/* Center: the user's name */}
          <motion.div
            className="relative z-10 flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full border border-[#d4a843]/30 bg-[#0a0f17]/90 px-2 text-center backdrop-blur-md sm:h-[132px] sm:w-[132px]"
            animate={{
              boxShadow: [
                "0 0 22px rgba(212,168,67,0.18)",
                "0 0 46px rgba(212,168,67,0.4)",
                "0 0 22px rgba(212,168,67,0.18)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7b8da3]">
              {isArabic ? "أهلاً" : "Welcome"}
            </span>
            <span className="mt-0.5 max-w-full truncate bg-gradient-to-r from-[#18c8ff] via-[#d4a843] to-[#22c55e] bg-clip-text text-lg font-black text-transparent sm:text-xl">
              {displayName}
            </span>
            {vip?.active && (
              <span className="mt-1 rounded-full bg-[#d4a843]/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#d4a843]">
                VIP
              </span>
            )}
          </motion.div>
        </div>

        {/* Tagline */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xl font-black text-white sm:text-2xl"
        >
          {isArabic ? (
            <>أهلاً <span className="text-[#d4a843]">{displayName}</span>، نفّذ صفقتك القادمة</>
          ) : (
            <>Welcome <span className="text-[#d4a843]">{displayName}</span>, take your next trade</>
          )}
        </motion.h2>
        <p className="mt-1.5 text-xs text-[#7b8da3] sm:text-sm">
          {isArabic
            ? "وكلاء الذكاء الاصطناعي الخمسة جاهزون لتحليل سوقك"
            : "All five AI agents are ready to analyze your market"}
        </p>
      </div>
    </section>
  );
}
