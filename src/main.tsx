import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { UserAuthProvider } from '@/contexts/UserAuthContext'
import { trpc } from '@/lib/trpc'
import { trpcClient, queryClient } from '@/lib/trpcClient'
import { LanguageProvider } from '@/lib/language'
import './index.css'

import App from './App.tsx'
import Login from './pages/Login.tsx'
import Admin from './pages/Admin.tsx'
import Developer from './pages/Developer.tsx'
import Privacy from './pages/Privacy.tsx'
import CandlePredictor from './pages/CandlePredictor.tsx'
import VIPDashboard from './pages/VIPDashboard.tsx'
import Account from './pages/Account.tsx'
import ForgotPassword from './pages/ForgotPassword.tsx'
import TraderDashboard from './pages/TraderDashboard.tsx'
import VisitTracker from './components/VisitTracker.tsx'

const cleanPathRoutes = new Set(['/admin', '/developer', '/login', '/privacy', '/candles', '/vip', '/account', '/forgot-password', '/dashboard'])
const currentPath = window.location.pathname.replace(/\/$/, '') || '/'

if (cleanPathRoutes.has(currentPath) && !window.location.hash) {
  window.history.replaceState(null, '', `/#${currentPath}`)
}

const router = createHashRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  { path: '/admin', element: <Admin /> },
  { path: '/developer', element: <Developer /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/candles', element: <CandlePredictor /> },
  { path: '/vip', element: <VIPDashboard /> },
  { path: '/account', element: <Account /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/dashboard', element: <TraderDashboard /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <UserAuthProvider>
              <VisitTracker />
              <RouterProvider router={router} />
            </UserAuthProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
