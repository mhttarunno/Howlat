import { z } from 'zod'

/** Money typed by the user: up to 12 whole digits and at most 2 decimals. Kept as a string end to end. */
export const moneyString = z
  .string()
  .trim()
  .min(1, 'Enter an amount')
  .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Use digits with up to 2 decimals (e.g. 5000 or 5000.50)')
  .refine((v) => toCents(v) > 0, 'Amount must be greater than zero')

/** "1234.5" -> 123450. String parsing only (UX hints; the backend remains the authority). */
export function toCents(v: string): number {
  const [w, f = ''] = v.trim().split('.')
  return Number(w || '0') * 100 + Number((f + '00').slice(0, 2))
}

const optionalText = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`).optional().or(z.literal(''))
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')

export const personSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: optionalText(32),
  email: z.string().trim().max(320).email('Enter a valid email').optional().or(z.literal('')),
  address: optionalText(300),
  notes: optionalText(2000),
})
export type PersonForm = z.infer<typeof personSchema>

export const loanSchema = z
  .object({
    person_id: z.string().min(1, 'Choose a person'),
    amount: moneyString,
    transaction_date: isoDate,
    expected_date: z.string().optional().or(z.literal('')),
    description: optionalText(500),
    notes: optionalText(5000),
  })
  .refine((d) => !d.expected_date || d.expected_date >= d.transaction_date, {
    path: ['expected_date'],
    message: 'Expected date cannot be before the transaction date',
  })
export type LoanForm = z.infer<typeof loanSchema>

export const repaymentSchema = z.object({
  transaction_id: z.string().min(1, 'Choose a transaction'),
  amount: moneyString,
  repayment_date: isoDate,
  payment_method: optionalText(40),
  description: optionalText(500),
  notes: optionalText(5000),
})
export type RepaymentForm = z.infer<typeof repaymentSchema>

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
export const registerSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter your name').max(120),
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(128),
})
export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z.string().min(8, 'At least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })

/** Empty strings become undefined/null so the API stores NULL. */
export const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined)
