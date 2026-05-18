import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { trpc } from '@/lib/trpc'
import { trpcClient, queryClient } from '@/lib/trpcClient'
import './index.css'

import App from './App.tsx'
import Login from './pages/Login.tsx'
import Admin from './pages/Admin.tsx'
import Privacy from './pages/Privacy.tsx'
import CandlePredictor from './pages/CandlePredictor.tsx'
import VIPDashboard from './pages/VIPDashboard.tsx'
import TestPay from './pages/TestPay.tsx'

const router = createHashRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  { path: '/admin', element: <Admin /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/candles', element: <CandlePredictor /> },
  { path: '/vip', element: <VIPDashboard /> },
  // ─── Secret test payment route (not linked from any page) ───
  // URL: https://tradevisortrading.com/#/test-pay-2026
  { path: '/test-pay-2026', element: <TestPay /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
