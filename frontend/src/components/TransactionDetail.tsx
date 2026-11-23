import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, HandCoins, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { handleSubmitError } from '@/components/forms/helpers'
import { useActions } from '@/context/actions'
import { useLedgerMutations, useTransaction } from '@/services/queries'
import { ApiError } from '@/services/api'
import { formatDate, isReceivableSide } from '@/utils/format'
import { clean, moneyString, toCents } from '@/utils/validation'
import type { RepaymentBrief, Transaction } from '@/types'
import { EntryTypeBadge } from './EntryList'
import { ErrorState, Money, StatusBadge } from './shared'
import { Badge, Button, ConfirmDialog, Dialog, Field, Input, Skeleton } from './ui/primitives'

const editSchema = z.object({
  amount: moneyString,
  repayment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  payment_method: z.string().trim().max(40).optional().or(z.literal('')),
  description: z.string().trim().max(500).optional().or(z.literal('')),
})
type EditForm = z.infer<typeof editSchema>

function RepaymentEditDialog({ txn, rep, onClose }: { txn: Transaction; rep: RepaymentBrief; onClose: () => void }) {
  const { updateRepayment } = useLedgerMutations()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { amount: rep.amount, repayment_date: rep.repayment_date, payment_method: rep.payment_method ?? '', description: rep.description ?? '' },
  })
  const maxCents = toCents(txn.outstanding) + toCents(rep.amount)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Edit repayment" description="Changes are immutably recorded in the audit trail.">
      <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
        if (toCents(v.amount) > maxCents) { setError('amount', { message: 'This would exceed the transaction amount' }); return }
        try {
          await updateRepayment.mutateAsync({ id: rep.id, amount: v.amount.trim(), repayment_date: v.repayment_date, payment_method: clean(v.payment_method) ?? null, description: clean(v.description) ?? null })
          toast.success('Repayment updated')
          onClose()
        } catch (e) { handleSubmitError(e, setError) }
      })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" required htmlFor="e-amount" error={errors.amount?.message}><Input id="e-amount" inputMode="decimal" aria-invalid={!!errors.amount} {...register('amount')} /></Field>
          <Field label="Date" required htmlFor="e-date" error={errors.repayment_date?.message}><Input id="e-date" type="date" min={txn.transaction_date} {...register('repayment_date')} /></Field>
        </div>
        <Field label="Payment method" htmlFor="e-method"><Input id="e-method" {...register('payment_method')} /></Field>
        <Field label="Description" htmlFor="e-desc"><Input id="e-desc" {...register('description')} /></Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Save changes</Button>
        </div>
      </form>
    </Dialog>
  )
}

