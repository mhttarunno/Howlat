import { ArrowDown, ArrowUp, ArrowUpDown, Clock, Eye, FilterX, HandCoins, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EntryIcon, EntryTypeBadge } from '@/components/EntryList'
import { EmptyState, ErrorState, ListSkeleton, Money, PageHeader, Pagination, Stat, StatusBadge } from '@/components/shared'
import { TransactionDetail } from '@/components/TransactionDetail'
import { Badge, Button, Card, Input, Select } from '@/components/ui/primitives'
import { useActions } from '@/context/actions'
import { useDebounced, useUrlFilters } from '@/hooks/useUrlFilters'
import { cn } from '@/lib/utils'
import { useEntries, usePeople, useSummary } from '@/services/queries'
import { ENTRY_LABEL, formatDate, isReceivableSide } from '@/utils/format'
import type { LedgerEntry, LoanType } from '@/types'

const PAGE_SIZE = 15
const DEFAULTS = { search: '', type: '', status: '', person: '', range: 'all', from: '', to: '', overdue: '', sort: 'date', order: 'desc', page: '1' }

type SortKey = 'date' | 'amount' | 'person' | 'type' | 'status'

function SortHeader({ label, k, sort, order, onSort, className }: { label: string; k: SortKey; sort: string; order: string; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort === k
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('px-4 py-3 text-left font-semibold text-muted-foreground', className)}>
      <button onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1.5 transition-colors hover:text-foreground cursor-pointer', active && 'text-foreground font-bold')}>
        <span>{label}</span>
        <Icon className={cn('h-3.5 w-3.5', active ? 'text-primary' : 'opacity-60')} />
      </button>
    </th>
  )
}

