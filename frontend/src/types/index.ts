// Money is always a decimal STRING from the API ("5000.00"). Never convert it to a float for math:
// every total shown comes from the backend.
export type Money = string

export type EntryType = 'LENT' | 'BORROWED' | 'REPAYMENT_RECEIVED' | 'REPAYMENT_RETURNED'
export type LoanType = 'LENT' | 'BORROWED'
export type Status = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string | null
  currency: string
  theme: 'light' | 'dark' | 'system'
  created_at: string
}
export interface TokenOut { access_token: string; user: User }

export interface Page<T> { items: T[]; total: number; page: number; page_size: number; pages: number }

export interface PersonBalances {
  total_lent: Money; total_borrowed: Money; repaid_to_me: Money; repaid_by_me: Money
  receivable: Money; payable: Money; net_balance: Money
}
export interface Person {
  id: string; name: string; phone: string | null; email: string | null; address: string | null
  notes: string | null; created_at: string; updated_at: string; archived_at: string | null
  balances: PersonBalances; transaction_count: number
}

export interface RepaymentBrief {
  id: string; amount: Money; repayment_date: string; payment_method: string | null
  description: string | null; notes: string | null; created_at: string
}
export interface Transaction {
  id: string; ref: string; person_id: string; person_name: string; transaction_type: LoanType
  amount: Money; paid_total: Money; outstanding: Money; status: Status
  transaction_date: string; expected_date: string | null; is_overdue: boolean
  description: string | null; notes: string | null; created_at: string; updated_at: string
  repayments: RepaymentBrief[]
}
export interface Repayment {
  id: string; ref: string; transaction_id: string; transaction_ref: string; person_id: string
  person_name: string; direction: 'RECEIVED' | 'RETURNED'; amount: Money; repayment_date: string
  payment_method: string | null; description: string | null; notes: string | null
  transaction_amount: Money; transaction_outstanding: Money; transaction_status: Status
  created_at: string; updated_at: string
}
export interface LedgerEntry {
  id: string; ref: string; entry_type: EntryType; transaction_id: string; person_id: string
  person_name: string; amount: Money; entry_date: string; expected_date: string | null
  description: string | null; notes: string | null; payment_method: string | null
  loan_amount: Money; paid_total: Money; outstanding: Money; status: Status
  is_overdue: boolean; created_at: string
}

export interface PersonBalanceRow extends PersonBalances { person_id: string; name: string; archived: boolean }
export interface DashboardSummary {
  total_lent: Money; total_borrowed: Money; total_received_back: Money; total_returned: Money
  outstanding_receivable: Money; outstanding_payable: Money; net_position: Money
  position: 'NET_RECEIVABLE' | 'NET_PAYABLE' | 'SETTLED'
  open_receivables: number; open_payables: number; overdue_receivables: number; overdue_payables: number
  top_receivables: PersonBalanceRow[]; top_payables: PersonBalanceRow[]
}
export interface MonthFlow {
  month: string; lent: Money; borrowed: Money; received: Money; returned: Money
  loan_count: number; repayment_count: number
}
export interface DashboardCharts { months: MonthFlow[]; receivable: Money; payable: Money }
export interface ReportSummary {
  start: string | null; end: string | null; lent: Money; borrowed: Money
  repayments_received: Money; repayments_returned: Money; loan_count: number; repayment_count: number
  outstanding_receivable: Money; outstanding_payable: Money; net_position: Money
}
export interface MonthlyReport { start: string | null; end: string | null; rows: MonthFlow[]; totals: MonthFlow }
export interface YearRow { year: string; lent: Money; borrowed: Money; received: Money; returned: Money; loan_count: number; repayment_count: number }
export interface PeopleReport { rows: PersonBalanceRow[]; totals: PersonBalanceRow | null }

export interface NotificationItem {
  transaction_id: string; person_id: string; person_name: string; direction: 'RECEIVABLE' | 'PAYABLE'
  kind: 'OVERDUE' | 'UPCOMING'; outstanding: Money; expected_date: string; days: number; description: string | null
}
export interface Notifications {
  counts: {
    overdue_receivable: number; overdue_payable: number; upcoming_receivable: number; upcoming_payable: number
    total: number; overdue_receivable_amount: Money; overdue_payable_amount: Money
    upcoming_receivable_amount: Money; upcoming_payable_amount: Money
  }
  items: NotificationItem[]
}