export function TransactionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useTransaction(id)
  const a = useActions()
  const { deleteLoan, deleteRepayment } = useLedgerMutations()
  const [editRep, setEditRep] = useState<RepaymentBrief | null>(null)
  const [delRep, setDelRep] = useState<RepaymentBrief | null>(null)
  const [delLoan, setDelLoan] = useState(false)
  const t = q.data
  const recv = t?.transaction_type === 'LENT'
  const fullyPaid = t?.status === 'FULLY_PAID'

  const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Something went wrong')

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()} wide title={t ? (recv ? 'Money lent' : 'Money borrowed') : 'Transaction'} description={t ? `Reference #${t.ref}` : undefined}>
        {q.isLoading && <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-32" /></div>}
        {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} compact />}
        {t && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <EntryTypeBadge type={t.transaction_type} />
              <StatusBadge status={t.status} />
              {t.is_overdue && <Badge tone="danger"><Clock className="h-3 w-3" /> Overdue</Badge>}
              <Link to={`/people/${t.person_id}`} onClick={onClose} className="ml-auto text-sm font-semibold text-primary hover:underline">
                {t.person_name}
              </Link>
            </div>

            <div className="hover-shimmer-sweep interactive-card grid grid-cols-3 gap-2.5 rounded-xl border border-border/80 bg-card-elevated p-3.5 text-center shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Original</p>
                <p className="mt-1 font-bold text-foreground tabular text-base sm:text-lg"><Money value={t.amount} /></p>
              </div>
              <div className="border-x border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repaid</p>
                <p className="mt-1 font-bold text-foreground tabular text-base sm:text-lg"><Money value={t.paid_total} /></p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outstanding</p>
                <p className="mt-1 font-bold tabular text-base sm:text-lg"><Money value={t.outstanding} tone={isReceivableSide(t.transaction_type) ? 'receivable' : 'payable'} /></p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm bg-card/60 p-4 rounded-xl border border-border/60">
              <div><dt className="text-xs text-muted-foreground">{recv ? 'Date given' : 'Date received'}</dt><dd className="font-medium text-foreground mt-0.5">{formatDate(t.transaction_date)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Expected {recv ? 'repayment' : 'return'}</dt><dd className="font-medium text-foreground mt-0.5">{formatDate(t.expected_date)}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Description</dt><dd className="font-medium text-foreground mt-0.5">{t.description || '—'}</dd></div>
              {t.notes && <div className="col-span-2"><dt className="text-xs text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap font-medium text-foreground mt-0.5">{t.notes}</dd></div>}
            </dl>

            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Repayment history ({t.repayments.length})</h4>
                {!fullyPaid && (
                  <Button size="sm" variant="secondary" onClick={() => { onClose(); a.repay({ transactionId: t.id, personId: t.person_id, direction: t.transaction_type }) }}>
                    <HandCoins className="h-3.5 w-3.5 text-primary" /> Record repayment
                  </Button>
                )}
              </div>
              {t.repayments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">No repayments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card/40">
                  {t.repayments.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-3.5 py-3 hover:bg-card-elevated/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold"><Money value={r.amount} tone={recv ? 'receivable' : 'payable'} /></p>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">{formatDate(r.repayment_date)}{r.payment_method ? ` · ${r.payment_method}` : ''}{r.description ? ` · ${r.description}` : ''}</p>
                      </div>
                      <Button variant="ghost" size="icon" aria-label="Edit repayment" onClick={() => setEditRep(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="danger-ghost" size="icon" aria-label="Delete repayment" onClick={() => setDelRep(r)}><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-col-reverse gap-2 border-t border-border/80 pt-4 sm:flex-row sm:justify-between">
              <Button variant="danger-ghost" onClick={() => setDelLoan(true)}><Trash2 className="h-4 w-4" /> Delete transaction</Button>
              <Button variant="secondary" onClick={() => { onClose(); a.editLoan(t) }}><Pencil className="h-4 w-4" /> Edit transaction</Button>
            </div>
          </div>
        )}
      </Dialog>

      {t && editRep && <RepaymentEditDialog txn={t} rep={editRep} onClose={() => setEditRep(null)} />}

      <ConfirmDialog open={!!delRep} onOpenChange={(o) => !o && setDelRep(null)} title="Delete this repayment?" confirmLabel="Delete repayment" loading={deleteRepayment.isPending}
        description={<>The outstanding balance will go back up{delRep && <> by <b><Money value={delRep.amount} /></b></>}. A permanent record of the deletion is kept in the audit trail.</>}
        onConfirm={() => delRep && deleteRepayment.mutate(delRep.id, { onSuccess: () => { toast.success('Repayment deleted'); setDelRep(null) }, onError: fail })} />

      <ConfirmDialog open={delLoan} onOpenChange={setDelLoan} title="Delete this transaction?" confirmLabel="Delete transaction" loading={deleteLoan.isPending}
        description={<>This removes the transaction{t && t.repayments.length > 0 ? <> and its <b>{t.repayments.length}</b> repayment{t.repayments.length === 1 ? '' : 's'}</> : ''} from your balances and reports. A full snapshot is kept in the audit trail.</>}
        onConfirm={() => deleteLoan.mutate(id, { onSuccess: () => { toast.success('Transaction deleted'); setDelLoan(false); onClose() }, onError: fail })} />
    </>
  )
}
