import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isAdmin, navigate])

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
