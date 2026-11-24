import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as AlertPrimitive from '@radix-ui/react-alert-dialog'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import { forwardRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/* ───────── Button ───────── */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] active:scale-[0.98]',
        secondary: 'bg-secondary border border-border text-foreground hover:bg-card-elevated hover:border-border-hover active:scale-[0.98] shadow-xs backdrop-blur-md',
        ghost: 'text-muted-foreground hover:bg-card-elevated hover:text-foreground active:scale-[0.98]',
        success: 'bg-success text-white hover:opacity-95 shadow-sm active:scale-[0.98]',
        danger: 'bg-danger/90 text-white hover:bg-danger shadow-sm active:scale-[0.98]',
        'danger-ghost': 'text-danger hover:bg-danger-soft active:scale-[0.98]',
      },
      size: { sm: 'h-8 px-3 text-[13px] rounded-md', md: 'h-10 px-4', lg: 'h-11 px-5 text-[15px]', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, loading, children, disabled, type = 'button', ...p }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp ref={ref} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...p}>
      {asChild ? children : (<>{loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}</>)}
    </Comp>
  )
})
Button.displayName = 'Button'

/* ───────── Card ───────── */
export function Card({ className, elevated, ...p }: HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-border text-card-foreground shadow-card backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] transition-all duration-200',
        elevated ? 'bg-card-elevated shadow-elevated' : 'bg-card',
        className,
      )}
      {...p}
    />
  )
}
export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-tight text-foreground tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ───────── Form controls ───────── */
const field = 'w-full rounded-lg border border-input bg-input-bg backdrop-blur-md supports-[backdrop-filter]:saturate-[130%] px-3 text-foreground placeholder:text-text-muted transition-all duration-150 hover:border-white/[0.22] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30'
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, 'h-10', className)} {...p} />
))
Input.displayName = 'Input'

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn(field, 'h-10 pr-10', className)}
        {...p}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus:outline-none"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  )
})
PasswordInput.displayName = 'PasswordInput'
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, 'min-h-[84px] py-2 resize-none', className)} {...p} />
))
Textarea.displayName = 'Textarea'
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(field, 'h-10 appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8 cursor-pointer', className)}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...p}>
    {children}
  </select>
))
Select.displayName = 'Select'

export function Field({ label, error, hint, required, htmlFor, children, className }: {
  label: string; error?: string; hint?: string; required?: boolean; htmlFor?: string; children: ReactNode; className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-foreground">
        {label}{required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {error ? <p role="alert" className="text-xs text-danger font-medium">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/* ───────── Badge ───────── */
const badge = cva('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold border transition-colors', {
  variants: {
    tone: {
      neutral: 'bg-card-elevated text-muted-foreground border-border',
      success: 'bg-success-soft text-success border-success/25',
      danger: 'bg-danger-soft text-danger border-danger/25',
      warning: 'bg-warning-soft text-warning border-warning/25',
      info: 'bg-info-soft text-info border-info/25',
    },
  },
  defaultVariants: { tone: 'neutral' },
})
export function Badge({ tone, className, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...p} />
}

/* ───────── Skeleton / Spinner ───────── */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton-shimmer rounded-md border border-border/40', className)} />
}
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary', className)} aria-label="Loading" />
}

/* ───────── Dialog (bottom sheet on phones, centred modal on larger screens) ───────── */
export function Dialog({ open, onOpenChange, title, description, children, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; wide?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-overlay fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md supports-[backdrop-filter]:saturate-[140%]" />
        <DialogPrimitive.Content
          className={cn(
            'animate-modal fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-card-elevated/95 dark:bg-card/90 backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] border border-white/[0.12] text-foreground shadow-pop outline-none',
            'bottom-0 inset-x-0 rounded-t-2xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[90dvh] sm:rounded-2xl',
            wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border bg-card-elevated/40 px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground tracking-tight">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={cn('mt-0.5 text-[13px] text-muted-foreground', !description && 'sr-only')}>
                {description ?? title}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="-mr-1.5 rounded-lg p-1.5 text-muted-foreground hover:bg-card-elevated hover:text-foreground transition-colors cursor-pointer active:scale-95" aria-label="Close">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-6 sm:pb-6 safe-bottom">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* ───────── Confirm dialog (for every delete / reverse) ───────── */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Delete', loading, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: ReactNode; confirmLabel?: string; loading?: boolean; onConfirm: () => void
}) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="animate-overlay fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-md supports-[backdrop-filter]:saturate-[140%]" />
        <AlertPrimitive.Content className="animate-modal fixed bottom-0 inset-x-0 z-[60] w-full rounded-t-2xl border border-white/[0.12] bg-card-elevated/95 dark:bg-card/90 backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] p-6 shadow-pop outline-none sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[90dvh] sm:max-w-md sm:rounded-2xl">
          <AlertPrimitive.Title className="text-base font-semibold text-foreground tracking-tight">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description asChild><div className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</div></AlertPrimitive.Description>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3.5 safe-bottom">
            <AlertPrimitive.Cancel asChild><Button variant="secondary">Cancel</Button></AlertPrimitive.Cancel>
            <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  )
}
