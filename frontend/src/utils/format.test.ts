import { describe, expect, it } from 'vitest'
import { compactMoney, formatDate, formatMoney, groupLakh, initials, isPositiveMoney, isZeroMoney } from './format'
import { moneyString, toCents } from './validation'

describe('Bangladeshi number formatting', () => {
  it.each([
    ['1000', '৳1,000'], ['10000', '৳10,000'], ['100000', '৳1,00,000'], ['1000000', '৳10,00,000'],
    ['12345678', '৳1,23,45,678'], ['999', '৳999'], ['0', '৳0'],
  ])('%s -> %s', (raw, want) => expect(formatMoney(raw)).toBe(want))

  it('hides .00 but keeps real decimals', () => {
    expect(formatMoney('5000.00')).toBe('৳5,000')
    expect(formatMoney('5000.50')).toBe('৳5,000.50')
    expect(formatMoney('5000', 'BDT', { alwaysDecimals: true })).toBe('৳5,000.00')
  })
  it('handles signs without float math', () => {
    expect(formatMoney('-2000.00')).toBe('-৳2,000')
    expect(formatMoney('800.00', 'BDT', { sign: true })).toBe('+৳800')
    expect(formatMoney('0.00', 'BDT', { sign: true })).toBe('৳0')
    expect(formatMoney('-0.00')).toBe('৳0')
  })
  it('is exact for values that break floats', () => {
    expect(formatMoney('999999999999.99')).toBe('৳9,99,99,99,99,999.99')
    expect(formatMoney('0.30')).toBe('৳0.30')
  })
  it('uses western grouping for other currencies', () => {
    expect(formatMoney('1234567', 'USD')).toBe('$1,234,567')
    expect(formatMoney('1234567', 'EUR')).toBe('€1,234,567')
  })
  it('tolerates empty input', () => expect(formatMoney('')).toBe('৳0'))
  it('groupLakh', () => expect(groupLakh('1234567')).toBe('12,34,567'))
  it('compact axis labels', () => {
    expect(compactMoney(1500)).toBe('1.5k')
    expect(compactMoney(150000)).toBe('1.5L')
    expect(compactMoney(20000000)).toBe('2Cr')
    expect(compactMoney(1500000, 'USD')).toBe('1.5M')
  })
  it('zero/positive helpers', () => {
    expect(isZeroMoney('0.00')).toBe(true)
    expect(isZeroMoney('-0.00')).toBe(true)
    expect(isZeroMoney('0.01')).toBe(false)
    expect(isPositiveMoney('5.00')).toBe(true)
    expect(isPositiveMoney('-5.00')).toBe(false)
  })
})

describe('misc formatting', () => {
  it('dates', () => {
    expect(formatDate('2026-11-22')).toBe('22 Nov 2026')
    expect(formatDate(null)).toBe('—')
  })
  it('initials', () => {
    expect(initials('Tanvir Ahmed')).toBe('TA')
    expect(initials('rahim')).toBe('R')
    expect(initials('')).toBe('?')
  })
})

describe('amount validation', () => {
  const ok = (v: string) => moneyString.safeParse(v).success
  it('accepts valid amounts', () => ['1', '5000', '5000.5', '5000.50', '0.01', '999999999999.99'].forEach((v) => expect(ok(v)).toBe(true)))
  it('rejects zero, negatives, junk and excess precision', () =>
    ['', '0', '0.00', '-5', 'abc', '1.234', '1e5', '1,000', ' ', '.5', '1000000000000'].forEach((v) => expect(ok(v), v).toBe(false)))
  it('toCents is exact', () => {
    expect(toCents('0.30')).toBe(30)
    expect(toCents('1234.5')).toBe(123450)
    expect(toCents('0.1') + toCents('0.2')).toBe(toCents('0.3'))
  })
})
