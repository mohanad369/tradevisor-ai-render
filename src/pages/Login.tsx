import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect to admin if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const success = await login(password)
    if (success) {
      navigate('/admin')
    } else {
      setError('Invalid password. Access denied.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-2xl font-bold mb-1">Admin Access</h1>
          <p className="text-[#666666] text-sm">Tradevisor AI Developer Panel</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[#a0a0a0] text-sm mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#d4a843]"
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl p-3 text-[#e11d48] text-sm text-center">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#d4a843] text-[#050505] font-semibold py-3 rounded-xl hover:bg-[#e8c76a] transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Access Admin Panel'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-[#1f1f1f] text-center">
            <a href="/" className="text-[#666666] text-sm hover:text-[#d4a843] transition-colors">Back to Website</a>
          </div>
        </div>
      </div>
    </div>
  )
}
