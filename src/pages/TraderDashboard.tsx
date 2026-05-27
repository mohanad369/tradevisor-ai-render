import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp, TrendingDown, Wallet, Target, Brain, Activity,
  Plus, Trash2, Loader2, Crown, AlertTriangle, LayoutDashboard,
  CheckCircle2, XCircle, MinusCircle, Calculator, LineChart as LineChartIcon,
  BookOpen, Gauge, Home, LogOut, Zap, ChevronRight, Cpu, History,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";

// ── Palette: mirrors the five TradeVisor AI agents ──
const C = {
  news: "#38bdf8",      // sky
  validate: "#22c55e",  // green
  momentum: "#f59e0b",  // amber
  chart: "#a78bfa",     // violet
  supervise: "#eab308", // gold
  loss: "#ef4444",
  bg: "#03070d",
  text: "#e6edf5",
  dim: "#7b8da3",
};

// Frosted-glass surface — translucent panel with blur, used everywhere.
const glass = "backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]";

function money(n: number, currency = "USD"): string {
  const sym = currency === "USD" ? "$" : "";
  return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

type NavId = "overview" | "archive" | "journal" | "plan" | "calculator" | "memory";

const NAV_ITEMS: { id: NavId; label: string; icon: typeof Wallet; color: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: C.news },
  { id: "archive", label: "24h Analysis Archive", icon: History, color: C.supervise },
  { id: "journal", label: "Trade Journal", icon: Activity, color: C.validate },
  { id: "plan", label: "Growth Plan", icon: LineChartIcon, color: C.momentum },
  { id: "calculator", label: "Lot Calculator", icon: Calculator, color: C.chart },
  { id: "memory", label: "Agent Memory", icon: Brain, color: C.supervise },
];

