import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, ShieldCheck, Wallet } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { handleSubmitError } from '@/components/forms/helpers'
import { Button, Field, Input } from '@/components/ui/primitives'
import { useAuth } from '@/context/auth'
import { loginSchema, registerSchema } from '@/utils/validation'

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Left branding panel */}
      <aside className="relative hidden flex-col justify-between border-r border-border/80 bg-sidebar p-12 text-white lg:flex overflow-hidden">
        {/* Subtle ambient lighting */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#2563EB]/15 to-[#0284C7]/10 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#0284C7] shadow-[0_0_20px_rgba(37,99,235,0.45)] ring-1 ring-white/20">
            <Wallet className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight text-white">Howlat</span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-blue-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Fintech-Grade Ledger
          </div>
          <h2 className="max-w-lg text-[38px] font-bold leading-[1.15] tracking-tight text-white">
            Every taka accounted for.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            A private, mathematically guaranteed ledger for money you lend, money you borrow, and every partial repayment in between.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-2.5 text-sm text-sidebar-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>Private by design: your ledger is isolated and visible only to you.</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-sidebar-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Server-enforced double-entry integrity & zero float arithmetic.</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 rounded-xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
          <p className="text-xs font-medium text-muted-foreground">Native South Asian currency formatting:</p>
          <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-foreground tabular">
            ৳ 1,00,000 <span className="text-text-muted">·</span> ৳ 10,00,000 <span className="text-text-muted">·</span> ৳ 1,00,00,000
          </p>
        </div>
      </aside>

      {/* Right form section */}
      <main className="relative flex items-center justify-center px-6 py-12 bg-background overflow-hidden">
        {/* Subtle ambient orb */}
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#0284C7] shadow-[0_0_16px_rgba(37,99,235,0.45)] text-white">
              <Wallet className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-foreground">Howlat</span>
          </div>

          <div className="rounded-2xl border border-white/[0.12] bg-card/90 backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] p-6 shadow-pop sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

            <div className="mt-6">{children}</div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  )
}

function useRedirectTarget() {
  const loc = useLocation()
  return (loc.state as { from?: string } | null)?.from ?? '/'
}

export function LoginPage() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const from = useRedirectTarget()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  if (user) return <Navigate to={from} replace />

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to access your private financial ledger."
      footer={<>New to Howlat? <Link to="/register" className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors">Create an account</Link></>}
    >
      <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
        try { await login(v.email, v.password); nav(from, { replace: true }) } catch (e) { handleSubmitError(e, setError) }
      })}>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} placeholder="you@domain.com" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} placeholder="••••••••" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" className="w-full mt-2 font-semibold" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { user, register: signUp } = useAuth()
  const nav = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) })
  if (user) return <Navigate to="/" replace />

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking money lent and borrowed with precision."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors">Sign in</Link></>}
    >
      <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
        try { await signUp(v.email, v.password, v.full_name); nav('/', { replace: true }) } catch (e) { handleSubmitError(e, setError) }
      })}>
        <Field label="Full name" htmlFor="name" error={errors.full_name?.message}>
          <Input id="name" autoComplete="name" autoFocus aria-invalid={!!errors.full_name} placeholder="e.g. Tariq Ahmed" {...register('full_name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} placeholder="you@domain.com" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters.">
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} placeholder="••••••••" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" className="w-full mt-2 font-semibold" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
