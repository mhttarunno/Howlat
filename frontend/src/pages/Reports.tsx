import { Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ActivityChart, BreakdownChart, FlowChart, RepaymentChart } from '@/components/charts'
import { EmptyState, ErrorState, Money, PageHeader, Stat } from '@/components/shared'
import { Button, Card, CardHeader, Input, Select, Skeleton } from '@/components/ui/primitives'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { api, ApiError } from '@/services/api'
import { useMonthlyReport, usePeopleReport, useReportSummary, useYearlyReport } from '@/services/queries'
import { formatMonth } from '@/utils/format'

const DEFAULTS = { range: 'last_30_days', from: '', to: '' }
const RANGES: [string, string][] = [
  ['today', 'Today'], ['last_7_days', 'Last 7 days'], ['last_30_days', 'Last 30 days'], ['this_month', 'This month'],
  ['last_month', 'Last month'], ['this_year', 'This year'], ['all', 'All time'], ['custom', 'Custom range'],
]
const EXPORTS: [string, string][] = [
  ['transactions', 'All transactions'], ['outstanding', 'Outstanding balances'], ['monthly', 'Monthly summary'],
  ['yearly', 'Yearly summary'], ['people', 'Person-wise balances'], ['summary', 'Summary'],
]

function Table({ head, children, right = [] }: { head: string[]; children: ReactNode; right?: number[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="border-b border-border/80 bg-card-elevated/60 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          <tr>{head.map((h, i) => <th key={h} scope="col" className={`px-4 py-3 ${right.includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border/60">{children}</tbody>
      </table>
    </div>
  )
}

export function ReportsPage() {
  const { values: f, set } = useUrlFilters(DEFAULTS)
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportKind, setExportKind] = useState('transactions')

  const invalid = f.range === 'custom' && ((!f.from && !f.to) || (f.from && f.to && f.from > f.to))
  const params = { range: f.range, start: f.range === 'custom' ? f.from || undefined : undefined, end: f.range === 'custom' ? f.to || undefined : undefined }
  const enabledParams = invalid ? { range: 'last_30_days' } : params

  const summary = useReportSummary(enabledParams)
  const monthly = useMonthlyReport(f.range === 'all' ? {} : enabledParams)
  const yearly = useYearlyReport()
  const people = usePeopleReport()

  const download = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(format)
    try {
      await api.download('/reports/export', { report: exportKind, format, ...enabledParams }, `howlat-${exportKind}.${format}`)
      toast.success(`${format.toUpperCase()} downloaded`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Export failed')
    } finally { setExporting(null) }
  }

  const s = summary.data
  const months = monthly.data?.rows ?? []
  const pattern = months.length > 12 ? 'MMM yy' : 'MMM'

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Server-certified ledger metrics computed in real-time." />

      <Card className="mb-5 p-4 sm:p-5 bg-card/60">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-end">
          <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="range" className="mb-1.5 block text-[13px] font-medium text-foreground">Period</label>
              <Select id="range" value={f.range} onChange={(e) => set({ range: e.target.value, from: '', to: '' })}>{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            </div>
            {f.range === 'custom' && (<>
              <div><label htmlFor="from" className="mb-1.5 block text-[13px] font-medium text-foreground">From</label><Input id="from" type="date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} /></div>
              <div><label htmlFor="to" className="mb-1.5 block text-[13px] font-medium text-foreground">To</label><Input id="to" type="date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} /></div>
            </>)}
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="sm:w-52">
              <label htmlFor="export" className="mb-1.5 block text-[13px] font-medium text-foreground">Export dataset</label>
              <Select id="export" value={exportKind} onChange={(e) => setExportKind(e.target.value)}>{EXPORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" loading={exporting === 'csv'} disabled={!!exporting || !!invalid} onClick={() => download('csv')}><Sheet className="h-4 w-4 text-emerald-400" /> CSV</Button>
              <Button variant="secondary" loading={exporting === 'xlsx'} disabled={!!exporting || !!invalid} onClick={() => download('xlsx')}><FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Excel</Button>
              <Button variant="secondary" loading={exporting === 'pdf'} disabled={!!exporting || !!invalid} onClick={() => download('pdf')}><FileText className="h-4 w-4 text-primary" /> PDF</Button>
            </div>
          </div>
        </div>
        {invalid && <p role="alert" className="mt-2 text-xs text-danger font-medium">Choose a valid custom range. The start must be on or before the end.</p>}
      </Card>

      {summary.isError ? <Card><ErrorState error={summary.error} onRetry={() => summary.refetch()} /></Card> : !s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">In this period</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Money lent" hint={`${s.loan_count} loans & debts`}><Money value={s.lent} tone="receivable" /></Stat>
            <Stat label="Money borrowed"><Money value={s.borrowed} tone="payable" /></Stat>
            <Stat label="Repayments received" hint={`${s.repayment_count} repayments`}><Money value={s.repayments_received} tone="receivable" /></Stat>
            <Stat label="Repayments returned"><Money value={s.repayments_returned} tone="payable" /></Stat>
          </div>
          <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current overall position</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Outstanding receivable"><Money value={s.outstanding_receivable} tone="receivable" /></Stat>
            <Stat label="Outstanding payable"><Money value={s.outstanding_payable} tone="payable" /></Stat>
            <Stat label="Net position" className="col-span-2 lg:col-span-1"><Money value={s.net_position} tone="auto" sign /></Stat>
          </div>
        </>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Lent vs borrowed" subtitle="By month" />
          <div className="px-2 pb-4 pt-3 sm:px-4">{monthly.isLoading ? <Skeleton className="mx-2 h-[260px]" /> : monthly.isError ? <ErrorState error={monthly.error} onRetry={() => monthly.refetch()} compact /> : <FlowChart months={months} pattern={pattern} />}</div></Card>
        <Card><CardHeader title="Repayment activity" subtitle="Received back vs returned" />
          <div className="px-2 pb-4 pt-3 sm:px-4">{monthly.isLoading ? <Skeleton className="mx-2 h-[260px]" /> : monthly.isError ? <ErrorState error={monthly.error} onRetry={() => monthly.refetch()} compact /> : <RepaymentChart months={months} pattern={pattern} />}</div></Card>
        <Card><CardHeader title="Receivable vs payable" subtitle="Outstanding right now" />
          <div className="px-2 pb-4 pt-3 sm:px-4">{s ? <BreakdownChart receivable={s.outstanding_receivable} payable={s.outstanding_payable} /> : <Skeleton className="mx-2 h-[260px]" />}</div></Card>
        <Card><CardHeader title="Transaction activity" subtitle="Entries recorded per month" />
          <div className="px-2 pb-4 pt-3 sm:px-4">{monthly.isLoading ? <Skeleton className="mx-2 h-[260px]" /> : <ActivityChart months={months} pattern={pattern} />}</div></Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Monthly summary" subtitle="Lending, borrowing and repayments per month" />
        <div className="mt-3">
          {monthly.data && (
            <Table head={['Month', 'Lent', 'Borrowed', 'Received back', 'Returned']} right={[1, 2, 3, 4]}>
              {[...monthly.data.rows].reverse().map((r) => (
                <tr key={r.month} className="hover:bg-card-elevated/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{formatMonth(r.month, 'MMMM yyyy')}</td>
                  <td className="px-4 py-3 text-right font-medium"><Money value={r.lent} /></td>
                  <td className="px-4 py-3 text-right font-medium"><Money value={r.borrowed} /></td>
                  <td className="px-4 py-3 text-right font-medium"><Money value={r.received} /></td>
                  <td className="px-4 py-3 text-right font-medium"><Money value={r.returned} /></td>
                </tr>
              ))}
              <tr className="bg-card-elevated/80 font-bold border-t border-border">
                <td className="px-4 py-3 text-foreground">Total</td>
                <td className="px-4 py-3 text-right"><Money value={monthly.data.totals.lent} /></td>
                <td className="px-4 py-3 text-right"><Money value={monthly.data.totals.borrowed} /></td>
                <td className="px-4 py-3 text-right"><Money value={monthly.data.totals.received} /></td>
                <td className="px-4 py-3 text-right"><Money value={monthly.data.totals.returned} /></td>
              </tr>
            </Table>
          )}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Yearly summary" subtitle="Year-over-year flow comparisons" />
          <div className="mt-3">
            {yearly.isError ? <ErrorState error={yearly.error} onRetry={() => yearly.refetch()} compact /> : !yearly.data ? <Skeleton className="m-4 h-24" /> : yearly.data.rows.length === 0 ? <EmptyState title="No yearly data yet" /> : (
              <Table head={['Year', 'Lent', 'Borrowed', 'Received', 'Returned']} right={[1, 2, 3, 4]}>
                {yearly.data.rows.map((r) => (
                  <tr key={r.year} className="hover:bg-card-elevated/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{r.year}</td>
                    <td className="px-4 py-3 text-right"><Money value={r.lent} /></td>
                    <td className="px-4 py-3 text-right"><Money value={r.borrowed} /></td>
                    <td className="px-4 py-3 text-right"><Money value={r.received} /></td>
                    <td className="px-4 py-3 text-right"><Money value={r.returned} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Person-wise balances" subtitle="Current who-owes-whom status" />
          <div className="mt-3">
            {people.isError ? <ErrorState error={people.error} onRetry={() => people.refetch()} compact /> : !people.data ? <Skeleton className="m-4 h-24" /> : people.data.rows.length === 0 ? <EmptyState title="No balances yet" /> : (
              <Table head={['Person', 'Owes you', 'You owe', 'Net']} right={[1, 2, 3]}>
                {people.data.rows.map((r) => (
                  <tr key={r.person_id} className="hover:bg-card-elevated/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{r.name}{r.archived && <span className="ml-1.5 text-xs text-muted-foreground">(archived)</span>}</td>
                    <td className="px-4 py-3 text-right"><Money value={r.receivable} tone="receivable" /></td>
                    <td className="px-4 py-3 text-right"><Money value={r.payable} tone="payable" /></td>
                    <td className="px-4 py-3 text-right font-bold"><Money value={r.net_balance} tone="auto" sign /></td>
                  </tr>
                ))}
                {people.data.totals && (
                  <tr className="bg-card-elevated/80 font-bold border-t border-border">
                    <td className="px-4 py-3 text-foreground">Total</td>
                    <td className="px-4 py-3 text-right"><Money value={people.data.totals.receivable} tone="receivable" /></td>
                    <td className="px-4 py-3 text-right"><Money value={people.data.totals.payable} tone="payable" /></td>
                    <td className="px-4 py-3 text-right"><Money value={people.data.totals.net_balance} tone="auto" sign /></td>
                  </tr>
                )}
              </Table>
            )}
          </div>
        </Card>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5 text-primary" /> Export files preserve exact decimal precision without floating point errors.</p>
    </>
  )
}