export default function TraderDashboard() {
  const navigate = useNavigate();
  const { user, isLoggedIn, vip, loading: authLoading, logout } = useUserAuth();

  // ── Queries ──
  const overview = trpc.dashboard.overview.useQuery(undefined, { retry: false });
  const growthPlan = trpc.dashboard.growthPlan.useQuery({ tradesPerDay: 4, tradingDays: 20 }, { retry: false });
  const agentMem = trpc.dashboard.agentMemory.useQuery(undefined, { retry: false });

  const utils = trpc.useUtils();
  const saveAccount = trpc.dashboard.saveAccount.useMutation({ onSuccess: () => utils.dashboard.invalidate() });
  const logTrade = trpc.dashboard.logTrade.useMutation({ onSuccess: () => utils.dashboard.invalidate() });
  const deleteTrade = trpc.dashboard.deleteTrade.useMutation({ onSuccess: () => utils.dashboard.invalidate() });
  // The user's saved AI analyses — trades are logged FROM these.
  const myAnalyses = trpc.dashboard.myAnalyses.useQuery({ onlyUnlogged: true }, { retry: false });
  const archive = trpc.dashboard.todayArchive.useQuery(
    { limit: 40 },
    { retry: false, enabled: isLoggedIn, refetchInterval: 60_000 },
  );

  // ── Local state ──
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [capitalInput, setCapitalInput] = useState("");
  const [riskInput, setRiskInput] = useState("1");
  const [rrInput, setRrInput] = useState("2");
  const [tradeOutcome, setTradeOutcome] = useState<"WIN" | "LOSS" | "BE">("WIN");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeAsset, setTradeAsset] = useState("");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState("");
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
    return growthPlan.data.projection.dailyPoints.map((p) => ({ day: `D${p.day}`, balance: p.balance }));
  }, [growthPlan.data]);

  // ── Guards ──
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
        <div className={`max-w-sm text-center rounded-2xl p-8 ${glass}`}>
          <Brain size={40} style={{ color: C.chart }} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Trader Dashboard</h1>
          <p className="text-sm mb-5" style={{ color: C.dim }}>
            Log in to your account to access your trading dashboard.
          </p>
          <button onClick={() => navigate("/account")}
            className="w-full py-3 rounded-xl font-semibold text-[#020509]" style={{ background: C.momentum }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSaveCapital = () => {
    const cap = parseFloat(capitalInput);
    if (!Number.isFinite(cap) || cap <= 0) return;
    saveAccount.mutate({
      startingCapital: cap,
      riskPercent: Number.isFinite(parseFloat(riskInput)) ? parseFloat(riskInput) : 1,
      rewardRatio: Number.isFinite(parseFloat(rrInput)) ? parseFloat(rrInput) : 2,
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
      analysisId: selectedAnalysisId || undefined,
      lessonLearned: tradeLesson || undefined,
    });
    setTradeAmount("");
    setTradeLesson("");
    setSelectedAnalysisId("");
  };

  const analyses = myAnalyses.data?.loggedIn ? myAnalyses.data.analyses : [];
  const archiveAnalyses = archive.data?.loggedIn && archive.data.isSubscriber ? archive.data.analyses : [];

  const firstName = (user.name?.trim() || user.email.split("@")[0]).split(" ")[0];

  return (
    <div className="min-h-screen relative" style={{ background: C.bg, color: C.text }}>
      {/* Ambient agent-colored glow */}
      <div className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(circle at 12% 8%, rgba(56,189,248,0.12), transparent 38%), radial-gradient(circle at 88% 20%, rgba(167,139,250,0.12), transparent 36%), radial-gradient(circle at 60% 95%, rgba(34,197,94,0.10), transparent 40%)" }} />

      <div className="relative mx-auto max-w-[1280px] px-3 sm:px-5 py-5">
        <div className="flex flex-col lg:flex-row gap-5">

          {/* ═══ SIDEBAR ═══ */}
          <aside className={`lg:w-60 shrink-0 rounded-2xl p-4 ${glass} h-fit lg:sticky lg:top-5`}>
            <div className="flex items-center gap-2.5 pb-4 mb-3 border-b border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${C.news}, ${C.chart})` }}>
                <Gauge size={18} className="text-[#020509]" />
              </div>
              <div>
                <div className="font-black text-sm leading-tight">TradeVisor</div>
                <div className="text-[10px]" style={{ color: C.dim }}>Trader Dashboard</div>
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-wider mb-2 px-1" style={{ color: C.dim }}>
              Main Menu
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveNav(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: active ? `${item.color}1a` : "transparent",
                      color: active ? item.color : C.dim,
                      border: `1px solid ${active ? `${item.color}40` : "transparent"}`,
                    }}>
                    <Icon size={16} />
                    <span className="font-medium">{item.label}</span>
                    {active && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                );
              })}
            </nav>

            <div className="text-[10px] uppercase tracking-wider mt-5 mb-2 px-1" style={{ color: C.dim }}>
              Navigate
            </div>
            <nav className="space-y-1">
              <button onClick={() => navigate("/vip")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{ color: C.supervise }}>
                <Crown size={16} /> <span className="font-medium">VIP Tools</span>
              </button>
              <button onClick={() => navigate("/")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/[0.04]"
                style={{ color: C.dim }}>
                <Home size={16} /> <span className="font-medium">Home</span>
              </button>
              <button onClick={async () => { await logout(); navigate("/"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-[#ef4444]/10"
                style={{ color: C.loss }}>
                <LogOut size={16} /> <span className="font-medium">Log Out</span>
              </button>
            </nav>
          </aside>

          {/* ═══ MAIN ═══ */}
          <main className="flex-1 min-w-0 space-y-5">

            {/* Header bar */}
            <div className={`rounded-2xl p-5 ${glass}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black flex items-center gap-2">
                    Welcome back, <span style={{ color: C.momentum }}>{firstName}</span>
                  </h1>
                  <p className="text-xs mt-0.5" style={{ color: C.dim }}>
                    Here's your trading overview &mdash; take your next trade.
                  </p>
                </div>
                {vip?.active && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: `${C.supervise}1f`, color: C.supervise, border: `1px solid ${C.supervise}40` }}>
                    <Crown size={13} /> VIP · {vip.plan}
                  </div>
                )}
              </div>
            </div>

            {/* Risk disclaimer */}
            <div className={`rounded-xl p-3 flex items-start gap-2 ${glass}`}
              style={{ borderColor: `${C.momentum}33` }}>
              <AlertTriangle size={14} style={{ color: C.momentum }} className="mt-0.5 shrink-0" />
              <p className="text-[11px]" style={{ color: C.dim }}>
                This dashboard is a tracking &amp; education tool. Projections are mathematical
                scenarios, not guarantees &mdash; trading carries real risk of loss.
              </p>
            </div>

            {/* First-time setup */}
            {needsSetup && (
              <div className={`rounded-2xl p-6 ${glass}`} style={{ borderColor: `${C.validate}44` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={18} style={{ color: C.validate }} />
                  <h2 className="font-bold">Set Your Starting Capital</h2>
                </div>
                <p className="text-xs mb-4" style={{ color: C.dim }}>
                  Enter the capital you start trading with. Risk per trade, lot size, and
                  your growth plan are all calculated from this.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Starting Capital">
                    <input type="number" value={capitalInput} onChange={(e) => setCapitalInput(e.target.value)}
                      placeholder="1000" className={inputCls} />
                  </Field>
                  <Field label="Risk per Trade %">
                    <input type="number" value={riskInput} onChange={(e) => setRiskInput(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Reward : Risk">
                    <input type="number" value={rrInput} onChange={(e) => setRrInput(e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <button onClick={handleSaveCapital} disabled={saveAccount.isPending}
                  className="mt-4 w-full py-2.5 rounded-xl font-semibold text-[#020509] flex items-center justify-center gap-2"
                  style={{ background: C.validate }}>
                  {saveAccount.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Start Tracking
                </button>
              </div>
            )}

            {/* ─── OVERVIEW ─── */}
            {!needsSetup && activeNav === "overview" && account && stats && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Current Balance" value={money(account.currentBalance, account.currency)}
                    accent={C.news} icon={<Wallet size={18} />}
                    sub={`Start: ${money(account.startingCapital, account.currency)}`} />
                  <StatCard label="Net P/L" value={money(stats.totalPnl, account.currency)}
                    accent={stats.totalPnl >= 0 ? C.validate : C.loss}
                    icon={stats.totalPnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    sub={`${stats.totalTrades} trades logged`} />
                  <StatCard label="Win Rate" value={`${stats.winRate}%`}
                    accent={C.momentum} icon={<Target size={18} />}
                    sub={`${stats.wins}W · ${stats.losses}L · ${stats.breakeven}BE`} />
                  <StatCard label="Profit Factor" value={stats.profitFactor >= 999 ? "∞" : String(stats.profitFactor)}
                    accent={C.chart} icon={<Zap size={18} />}
                    sub={`Avg win ${money(stats.avgWin)} / loss ${money(stats.avgLoss)}`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Growth snapshot */}
                  <div className={`lg:col-span-2 rounded-2xl p-5 ${glass}`}>
                    <SectionTitle icon={<LineChartIcon size={16} />} color={C.news} title="Growth Snapshot" />
                    {growthPlan.data?.loggedIn && (
                      <>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <MiniStat label="Projected End" value={money(growthPlan.data.projection.endBalance)} accent={C.news} />
                          <MiniStat label="Growth" value={`+${money(growthPlan.data.projection.growthAmount)}`} accent={C.validate} />
                          <MiniStat label="Growth %" value={`${growthPlan.data.projection.growthPercent}%`} accent={C.momentum} />
                        </div>
                        <div style={{ height: 190 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="balO" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={C.news} stopOpacity={0.45} />
                                  <stop offset="100%" stopColor={C.news} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                              <XAxis dataKey="day" tick={{ fill: C.dim, fontSize: 10 }} />
                              <YAxis tick={{ fill: C.dim, fontSize: 10 }} width={50} />
                              <Tooltip contentStyle={{ background: "#0a0f17", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: C.dim }} />
                              <Area type="monotone" dataKey="balance" stroke={C.news} strokeWidth={2} fill="url(#balO)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick log */}
                  <div className={`rounded-2xl p-5 ${glass}`}>
                    <SectionTitle icon={<Plus size={16} />} color={C.validate} title="Quick Log Trade" />
                    <OutcomePicker value={tradeOutcome} onChange={setTradeOutcome} />
                    <input type="number" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder={tradeOutcome === "LOSS" ? "Amount lost" : tradeOutcome === "WIN" ? "Amount won" : "0"}
                      className={`${inputCls} mt-2`} />
                    <button onClick={handleLogTrade} disabled={logTrade.isPending || !tradeAmount}
                      className="mt-3 w-full py-2.5 rounded-xl font-semibold text-[#020509] flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: C.validate }}>
                      {logTrade.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      Add Trade
                    </button>
                    <p className="text-[10px] mt-2 text-center" style={{ color: C.dim }}>
                      Open the Journal tab for full details &amp; lessons.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ─── JOURNAL ─── */}
            {!needsSetup && activeNav === "archive" && (
              <div className={`rounded-2xl p-5 ${glass}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <SectionTitle icon={<History size={16} />} color={C.supervise} title="24h Analysis Archive" noMargin />
                  <span className="text-[10px] px-2 py-1 rounded-full"
                    style={{ background: `${C.supervise}18`, color: C.supervise, border: `1px solid ${C.supervise}35` }}>
                    Auto-hides after 24 hours
                  </span>
                </div>

                {archive.isLoading ? (
                  <div className="flex items-center justify-center py-12" style={{ color: C.dim }}>
                    <Loader2 size={18} className="animate-spin mr-2" /> Loading today's archive...
                  </div>
                ) : archive.data?.loggedIn && archive.data.isSubscriber ? (
                  archiveAnalyses.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {archiveAnalyses.map((a) => {
                        const sig = (a.signal || "").toUpperCase();
                        const sigCol = sig === "SELL" ? C.loss : sig === "BUY" ? C.validate : C.dim;
                        const created = a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--";
                        const expiresMins = a.minutesUntilExpiry ?? 0;
                        const expiresText = expiresMins >= 60
                          ? `${Math.ceil(expiresMins / 60)}h left`
                          : `${expiresMins}m left`;

                        return (
                          <div key={a.analysisId} className="rounded-xl border p-3 relative overflow-hidden"
                            style={{ borderColor: `${sigCol}35`, background: "rgba(255,255,255,0.025)" }}>
                            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-10" style={{ background: sigCol }} />
                            <div className="relative">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Cpu size={14} style={{ color: C.news }} />
                                    <span className="text-sm font-bold">{a.asset || "Chart Analysis"}</span>
                                    <span className="text-[10px]" style={{ color: C.dim }}>{a.timeframe || ""}</span>
                                  </div>
                                  <div className="text-[10px] mt-0.5" style={{ color: C.dim }}>
                                    {a.strategy || "AI strategy"} · {created} · {expiresText}
                                  </div>
                                </div>
                                <span className="shrink-0 text-[11px] font-black px-2 py-1 rounded-full"
                                  style={{ background: `${sigCol}18`, color: sigCol }}>
                                  {sig || "NEUTRAL"} {a.confidence ? `${a.confidence}%` : ""}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                                <MiniStat label="Entry" value={a.entry || "--"} accent={C.momentum} />
                                <MiniStat label="Stop" value={a.stopLoss || "--"} accent={C.loss} />
                                <MiniStat label="Target" value={a.takeProfit || "--"} accent={C.validate} />
                                <MiniStat label="Status" value={a.outcome || "Open"} accent={a.outcome ? C.news : C.dim} />
                              </div>

                              {a.summary && (
                                <p className="text-[11px] mt-3 line-clamp-2" style={{ color: C.dim }}>
                                  {a.summary}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center"
                      style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                      <History size={28} className="mx-auto mb-3" style={{ color: C.supervise }} />
                      <h3 className="font-bold text-white">No analyses in the last 24 hours</h3>
                      <p className="text-xs mt-1" style={{ color: C.dim }}>
                        Run a chart analysis and it will appear here for today's trading session.
                      </p>
                      <button onClick={() => navigate("/")}
                        className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-[#020509]"
                        style={{ background: C.momentum }}>
                        Open Analyzer
                      </button>
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center"
                    style={{ borderColor: `${C.momentum}33` }}>
                    <Crown size={30} className="mx-auto mb-3" style={{ color: C.momentum }} />
                    <h3 className="font-bold text-white">Subscriber archive only</h3>
                    <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: C.dim }}>
                      The 24-hour analysis archive is available for active VIP subscribers.
                      It helps you review the trades you opened during the current day.
                    </p>
                    <button onClick={() => navigate("/#pricing")}
                      className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-[#020509]"
                      style={{ background: C.momentum }}>
                      View VIP Plans
                    </button>
                  </div>
                )}
              </div>
            )}

            {!needsSetup && activeNav === "journal" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className={`rounded-2xl p-5 ${glass}`}>
                  <SectionTitle icon={<Plus size={16} />} color={C.validate} title="Log a Trade" />
                  <OutcomePicker value={tradeOutcome} onChange={setTradeOutcome} />
                  <input type="number" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder={tradeOutcome === "LOSS" ? "Amount lost" : tradeOutcome === "WIN" ? "Amount won" : "0"}
                    className={`${inputCls} mt-2`} />

                  {/* AI Analysis picker — trades are logged from a real AI analysis */}
                  <div className="mt-3">
                    <label className="text-[10px] uppercase tracking-wide block mb-1.5" style={{ color: C.dim }}>
                      Win from AI Analysis
                    </label>
                    {analyses.length > 0 ? (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {analyses.map((a) => {
                          const active = selectedAnalysisId === a.analysisId;
                          const sigCol = a.signal === "SELL" ? C.loss : C.validate;
                          return (
                            <button key={a.analysisId}
                              onClick={() => {
                                setSelectedAnalysisId(active ? "" : a.analysisId);
                                if (!active) setTradeAsset(a.asset || "");
                              }}
                              className="w-full text-left rounded-lg border p-2.5 transition-all"
                              style={{
                                borderColor: active ? C.news : "rgba(255,255,255,0.08)",
                                background: active ? `${C.news}1a` : "transparent",
                              }}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold flex items-center gap-1.5">
                                  <Cpu size={12} style={{ color: C.news }} />
                                  {a.asset || "Chart"} · {a.timeframe || "—"}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${sigCol}1f`, color: sigCol }}>
                                  {a.signal || "—"} {a.confidence ? `${a.confidence}%` : ""}
                                </span>
                              </div>
                              {a.summary && (
                                <p className="text-[10px] mt-1 line-clamp-2" style={{ color: C.dim }}>
                                  {a.summary}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-3 text-center"
                        style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                        <p className="text-[11px]" style={{ color: C.dim }}>
                          No AI analyses yet. Run an analysis on the chart analyzer first —
                          it will appear here to log a trade from.
                        </p>
                        <button onClick={() => navigate("/")}
                          className="mt-2 text-[11px] font-semibold" style={{ color: C.news }}>
                          Go to Chart Analyzer →
                        </button>
                      </div>
                    )}
                  </div>

                  <input type="text" value={tradeAsset} onChange={(e) => setTradeAsset(e.target.value)}
                    placeholder="Asset (auto-filled from analysis)" className={`${inputCls} mt-3`} />
                  <textarea value={tradeLesson} onChange={(e) => setTradeLesson(e.target.value)}
                    placeholder={tradeOutcome === "LOSS" ? "What went wrong? (the agents learn from this)" : "Note / lesson (optional)"}
                    rows={3} className={`${inputCls} mt-2 resize-none`} />
                  <button onClick={handleLogTrade} disabled={logTrade.isPending || !tradeAmount}
                    className="mt-3 w-full py-2.5 rounded-xl font-semibold text-[#020509] flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: C.validate }}>
                    {logTrade.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Add Trade
                  </button>
                  {selectedAnalysisId && (
                    <p className="text-[10px] mt-2 text-center" style={{ color: C.news }}>
                      ✓ Linked to an AI analysis — the agents will learn from this result.
                    </p>
                  )}
                </div>

                <div className={`lg:col-span-2 rounded-2xl p-5 ${glass}`}>
                  <SectionTitle icon={<Activity size={16} />} color={C.supervise} title="Trade Journal" />
                  {trades.length > 0 ? (
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
                            const col = t.outcome === "WIN" ? C.validate : t.outcome === "LOSS" ? C.loss : C.dim;
                            return (
                              <tr key={t.tradeId} className="border-t border-white/[0.06]">
                                <td className="py-2.5"><span className="font-bold" style={{ color: col }}>{t.outcome}</span></td>
                                <td className="py-2.5">{t.asset || "—"}</td>
                                <td className="py-2.5">{t.strategy || "—"}</td>
                                <td className="py-2.5 font-semibold" style={{ color: col }}>
                                  {amt >= 0 ? "+" : ""}{money(amt)}
                                </td>
                                <td className="py-2.5 max-w-[180px] truncate" style={{ color: C.dim }}>{t.lessonLearned || "—"}</td>
                                <td className="py-2.5 text-right">
                                  <button onClick={() => deleteTrade.mutate({ tradeId: t.tradeId })}
                                    className="opacity-60 hover:opacity-100">
                                    <Trash2 size={13} style={{ color: C.loss }} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-center py-10" style={{ color: C.dim }}>
                      No trades logged yet. Add your first trade on the left.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── GROWTH PLAN ─── */}
            {!needsSetup && activeNav === "plan" && growthPlan.data?.loggedIn && (
              <div className={`rounded-2xl p-5 ${glass}`}>
                <div className="flex items-center justify-between mb-4">
                  <SectionTitle icon={<LineChartIcon size={16} />} color={C.momentum} title="1-Month Growth Plan" noMargin />
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: growthPlan.data.basedOnRealData ? `${C.validate}1f` : `${C.dim}1f`,
                      color: growthPlan.data.basedOnRealData ? C.validate : C.dim,
                    }}>
                    {growthPlan.data.basedOnRealData ? "Based on your real win rate" : "Estimate — log 10+ trades"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MiniStat label="Projected End" value={money(growthPlan.data.projection.endBalance)} accent={C.news} />
                  <MiniStat label="Growth" value={`+${money(growthPlan.data.projection.growthAmount)}`} accent={C.validate} />
                  <MiniStat label="Growth %" value={`${growthPlan.data.projection.growthPercent}%`} accent={C.momentum} />
                </div>
                {growthPlan.data.warning && (
                  <div className="mb-3 text-[11px] rounded-lg p-2 flex items-center gap-2"
                    style={{ background: `${C.loss}15`, color: C.loss }}>
                    <AlertTriangle size={12} /> {growthPlan.data.warning}
                  </div>
                )}
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="balP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.momentum} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={C.momentum} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="day" tick={{ fill: C.dim, fontSize: 10 }} />
                      <YAxis tick={{ fill: C.dim, fontSize: 10 }} width={50} />
                      <Tooltip contentStyle={{ background: "#0a0f17", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: C.dim }} />
                      <Area type="monotone" dataKey="balance" stroke={C.momentum} strokeWidth={2} fill="url(#balP)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] mt-2" style={{ color: C.dim }}>
                  Plan assumes {growthPlan.data.inputs.tradesPerDay} trades/day ·{" "}
                  {growthPlan.data.inputs.riskPercent}% risk · 1:{growthPlan.data.inputs.rewardRatio} R:R ·{" "}
                  {growthPlan.data.inputs.winRatePercent}% win rate.
                </p>
              </div>
            )}

            {/* ─── CALCULATOR ─── */}
            {!needsSetup && activeNav === "calculator" && (
              <div className={`rounded-2xl p-5 ${glass} max-w-md`}>
                <SectionTitle icon={<Calculator size={16} />} color={C.chart} title="Lot Size Calculator" />
                <Field label="Stop-Loss Distance (pips)">
                  <input type="number" value={slPips} onChange={(e) => setSlPips(e.target.value)} className={inputCls} />
                </Field>
                {lotQuery.data?.loggedIn && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <MiniStat label="Recommended Lot" value={String(lotQuery.data.recommendedLot)} accent={C.chart} />
                    <MiniStat label="Risk Amount" value={money(lotQuery.data.riskAmount)} accent={C.loss} />
                    <MiniStat label="Reward Target" value={money(lotQuery.data.rewardTargetAmount)} accent={C.validate} />
                    <MiniStat label="Risk %" value={`${lotQuery.data.riskPercent}%`} accent={C.news} />
                  </div>
                )}
              </div>
            )}

            {/* ─── AGENT MEMORY ─── */}
            {!needsSetup && activeNav === "memory" && (
              <div className={`rounded-2xl p-5 ${glass}`}>
                <SectionTitle icon={<Brain size={16} />} color={C.supervise} title="Agent Memory" />
                <p className="text-[11px] mb-4 -mt-2" style={{ color: C.dim }}>
                  The AI agents remember your real results and use them as context in your
                  next analysis — their advice sharpens as you log more trades.
                </p>
                {agentMem.data?.loggedIn && agentMem.data.buckets.length > 0 ? (
                  <>
                    <div className="mb-4 rounded-xl p-4 flex items-center gap-3" style={{ background: `${C.supervise}12` }}>
                      <BookOpen size={20} style={{ color: C.supervise }} />
                      <div>
                        <span className="text-[10px] uppercase" style={{ color: C.dim }}>Overall Win Rate (memory)</span>
                        <div className="text-2xl font-black" style={{ color: C.supervise }}>
                          {agentMem.data.overallWinRate}%
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {agentMem.data.buckets.map((b, i) => (
                        <div key={i} className="rounded-xl border border-white/[0.07] p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">{b.asset || "general"} · {b.strategy || "general"}</span>
                            <span style={{ color: b.winRate >= 50 ? C.validate : C.loss }}>{b.winRate}% WR</span>
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: C.dim }}>
                            {b.wins}W · {b.losses}L · {b.breakeven}BE
                          </div>
                          {b.lessons.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {b.lessons.slice(0, 3).map((l, j) => (
                                <li key={j} className="text-[10px] flex gap-1" style={{ color: C.dim }}>
                                  <span style={{ color: C.supervise }}>•</span> {l}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-center py-10" style={{ color: C.dim }}>
                    No memory yet. Log trades with lessons and the agents start learning.
                  </p>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ════ Presentational helpers ════
const inputCls =
  "w-full rounded-lg px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] outline-none focus:border-white/25 text-white placeholder:text-[#5b6b7d]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide block mb-1" style={{ color: C.dim }}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ icon, color, title, noMargin }: {
  icon: React.ReactNode; color: string; title: string; noMargin?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${noMargin ? "" : "mb-4"}`} style={{ color }}>
      {icon}
      <h2 className="font-bold text-sm" style={{ color: C.text }}>{title}</h2>
    </div>
  );
}

function StatCard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-4 ${glass} relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20"
        style={{ background: accent }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: C.dim }}>{label}</span>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <div className="text-xl font-black" style={{ color: accent }}>{value}</div>
        {sub && <div className="text-[10px] mt-0.5" style={{ color: C.dim }}>{sub}</div>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] p-2.5">
      <div className="text-[9px] uppercase tracking-wide" style={{ color: C.dim }}>{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function OutcomePicker({ value, onChange }: {
  value: "WIN" | "LOSS" | "BE"; onChange: (v: "WIN" | "LOSS" | "BE") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["WIN", "LOSS", "BE"] as const).map((o) => {
        const active = value === o;
        const col = o === "WIN" ? C.validate : o === "LOSS" ? C.loss : C.dim;
        const Icon = o === "WIN" ? CheckCircle2 : o === "LOSS" ? XCircle : MinusCircle;
        return (
          <button key={o} onClick={() => onChange(o)}
            className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-colors"
            style={{
              borderColor: active ? col : "rgba(255,255,255,0.08)",
              background: active ? `${col}1f` : "transparent",
              color: active ? col : C.dim,
            }}>
            <Icon size={13} /> {o}
          </button>
        );
      })}
    </div>
  );
}
