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

const router = createHashRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  { path: '/admin', element: <Admin /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/candles', element: <CandlePredictor /> },
  { path: '/vip', element: <VIPDashboard /> },
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
