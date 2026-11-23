import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '@/services/api'

/** Puts server validation messages on their fields; anything else becomes a toast. */
export function handleSubmitError<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fieldMap: Record<string, Path<T>> = {}) {
  if (err instanceof ApiError) {
    let placed = false
    for (const [field, message] of Object.entries(err.fieldErrors)) {
      const name = (fieldMap[field] ?? field) as Path<T>
      setError(name, { type: 'server', message })
      placed = true
    }
    if (!placed || err.status !== 422) toast.error(err.message)
    return
  }
  toast.error('Something went wrong. Please try again.')
}
