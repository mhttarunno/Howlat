import { AlertTriangle, ArrowDownLeft, ArrowUpRight, HandCoins, Scale, UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ActivityChart, BreakdownChart, FlowChart, RepaymentChart } from '@/components/charts'
import { EntryRow } from '@/components/EntryList'
import { Avatar, EmptyState, ErrorState, ListSkeleton, Money, PageHeader } from '@/components/shared'
import { Button, Card, CardHeader, Skeleton } from '@/components/ui/primitives'
import { useActions } from '@/context/actions'
import { useAuth } from '@/context/auth'
import { cn } from '@/lib/utils'
import { useCharts, useRecent, useSummary } from '@/services/queries'
import type { DashboardSummary, PersonBalanceRow } from '@/types'

function SummaryCard({ label, value, tone, icon, hint, className }: { label: string; value: string; tone: 'receivable' | 'payable' | 'none'; icon: ReactNode; hint?: string; className?: string }) {
  return (
    <Card className={cn(
      'group interactive-card p-4 hover:border-primary/45 hover:shadow-glow transition-all duration-200',
      className,
    )}>
      <div className="flex min-h-9 items-start justify-between gap-2 sm:min-h-0 sm:items-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{label}</p>
        <span className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200',
          tone === 'receivable' ? 'bg-success-soft text-success border-success/25' :
          tone === 'payable' ? 'bg-warning-soft text-warning border-warning/25' :
          'bg-card-elevated text-muted-foreground border-border',
        )}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[22px] font-bold tracking-tight text-foreground sm:text-2xl tabular group-hover:text-primary transition-colors duration-200">
        <Money value={value} tone={tone === 'none' ? undefined : tone} />
      </p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </Card>
  )
}

function NetPosition({ s }: { s: DashboardSummary }) {
  const { user } = useAuth()
  const recv = s.position === 'NET_RECEIVABLE'
  const pay = s.position === 'NET_PAYABLE'
  return (
    <Card elevated className={cn(
      'relative overflow-hidden p-6 sm:p-7 bg-gradient-to-br from-white/[0.08] via-card-elevated/90 to-card/80 border border-white/[0.14] shadow-elevated backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] interactive-card',
      recv && 'border-success/40 shadow-[0_8px_32px_rgba(16,185,129,0.18)]',
      pay && 'border-warning/40 shadow-[0_8px_32px_rgba(245,158,11,0.18)]',
    )}>
      {/* Traveling luxury glass shimmer reflection */}
      <div className="shimmer-sweep" aria-hidden />

      {/* Delicate top illuminated highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      {/* Ambient background glow & radial light reflection */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full blur-3xl opacity-35 transition-all animate-pulse-glow',
          recv ? 'bg-success' : pay ? 'bg-warning' : 'bg-primary',
        )}
      />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition-transform hover:scale-105 duration-200',
            recv ? 'bg-success-soft text-success border-success/30' :
            pay ? 'bg-warning-soft text-warning border-warning/30' :
            'bg-card-elevated text-muted-foreground border-border',
          )}>
            <Scale className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Net Ledger Position</p>
            <p className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[30px] tabular">
              <Money value={s.net_position} tone="auto" sign />
            </p>
          </div>
        </div>
        <div className="max-w-xs text-sm text-muted-foreground">
          <p className={cn(
            'font-bold text-sm tracking-tight',
            recv ? 'text-success' : pay ? 'text-warning' : 'text-foreground',
          )}>
            {recv ? 'Net receivable' : pay ? 'Net payable' : 'All settled'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {recv ? 'Overall, others owe you more than you owe.' : pay ? 'Overall, you owe more than others owe you.' : 'Nothing is outstanding either way.'}
          </p>
          <p className="mt-1.5 text-[11px] text-text-muted">Formula: Total Receivable − Total Payable ({user?.currency ?? 'BDT'})</p>
        </div>
      </div>
    </Card>
  )
}

