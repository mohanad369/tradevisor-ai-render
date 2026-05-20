import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp, TrendingDown, Wallet, Target, Brain, Activity,
  Plus, Trash2, Loader2, ArrowLeft, Crown, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle, Calculator, LineChart as LineChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";

// Palette mirrors the five AI agents for a consistent, professional look.
const C = {
  news: "#38bdf8",      // sky
  validate: "#22c55e",  // green
  momentum: "#f59e0b",  // amber
  chart: "#a78bfa",     // violet
  supervise: "#eab308", // gold
  bg: "#03070d",
  panel: "#0a0f17",
  border: "#1b2733",
  text: "#e6edf5",
  dim: "#7b8da3",
};

function money(n: number, currency = "USD"): string {
  const sym = currency === "USD" ? "$" : "";
  return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TraderDashboard() {
  const navigate = useNavigate();
  const { user, isLoggedIn, vip, loading: authLoading } = useUserAuth();

  // ─── Queries ───
  const overview = trpc.dashboard.overview.useQuery(undefined, { retry: false });
  const growthPlan = trpc.dashboard.growthPlan.useQuery({ tradesPerDay: 4, tradingDays: 20 }, { retry: false });
  const agentMem = trpc.dashboard.agentMemory.useQuery(undefined, { retry: false });

  const utils = trpc.useUtils();
  const saveAccount = trpc.dashboard.saveAccount.useMutation({
    onSuccess: () => { utils.dashboard.invalidate(); },
  });
  const logTrade = trpc.dashboard.logTrade.useMutation({
    onSuccess: () => { utils.dashboard.invalidate(); },
  });
  const deleteTrade = trpc.dashboard.deleteTrade.useMutation({
    onSuccess: () => { utils.dashboard.invalidate(); },
  });

  // ─── Local form state ───
  const [capitalInput, setCapitalInput] = useState("");
  const [riskInput, setRiskInput] = useState("1");
  const [rrInput, setRrInput] = useState("2");

  const [tradeOutcome, setTradeOutcome] = useState<"WIN" | "LOSS" | "BE">("WIN");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeAsset, setTradeAsset] = useState("");
  const [tradeStrategy, setTradeStrategy] = useState("");
  const [tradeLesson, setTradeLesson] = useState("");

  const [slPips, setSlPips] = useState("20");
  const lotQuery = trpc.dashboard.lotSize.useQuery(
    { stopLossPips: Math.max(0.1, parseFloat(slPips) || 20) },
    { retry: false, enabled: isLoggedIn },
  );

  const data = overview.data;
  const account = data && data.loggedIn ? data.account : null;
  const stats = data && data.loggedIn ? data.stats : null;
  const trades = data && data.loggedIn ? data.recentTrades : [];

  const needsSetup = account ? account.startingCapital === 0 : false;

  const chartData = useMemo(() => {
    if (!growthPlan.data || !growthPlan.data.loggedIn) return [];
    return growthPlan.data.projection.dailyPoints.map((p) => ({
      day: `D${p.day}`,
      balance: p.balance,
    }));
  }, [growthPlan.data]);

  // ─── Guards ───
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="animate-spin" style={{ color: C.momentum }} size={28} />
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
        <div className="max-w-sm text-center">
          <Brain size={40} style={{ color: C.chart }} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Trader Dashboard</h1>
          <p className="text-sm mb-5" style={{ color: C.dim }}>
            Log in to your account to access your trading dashboard.
          </p>
          <button onClick={() => navigate("/account")}
            className="w-full py-3 rounded-xl font-semibold text-[#020509]"
            style={{ background: C.momentum }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSaveCapital = () => {
    const cap = parseFloat(capitalInput);
    const risk = parseFloat(riskInput);
    const rr = parseFloat(rrInput);
    if (!Number.isFinite(cap) || cap <= 0) return;
    saveAccount.mutate({
      startingCapital: cap,
      riskPercent: Number.isFinite(risk) ? risk : 1,
      rewardRatio: Number.isFinite(rr) ? rr : 2,
    });
    setCapitalInput("");
  };

  const handleLogTrade = () => {
    const amt = parseFloat(tradeAmount);
    if (!Number.isFinite(amt)) return;
    logTrade.mutate({
      outcome: tradeOutcome,
      amount: amt,
      asset: tradeAsset || undefined,
      strategy: tradeStrategy || undefined,
      lessonLearned: tradeLesson || undefined,
    });
    setTradeAmount("");
    setTradeLesson("");
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: C.bg, color: C.text }}>
      {/* Ambient wash */}
      <div className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.10), transparent 40%), radial-gradient(circle at 80% 30%, rgba(167,139,250,0.10), transparent 40%)" }} />

      <div className="relative max-w-6xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")}
              className="w-9 h-9 rounded-lg flex items-center justify-center border"
              style={{ borderColor: C.border, background: C.panel }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-black">Trader Dashboard</h1>
              <p className="text-[11px]" style={{ color: C.dim }}>
                {user.name || user.email}
                {vip?.active && <span className="ml-2" style={{ color: C.supervise }}>· VIP {vip.plan}</span>}
              </p>
            </div>
          </div>
          <button onClick={() => navigate("/vip")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border"
            style={{ borderColor: `${C.supervise}55`, color: C.supervise, background: `${C.supervise}12` }}>
            <Crown size={13} /> VIP Tools
          </button>
        </div>

        {/* Risk disclaimer */}
        <div className="mb-5 rounded-xl border p-3 flex items-start gap-2"
          style={{ borderColor: `${C.momentum}33`, background: `${C.momentum}0d` }}>
          <AlertTriangle size={14} style={{ color: C.momentum }} className="mt-0.5 shrink-0" />
          <p className="text-[11px]" style={{ color: C.dim }}>
            This dashboard is a tracking &amp; education tool. Projections are mathematical
            scenarios, not guarantees — trading carries real risk of loss.
          </p>
        </div>

        {/* ── First-time capital setup ── */}
        {needsSetup && (
          <div className="mb-6 rounded-2xl border p-5"
            style={{ borderColor: `${C.validate}44`, background: C.panel }}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={18} style={{ color: C.validate }} />
              <h2 className="font-bold">Set Your Starting Capital</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: C.dim }}>
              Enter the capital you start trading with. Everything else — risk per trade,
              lot size, and your growth plan — is calculated from this.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>Starting Capital</label>
                <input type="number" value={capitalInput} onChange={(e) => setCapitalInput(e.target.value)}
                  placeholder="1000"
                  className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none"
                  style={{ borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>Risk per Trade %</label>
                <input type="number" value={riskInput} onChange={(e) => setRiskInput(e.target.value)}
                  className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none"
                  style={{ borderColor: C.border }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>Reward : Risk</label>
                <input type="number" value={rrInput} onChange={(e) => setRrInput(e.target.value)}
                  className="w-full mt-1 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none"
                  style={{ borderColor: C.border }} />
              </div>
            </div>
            <button onClick={handleSaveCapital} disabled={saveAccount.isPending}
              className="mt-4 w-full py-2.5 rounded-lg font-semibold text-[#020509] flex items-center justify-center gap-2"
              style={{ background: C.validate }}>
              {saveAccount.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Start Tracking
            </button>
          </div>
        )}

        {/* ── Stat cards ── */}
        {account && stats && !needsSetup && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Current Balance" value={money(account.currentBalance, account.currency)}
              accent={C.news} icon={<Wallet size={16} />}
              sub={`Start: ${money(account.startingCapital, account.currency)}`} />
            <StatCard label="Net P/L" value={money(stats.totalPnl, account.currency)}
              accent={stats.totalPnl >= 0 ? C.validate : "#ef4444"}
              icon={stats.totalPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              sub={`${stats.totalTrades} trades logged`} />
            <StatCard label="Win Rate" value={`${stats.winRate}%`}
              accent={C.momentum} icon={<Target size={16} />}
              sub={`${stats.wins}W · ${stats.losses}L · ${stats.breakeven}BE`} />
            <StatCard label="Profit Factor" value={stats.profitFactor >= 999 ? "∞" : String(stats.profitFactor)}
              accent={C.chart} icon={<Activity size={16} />}
              sub={`Avg win ${money(stats.avgWin)} / loss ${money(stats.avgLoss)}`} />
          </div>
        )}

        {!needsSetup && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Left: Log a trade ── */}
            <div className="rounded-2xl border p-5" style={{ borderColor: C.border, background: C.panel }}>
              <div className="flex items-center gap-2 mb-4">
                <Plus size={16} style={{ color: C.validate }} />
                <h2 className="font-bold text-sm">Log a Trade</h2>
              </div>

              <div className="flex gap-2 mb-3">
                {(["WIN", "LOSS", "BE"] as const).map((o) => {
                  const active = tradeOutcome === o;
                  const col = o === "WIN" ? C.validate : o === "LOSS" ? "#ef4444" : C.dim;
                  const Icon = o === "WIN" ? CheckCircle2 : o === "LOSS" ? XCircle : MinusCircle;
                  return (
                    <button key={o} onClick={() => setTradeOutcome(o)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-colors"
                      style={{
                        borderColor: active ? col : C.border,
                        background: active ? `${col}1f` : "transparent",
                        color: active ? col : C.dim,
                      }}>
                      <Icon size={13} /> {o}
                    </button>
                  );
                })}
              </div>

              <input type="number" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)}
                placeholder={tradeOutcome === "LOSS" ? "Amount lost" : tradeOutcome === "WIN" ? "Amount won" : "0"}
                className="w-full mb-2 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none"
                style={{ borderColor: C.border }} />
              <input type="text" value={tradeAsset} onChange={(e) => setTradeAsset(e.target.value)}
                placeholder="Asset (e.g. XAU/USD)"
                className="w-full mb-2 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none"
                style={{ borderColor: C.border }} />
              <input type="text" value={tradeStrategy} onChange={(e) => setTradeStrategy(e.target.value)}
                placeholder="Strategy (e.g. SMC)"
                className="w-full mb-2 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none"
                style={{ borderColor: C.border }} />
              <textarea value={tradeLesson} onChange={(e) => setTradeLesson(e.target.value)}
                placeholder={tradeOutcome === "LOSS"
                  ? "What went wrong? (the agents learn from this)"
                  : "Note / lesson (optional)"}
                rows={2}
                className="w-full mb-3 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none resize-none"
                style={{ borderColor: C.border }} />

              <button onClick={handleLogTrade} disabled={logTrade.isPending || !tradeAmount}
                className="w-full py-2.5 rounded-lg font-semibold text-[#020509] flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: C.validate }}>
                {logTrade.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Add Trade
              </button>
            </div>

            {/* ── Middle: Growth plan chart ── */}
            <div className="lg:col-span-2 rounded-2xl border p-5" style={{ borderColor: C.border, background: C.panel }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LineChartIcon size={16} style={{ color: C.news }} />
                  <h2 className="font-bold text-sm">1-Month Growth Plan</h2>
                </div>
                {growthPlan.data?.loggedIn && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: growthPlan.data.basedOnRealData ? `${C.validate}1f` : `${C.dim}1f`,
                      color: growthPlan.data.basedOnRealData ? C.validate : C.dim,
                    }}>
                    {growthPlan.data.basedOnRealData ? "Based on your real win rate" : "Estimate — log 10+ trades for accuracy"}
                  </span>
                )}
              </div>

              {growthPlan.data?.loggedIn && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <MiniStat label="Projected End"
                      value={money(growthPlan.data.projection.endBalance)} accent={C.news} />
                    <MiniStat label="Growth"
                      value={`+${money(growthPlan.data.projection.growthAmount)}`} accent={C.validate} />
                    <MiniStat label="Growth %"
                      value={`${growthPlan.data.projection.growthPercent}%`} accent={C.momentum} />
                  </div>

                  {growthPlan.data.warning && (
                    <div className="mb-3 text-[11px] rounded-lg p-2 flex items-center gap-2"
                      style={{ background: "#ef444415", color: "#ef4444" }}>
                      <AlertTriangle size={12} /> {growthPlan.data.warning}
                    </div>
                  )}

                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.news} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={C.news} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="day" tick={{ fill: C.dim, fontSize: 10 }} />
                        <YAxis tick={{ fill: C.dim, fontSize: 10 }} width={50} />
                        <Tooltip
                          contentStyle={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: C.dim }} />
                        <Area type="monotone" dataKey="balance" stroke={C.news} strokeWidth={2} fill="url(#bal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: C.dim }}>
                    Plan assumes {growthPlan.data.inputs.tradesPerDay} trades/day ·{" "}
                    {growthPlan.data.inputs.riskPercent}% risk · 1:{growthPlan.data.inputs.rewardRatio} R:R ·{" "}
                    {growthPlan.data.inputs.winRatePercent}% win rate.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Lot calculator + Agent memory ── */}
        {!needsSetup && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            {/* Lot calculator */}
            <div className="rounded-2xl border p-5" style={{ borderColor: C.border, background: C.panel }}>
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={16} style={{ color: C.momentum }} />
                <h2 className="font-bold text-sm">Lot Size Calculator</h2>
              </div>
              <label className="text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>
                Stop-Loss Distance (pips)
              </label>
              <input type="number" value={slPips} onChange={(e) => setSlPips(e.target.value)}
                className="w-full mt-1 mb-4 rounded-lg px-3 py-2.5 text-sm border bg-transparent outline-none"
                style={{ borderColor: C.border }} />
              {lotQuery.data?.loggedIn && (
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Recommended Lot"
                    value={String(lotQuery.data.recommendedLot)} accent={C.momentum} />
                  <MiniStat label="Risk Amount"
                    value={money(lotQuery.data.riskAmount)} accent="#ef4444" />
                  <MiniStat label="Reward Target"
                    value={money(lotQuery.data.rewardTargetAmount)} accent={C.validate} />
                  <MiniStat label="Risk %"
                    value={`${lotQuery.data.riskPercent}%`} accent={C.news} />
                </div>
              )}
            </div>

            {/* Agent memory */}
            <div className="rounded-2xl border p-5" style={{ borderColor: C.border, background: C.panel }}>
              <div className="flex items-center gap-2 mb-1">
                <Brain size={16} style={{ color: C.chart }} />
                <h2 className="font-bold text-sm">Agent Memory</h2>
              </div>
              <p className="text-[11px] mb-4" style={{ color: C.dim }}>
                The AI agents remember your real results and use them as context in your
                next analysis — so their advice gets sharper as you log more trades.
              </p>
              {agentMem.data?.loggedIn && agentMem.data.buckets.length > 0 ? (
                <>
                  <div className="mb-3 rounded-lg p-3" style={{ background: `${C.chart}12` }}>
                    <span className="text-[10px] uppercase" style={{ color: C.dim }}>Overall Win Rate (memory)</span>
                    <div className="text-2xl font-black" style={{ color: C.chart }}>
                      {agentMem.data.overallWinRate}%
                    </div>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {agentMem.data.buckets.map((b, i) => (
                      <div key={i} className="rounded-lg border p-2.5" style={{ borderColor: C.border }}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{b.asset || "general"} · {b.strategy || "general"}</span>
                          <span style={{ color: b.winRate >= 50 ? C.validate : "#ef4444" }}>{b.winRate}% WR</span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: C.dim }}>
                          {b.wins}W · {b.losses}L · {b.breakeven}BE
                        </div>
                        {b.lessons.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {b.lessons.slice(0, 3).map((l, j) => (
                              <li key={j} className="text-[10px] flex gap-1" style={{ color: C.dim }}>
                                <span style={{ color: C.chart }}>•</span> {l}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-center py-6" style={{ color: C.dim }}>
                  No memory yet. Log trades with lessons and the agents start learning.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Trade journal ── */}
        {!needsSetup && trades.length > 0 && (
          <div className="mt-5 rounded-2xl border p-5" style={{ borderColor: C.border, background: C.panel }}>
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Activity size={16} style={{ color: C.supervise }} /> Trade Journal
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: C.dim }} className="text-left">
                    <th className="py-2 font-medium">Result</th>
                    <th className="py-2 font-medium">Asset</th>
                    <th className="py-2 font-medium">Strategy</th>
                    <th className="py-2 font-medium">P/L</th>
                    <th className="py-2 font-medium">Lesson</th>
                    <th className="py-2 font-medium text-right">·</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t: any) => {
                    const amt = parseFloat(t.amount) || 0;
                    const col = t.outcome === "WIN" ? C.validate : t.outcome === "LOSS" ? "#ef4444" : C.dim;
                    return (
                      <tr key={t.tradeId} className="border-t" style={{ borderColor: C.border }}>
                        <td className="py-2.5">
                          <span className="font-bold" style={{ color: col }}>{t.outcome}</span>
                        </td>
                        <td className="py-2.5">{t.asset || "—"}</td>
                        <td className="py-2.5">{t.strategy || "—"}</td>
                        <td className="py-2.5 font-semibold" style={{ color: col }}>
                          {amt >= 0 ? "+" : ""}{money(amt)}
                        </td>
                        <td className="py-2.5 max-w-[200px] truncate" style={{ color: C.dim }}>
                          {t.lessonLearned || "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => deleteTrade.mutate({ tradeId: t.tradeId })}
                            className="opacity-60 hover:opacity-100">
                            <Trash2 size={13} style={{ color: "#ef4444" }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small presentational helpers ──
function StatCard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: C.border, background: C.panel }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: accent }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>{label}</span>
      </div>
      <div className="text-xl font-black" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: C.dim }}>{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: C.border }}>
      <div className="text-[9px] uppercase tracking-wide" style={{ color: C.dim }}>{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color: accent }}>{value}</div>
    </div>
  );
}
