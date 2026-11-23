import { FilterX, Search, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, EmptyState, ErrorState, ListSkeleton, Money, PageHeader, Pagination } from '@/components/shared'
import { Badge, Button, Card, Input, Select } from '@/components/ui/primitives'
import { useActions } from '@/context/actions'
import { useDebounced, useUrlFilters } from '@/hooks/useUrlFilters'
import { cn } from '@/lib/utils'
import { usePeople } from '@/services/queries'
import { isZeroMoney } from '@/utils/format'

const DEFAULTS = { search: '', status: 'active', balance: '', sort: 'name', order: 'asc', page: '1' }
const PAGE_SIZE = 12

export function PeoplePage() {
  const a = useActions()
  const { values: f, set, reset, activeCount } = useUrlFilters(DEFAULTS)
  const [text, setText] = useState(f.search)
  const debounced = useDebounced(text)
  useEffect(() => { if (debounced !== f.search) set({ search: debounced }) }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setText(f.search) }, [f.search])

  const q = usePeople({ search: f.search || undefined, status: f.status, balance: f.balance || undefined, sort: f.sort, order: f.order, page: Number(f.page) || 1, page_size: PAGE_SIZE })
  const hasFilters = activeCount > 0

  return (
    <>
      <PageHeader
        title="People"
        subtitle="Everyone you lend to or borrow from. A person can have both roles."
        actions={<Button onClick={() => a.addPerson()}><UserPlus className="h-4 w-4" /> Add person</Button>}
      />
      <Card>
        <div className="space-y-3.5 border-b border-border/80 bg-card/40 p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search by name, phone or email…"
              aria-label="Search people"
              className="pl-9.5 h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Select aria-label="Show" value={f.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All people</option>
            </Select>
            <Select aria-label="Balance" value={f.balance} onChange={(e) => set({ balance: e.target.value })}>
              <option value="">Any balance</option>
              <option value="owes_me">Owes me</option>
              <option value="i_owe">I owe them</option>
              <option value="settled">Settled</option>
            </Select>
            <Select aria-label="Sort by" value={`${f.sort}:${f.order}`} onChange={(e) => { const [sort, order] = e.target.value.split(':'); set({ sort, order }) }}>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="receivable:desc">Owes me most</option>
              <option value="payable:desc">I owe most</option>
              <option value="created:desc">Newest first</option>
            </Select>
            {hasFilters && (
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => { reset(); setText('') }}>
                <FilterX className="h-4 w-4" /> Clear filters
              </Button>
            )}
          </div>
        </div>

        {q.isLoading ? (
          <ListSkeleton rows={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || q.data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No people match" body="Try a different search or clear the filters." action={<Button variant="secondary" onClick={() => { reset(); setText('') }}>Clear filters</Button>} />
          ) : (
            <EmptyState title="No people yet" body="Add the first person you lend to or borrow from." action={<Button onClick={() => a.addPerson()}><UserPlus className="h-4 w-4" /> Add your first person</Button>} />
          )
        ) : (
          <div className={cn(q.isFetching && 'opacity-60 transition-opacity')}>
            <ul className="divide-y divide-border/60">
              {q.data.items.map((p) => {
                const b = p.balances
                const settled = isZeroMoney(b.receivable) && isZeroMoney(b.payable)
                return (
                  <li key={p.id}>
                    <Link to={`/people/${p.id}`} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-card-elevated/40 transition-colors sm:px-5">
                      <Avatar name={p.name} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-foreground text-[15px]">{p.name}</p>
                          {p.archived_at && <Badge tone="neutral">Archived</Badge>}
                        </div>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {p.phone || p.email || `${p.transaction_count} transaction${p.transaction_count === 1 ? '' : 's'}`}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        {settled ? (
                          <span className="text-xs font-medium text-text-muted">{p.transaction_count ? 'Settled' : 'No activity'}</span>
                        ) : (
                          <div className="space-y-0.5">
                            {!isZeroMoney(b.receivable) && (
                              <p className="text-xs">
                                <span className="mr-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">owes you</span>
                                <Money value={b.receivable} tone="receivable" className="font-bold text-sm" />
                              </p>
                            )}
                            {!isZeroMoney(b.payable) && (
                              <p className="text-xs">
                                <span className="mr-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">you owe</span>
                                <Money value={b.payable} tone="payable" className="font-bold text-sm" />
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Pagination page={q.data.page} pages={q.data.pages} total={q.data.total} pageSize={q.data.page_size} onPage={(p) => set({ page: String(p) }, { keepPage: true })} />
          </div>
        )}
      </Card>
    </>
  )
}
