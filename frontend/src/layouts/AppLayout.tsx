import * as Dropdown from '@radix-ui/react-dropdown-menu'
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Bell, ChevronDown, HandCoins, LayoutDashboard, LogOut, Menu, Moon, Plus,
  ReceiptText, Search, Settings as SettingsIcon, Sun, UserPlus, Users, Wallet, type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Money } from '@/components/shared'
import { Badge, Button, Dialog } from '@/components/ui/primitives'
import { ActionsProvider, useActions } from '@/context/actions'
import { useAuth } from '@/context/auth'
import { useTheme } from '@/context/theme'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/services/queries'
import { formatDate } from '@/utils/format'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/people', label: 'People', icon: Users },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/money-given', label: 'Money Given', icon: ArrowUpRight },
  { to: '/money-received', label: 'Money Received', icon: ArrowDownLeft },
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]
const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Dashboard'], [/^\/people\/.+/, 'Person'], [/^\/people/, 'People'], [/^\/transactions/, 'Transactions'],
  [/^\/money-given/, 'Money Given'], [/^\/money-received/, 'Money Received'], [/^\/reports/, 'Reports & Analytics'], [/^\/settings/, 'Settings'],
]
const titleFor = (path: string) => TITLES.find(([r]) => r.test(path))?.[1] ?? 'Howlat'

export function AppLayout() {
  return (
    <ActionsProvider>
      <Shell />
    </ActionsProvider>
  )
}

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-3 transition-opacity hover:opacity-90" aria-label="Howlat home">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#0284C7] shadow-[0_0_16px_rgba(37,99,235,0.45)] ring-1 ring-white/20">
        <Wallet className="h-[18px] w-[18px] text-white" />
      </span>
      <div className="flex flex-col">
        <span className="text-[17px] font-bold tracking-tight text-foreground">Howlat</span>
        <span className="hidden text-[10px] font-medium tracking-wider text-muted-foreground uppercase lg:block">Fintech Ledger</span>
      </div>
    </Link>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  useEffect(() => { setMoreOpen(false); window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="relative min-h-dvh bg-background text-foreground lg:pl-64">
      {/* Ambient background lighting with deep navy obsidian and electric blue reflection */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="ambient-orb-1 absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/[0.12] dark:bg-blue-600/[0.08] blur-[120px]" />
        <div className="ambient-orb-2 absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.10] dark:bg-cyan-500/[0.06] blur-[130px]" />
        <div className="ambient-orb-3 absolute bottom-1/4 left-1/3 h-[450px] w-[450px] rounded-full bg-indigo-600/[0.08] dark:bg-indigo-600/[0.05] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.08),rgba(255,255,255,0))]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar/85 backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] lg:flex shadow-elevated" aria-label="Sidebar">
        <div className="px-5 pb-5 pt-6"><Logo /></div>
        <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Navigation
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
          {NAV.map((n) => <SidebarLink key={n.to} {...n} />)}
        </nav>
        <SidebarFooter />
      </aside>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <TopBar title={titleFor(pathname)} onMenu={() => setMoreOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          <div key={pathname} className="animate-fade-in"><Outlet /></div>
        </main>
      </div>

      <BottomNav onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  )
}

function SidebarLink({ to, label, icon: Icon, end }: NavItem) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-150',
        isActive
          ? 'bg-sidebar-active text-sidebar-active-foreground font-semibold shadow-sm'
          : 'text-sidebar-foreground hover:bg-card-elevated hover:text-foreground',
      )}>
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          )}
          <Icon className={cn('h-[18px] w-[18px] transition-colors', isActive ? 'text-primary' : 'text-sidebar-foreground group-hover:text-foreground')} aria-hidden />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function ThemeToggleIcon({ resolved, className }: { resolved: 'light' | 'dark'; className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0 overflow-hidden', className)}>
      <Sun
        className={cn(
          'h-full w-full text-amber-400 transition-all duration-150 ease-out',
          resolved === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0 absolute pointer-events-none',
        )}
      />
      <Moon
        className={cn(
          'h-full w-full text-primary transition-all duration-150 ease-out',
          resolved === 'light' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0 absolute pointer-events-none',
        )}
      />
    </span>
  )
}

