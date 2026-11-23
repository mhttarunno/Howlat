import { format, parseISO } from 'date-fns'
import type { EntryType, Status } from '@/types'

const SYMBOLS: Record<string, string> = { BDT: '৳', USD: '$', EUR: '€', GBP: '£', INR: '₹' }

/** Groups the integer part Bangladeshi/Indian style: 1234567 -> 12,34,567. Works on strings, no float math. */
export function groupLakh(whole: string): string {
  if (whole.length <= 3) return whole
  let head = whole.slice(0, -3)
  const tail = whole.slice(-3)
  const parts: string[] = []
  while (head.length > 2) {
    parts.unshift(head.slice(-2))
    head = head.slice(0, -2)
  }
  if (head) parts.unshift(head)
  return `${parts.join(',')},${tail}`
}

function groupWestern(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Formats a decimal string from the API for display. Pure string manipulation (no Number()),
 * so there is no rounding or precision loss. Decimals are hidden when they are .00.
 */
export function formatMoney(value: string | null | undefined, currency = 'BDT', opts: { sign?: boolean; alwaysDecimals?: boolean } = {}): string {
  if (value == null || value === '') return `${SYMBOLS[currency] ?? ''}0`
  const neg = value.startsWith('-')
  const [wholeRaw, fracRaw = ''] = value.replace('-', '').split('.')
  const whole = currency === 'BDT' || currency === 'INR' ? groupLakh(wholeRaw) : groupWestern(wholeRaw)
  const frac = fracRaw.padEnd(2, '0').slice(0, 2)
  const showFrac = opts.alwaysDecimals || frac !== '00'
  const isZero = /^0*$/.test(wholeRaw) && /^0*$/.test(frac)
  const sign = neg && !isZero ? '-' : opts.sign && !isZero ? '+' : ''
  return `${sign}${SYMBOLS[currency] ?? currency + ' '}${whole}${showFrac ? '.' + frac : ''}`
}

/** Compact for chart axes: 1,50,000 -> 1.5L, 2,00,00,000 -> 2Cr (BDT) */
export function compactMoney(n: number, currency = 'BDT'): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (currency === 'BDT' || currency === 'INR') {
    if (abs >= 1e7) return `${sign}${+(abs / 1e7).toFixed(1)}Cr`
    if (abs >= 1e5) return `${sign}${+(abs / 1e5).toFixed(1)}L`
    if (abs >= 1e3) return `${sign}${+(abs / 1e3).toFixed(1)}k`
    return `${sign}${abs}`
  }
  if (abs >= 1e6) return `${sign}${+(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${sign}${+(abs / 1e3).toFixed(1)}k`
  return `${sign}${abs}`
}

/** Chart-only conversion (display geometry, never used to compute a balance). */
export const chartNum = (m: string) => Number(m)

export function isZeroMoney(v: string) {
  return /^-?0*(\.0*)?$/.test(v)
}
export function isPositiveMoney(v: string) {
  return !v.startsWith('-') && !isZeroMoney(v)
}

export function formatDate(d: string | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!d) return '—'
  try {
    return format(parseISO(d), pattern)
  } catch {
    return d
  }
}

export function formatMonth(key: string, pattern = 'MMM yy'): string {
  try {
    return format(parseISO(`${key}-01`), pattern)
  } catch {
    return key
  }
}

/** Local calendar date as YYYY-MM-DD (the user's own timezone, not UTC). */
export function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const ENTRY_LABEL: Record<EntryType, string> = {
  LENT: 'Money Lent',
  BORROWED: 'Money Borrowed',
  REPAYMENT_RECEIVED: 'Repayment Received',
  REPAYMENT_RETURNED: 'Repayment Returned',
}
export const STATUS_LABEL: Record<Status, string> = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  FULLY_PAID: 'Fully Paid',
}

/** true for the "owed TO me" side (green): a loan I made, or a repayment I received */
export const isReceivableSide = (t: EntryType) => t === 'LENT' || t === 'REPAYMENT_RECEIVED'

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?'
}
