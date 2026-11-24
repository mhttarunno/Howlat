import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, ShieldCheck, Wallet } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { handleSubmitError } from '@/components/forms/helpers'
import { MoneyExchangeAnimation } from '@/components/MoneyExchangeAnimation'
import { Button, Field, Input, PasswordInput } from '@/components/ui/primitives'
import { useAuth } from '@/context/auth'
import { loginSchema, registerSchema } from '@/utils/validation'

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.15fr_1fr]">
      {/* ────────── LEFT SHOWCASE PANEL (Centered Symmetrical Fintech Landing) ────────── */}
      <aside className="relative hidden flex-col justify-between border-r border-border/80 bg-[#070C1A] p-8 xl:p-12 text-white lg:flex overflow-y-auto overflow-x-hidden">
        {/* Subtle Ambient Radial Lighting */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-10 h-[480px] w-[480px] rounded-full bg-gradient-to-tr from-[#2563EB]/20 via-[#0284C7]/10 to-transparent blur-3xl animate-pulse"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 bottom-10 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-[#10B981]/15 via-[#06B6D4]/10 to-transparent blur-3xl animate-pulse"
          style={{ animationDelay: '3.5s' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full bg-blue-500/[0.06] blur-3xl"
        />

        {/* Content Container (Horizontally Centered & Symmetrical) */}
        <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center justify-between text-center min-h-full py-4">
          {/* 1. Header & Branding (Centered) */}
          <div className="branding-enter flex items-center justify-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#0284C7] shadow-[0_0_24px_rgba(37,99,235,0.5)] ring-1 ring-white/20">
              <Wallet className="h-5 w-5 text-white" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-white">Howlat</span>
          </div>

          {/* 2. Hero Section (Centered) */}
          <div className="my-auto py-6 w-full flex flex-col items-center">
            {/* Eyebrow Badge */}
            <div className="hero-badge-enter inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-blue-300 shadow-[0_0_16px_rgba(37,99,235,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Fintech-Grade Ledger
            </div>

            {/* Main Headline */}
            <h2 className="hero-headline-enter mt-4 text-[34px] xl:text-[40px] font-extrabold leading-[1.14] tracking-tight text-white max-w-lg">
              Every taka{' '}
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
                accounted for.
              </span>
            </h2>

            {/* Description */}
            <p className="hero-desc-enter mt-3 max-w-md mx-auto text-sm xl:text-[15px] leading-relaxed text-slate-300">
              A private, mathematically guaranteed ledger for money you lend, money you borrow, and every partial repayment in between.
            </p>

            {/* Security & Feature Highlights (Centered with Staggered Entrance) */}
            <div className="hero-features-enter mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5 text-xs sm:text-sm text-slate-300 w-full">
              <div className="flex items-center gap-2 rounded-full bg-white/[0.035] border border-white/[0.08] px-3.5 py-1.5 transition-all duration-200 hover:bg-white/[0.07] hover:scale-[1.02]">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Private by design: isolated to you only</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/[0.035] border border-white/[0.08] px-3.5 py-1.5 transition-all duration-200 hover:bg-white/[0.07] hover:scale-[1.02]">
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                <span>Server-enforced double-entry & zero float</span>
              </div>
            </div>

            {/* 3. Animated Lending Demonstration (Centered) */}
            <div className="demo-enter mt-7 w-full">
              <MoneyExchangeAnimation />
            </div>
          </div>

          {/* 4. Currency Formatting Section (Centered with Frosted Styling) */}
          <div className="currency-section-enter mt-4 w-full rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Native South Asian currency formatting:
            </p>
            <p className="mt-1.5 font-mono text-sm sm:text-base font-bold tracking-wider text-slate-100 tabular">
              ৳ 1,00,000 <span className="text-slate-500">·</span> ৳ 10,00,000 <span className="text-slate-500">·</span> ৳ 1,00,00,000
            </p>
          </div>
        </div>
      </aside>

      {/* ────────── RIGHT FORM SECTION (Login / Registration) ────────── */}
      <main className="relative flex items-center justify-center px-6 py-12 bg-background overflow-hidden">
        {/* Subtle Ambient Orb */}
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="relative z-10 w-full max-w-md">
          {/* Mobile Centered Brand & Hero (Visible on small screens) */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#0284C7] shadow-[0_0_16px_rgba(37,99,235,0.45)] text-white">
                <Wallet className="h-5 w-5" />
              </span>
              <span className="text-2xl font-bold tracking-tight text-foreground">Howlat</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Every taka accounted for · Double-entry personal ledger
            </p>
          </div>

          {/* Mobile Lending Demonstration Preview */}
          <div className="mb-6 lg:hidden">
            <MoneyExchangeAnimation />
          </div>

          {/* Authentication Card Form */}
          <div className="rounded-2xl border border-white/[0.12] bg-card/90 backdrop-blur-2xl supports-[backdrop-filter]:saturate-[140%] p-6 shadow-pop sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

            <div className="mt-6">{children}</div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>

      {/* Professional Entrance Animations System */}
      <style>{`
        .branding-enter { animation: heroFadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hero-badge-enter { animation: heroScaleFadeIn 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hero-headline-enter { animation: heroFadeInUp 0.85s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hero-desc-enter { animation: heroFadeInUp 0.85s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hero-features-enter { animation: heroFadeInUp 0.9s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .demo-enter { animation: heroFadeInUp 0.95s 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .currency-section-enter { animation: heroFadeInUp 1s 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes heroFadeInUp {
          0% {
            opacity: 0;
            transform: translateY(18px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heroScaleFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .branding-enter,
          .hero-badge-enter,
          .hero-headline-enter,
          .hero-desc-enter,
          .hero-features-enter,
          .demo-enter,
          .currency-section-enter {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
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
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} placeholder="••••••••" {...register('password')} />
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
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} placeholder="••••••••" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" className="w-full mt-2 font-semibold" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