function SidebarFooter() {
  const { user, logout } = useAuth()
  const { resolved, toggle } = useTheme()
  const [busy, setBusy] = useState(false)
  if (!user) return null
  return (
    <div className="border-t border-border/80 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-card-elevated/80 dark:bg-card-elevated/50 backdrop-blur-md border border-border/80 p-2.5 shadow-sm hover:border-primary/30 transition-all">
        <Avatar name={user.full_name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground tracking-tight">{user.full_name}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button
          onClick={toggle}
          className="group flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card/80 px-2 py-2 text-[12px] font-semibold text-foreground/85 transition-all hover:bg-card-elevated hover:text-foreground hover:border-primary/40 cursor-pointer shadow-xs active:scale-95"
          aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}>
          <ThemeToggleIcon resolved={resolved} className="h-3.5 w-3.5" />
          <span>{resolved === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); await logout() }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card/80 px-2 py-2 text-[12px] font-semibold text-foreground/85 transition-all hover:border-danger/40 hover:bg-danger-soft hover:text-danger cursor-pointer shadow-xs active:scale-[0.98]">
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}

/* ───────── Top bar ───────── */
function TopBar({ title, onMenu }: { title: string; onMenu: () => void }) {
  const nav = useNavigate()
  const { resolved, toggle } = useTheme()
  const [q, setQ] = useState('')
  const [mobileSearch, setMobileSearch] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    nav(`/transactions?search=${encodeURIComponent(term)}`)
    setMobileSearch(false)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:h-16 sm:gap-3.5 sm:px-6">
        <div className="lg:hidden shrink-0"><Logo /></div>
        <h2 className="hidden text-[17px] font-bold tracking-tight text-foreground lg:block">{title}</h2>

        <form onSubmit={submit} role="search" className="ml-auto hidden w-full max-w-xs md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search transactions, people…"
              aria-label="Search"
              className="h-9 w-full rounded-lg border border-input bg-input-bg pl-9 pr-3 text-sm text-foreground placeholder:text-text-muted transition-all duration-150 hover:border-border-hover focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => setMobileSearch(true)}>
            <Search className="h-[18px] w-[18px]" />
          </Button>
          <NotificationBell />
          <QuickAdd />
          {/* Mobile Theme Toggle: Direct 1-tap in the top bar */}
          <Button
            variant="ghost"
            size="icon"
            className="group lg:hidden text-foreground cursor-pointer active:scale-90 transition-transform"
            aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
            onClick={toggle}
          >
            <ThemeToggleIcon resolved={resolved} className="h-[18px] w-[18px]" />
          </Button>
          <UserMenu />
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={onMenu}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Dialog open={mobileSearch} onOpenChange={setMobileSearch} title="Search" description="Search by person, description, notes or reference">
        <form onSubmit={submit} className="flex gap-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            aria-label="Search term"
            className="h-11 flex-1 rounded-lg border border-input bg-input-bg px-3.5 text-foreground placeholder:text-text-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <Button type="submit" size="lg">Go</Button>
        </form>
      </Dialog>
    </header>
  )
}

const menuContent = 'z-50 min-w-[220px] animate-dropdown rounded-xl border border-border bg-card-elevated/95 p-1.5 text-foreground shadow-pop backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%]'
const menuItem = 'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground font-medium'

