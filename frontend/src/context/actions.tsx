import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { PersonDialog } from '@/components/forms/PersonDialog'
import { LoanDialog } from '@/components/forms/LoanDialog'
import { RepaymentDialog } from '@/components/forms/RepaymentDialog'
import type { LoanType, Person, Transaction } from '@/types'

/** App-wide "quick action" dialogs, openable from the top bar, dashboard, profile and tables. */
interface Actions {
  addPerson: () => void
  editPerson: (p: Person) => void
  newLoan: (type: LoanType, personId?: string) => void
  editLoan: (t: Transaction) => void
  /** Record a repayment. Pass a loan id to pre-select it; omit to choose from open loans. */
  repay: (opts?: { transactionId?: string; personId?: string; direction?: LoanType }) => void
}

const Ctx = createContext<Actions | null>(null)

type State =
  | { kind: 'person'; person?: Person }
  | { kind: 'loan'; type: LoanType; personId?: string; edit?: Transaction }
  | { kind: 'repay'; transactionId?: string; personId?: string; direction?: LoanType }
  | null

export function ActionsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(null)
  const close = useCallback(() => setS(null), [])

  const value = useMemo<Actions>(() => ({
    addPerson: () => setS({ kind: 'person' }),
    editPerson: (person) => setS({ kind: 'person', person }),
    newLoan: (type, personId) => setS({ kind: 'loan', type, personId }),
    editLoan: (edit) => setS({ kind: 'loan', type: edit.transaction_type, edit }),
    repay: (o) => setS({ kind: 'repay', ...o }),
  }), [])

  return (
    <Ctx.Provider value={value}>
      {children}
      {s?.kind === 'person' && <PersonDialog person={s.person} onClose={close} />}
      {s?.kind === 'loan' && <LoanDialog type={s.type} personId={s.personId} edit={s.edit} onClose={close} />}
      {s?.kind === 'repay' && <RepaymentDialog transactionId={s.transactionId} personId={s.personId} direction={s.direction} onClose={close} />}
    </Ctx.Provider>
  )
}

export function useActions() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useActions must be used inside ActionsProvider')
  return c
}
