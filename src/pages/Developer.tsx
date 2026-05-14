import { useState } from "react"
import { useNavigate } from "react-router"
import { AlertTriangle, CheckCircle2, Code2, Copy, KeyRound, Loader2, UserPlus } from "lucide-react"

const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "")

type DeveloperLoginResponse =
  | { success: true; email: string; code: string; expires: string }
  | { error: string }

type DeveloperGrantResponse =
  | { success: true; email: string; code: string; expires: string; reused?: boolean }
  | { error: string }

export default function Developer() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isDeveloper, setIsDeveloper] = useState(false)
  const [friendEmail, setFriendEmail] = useState("")
  const [months, setMonths] = useState(1)
  const [grantLoading, setGrantLoading] = useState(false)
  const [grantError, setGrantError] = useState("")
  const [grantResult, setGrantResult] = useState<Extract<DeveloperGrantResponse, { success: true }> | null>(null)
  const navigate = useNavigate()

  const apiOrigin = configuredApiOrigin || window.location.origin

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch(`${apiOrigin}/api/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await response.json().catch(() => null) as DeveloperLoginResponse | null

      if (!response.ok || !data || "error" in data || !data.success) {
        setError(data && "error" in data ? data.error : "Developer login failed.")
        return
      }

      const developerSub = {
        id: "developer-access",
        orderId: "DEVELOPER-LOGIN",
        email: data.email,
        code: data.code,
        plan: "Developer Access",
        amount: "$0",
        txId: "DEVELOPER-LOGIN",
        status: "ACTIVE",
        startDate: new Date().toISOString(),
        endDate: data.expires,
      }

      const subscribers = JSON.parse(localStorage.getItem("tv_subscribers_v3") || "[]")
      const cleanSubscribers = subscribers.filter((sub: any) => sub.email !== data.email)
      cleanSubscribers.push(developerSub)
      localStorage.setItem("tv_subscribers_v3", JSON.stringify(cleanSubscribers))

      const logins = JSON.parse(localStorage.getItem("tradevisor_user_logins") || "[]")
      const cleanLogins = logins.filter((login: any) => login.email !== data.email)
      cleanLogins.push({ email: data.email, code: data.code })
      localStorage.setItem("tradevisor_user_logins", JSON.stringify(cleanLogins))
      localStorage.setItem("tradevisor_current_user_email", data.email)
      localStorage.setItem("tradevisor_current_user_code", data.code)
      localStorage.setItem("tradevisor_dev_mode", "true")

      setIsDeveloper(true)
    } catch {
      setError("Secure server is unavailable. Try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVipCode = async (event: React.FormEvent) => {
    event.preventDefault()
    setGrantError("")
    setGrantResult(null)
    setGrantLoading(true)

    try {
      const response = await fetch(`${apiOrigin}/api/developer/grant-vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          email: friendEmail,
          months,
          plan: `Developer Gift ${months} Month${months === 1 ? "" : "s"}`,
        }),
      })
      const data = await response.json().catch(() => null) as DeveloperGrantResponse | null

      if (!response.ok || !data || "error" in data || !data.success) {
        setGrantError(data && "error" in data ? data.error : "Unable to create VIP code.")
        return
      }

      setGrantResult(data)
    } catch {
      setGrantError("Secure server is unavailable. Try again later.")
    } finally {
      setGrantLoading(false)
    }
  }

  const copyCode = async () => {
    if (!grantResult?.code) return
    await navigator.clipboard.writeText(grantResult.code)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
            <Code2 size={30} className="text-[#d4a843]" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Developer Access</h1>
          <p className="text-[#666666] text-sm">Secure Tradevisor developer entry</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
          {!isDeveloper ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[#a0a0a0] text-sm mb-1.5 block">Developer Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter developer password"
                  className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl p-3 text-[#e11d48] text-sm flex items-center gap-2">
                  <AlertTriangle size={14} /> <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {loading ? "Verifying..." : "Open Developer Tools"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-3 text-[#22c55e] text-sm flex items-center gap-2">
                <CheckCircle2 size={14} /> Developer verified. You can create VIP codes.
              </div>

              <form onSubmit={handleCreateVipCode} className="space-y-4">
                <div>
                  <label className="text-[#a0a0a0] text-sm mb-1.5 block">Friend Email</label>
                  <input
                    type="email"
                    value={friendEmail}
                    onChange={(event) => {
                      setFriendEmail(event.target.value)
                      setGrantError("")
                      setGrantResult(null)
                    }}
                    placeholder="friend@email.com"
                    className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                  />
                </div>

                <div>
                  <label className="text-[#a0a0a0] text-sm mb-1.5 block">VIP Duration</label>
                  <select
                    value={months}
                    onChange={(event) => setMonths(Number(event.target.value))}
                    className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#d4a843]"
                  >
                    <option value={1}>1 month</option>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                  </select>
                </div>

                {grantError && (
                  <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl p-3 text-[#e11d48] text-sm flex items-center gap-2">
                    <AlertTriangle size={14} /> <span>{grantError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={grantLoading || !friendEmail}
                  className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {grantLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {grantLoading ? "Creating..." : "Create VIP Code"}
                </button>
              </form>

              {grantResult && (
                <div className="bg-[#141414] border border-[#d4a843]/30 rounded-xl p-4">
                  <p className="text-[#a0a0a0] text-xs mb-1">VIP code for {grantResult.email}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[#d4a843] text-xl font-bold tracking-[0.2em]">{grantResult.code}</code>
                    <button onClick={copyCode} className="w-10 h-10 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] flex items-center justify-center">
                      <Copy size={16} className="text-[#d4a843]" />
                    </button>
                  </div>
                  <p className="text-[#666666] text-xs mt-2">Expires: {new Date(grantResult.expires).toLocaleDateString()}</p>
                </div>
              )}

              <button onClick={() => navigate("/vip")} className="w-full bg-[#141414] border border-[#1f1f1f] text-white font-semibold py-3 rounded-xl hover:border-[#d4a843]/40 transition-colors">
                Open VIP Dashboard
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[#1f1f1f] text-center">
            <button onClick={() => navigate("/")} className="text-[#666666] text-sm hover:text-[#d4a843] transition-colors">
              Back to Website
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
