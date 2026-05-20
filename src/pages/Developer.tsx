import { useState } from "react"
import { useNavigate } from "react-router"
import { AlertTriangle, Code2, KeyRound, Loader2 } from "lucide-react"

const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "")

type DeveloperLoginResponse =
  | {
      success: true
      sessionToken: string
      userToken?: string
      user?: { userId: string; email: string; name: string } | null
      email: string
      code: string
      expires: string
      subscriber: {
        subscriberId: string
        email: string
        code: string
        plan: string
        status: string
        endDate?: string
      }
    }
  | { error: string }

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem("tradevisor_device_id")
  if (!id) {
    const random = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    id = `dev_${random}`
    localStorage.setItem("tradevisor_device_id", id)
  }
  return id
}

export default function Developer() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const apiOrigin = configuredApiOrigin || window.location.origin

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const deviceId = getOrCreateDeviceId()
      const response = await fetch(`${apiOrigin}/api/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, deviceId }),
      })
      const data = await response.json().catch(() => null) as DeveloperLoginResponse | null

      if (!response.ok || !data || "error" in data || !data.success) {
        setError(data && "error" in data ? data.error : "Developer login failed.")
        return
      }

      localStorage.setItem("tradevisor_session_token", data.sessionToken)
      localStorage.setItem("tradevisor_current_user_email", data.email)
      localStorage.setItem("tradevisor_current_user_code", data.code)
      localStorage.setItem("tradevisor_dev_mode", "true")
      localStorage.removeItem("tradevisor_analysis_count")

      // Also store the user-account token so the Trader Dashboard
      // (/dashboard, user-account system) recognizes the developer.
      if (data.userToken) {
        localStorage.setItem("tradevisor_user_token", data.userToken)
      }

      navigate("/vip")
    } catch {
      setError("Secure server is unavailable. Try again later.")
    } finally {
      setLoading(false)
    }
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
              {loading ? "Verifying..." : "Enter VIP as Developer"}
            </button>
          </form>

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
