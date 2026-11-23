import { ArrowDownLeft, ArrowUpRight, Clock, HandCoins, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ENTRY_LABEL, formatDate, isReceivableSide } from '@/utils/format'
import type { EntryType, LedgerEntry } from '@/types'
import { Badge } from './ui/primitives'
import { Money, StatusBadge } from './shared'

export const ENTRY_ICON: Record<EntryType, typeof ArrowUpRight> = {
  LENT: ArrowUpRight,
  BORROWED: ArrowDownLeft,
  REPAYMENT_RECEIVED: HandCoins,
  REPAYMENT_RETURNED: Undo2,
}

export function EntryIcon({ type }: { type: EntryType }) {
  const Icon = ENTRY_ICON[type]
  // LENT & REPAYMENT_RETURNED = Money given (Amber)
  // BORROWED & REPAYMENT_RECEIVED = Money received (Emerald)
  const isGiven = type === 'LENT' || type === 'REPAYMENT_RETURNED'
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-150',
        isGiven
          ? 'bg-warning-soft text-warning border-warning/25'
          : 'bg-success-soft text-success border-success/25',
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}

export function EntryTypeBadge({ type }: { type: EntryType }) {
  const isGiven = type === 'LENT' || type === 'REPAYMENT_RETURNED'
  return <Badge tone={isGiven ? 'warning' : 'success'}>{ENTRY_LABEL[type]}</Badge>
}

/** One compact activity row: used on the dashboard and on person profiles. */
export function EntryRow({ e, showPerson = true }: { e: LedgerEntry; showPerson?: boolean }) {
  const isLoan = e.entry_type === 'LENT' || e.entry_type === 'BORROWED'
  return (
    <li className="group interactive-row flex items-center gap-3.5 px-4 py-3 sm:px-5 hover:bg-card-elevated/60 transition-all duration-200">
      <div className="transition-transform duration-200 group-hover:scale-110">
        <EntryIcon type={e.entry_type} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {showPerson ? (
            <Link to={`/people/${e.person_id}`} className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {e.person_name}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-foreground">{ENTRY_LABEL[e.entry_type]}</span>
          )}
          {showPerson && <EntryTypeBadge type={e.entry_type} />}
          {isLoan && <StatusBadge status={e.status} />}
          {e.is_overdue && (
            <Badge tone="danger" className="animate-pulse">
              <Clock className="h-3 w-3" /> Overdue
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDate(e.entry_date)}{e.description ? ` · ${e.description}` : ''}
        </p>
      </div>
      <Money
        value={e.amount}
        tone={isReceivableSide(e.entry_type) ? 'receivable' : 'payable'}
        className="text-[15px] font-bold transition-transform duration-200 group-hover:scale-105"
      />
    </li>
  )
}
