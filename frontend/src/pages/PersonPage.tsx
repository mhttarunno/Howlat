import { ArrowDownLeft, ArrowLeft, ArchiveRestore, ArrowUpRight, Archive, HandCoins, Mail, MapPin, Pencil, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntryIcon, EntryRow } from '@/components/EntryList'
import { Avatar, EmptyState, ErrorState, ListSkeleton, Money, Pagination, Stat, StatusBadge } from '@/components/shared'
import { TransactionDetail } from '@/components/TransactionDetail'
import { Badge, Button, Card, ConfirmDialog, Skeleton } from '@/components/ui/primitives'
import { useActions } from '@/context/actions'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { useEntries, usePerson, usePersonMutations, useRepayments } from '@/services/queries'
import { formatDate, isReceivableSide, isZeroMoney } from '@/utils/format'

type Tab = 'transactions' | 'repayments' | 'activity'

export function PersonPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const a = useActions()
  const person = usePerson(id)
  const { archive, restore } = usePersonMutations()
  const [tab, setTab] = useState<Tab>('transactions')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const loans = useEntries({ person_id: id, type: ['LENT', 'BORROWED'], sort: 'date', order: 'desc', page: tab === 'transactions' ? page : 1, page_size: 10 })
  const reps = useRepayments({ person_id: id, page: tab === 'repayments' ? page : 1, page_size: 10 })
  const activity = useEntries({ person_id: id, sort: 'created', order: 'desc', page: tab === 'activity' ? page : 1, page_size: 10 })

  if (person.isLoading) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
  if (person.isError) {
    const notFound = person.error instanceof ApiError && person.error.status === 404
    return <Card>{notFound ? <EmptyState title="Person not found" body="They may have been removed, or the link is wrong." action={<Button asChild variant="secondary"><Link to="/people">Back to people</Link></Button>} /> : <ErrorState error={person.error} onRetry={() => person.refetch()} />}</Card>
  }
  const p = person.data!
  const b = p.balances
  const archived = !!p.archived_at
  const switchTab = (t: Tab) => { setTab(t); setPage(1) }

  return (
    <>
      <Link to="/people" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to People
      </Link>

      <Card className="p-5 sm:p-6 bg-card-elevated border-border shadow-elevated">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <Avatar name={p.name} size={60} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">{p.name}</h1>
                {archived && <Badge tone="neutral">Archived</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {p.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-text-muted" /> {p.phone}</p>}
                {p.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-text-muted" /> {p.email}</p>}
                {p.address && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-text-muted" /> {p.address}</p>}
                <p className="text-text-muted">Added {formatDate(p.created_at)}</p>
              </div>
              {p.notes && <p className="mt-2.5 max-w-xl whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed bg-card/60 p-2.5 rounded-lg border border-border/60">{p.notes}</p>}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => a.editPerson(p)}>
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </Button>
            {archived
              ? <Button variant="secondary" size="sm" loading={restore.isPending} onClick={() => restore.mutate(id, { onSuccess: () => toast.success('Person restored') })}><ArchiveRestore className="h-3.5 w-3.5" /> Restore</Button>
              : <Button variant="danger-ghost" size="sm" onClick={() => setConfirmArchive(true)}><Archive className="h-3.5 w-3.5" /> Archive</Button>}
          </div>
        </div>
      </Card>

      {/* Net balance between both parties */}
      <Card className="mt-4 p-5 sm:p-6 bg-gradient-to-r from-card to-card-elevated border-border shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Net Ledger Balance with {p.name}</p>
        <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl tabular">
          <Money value={b.net_balance} tone="auto" sign />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isZeroMoney(b.net_balance) ? (isZeroMoney(b.receivable) ? 'Nothing outstanding between you.' : 'Both sides cancel out.') : b.net_balance.startsWith('-') ? `You owe ${p.name} overall.` : `${p.name} owes you overall.`}
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Given to them"><Money value={b.total_lent} /></Stat>
        <Stat label="Received from them"><Money value={b.total_borrowed} /></Stat>
        <Stat label="They repaid you"><Money value={b.repaid_to_me} tone="receivable" /></Stat>
        <Stat label="You repaid them"><Money value={b.repaid_by_me} tone="payable" /></Stat>
        <Stat label="They still owe you"><Money value={b.receivable} tone="receivable" /></Stat>
        <Stat label="You still owe them"><Money value={b.payable} tone="payable" /></Stat>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap">
        <Button onClick={() => a.newLoan('LENT', id)} disabled={archived}>
          <ArrowUpRight className="h-4 w-4 text-warning" /> Give money
        </Button>
        <Button variant="secondary" onClick={() => a.newLoan('BORROWED', id)} disabled={archived}>
          <ArrowDownLeft className="h-4 w-4 text-success" /> Receive money
        </Button>
        <Button variant="secondary" onClick={() => a.repay({ personId: id })}>
          <HandCoins className="h-4 w-4 text-primary" /> Record repayment
        </Button>
      </div>
      {archived && <p className="mt-2 text-xs text-muted-foreground">Archived people can't receive new loans, but you can still record repayments on existing open transactions.</p>}

      <Card className="mt-6">
        <div role="tablist" aria-label="History" className="flex gap-2 border-b border-border/80 px-4 pt-2 bg-card/40">
          {([['transactions', 'Transactions', loans.data?.total], ['repayments', 'Repayments', reps.data?.total], ['activity', 'Recent activity', undefined]] as const).map(([k, label, n]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => switchTab(k)}
              className={cn(
                '-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-all duration-150 cursor-pointer',
                tab === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}>
              {label}{n !== undefined && <span className="ml-2 rounded-md bg-card-elevated border border-border/60 px-1.5 py-0.5 text-[11px] font-mono tabular">{n}</span>}
            </button>
          ))}
        </div>

        {tab === 'transactions' && (loans.isLoading ? <ListSkeleton rows={4} /> : loans.isError ? <ErrorState error={loans.error} onRetry={() => loans.refetch()} compact /> :
          !loans.data?.items.length ? <EmptyState title="No transactions yet" body={`Money you give to or receive from ${p.name} will appear here.`} /> : (
            <>
              <ul className="divide-y divide-border/60">
                {loans.data.items.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setDetailId(e.transaction_id)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-card-elevated/40 transition-colors sm:px-5 cursor-pointer">
                      <EntryIcon type={e.entry_type} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{e.entry_type === 'LENT' ? 'Lent' : 'Borrowed'} <Money value={e.amount} /></span>
                          <StatusBadge status={e.status} />
                          {e.is_overdue && <Badge tone="danger">Overdue</Badge>}
                        </div>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {formatDate(e.entry_date)}{e.description ? ` · ${e.description}` : ''}{e.expected_date ? ` · due ${formatDate(e.expected_date, 'd MMM')}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Outstanding</p>
                        <Money value={e.outstanding} tone={isZeroMoney(e.outstanding) ? 'none' : isReceivableSide(e.entry_type) ? 'receivable' : 'payable'} className="text-[15px] font-bold" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={loans.data.page} pages={loans.data.pages} total={loans.data.total} pageSize={loans.data.page_size} onPage={setPage} />
            </>
          ))}

        {tab === 'repayments' && (reps.isLoading ? <ListSkeleton rows={4} /> : reps.isError ? <ErrorState error={reps.error} onRetry={() => reps.refetch()} compact /> :
          !reps.data?.items.length ? <EmptyState title="No repayments yet" body="Partial and full repayments will be listed here, each one separately." /> : (
            <>
              <ul className="divide-y divide-border/60">
                {reps.data.items.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => setDetailId(r.transaction_id)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-card-elevated/40 transition-colors sm:px-5 cursor-pointer">
                      <EntryIcon type={r.direction === 'RECEIVED' ? 'REPAYMENT_RECEIVED' : 'REPAYMENT_RETURNED'} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{r.direction === 'RECEIVED' ? 'Received from' : 'Returned to'} {r.person_name}</p>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {formatDate(r.repayment_date)}{r.payment_method ? ` · ${r.payment_method}` : ''} · loan ref {r.transaction_ref} (<Money value={r.transaction_outstanding} /> remaining)
                        </p>
                      </div>
                      <Money value={r.amount} tone={r.direction === 'RECEIVED' ? 'receivable' : 'payable'} className="text-[15px] font-bold" />
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={reps.data.page} pages={reps.data.pages} total={reps.data.total} pageSize={reps.data.page_size} onPage={setPage} />
            </>
          ))}

        {tab === 'activity' && (activity.isLoading ? <ListSkeleton rows={4} /> : activity.isError ? <ErrorState error={activity.error} onRetry={() => activity.refetch()} compact /> :
          !activity.data?.items.length ? <EmptyState title="No activity yet" /> : (
            <>
              <ul className="divide-y divide-border/60">{activity.data.items.map((e) => <EntryRow key={e.id} e={e} showPerson={false} />)}</ul>
              <Pagination page={activity.data.page} pages={activity.data.pages} total={activity.data.total} pageSize={activity.data.page_size} onPage={setPage} />
            </>
          ))}
      </Card>

      {detailId && <TransactionDetail id={detailId} onClose={() => setDetailId(null)} />}
      <ConfirmDialog open={confirmArchive} onOpenChange={setConfirmArchive} title={`Archive ${p.name}?`} confirmLabel="Archive" loading={archive.isPending}
        description="They'll be hidden from your people list and can't receive new loans. All transactions, repayments and balances are preserved, and you can restore them any time."
        onConfirm={() => archive.mutate(id, { onSuccess: () => { toast.success(`${p.name} archived`); setConfirmArchive(false); nav('/people') } })} />
    </>
  )
}
