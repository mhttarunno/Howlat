import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui/primitives'
import { Money } from '@/components/shared'
import { newIdempotencyKey } from '@/services/api'
import { useLedgerMutations, usePeople } from '@/services/queries'
import { clean, loanSchema, type LoanForm } from '@/utils/validation'
import { todayISO } from '@/utils/format'
import type { LoanType, Transaction } from '@/types'
import { PersonDialog } from './PersonDialog'
import { handleSubmitError } from './helpers'

const COPY: Record<LoanType, { title: string; person: string; date: string; expected: string; cta: string }> = {
  LENT: { title: 'Give money', person: 'Who are you lending to?', date: 'Date given', expected: 'Expected repayment date', cta: 'Record loan' },
  BORROWED: { title: 'Receive money', person: 'Who is lending to you?', date: 'Date received', expected: 'Expected return date', cta: 'Record borrowing' },
}

export function LoanDialog({ type, personId, edit, onClose }: { type: LoanType; personId?: string; edit?: Transaction; onClose: () => void }) {
  const copy = COPY[type]
  const { createLoan, updateLoan } = useLedgerMutations()
  const people = usePeople({ status: 'active', page_size: 100, sort: 'name' })
  const [addingPerson, setAddingPerson] = useState(false)
  const key = useRef(newIdempotencyKey())

  const { register, handleSubmit, setError, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoanForm>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      person_id: edit?.person_id ?? personId ?? '',
      amount: edit?.amount ?? '',
      transaction_date: edit?.transaction_date ?? todayISO(),
      expected_date: edit?.expected_date ?? '',
      description: edit?.description ?? '',
      notes: edit?.notes ?? '',
    },
  })

  const options = useMemo(() => {
    const list = people.data?.items ?? []
    if (edit && !list.some((p) => p.id === edit.person_id)) return [{ id: edit.person_id, name: edit.person_name }, ...list]
    return list
  }, [people.data, edit])

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (edit) {
        await updateLoan.mutateAsync({
          id: edit.id, person_id: v.person_id, amount: v.amount.trim(), transaction_date: v.transaction_date,
          expected_date: v.expected_date || null, description: clean(v.description) ?? null, notes: clean(v.notes) ?? null,
        })
        toast.success('Transaction updated')
      } else {
        await createLoan.mutateAsync({
          key: key.current,
          body: {
            person_id: v.person_id, transaction_type: type, amount: v.amount.trim(), transaction_date: v.transaction_date,
            expected_date: v.expected_date || null, description: clean(v.description), notes: clean(v.notes),
          },
        })
        toast.success(type === 'LENT' ? 'Loan recorded' : 'Borrowing recorded')
      }
      onClose()
    } catch (e) {
      handleSubmitError(e, setError)
    }
  })

  if (addingPerson) {
    return <PersonDialog onClose={() => setAddingPerson(false)} onCreated={(p) => { setValue('person_id', p.id, { shouldValidate: true }); setAddingPerson(false) }} />
  }

  const paid = edit?.paid_total
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={edit ? `Edit ${type === 'LENT' ? 'loan' : 'borrowing'}` : copy.title}
      description={edit ? `Reference #${edit.ref}. Repayments are preserved in the ledger.` : undefined}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={copy.person} required htmlFor="l-person" error={errors.person_id?.message}>
          <div className="flex gap-2">
            <Select id="l-person" aria-invalid={!!errors.person_id} {...register('person_id')}>
              <option value="">{people.isLoading ? 'Loading…' : 'Select a person'}</option>
              {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => setAddingPerson(true)} className="shrink-0 font-medium">New person</Button>
          </div>
          {people.isError && <p className="text-xs text-danger font-medium">Could not load people. Close and try again.</p>}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" required htmlFor="l-amount" error={errors.amount?.message}>
            <Input id="l-amount" inputMode="decimal" placeholder="0.00" autoComplete="off" aria-invalid={!!errors.amount} {...register('amount')} />
            {paid && paid !== '0.00' && <p className="text-xs text-muted-foreground mt-1">Already repaid <Money value={paid} />. The amount cannot go below this.</p>}
          </Field>
          <Field label={copy.date} required htmlFor="l-date" error={errors.transaction_date?.message}>
            <Input id="l-date" type="date" max={watch('expected_date') || undefined} aria-invalid={!!errors.transaction_date} {...register('transaction_date')} />
          </Field>
        </div>
        <Field label={`${copy.expected} (optional)`} htmlFor="l-exp" error={errors.expected_date?.message} hint="Used for upcoming and overdue reminders in the ledger.">
          <Input id="l-exp" type="date" min={watch('transaction_date') || undefined} aria-invalid={!!errors.expected_date} {...register('expected_date')} />
        </Field>
        <Field label="Description" htmlFor="l-desc" error={errors.description?.message}>
          <Input id="l-desc" placeholder="e.g. Project financing or rent advance" autoComplete="off" {...register('description')} />
        </Field>
        <Field label="Notes" htmlFor="l-notes" error={errors.notes?.message}>
          <Textarea id="l-notes" placeholder="Optional private notes…" {...register('notes')} />
        </Field>
        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-3.5">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{edit ? 'Save changes' : copy.cta}</Button>
        </div>
      </form>
    </Dialog>
  )
}
