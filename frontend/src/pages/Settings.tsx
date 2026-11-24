import { zodResolver } from '@hookform/resolvers/zod'
import { Download, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { handleSubmitError } from '@/components/forms/helpers'
import { PageHeader } from '@/components/shared'
import { Button, Card, CardHeader, ConfirmDialog, Field, Input, PasswordInput, Select } from '@/components/ui/primitives'
import { useAuth } from '@/context/auth'
import { useTheme, type Theme } from '@/context/theme'
import { cn } from '@/lib/utils'
import { api, ApiError } from '@/services/api'
import type { TokenOut, User } from '@/types'
import { formatMoney } from '@/utils/format'
import { passwordChangeSchema } from '@/utils/validation'

const CURRENCIES = [['BDT', 'Bangladeshi Taka (৳)'], ['USD', 'US Dollar ($)'], ['EUR', 'Euro (€)'], ['GBP', 'British Pound (£)'], ['INR', 'Indian Rupee (₹)']]
const profileSchema = z.object({ full_name: z.string().trim().min(1, 'Enter your name').max(120) })

export function SettingsPage() {
  const { user, setUser, adoptToken, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const nav = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [delPw, setDelPw] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')

  const profile = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { full_name: user?.full_name ?? '' } })
  const pw = useForm<z.infer<typeof passwordChangeSchema>>({ resolver: zodResolver(passwordChangeSchema) })
  if (!user) return null

  const patchMe = async (body: Partial<Pick<User, 'full_name' | 'currency' | 'theme'>>) => setUser(await api.patch<User>('/auth/me', body))

  const pickTheme = (t: Theme) => { setTheme(t); patchMe({ theme: t }).catch(() => { /* local preference still applies */ }) }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" subtitle="Manage your profile, preferences and security." />

      <Card>
        <CardHeader title="Profile Information" subtitle={user.email} />
        <form noValidate className="space-y-4 p-4 sm:p-5" onSubmit={profile.handleSubmit(async (v) => {
          try { await patchMe({ full_name: v.full_name.trim() }); toast.success('Profile updated') } catch (e) { handleSubmitError(e, profile.setError) }
        })}>
          <Field label="Full name" htmlFor="s-name" error={profile.formState.errors.full_name?.message}>
            <Input id="s-name" {...profile.register('full_name')} />
          </Field>
          <Button type="submit" loading={profile.formState.isSubmitting}>Save profile</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Ledger Preferences" subtitle="Display currency and application theme." />
        <div className="space-y-5 p-4 sm:p-5">
          <Field
            label="Default Currency"
            htmlFor="s-cur"
            hint={`Preview: ${formatMoney('1000000', user.currency)} · ${formatMoney('1234.5', user.currency, { alwaysDecimals: true })}. Amounts are stored with exact numeric precision.`}
          >
            <Select id="s-cur" value={user.currency} onChange={async (e) => { try { await patchMe({ currency: e.target.value as User['currency'] }); toast.success('Currency updated') } catch (er) { toast.error(er instanceof ApiError ? er.message : 'Could not save') } }}>
              {CURRENCIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </Select>
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground">Theme Mode</p>
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2.5">
              {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]] as const).map(([v, label, Icon]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={theme === v}
                  onClick={() => pickTheme(v)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition-all duration-150 cursor-pointer',
                    theme === v
                      ? 'border-primary bg-sidebar-active text-foreground shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                      : 'border-border/80 bg-input-bg text-muted-foreground hover:border-border hover:bg-card-elevated hover:text-foreground',
                  )}>
                  <Icon className={cn('h-4 w-4', theme === v ? 'text-primary' : 'text-muted-foreground')} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Security & Password" subtitle="You will be signed out on all other active devices." />
        <form noValidate className="space-y-4 p-4 sm:p-5" onSubmit={pw.handleSubmit(async (v) => {
          try {
            adoptToken(await api.post<TokenOut>('/auth/change-password', { current_password: v.current_password, new_password: v.new_password }))
            pw.reset(); toast.success('Password changed')
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) pw.setError('current_password', { message: e.message }); else handleSubmitError(e, pw.setError)
          }
        })}>
          <Field label="Current password" htmlFor="pw-cur" error={pw.formState.errors.current_password?.message}><PasswordInput id="pw-cur" autoComplete="current-password" {...pw.register('current_password')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="pw-new" error={pw.formState.errors.new_password?.message} hint="At least 8 characters."><PasswordInput id="pw-new" autoComplete="new-password" {...pw.register('new_password')} /></Field>
            <Field label="Confirm new password" htmlFor="pw-conf" error={pw.formState.errors.confirm?.message}><PasswordInput id="pw-conf" autoComplete="new-password" {...pw.register('confirm')} /></Field>
          </div>
          <Button type="submit" loading={pw.formState.isSubmitting}>Update password</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Data Management" subtitle="Export or terminate your account." />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Download your complete private ledger — including people, loans, repayments, and the audit trail — as a standalone JSON backup.
            </p>
            <Button variant="secondary" className="shrink-0" loading={exporting} onClick={async () => {
              setExporting(true)
              try { await api.download('/auth/export', {}, 'howlat-data-export.json'); toast.success('Export downloaded') } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Export failed') } finally { setExporting(false) }
            }}>
              <Download className="h-4 w-4 text-primary" /> Export data
            </Button>
          </div>
          <div className="border-t border-border/80 pt-4">
            <Button variant="secondary" onClick={() => void logout()} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> Log out of this device
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-danger/25 bg-danger-soft/5">
        <CardHeader title="Danger Zone" subtitle="Permanently delete your account and all financial history." />
        <div className="p-4 sm:p-5">
          <Button variant="danger" onClick={() => { setDelPw(''); setDelErr(''); setDelOpen(true) }}>
            <Trash2 className="h-4 w-4" /> Delete my account
          </Button>
        </div>
      </Card>

      <ConfirmDialog open={delOpen} onOpenChange={setDelOpen} title="Delete your account?" confirmLabel="Delete everything" loading={delBusy}
        description={<div className="space-y-3.5"><p>All people, transactions, repayments and history will be erased permanently. This action cannot be reversed.</p>
          <Field label="Enter your password to confirm" htmlFor="del-pw" error={delErr}><PasswordInput id="del-pw" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" /></Field></div>}
        onConfirm={async () => {
          if (!delPw) { setDelErr('Enter your password'); return }
          setDelBusy(true); setDelErr('')
          try { await api.post('/auth/delete-account', { password: delPw }); toast.success('Account deleted'); await logout(); nav('/login', { replace: true }) }
          catch (e) { setDelErr(e instanceof ApiError ? e.message : 'Could not delete the account') } finally { setDelBusy(false) }
        }} />
    </div>
  )
}
