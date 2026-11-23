import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/context/auth'
import { chartNum, compactMoney, formatMoney, formatMonth } from '@/utils/format'
import type { MonthFlow } from '@/types'

const C = {
  receivable: 'var(--success)',
  payable: 'var(--warning)',
  borrowed: 'var(--accent-secondary)',
  accent: 'var(--primary)',
  info: 'var(--info)',
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)',
}

interface Row { label: string; month: string; lent: number; borrowed: number; received: number; returned: number; activity: number; raw: MonthFlow }
const toRows = (months: MonthFlow[], pattern = 'MMM'): Row[] =>
  months.map((m) => ({
    label: formatMonth(m.month, pattern), month: m.month, raw: m,
    lent: chartNum(m.lent), borrowed: chartNum(m.borrowed), received: chartNum(m.received), returned: chartNum(m.returned),
    activity: m.loan_count + m.repayment_count,
  }))

type TipPayload = { name?: string; dataKey?: string; color?: string; payload: Row }
function Tip({ active, payload, label, kind }: { active?: boolean; payload?: TipPayload[]; label?: string; kind: 'flow' | 'repay' | 'activity' }) {
  const { user } = useAuth()
  if (!active || !payload?.length) return null
  const raw = payload[0]!.payload.raw
  const cur = user?.currency ?? 'BDT'
  const lines =
    kind === 'flow' ? [['Lent', raw.lent, C.payable], ['Borrowed', raw.borrowed, C.borrowed]]
    : kind === 'repay' ? [['Received back', raw.received, C.receivable], ['Returned', raw.returned, C.payable]]
    : []
  return (
    <div className="rounded-xl border border-border bg-card-elevated/95 px-3.5 py-2.5 text-xs text-foreground shadow-pop backdrop-blur-md animate-fade-in">
      <p className="mb-1.5 font-semibold text-foreground tracking-tight">{label}</p>
      {kind === 'activity' ? (
        <div className="space-y-1 text-muted-foreground">
          <p><span className="font-medium text-foreground">{raw.loan_count}</span> new {raw.loan_count === 1 ? 'loan' : 'loans'}</p>
          <p><span className="font-medium text-foreground">{raw.repayment_count}</span> {raw.repayment_count === 1 ? 'repayment' : 'repayments'}</p>
        </div>
      ) : lines.map(([name, v, color]) => (
        <p key={name as string} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shadow-sm" style={{ background: color as string }} />
          <span className="text-muted-foreground">{name as string}</span>
          <span className="ml-auto pl-4 font-semibold tabular text-foreground">{formatMoney(v as string, cur)}</span>
        </p>
      ))}
    </div>
  )
}

const axisProps = { tick: { fill: C.axis, fontSize: 11, fontWeight: 500 }, tickLine: false, axisLine: false } as const

function useCompact() {
  const { user } = useAuth()
  const cur = user?.currency ?? 'BDT'
  return (v: number) => compactMoney(v, cur)
}

export function FlowChart({ months, pattern }: { months: MonthFlow[]; pattern?: string }) {
  const compact = useCompact()
  const data = toRows(months, pattern)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} tickFormatter={compact} width={48} />
        <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 4 }} content={<Tip kind="flow" />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#94A3B8' }} />
        <Bar dataKey="lent" name="Lent" fill={C.payable} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="borrowed" name="Borrowed" fill={C.borrowed} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RepaymentChart({ months, pattern }: { months: MonthFlow[]; pattern?: string }) {
  const compact = useCompact()
  const data = toRows(months, pattern)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.receivable} stopOpacity={0.3} />
            <stop offset="100%" stopColor={C.receivable} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gRet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.payable} stopOpacity={0.25} />
            <stop offset="100%" stopColor={C.payable} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} tickFormatter={compact} width={48} />
        <Tooltip content={<Tip kind="repay" />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#94A3B8' }} />
        <Area type="monotone" dataKey="received" name="Received back" stroke={C.receivable} strokeWidth={2.5} fill="url(#gRec)" />
        <Area type="monotone" dataKey="returned" name="Returned by me" stroke={C.payable} strokeWidth={2.5} fill="url(#gRet)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ActivityChart({ months, pattern }: { months: MonthFlow[]; pattern?: string }) {
  const data = toRows(months, pattern)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} allowDecimals={false} width={40} />
        <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 4 }} content={<Tip kind="activity" />} />
        <Bar dataKey="activity" name="Entries" fill={C.accent} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BreakdownChart({ receivable, payable }: { receivable: string; payable: string }) {
  const { user } = useAuth()
  const cur = user?.currency ?? 'BDT'
  const data = [
    { name: 'Owed to you', value: chartNum(receivable), raw: receivable, color: C.receivable },
    { name: 'You owe', value: chartNum(payable), raw: payable, color: C.payable },
  ].filter((d) => d.value > 0)

  if (data.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">Nothing outstanding. You're all settled.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="84%" paddingAngle={data.length > 1 ? 4 : 0} stroke="none">
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip
          formatter={(_v, _n, item) => formatMoney((item.payload as { raw: string }).raw, cur)}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--card-elevated)',
            color: 'var(--foreground)',
            fontSize: 12,
            boxShadow: 'var(--shadow-pop)',
          }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#94A3B8' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
