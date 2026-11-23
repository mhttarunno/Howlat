import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom'
import { Spinner } from '@/components/ui/primitives'
import { useAuth } from '@/context/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import { DashboardPage } from '@/pages/Dashboard'
import { PeoplePage } from '@/pages/People'
import { PersonPage } from '@/pages/PersonPage'
import { TransactionsPage } from '@/pages/Transactions'

// Charts-heavy and rarely-first pages are code-split.
const ReportsPage = lazy(() => import('@/pages/Reports').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.SettingsPage })))

const Fallback = () => <div className="flex justify-center py-24"><Spinner /></div>

export function RequireAuth() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner className="h-7 w-7" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  return <AppLayout />
}

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'people/:id', element: <PersonPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'money-given', element: <TransactionsPage fixedType="LENT" /> },
      { path: 'money-received', element: <TransactionsPage fixedType="BORROWED" /> },
      { path: 'reports', element: <Suspense fallback={<Fallback />}><ReportsPage /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<Fallback />}><SettingsPage /></Suspense> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export const router = () => createBrowserRouter(routes)
export { Outlet }