function QuickAdd() {
  const a = useActions()
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <Button aria-label="Quick add transaction" className="hover-shimmer-sweep h-9 px-3 sm:h-9 sm:px-3.5 shadow-sm active:scale-[0.97]">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline font-semibold">Quick add</span>
          <ChevronDown className="hidden h-3.5 w-3.5 opacity-70 sm:block" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={8} className={menuContent}>
          <Dropdown.Item className={menuItem} onSelect={() => a.newLoan('LENT')}>
            <ArrowUpRight className="h-4 w-4 text-warning" /> Give money
          </Dropdown.Item>
          <Dropdown.Item className={menuItem} onSelect={() => a.newLoan('BORROWED')}>
            <ArrowDownLeft className="h-4 w-4 text-success" /> Receive money
          </Dropdown.Item>
          <Dropdown.Item className={menuItem} onSelect={() => a.repay()}>
            <HandCoins className="h-4 w-4 text-primary" /> Record repayment
          </Dropdown.Item>
          <Dropdown.Separator className="my-1 h-px bg-border/80" />
          <Dropdown.Item className={menuItem} onSelect={() => a.addPerson()}>
            <UserPlus className="h-4 w-4 text-muted-foreground" /> Add person
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

function NotificationBell() {
  const { data } = useNotifications()
  const nav = useNavigate()
  const count = data?.counts.total ?? 0
  const overdue = (data?.counts.overdue_receivable ?? 0) + (data?.counts.overdue_payable ?? 0)
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={count ? `${count} reminders` : 'No reminders'}>
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className={cn(
              'absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm',
              overdue ? 'bg-danger animate-pulse' : 'bg-primary',
            )}>
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={8} className={cn(menuContent, 'w-[min(92vw,380px)] p-0 overflow-hidden')}>
          <div className="border-b border-border bg-card/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground tracking-tight">Reminders</p>
            <p className="text-xs text-muted-foreground">Based on expected dates you set. Strictly private to your ledger.</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/60">
            {!data?.items.length && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                You're all caught up. No upcoming or overdue repayments.
              </p>
            )}
            {data?.items.map((n) => (
              <Dropdown.Item
                key={n.transaction_id}
                onSelect={() => nav(`/people/${n.person_id}`)}
                className="flex cursor-pointer items-start gap-3 px-4 py-3 outline-none transition-colors data-[highlighted]:bg-card/80">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{n.person_name}</span>
                    <Badge tone={n.kind === 'OVERDUE' ? 'danger' : 'info'}>
                      {n.kind === 'OVERDUE' ? `${n.days}d overdue` : n.days === 0 ? 'Due today' : `Due in ${n.days}d`}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n.direction === 'RECEIVABLE' ? 'Owes you' : 'You owe'} · {formatDate(n.expected_date)}{n.description ? ` · ${n.description}` : ''}
                  </p>
                </div>
                <Money
                  value={n.outstanding}
                  tone={n.direction === 'RECEIVABLE' ? 'receivable' : 'payable'}
                  className="text-sm font-bold"
                />
              </Dropdown.Item>
            ))}
          </div>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const { resolved, toggle } = useTheme()
  const nav = useNavigate()
  if (!user) return null
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button className="hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block cursor-pointer" aria-label="Account menu">
          <Avatar name={user.full_name} size={36} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={8} className={menuContent}>
          <div className="px-3 py-2.5 bg-card/40 rounded-t-lg">
            <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Dropdown.Separator className="my-1 h-px bg-border" />
          <Dropdown.Item className={menuItem} onSelect={() => nav('/settings')}>
            <SettingsIcon className="h-4 w-4" /> Settings
          </Dropdown.Item>
          <Dropdown.Item className={menuItem} onSelect={toggle}>
            <ThemeToggleIcon resolved={resolved} className="h-4 w-4" />
            {resolved === 'dark' ? 'Light theme' : 'Dark theme'}
          </Dropdown.Item>
          <Dropdown.Separator className="my-1 h-px bg-border" />
          <Dropdown.Item className={cn(menuItem, 'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger')} onSelect={() => void logout()}>
            <LogOut className="h-4 w-4" /> Log out
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

/* ───────── Mobile ───────── */
function BottomNav({ onMore }: { onMore: () => void }) {
  const a = useActions()
  const item = (to: string, label: string, Icon: LucideIcon, end?: boolean) => (
    <NavLink to={to} end={end} className={({ isActive }) => cn(
      'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
      isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground',
    )}>
      {({ isActive }) => (<><Icon className={cn('h-5 w-5', isActive && 'text-primary')} aria-hidden />{label}</>)}
    </NavLink>
  )
  return (
    <nav aria-label="Primary" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-sidebar/90 backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] lg:hidden">
      <div className="mx-auto flex max-w-md items-end px-1">
        {item('/', 'Home', LayoutDashboard, true)}
        {item('/people', 'People', Users)}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => a.repay()}
            aria-label="Record repayment"
            className="-mt-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#0284C7] text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] ring-4 ring-background cursor-pointer active:scale-95 hover:scale-105 transition-all duration-200 animate-pulse-glow">
            <HandCoins className="h-6 w-6" />
          </button>
        </div>
        {item('/transactions', 'History', ReceiptText)}
        <button
          onClick={onMore}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <Menu className="h-5 w-5" aria-hidden />More
        </button>
      </div>
    </nav>
  )
}

function MoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, logout } = useAuth()
  const { resolved, toggle } = useTheme()
  const a = useActions()
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Menu" description={user?.email}>
      <div className="space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => onOpenChange(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-colors',
              isActive ? 'bg-sidebar-active text-foreground font-semibold' : 'text-muted-foreground hover:bg-card-elevated hover:text-foreground',
            )}>
            <Icon className="h-5 w-5 text-primary" aria-hidden /> {label}
          </NavLink>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Button variant="secondary" onClick={() => { onOpenChange(false); a.newLoan('LENT') }}>
          <ArrowUpRight className="h-4 w-4 text-warning" /> Give
        </Button>
        <Button variant="secondary" onClick={() => { onOpenChange(false); a.newLoan('BORROWED') }}>
          <ArrowDownLeft className="h-4 w-4 text-success" /> Receive
        </Button>
      </div>
      <div className="mt-4 flex gap-2.5 border-t border-border pt-4">
        <Button
          variant="secondary"
          className="flex-1 cursor-pointer active:scale-95 transition-transform"
          onClick={toggle}
          aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
        >
          <ThemeToggleIcon resolved={resolved} className="h-4 w-4" />
          <span>{resolved === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </Button>
        <Button variant="danger-ghost" className="flex-1 cursor-pointer active:scale-95 transition-transform" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </div>
    </Dialog>
  )
}