function BalanceList({ title, rows, tone, empty }: { title: string; rows: PersonBalanceRow[]; tone: 'receivable' | 'payable'; empty: string }) {
  return (
    <div>
      <p className={cn(
        'mb-1.5 px-4 pt-3 text-[11px] font-bold uppercase tracking-wider sm:px-5',
        tone === 'receivable' ? 'text-success' : 'text-warning',
      )}>
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-muted-foreground sm:px-5">{empty}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((r) => (
            <li key={r.person_id}>
              <Link to={`/people/${r.person_id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-elevated/50 transition-colors sm:px-5">
                <Avatar name={r.name} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{r.name}</span>
                <Money value={tone === 'receivable' ? r.receivable : r.payable} tone={tone} className="text-sm font-bold" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChartCard({ title, subtitle, loading, error, retry, children }: { title: string; subtitle: string; loading: boolean; error: unknown; retry: () => void; children: ReactNode }) {
  return (
    <Card className="hover:border-border-hover/40 transition-colors">
      <CardHeader title={title} subtitle={subtitle} />
      <div className="px-2 pb-4 pt-3 sm:px-4">
        {loading ? <Skeleton className="mx-2 h-[260px]" /> : error ? <ErrorState error={error} onRetry={retry} compact /> : children}
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const a = useActions()
  const summary = useSummary()
  const charts = useCharts(12)
  const recent = useRecent(8)
  const s = summary.data
  const noData = s && s.total_lent === '0.00' && s.total_borrowed === '0.00'

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.full_name.split(' ')[0] ?? ''}`}
        subtitle="Here's where every taka stands today."
      />

      {/* Quick Action Ribbon */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
        <Button variant="secondary" className="hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150" onClick={() => a.newLoan('LENT')}>
          <ArrowUpRight className="h-4 w-4 text-warning" /> Give money
        </Button>
        <Button variant="secondary" className="hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150" onClick={() => a.newLoan('BORROWED')}>
          <ArrowDownLeft className="h-4 w-4 text-success" /> Receive money
        </Button>
        <Button variant="secondary" className="hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150" onClick={() => a.repay()}>
          <HandCoins className="h-4 w-4 text-primary" /> Record repayment
        </Button>
        <Button variant="secondary" className="hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150" onClick={() => a.addPerson()}>
          <UserPlus className="h-4 w-4 text-muted-foreground" /> Add person
        </Button>
      </div>

      {summary.isError ? (
        <Card><ErrorState error={summary.error} onRetry={() => summary.refetch()} /></Card>
      ) : !s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[106px]" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {noData && (
            <Card>
              <EmptyState
                title="Record your first transaction"
                body="Add a person, then record money you gave or received. Your balances and charts appear here automatically."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => a.addPerson()}><UserPlus className="h-4 w-4" /> Add a person</Button>
                    <Button variant="secondary" onClick={() => a.newLoan('LENT')}>Give money</Button>
                  </div>
                }
              />
            </Card>
          )}

          {(s.overdue_receivables > 0 || s.overdue_payables > 0) && (
            <div role="status" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm text-foreground shadow-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="leading-relaxed">
                {s.overdue_receivables > 0 && (
                  <>
                    <b className="text-danger">{s.overdue_receivables}</b> overdue {s.overdue_receivables === 1 ? 'repayment is' : 'repayments are'} owed to you.{' '}
                  </>
                )}
                {s.overdue_payables > 0 && (
                  <>
                    <b className="text-danger">{s.overdue_payables}</b> overdue {s.overdue_payables === 1 ? 'payment' : 'payments'} you owe.{' '}
                  </>
                )}
                <Link to="/transactions?overdue=true" className="font-semibold text-danger underline hover:opacity-80 transition-opacity">
                  View overdue
                </Link>
              </p>
            </div>
          )}

          <NetPosition s={s} />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <SummaryCard className="animate-fade-in-up stagger-1" label="Outstanding receivable" value={s.outstanding_receivable} tone="receivable" icon={<ArrowUpRight className="h-4 w-4" />} hint={`${s.open_receivables} open · owed to you`} />
            <SummaryCard className="animate-fade-in-up stagger-2" label="Outstanding payable" value={s.outstanding_payable} tone="payable" icon={<ArrowDownLeft className="h-4 w-4" />} hint={`${s.open_payables} open · you owe`} />
            <SummaryCard className="animate-fade-in-up stagger-3" label="Total money lent" value={s.total_lent} tone="receivable" icon={<ArrowUpRight className="h-4 w-4" />} hint="All time" />
            <SummaryCard className="animate-fade-in-up stagger-4" label="Total money borrowed" value={s.total_borrowed} tone="payable" icon={<ArrowDownLeft className="h-4 w-4" />} hint="All time" />
            <SummaryCard className="animate-fade-in-up stagger-5" label="Received back" value={s.total_received_back} tone="receivable" icon={<HandCoins className="h-4 w-4" />} hint="Repaid to you" />
            <SummaryCard className="animate-fade-in-up stagger-6" label="Returned to others" value={s.total_returned} tone="payable" icon={<HandCoins className="h-4 w-4" />} hint="Repaid by you" />
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="animate-fade-in-up stagger-3">
          <ChartCard title="Lent vs borrowed" subtitle="Last 12 months" loading={charts.isLoading} error={charts.error} retry={() => charts.refetch()}>
            {charts.data && <FlowChart months={charts.data.months} />}
          </ChartCard>
        </div>
        <div className="animate-fade-in-up stagger-4">
          <ChartCard title="Repayment activity" subtitle="Money received back vs returned, by month" loading={charts.isLoading} error={charts.error} retry={() => charts.refetch()}>
            {charts.data && <RepaymentChart months={charts.data.months} />}
          </ChartCard>
        </div>
        <div className="animate-fade-in-up stagger-5">
          <ChartCard title="Receivable vs payable" subtitle="What is still outstanding right now" loading={charts.isLoading} error={charts.error} retry={() => charts.refetch()}>
            {charts.data && <BreakdownChart receivable={charts.data.receivable} payable={charts.data.payable} />}
          </ChartCard>
        </div>
        <div className="animate-fade-in-up stagger-6">
          <ChartCard title="Transaction activity" subtitle="Loans and repayments recorded per month" loading={charts.isLoading} error={charts.error} retry={() => charts.refetch()}>
            {charts.data && <ActivityChart months={charts.data.months} />}
          </ChartCard>
        </div>
      </div>

      {/* Activity & Outstanding Cards */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Recent activity"
            subtitle="Latest recorded transactions and repayments"
            action={<Button asChild variant="ghost" size="sm"><Link to="/transactions">View all</Link></Button>}
          />
          <div className="mt-2">
            {recent.isLoading ? (
              <ListSkeleton rows={5} />
            ) : recent.isError ? (
              <ErrorState error={recent.error} onRetry={() => recent.refetch()} compact />
            ) : recent.data?.items.length ? (
              <ul className="divide-y divide-border/60">{recent.data.items.map((e) => <EntryRow key={e.id} e={e} />)}</ul>
            ) : (
              <EmptyState title="No activity yet" body="Transactions you record will show up here." />
            )}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Outstanding balances" subtitle="Highest open amounts" />
          {!s ? (
            <div className="p-4"><Skeleton className="h-40" /></div>
          ) : (
            <div className="pb-2">
              <BalanceList title="They owe you" rows={s.top_receivables} tone="receivable" empty="Nobody owes you anything." />
              <div className="border-t border-border/60" />
              <BalanceList title="You owe" rows={s.top_payables} tone="payable" empty="You don't owe anyone." />
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