export function TransactionsPage({ fixedType }: { fixedType?: LoanType }) {
  const a = useActions()
  const { values: f, set, reset, activeCount } = useUrlFilters(DEFAULTS)
  const [searchText, setSearchText] = useState(f.search)
  const debounced = useDebounced(searchText)
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => { if (debounced !== f.search) set({ search: debounced }) }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSearchText(f.search) }, [f.search])

  const people = usePeople({ status: 'all', page_size: 100, sort: 'name' })
  const summary = useSummary()

  const typeFilter = fixedType ?? (f.type || undefined)
  const params = useMemo(() => ({
    search: f.search || undefined,
    type: fixedType ? [fixedType] : typeFilter ? [typeFilter] : undefined,
    status: f.status || undefined,
    person_id: f.person || undefined,
    range: f.range !== 'all' ? f.range : undefined,
    date_from: f.range === 'custom' ? f.from || undefined : undefined,
    date_to: f.range === 'custom' ? f.to || undefined : undefined,
    overdue: f.overdue === 'true' || undefined,
    sort: f.sort, order: f.order, page: Number(f.page) || 1, page_size: PAGE_SIZE,
  }), [f, fixedType, typeFilter])

  const q = useEntries(params)
  const page = q.data

  const onSort = (k: SortKey) => set(f.sort === k ? { order: f.order === 'asc' ? 'desc' : 'asc' } : { sort: k, order: k === 'person' || k === 'type' ? 'asc' : 'desc' })
  const title = fixedType === 'LENT' ? 'Money Given' : fixedType === 'BORROWED' ? 'Money Received' : 'Transactions'
  const subtitle = fixedType === 'LENT' ? 'Money you have lent to others.' : fixedType === 'BORROWED' ? 'Money you have borrowed from others.' : 'Every loan, borrowing, and repayment in one ledger.'
  const hasFilters = activeCount > 0

  const customRangeInvalid = f.range === 'custom' && f.from && f.to && f.from > f.to

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          fixedType ? (
            <Button onClick={() => a.newLoan(fixedType)}>
              <Plus className="h-4 w-4" /> {fixedType === 'LENT' ? 'Give money' : 'Receive money'}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => a.repay()}>
                <HandCoins className="h-4 w-4 text-primary" /> Record repayment
              </Button>
              <Button onClick={() => a.newLoan('LENT')}>
                <Plus className="h-4 w-4" /> New transaction
              </Button>
            </>
          )
        }
      />

      {fixedType && summary.data && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Stat label={fixedType === 'LENT' ? 'Total lent' : 'Total borrowed'}>
            <Money value={fixedType === 'LENT' ? summary.data.total_lent : summary.data.total_borrowed} />
          </Stat>
          <Stat label={fixedType === 'LENT' ? 'Still owed to you' : 'Still owed by you'}>
            <Money value={fixedType === 'LENT' ? summary.data.outstanding_receivable : summary.data.outstanding_payable} tone={fixedType === 'LENT' ? 'receivable' : 'payable'} />
          </Stat>
        </div>
      )}

      <Card>
        <div className="space-y-3.5 border-b border-border/80 bg-card/40 p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search transactions…" aria-label="Search transactions" className="pl-9.5 h-10" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
            {!fixedType && (
              <Select aria-label="Transaction type" value={f.type} onChange={(e) => set({ type: e.target.value })}>
                <option value="">All types</option>
                {(Object.keys(ENTRY_LABEL) as (keyof typeof ENTRY_LABEL)[]).map((t) => <option key={t} value={t}>{ENTRY_LABEL[t]}</option>)}
              </Select>
            )}
            <Select aria-label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="">Any status</option><option value="UNPAID">Unpaid</option><option value="PARTIALLY_PAID">Partially paid</option><option value="FULLY_PAID">Fully paid</option>
            </Select>
            <Select aria-label="Person" value={f.person} onChange={(e) => set({ person: e.target.value })}>
              <option value="">All people</option>
              {people.data?.items.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived_at ? ' (archived)' : ''}</option>)}
            </Select>
            <Select aria-label="Date range" value={f.range} onChange={(e) => set({ range: e.target.value, from: '', to: '' })}>
              <option value="all">All time</option><option value="today">Today</option><option value="last_7_days">Last 7 days</option><option value="last_30_days">Last 30 days</option>
              <option value="this_month">This month</option><option value="last_month">Last month</option><option value="this_year">This year</option><option value="custom">Custom range…</option>
            </Select>
            {f.range === 'custom' && (
              <>
                <Input type="date" aria-label="From date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} />
                <Input type="date" aria-label="To date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} />
              </>
            )}
            <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-input-bg px-3 text-sm text-foreground cursor-pointer hover:border-border-hover transition-colors">
              <input type="checkbox" checked={f.overdue === 'true'} onChange={(e) => set({ overdue: e.target.checked ? 'true' : '' })} className="h-4 w-4 rounded accent-danger cursor-pointer" />
              <span>Overdue only</span>
            </label>
          </div>
          {customRangeInvalid && <p role="alert" className="text-xs text-danger font-medium">The start date must be on or before the end date.</p>}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => { reset(); setSearchText('') }}>
              <FilterX className="h-3.5 w-3.5" /> Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </Button>
          )}
        </div>

        {q.isLoading ? (
          <ListSkeleton rows={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !page || page.items.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No matches" body="Nothing fits these filters. Try widening the date range or clearing a filter." action={<Button variant="secondary" onClick={() => { reset(); setSearchText('') }}>Clear filters</Button>} />
          ) : (
            <EmptyState title={fixedType === 'LENT' ? 'No money given yet' : fixedType === 'BORROWED' ? 'No money received yet' : 'No transactions yet'} body="Record your first transaction to start tracking balances and repayments."
              action={<Button onClick={() => a.newLoan(fixedType ?? 'LENT')}><Plus className="h-4 w-4" /> Add the first transaction</Button>} />
          )
        ) : (
          <div className={cn('transition-opacity', q.isFetching && 'opacity-60')}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border/80 bg-card-elevated/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Ref</th>
                    <SortHeader label="Person" k="person" sort={f.sort} order={f.order} onSort={onSort} />
                    <SortHeader label="Type" k="type" sort={f.sort} order={f.order} onSort={onSort} />
                    <SortHeader label="Amount" k="amount" sort={f.sort} order={f.order} onSort={onSort} className="text-right" />
                    <SortHeader label="Date" k="date" sort={f.sort} order={f.order} onSort={onSort} />
                    <th scope="col" className="px-4 py-3 text-left font-semibold">Description</th>
                    <SortHeader label="Status" k="status" sort={f.sort} order={f.order} onSort={onSort} />
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {page.items.map((e) => (
                    <Row key={e.id} e={e} onOpen={() => setDetailId(e.transaction_id)} onRepay={() => a.repay({ transactionId: e.transaction_id, personId: e.person_id, direction: e.entry_type as LoanType })} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-border/60 md:hidden">
              {page.items.map((e) => <MobileCard key={e.id} e={e} onOpen={() => setDetailId(e.transaction_id)} />)}
            </ul>
            <Pagination page={page.page} pages={page.pages} total={page.total} pageSize={page.page_size} onPage={(p) => set({ page: String(p) }, { keepPage: true })} />
          </div>
        )}
      </Card>

      {detailId && <TransactionDetail id={detailId} onClose={() => setDetailId(null)} />}
    </>
  )
}

const isLoan = (e: LedgerEntry) => e.entry_type === 'LENT' || e.entry_type === 'BORROWED'

function Row({ e, onOpen, onRepay }: { e: LedgerEntry; onOpen: () => void; onRepay: () => void }) {
  const canRepay = isLoan(e) && e.status !== 'FULLY_PAID'
  return (
    <tr className="hover:bg-card-elevated/40 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.ref}</td>
      <td className="px-4 py-3">
        <button onClick={onOpen} className="flex items-center gap-2.5 text-left font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
          <EntryIcon type={e.entry_type} />
          <span>{e.person_name}</span>
        </button>
      </td>
      <td className="px-4 py-3"><EntryTypeBadge type={e.entry_type} /></td>
      <td className="px-4 py-3 text-right font-bold">
        <Money value={e.amount} tone={isReceivableSide(e.entry_type) ? 'receivable' : 'payable'} className="text-[15px]" />
        {isLoan(e) && e.status !== 'UNPAID' && (
          <p className="text-[11px] font-normal text-muted-foreground tabular mt-0.5">Left: <Money value={e.outstanding} /></p>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular">{formatDate(e.entry_date)}</td>
      <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground" title={e.description ?? ''}>{e.description || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={e.status} />
          {e.is_overdue && <Badge tone="danger"><Clock className="h-3 w-3" /> Overdue</Badge>}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {canRepay && (
            <Button variant="ghost" size="icon" aria-label={`Record repayment for ${e.person_name}`} onClick={onRepay} className="text-muted-foreground hover:text-foreground">
              <HandCoins className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label={`View details for ${e.person_name}`} onClick={onOpen} className="text-muted-foreground hover:text-foreground">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

function MobileCard({ e, onOpen }: { e: LedgerEntry; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-card-elevated/40 active:bg-card-elevated/60 transition-colors" aria-label={`${ENTRY_LABEL[e.entry_type]} ${e.person_name}`}>
        <EntryIcon type={e.entry_type} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{e.person_name}</p>
          <p className="truncate text-xs text-muted-foreground mt-0.5">{ENTRY_LABEL[e.entry_type]} · {formatDate(e.entry_date, 'd MMM')}{e.description ? ` · ${e.description}` : ''}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge status={e.status} />
            {e.is_overdue && <Badge tone="danger">Overdue</Badge>}
          </div>
        </div>
        <div className="text-right">
          <Money value={e.amount} tone={isReceivableSide(e.entry_type) ? 'receivable' : 'payable'} className="text-[15px] font-bold" />
          {isLoan(e) && e.status !== 'UNPAID' && <p className="text-[11px] text-muted-foreground tabular mt-0.5">Left <Money value={e.outstanding} /></p>}
        </div>
      </button>
    </li>
  )
}
