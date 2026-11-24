import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button, Dialog, Field, Input, Textarea } from '@/components/ui/primitives'
import { usePersonMutations } from '@/services/queries'
import { clean, personSchema, type PersonForm } from '@/utils/validation'
import type { Person } from '@/types'
import { handleSubmitError } from './helpers'

export function PersonDialog({ person, onClose, onCreated }: { person?: Person; onClose: () => void; onCreated?: (p: Person) => void }) {
  const { create, update } = usePersonMutations()
  const editing = !!person
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<PersonForm>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: person?.name ?? '', phone: person?.phone ?? '', email: person?.email ?? '',
      address: person?.address ?? '', notes: person?.notes ?? '',
    },
  })

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (editing) {
        // Empty string -> null clears the field on the server.
        await update.mutateAsync({
          id: person.id, name: v.name.trim(), phone: clean(v.phone) ?? null, email: clean(v.email) ?? null,
          address: clean(v.address) ?? null, notes: clean(v.notes) ?? null,
        })
        toast.success('Changes saved')
      } else {
        const created = await create.mutateAsync({
          name: v.name.trim(), phone: clean(v.phone), email: clean(v.email), address: clean(v.address), notes: clean(v.notes),
        })
        toast.success(`${created.name} added`)
        onCreated?.(created)
      }
      onClose()
    } catch (e) {
      handleSubmitError(e, setError)
    }
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={editing ? 'Edit person' : 'Add person'}
      description="A person can both lend to you and borrow from you — no fixed role.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" required htmlFor="p-name" error={errors.name?.message}>
          <Input id="p-name" autoFocus autoComplete="off" aria-invalid={!!errors.name} {...register('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="p-phone" error={errors.phone?.message}>
            <Input id="p-phone" inputMode="tel" autoComplete="off" {...register('phone')} />
          </Field>
          <Field label="Email" htmlFor="p-email" error={errors.email?.message}>
            <Input id="p-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />
          </Field>
        </div>
        <Field label="Address" htmlFor="p-address" error={errors.address?.message}>
          <Input id="p-address" autoComplete="off" {...register('address')} />
        </Field>
        <Field label="Notes" htmlFor="p-notes" error={errors.notes?.message}>
          <Textarea id="p-notes" {...register('notes')} />
        </Field>
        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-3.5">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{editing ? 'Save changes' : 'Add person'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
