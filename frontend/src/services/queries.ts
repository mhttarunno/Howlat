import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  DashboardCharts, DashboardSummary, LedgerEntry, LoanType, MonthlyReport, Notifications, Page,
  PeopleReport, Person, Repayment, ReportSummary, Transaction, YearRow,
} from '@/types'

type P = Record<string, string | number | boolean | null | undefined | string[]>

export const keys = {
  all: ['howlat'] as const,
  summary: ['howlat', 'summary'] as const,
  charts: (m: number) => ['howlat', 'charts', m] as const,
  recent: ['howlat', 'recent'] as const,
  notifications: ['howlat', 'notifications'] as const,
  people: (p: P) => ['howlat', 'people', p] as const,
  person: (id: string) => ['howlat', 'person', id] as const,
  entries: (p: P) => ['howlat', 'entries', p] as const,
  txn: (id: string) => ['howlat', 'txn', id] as const,
  repayments: (p: P) => ['howlat', 'repayments', p] as const,
  report: (name: string, p: P) => ['howlat', 'report', name, p] as const,
}

// ---------- reads
export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: () => api.get<DashboardSummary>('/dashboard/summary') })
export const useCharts = (months = 12) => useQuery({ queryKey: keys.charts(months), queryFn: () => api.get<DashboardCharts>('/dashboard/charts', { months }) })
export const useRecent = (limit = 8) => useQuery({ queryKey: [...keys.recent, limit], queryFn: () => api.get<Page<LedgerEntry>>('/dashboard/recent-activity', { limit }) })
export const useNotifications = () => useQuery({ queryKey: keys.notifications, queryFn: () => api.get<Notifications>('/notifications'), refetchInterval: 5 * 60_000 })

export const usePeople = (p: P) => useQuery({ queryKey: keys.people(p), queryFn: () => api.get<Page<Person>>('/people', p), placeholderData: keepPreviousData })
export const usePerson = (id: string) => useQuery({ queryKey: keys.person(id), queryFn: () => api.get<Person>(`/people/${id}`) })
export const useEntries = (p: P) => useQuery({ queryKey: keys.entries(p), queryFn: () => api.get<Page<LedgerEntry>>('/transactions', p), placeholderData: keepPreviousData })
export const useTransaction = (id: string | null) =>
  useQuery({ queryKey: keys.txn(id ?? ''), queryFn: () => api.get<Transaction>(`/transactions/${id}`), enabled: !!id })
export const useRepayments = (p: P) => useQuery({ queryKey: keys.repayments(p), queryFn: () => api.get<Page<Repayment>>('/repayments', p), placeholderData: keepPreviousData })

export const useReportSummary = (p: P) => useQuery({ queryKey: keys.report('summary', p), queryFn: () => api.get<ReportSummary>('/reports/summary', p), placeholderData: keepPreviousData })
export const useMonthlyReport = (p: P) => useQuery({ queryKey: keys.report('monthly', p), queryFn: () => api.get<MonthlyReport>('/reports/monthly', p), placeholderData: keepPreviousData })
export const useYearlyReport = () => useQuery({ queryKey: keys.report('yearly', {}), queryFn: () => api.get<{ rows: YearRow[] }>('/reports/yearly') })
export const usePeopleReport = () => useQuery({ queryKey: keys.report('people', {}), queryFn: () => api.get<PeopleReport>('/reports/people') })

// ---------- writes (every mutation refreshes all derived figures)
function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: keys.all })
}

/** null clears an optional field on the server; undefined leaves it unchanged */
type Opt = string | null | undefined
export interface PersonInput { name: string; phone?: Opt; email?: Opt; address?: Opt; notes?: Opt }
export interface LoanInput {
  person_id: string; transaction_type: LoanType; amount: string; transaction_date: string
  expected_date?: string | null; description?: Opt; notes?: Opt
}
export interface RepaymentInput {
  transaction_id: string; person_id?: string; amount: string; repayment_date: string
  payment_method?: Opt; description?: Opt; notes?: Opt
}

export function usePersonMutations() {
  const inv = useInvalidateAll()
  return {
    create: useMutation({ mutationFn: (b: PersonInput) => api.post<Person>('/people', b), onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, ...b }: { id: string } & Partial<PersonInput>) => api.patch<Person>(`/people/${id}`, b), onSuccess: inv }),
    archive: useMutation({ mutationFn: (id: string) => api.delete<Person>(`/people/${id}`), onSuccess: inv }),
    restore: useMutation({ mutationFn: (id: string) => api.post<Person>(`/people/${id}/restore`), onSuccess: inv }),
  }
}

export function useLedgerMutations() {
  const inv = useInvalidateAll()
  return {
    createLoan: useMutation({
      mutationFn: ({ body, key }: { body: LoanInput; key: string }) => api.post<Transaction>('/transactions', body, { 'Idempotency-Key': key }),
      onSuccess: inv,
    }),
    updateLoan: useMutation({
      mutationFn: ({ id, ...b }: { id: string } & Partial<LoanInput>) => api.patch<Transaction>(`/transactions/${id}`, b),
      onSuccess: inv,
    }),
    deleteLoan: useMutation({ mutationFn: (id: string) => api.delete(`/transactions/${id}`), onSuccess: inv }),
    createRepayment: useMutation({
      mutationFn: ({ body, key }: { body: RepaymentInput; key: string }) => api.post<Repayment>('/repayments', body, { 'Idempotency-Key': key }),
      onSuccess: inv,
    }),
    updateRepayment: useMutation({
      mutationFn: ({ id, ...b }: { id: string } & Partial<Omit<RepaymentInput, 'transaction_id' | 'person_id'>>) => api.patch<Repayment>(`/repayments/${id}`, b),
      onSuccess: inv,
    }),
    deleteRepayment: useMutation({ mutationFn: (id: string) => api.delete(`/repayments/${id}`), onSuccess: inv }),
  }
}
