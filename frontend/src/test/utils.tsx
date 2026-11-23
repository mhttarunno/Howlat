import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { vi } from 'vitest'
import { AuthProvider } from '@/context/auth'
import { ThemeProvider } from '@/context/theme'
import { routes } from '@/routes'
import { ApiError } from '@/services/api'

type Handler = (req: { url: URL; method: string; body: any }) => { status?: number; body?: unknown } | Promise<{ status?: number; body?: unknown }>
export interface Call { method: string; path: string; search: URLSearchParams; body: any }

/** Stubs fetch with a route table. Keys look like "GET /people". Unmatched requests fail the test loudly. */
export function mockApi(table: Record<string, Handler | unknown>) {
  const calls: Call[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = (init?.method ?? 'GET').toUpperCase()
    const path = url.pathname.replace('/api/v1', '')
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, path, search: url.searchParams, body })
    const h = table[`${method} ${path}`]
    if (h === undefined) throw new Error(`Unmocked request: ${method} ${path}`)
    const out = typeof h === 'function' ? await (h as Handler)({ url, method, body }) : { body: h }
    const status = (out as any)?.status ?? 200
    const payload = (out as any)?.body ?? out
    return new Response(status === 204 ? null : JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fn)
  return { calls, fn, find: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path) }
}

export const failNetwork = () => vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
export { ApiError }

export const USER = { id: 'u1', email: 'me@example.com', full_name: 'Tanvir Ahmed', currency: 'BDT', theme: 'light', created_at: '2026-01-01T00:00:00Z' }

export const EMPTY_SUMMARY = {
  total_lent: '0.00', total_borrowed: '0.00', total_received_back: '0.00', total_returned: '0.00',
  outstanding_receivable: '0.00', outstanding_payable: '0.00', net_position: '0.00', position: 'SETTLED',
  open_receivables: 0, open_payables: 0, overdue_receivables: 0, overdue_payables: 0, top_receivables: [], top_payables: [],
}
export const page = <T,>(items: T[], extra: object = {}) => ({ items, total: items.length, page: 1, page_size: 20, pages: 1, ...extra })

export const balances = (o: Partial<Record<string, string>> = {}) => ({
  total_lent: '0.00', total_borrowed: '0.00', repaid_to_me: '0.00', repaid_by_me: '0.00', receivable: '0.00', payable: '0.00', net_balance: '0.00', ...o,
})
export const person = (o: object = {}) => ({
  id: 'p1', name: 'Rahim', phone: null, email: null, address: null, notes: null, created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z', archived_at: null, balances: balances(), transaction_count: 0, ...o,
})
export const entry = (o: object = {}) => ({
  id: 'e1', ref: 'ABCD1234', entry_type: 'LENT', transaction_id: 'e1', person_id: 'p1', person_name: 'Rahim', amount: '5000.00',
  entry_date: '2026-11-01', expected_date: null, description: 'Emergency', notes: null, payment_method: null, loan_amount: '5000.00',
  paid_total: '0.00', outstanding: '5000.00', status: 'UNPAID', is_overdue: false, created_at: '2026-11-01T00:00:00Z', ...o,
})

/** Routes common to every authenticated screen (user, notification bell). */
export const baseRoutes = () => ({
  'GET /auth/me': USER,
  'GET /notifications': { counts: { overdue_receivable: 0, overdue_payable: 0, upcoming_receivable: 0, upcoming_payable: 0, total: 0, overdue_receivable_amount: '0.00', overdue_payable_amount: '0.00', upcoming_receivable_amount: '0.00', upcoming_payable_amount: '0.00' }, items: [] },
})

export function renderApp(route = '/', { authed = true }: { authed?: boolean } = {}) {
  if (authed) localStorage.setItem('howlat.token', 'test-token')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } })
  const router = createMemoryRouter(routes, { initialEntries: [route] })
  const utils = render(
    <QueryClientProvider client={client}>
      <ThemeProvider><AuthProvider><RouterProvider router={router} /><Toaster /></AuthProvider></ThemeProvider>
    </QueryClientProvider>,
  )
  return { ...utils, router, client }
}

export function renderUi(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><ThemeProvider><AuthProvider>{ui}</AuthProvider></ThemeProvider></QueryClientProvider>)
}
