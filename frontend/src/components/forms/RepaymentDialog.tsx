import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Money } from '@/components/shared'
import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui/primitives'
import { newIdempotencyKey } from '@/services/api'
import { useEntries, useLedgerMutations } from '@/services/queries'
import { formatDate, todayISO } from '@/utils/format'
import { clean, repaymentSchema, toCents, type RepaymentForm } from '@/utils/validation'
import type { LoanType } from '@/types'
import { handleSubmitError } from './helpers'

const METHODS = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank transfer', 'Cheque', 'Other']

export function RepaymentDialog({ transactionId, personId, direction, onClose }: {
  transactionId?: string; personId?: string; direction?: LoanType; onClose: () => void
}) {
  const { createRepayment } = useLedgerMutations()
  const key = useRef(newIdempotencyKey())

  const open = useEntries({
    open: true, type: direction ? [direction] : ['LENT', 'BORROWED'], person_id: personId, sort: 'person', order: 'asc', page_size: 100,
  })
  const loans = useMemo(() => open.data?.items ?? [], [open.data])

  const { register, handleSubmit, setError, watch, setValue, formState: { errors, isSubmitting } } = useForm<RepaymentForm>({
    resolver: zodResolver(repaymentSchema),
    defaultValues: { transaction_id: transactionId ?? '', amount: '', repayment_date: todayISO(), payment_method: '', description: '', notes: '' },
  })

  const selectedId = watch('transaction_id')
  const amount = watch('amount')
  const loan = loans.find((l) => l.transaction_id === selectedId)
  const exceeds = !!loan && /^\d+(\.\d{1,2})?$/.test(amount ?? '') && toCents(amount) > toCents(loan.outstanding)

  const onSubmit = handleSubmit(async (v) => {
    if (loan && toCents(v.amount) > toCents(loan.outstanding)) {
      setError('amount', { type: 'validate', message: 'This is more than the remaining balance' })
      return
    }
    if (loan && v.repayment_date < loan.entry_date) {
      setError('repayment_date', { type: 'validate', message: 'Cannot be before the transaction date' })
      return
    }
    try {
      const r = await createRepayment.mutateAsync({
        key: key.current,
        body: {
          transaction_id: v.transaction_id, person_id: loan?.person_id, amount: v.amount.trim(), repayment_date: v.repayment_date,
          payment_method: clean(v.payment_method), description: clean(v.description), notes: clean(v.notes),
        },
      })
      toast.success(r.transaction_status === 'FULLY_PAID' ? `Fully paid — ${r.person_name} is settled on this transaction` : 'Repayment recorded')
      onClose()
    } catch (e) {
      handleSubmitError(e, setError)
    }
  })

  const label = (l: (typeof loans)[number]) =>
    `${l.person_name} · ${l.entry_type === 'LENT' ? 'they owe you' : 'you owe them'} · ${l.description || formatDate(l.entry_date)}`

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Record repayment"
      description="Repayments are stored separately; the original transaction amount is never altered.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Which transaction?" required htmlFor="r-txn" error={errors.transaction_id?.message}>
          <Select id="r-txn" aria-invalid={!!errors.transaction_id} {...register('transaction_id')}>
            <option value="">{open.isLoading ? 'Loading…' : loans.length ? 'Select an open transaction' : 'No open transactions'}</option>
            {loans.map((l) => <option key={l.transaction_id} value={l.transaction_id}>{label(l)}</option>)}
          </Select>
          {open.isError && <p className="text-xs text-danger font-medium">Could not load open transactions.</p>}
          {!open.isLoading && !open.isError && loans.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Nothing is outstanding right now, so there is nothing to repay.</p>
          )}
        </Field>

        {loan && (
          <div className="rounded-xl border border-border/80 bg-card-elevated p-3.5 text-[13px] shadow-sm">
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Original amount</span><Money value={loan.loan_amount} /></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Already repaid</span><Money value={loan.paid_total} /></div>
            <div className="mt-1.5 flex justify-between border-t border-border/60 pt-1.5 font-bold">
              <span className="text-foreground">Remaining</span>
              <Money value={loan.outstanding} tone={loan.entry_type === 'LENT' ? 'receivable' : 'payable'} />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={loan?.entry_type === 'BORROWED' ? 'Amount you return' : 'Amount received'} required htmlFor="r-amount"
            error={errors.amount?.message ?? (exceeds ? 'This is more than the remaining balance' : undefined)}>
            <Input id="r-amount" inputMode="decimal" placeholder="0.00" autoComplete="off" aria-invalid={!!errors.amount || exceeds} {...register('amount')} />
            {loan && (
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline cursor-pointer transition-colors"
                onClick={() => setValue('amount', loan.outstanding, { shouldValidate: true })}>
                Pay the full remaining balance
              </button>
            )}
          </Field>
          <Field label="Repayment date" required htmlFor="r-date" error={errors.repayment_date?.message}>
            <Input id="r-date" type="date" min={loan?.entry_date} aria-invalid={!!errors.repayment_date} {...register('repayment_date')} />
          </Field>
        </div>
        <Field label="Payment method (optional)" htmlFor="r-method" error={errors.payment_method?.message}>
          <Input id="r-method" list="pay-methods" autoComplete="off" placeholder="e.g. bKash, Bank transfer, Cash" {...register('payment_method')} />
          <datalist id="pay-methods">{METHODS.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Description" htmlFor="r-desc" error={errors.description?.message}>
          <Input id="r-desc" placeholder="e.g. November installment" autoComplete="off" {...register('description')} />
        </Field>
        <Field label="Notes" htmlFor="r-notes" error={errors.notes?.message}>
          <Textarea id="r-notes" placeholder="Optional private notes…" {...register('notes')} />
        </Field>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={exceeds}>Record repayment</Button>
        </div>
      </form>
    </Dialog>
  )
}
