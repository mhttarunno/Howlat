import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/auth'
import { ApiError } from '@/services/api'
import { cn } from '@/lib/utils'
import { formatMoney, initials, isPositiveMoney, isZeroMoney, STATUS_LABEL } from '@/utils/format'
import type { Status } from '@/types'
import { Badge, Button, Card } from './ui/primitives'

/**
 * Renders a backend money string using the user's currency.
 * Financial color identity:
 * - receivable (money owed to me / positive): Emerald Green (#10B981)
 * - payable (money given / I owe): Warm Amber (#F59E0B)
 */
export function Money({ value, tone, sign, className, decimals }: {
  value: string; tone?: 'receivable' | 'payable' | 'auto' | 'none'; sign?: boolean; className?: string; decimals?: boolean
}) {
  const { user } = useAuth()
  const text = formatMoney(value, user?.currency ?? 'BDT', { sign, alwaysDecimals: decimals })
  const color =
    tone === 'receivable' ? 'text-success'
    : tone === 'payable' ? 'text-warning'
    : tone === 'auto' ? (isZeroMoney(value) ? 'text-foreground' : isPositiveMoney(value) ? 'text-success' : 'text-warning')
    : ''
  return <span className={cn('tabular whitespace-nowrap font-medium', color, className)}>{text}</span>
}

export function StatusBadge({ status }: { status: Status }) {
  const tone = status === 'FULLY_PAID' ? 'success' : status === 'PARTIALLY_PAID' ? 'warning' : 'neutral'
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-sky-50 text-blue-800 border border-blue-200/90 font-bold tracking-wide shadow-xs dark:from-blue-600/30 dark:to-cyan-600/25 dark:text-blue-200 dark:border-blue-400/40 dark:shadow-[0_0_12px_rgba(59,130,246,0.25)] transition-all select-none"
    >
      {initials(name)}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-card-elevated border border-border text-muted-foreground shadow-sm">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="font-semibold text-foreground text-[15px]">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Shown instead of data when a request fails. Never substitutes fake numbers. */
export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const e = error instanceof ApiError ? error : null
  const offline = e?.isNetwork
  return (
    <div role="alert" className={cn('flex flex-col items-center text-center', compact ? 'px-4 py-6' : 'px-6 py-12')}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft border border-danger/20 text-danger">
        {offline ? <WifiOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>
      <p className="font-semibold text-foreground">{offline ? "You're offline or the server is unreachable" : 'Could not load this data'}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{e?.message ?? 'Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  )
}

export function Pagination({ page, pages, total, pageSize, onPage }: { page: number; pages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3.5 text-[13px] text-muted-foreground">
      <span className="tabular">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2.5 tabular font-medium text-foreground">Page {page} / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function Stat({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <Card elevated className={cn('p-4 border-border/80 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-glow transition-all duration-200', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-foreground tabular sm:text-[22px]">{children}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </Card>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <div className="h-9 w-9 rounded-full bg-card-elevated animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-1/3 rounded bg-card-elevated animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-card-elevated/60 animate-pulse" />
          </div>
          <div className="h-5 w-20 rounded bg-card-elevated animate-pulse" />
        </div>
      ))}
    </div>
  )
}
