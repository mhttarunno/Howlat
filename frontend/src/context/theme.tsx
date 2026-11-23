import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'
const KEY = 'howlat.theme'

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light') {
      localStorage.setItem(KEY, 'dark')
    }
    return 'dark'
  } catch { return 'dark' }
}

function apply(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) || theme !== 'light'
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.classList.toggle('light', !isDark)
}

const Ctx = createContext<{ theme: Theme; resolved: 'light' | 'dark'; setTheme: (t: Theme) => void; toggle: () => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(read)
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    apply(theme)
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) || theme !== 'light'
    setResolved(isDark ? 'dark' : 'light')
    if (theme !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => { apply('system'); setResolved(mq.matches ? 'dark' : 'light') }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
    apply(t)
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) || t !== 'light'
    setThemeState(t)
    setResolved(isDark ? 'dark' : 'light')
  }, [])

  const toggle = useCallback(() => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark')
    const nextIsDark = !isCurrentlyDark
    const nextTheme: Theme = nextIsDark ? 'dark' : 'light'
    // Instant synchronous class toggle directly on root DOM for 0ms latency
    document.documentElement.classList.toggle('dark', nextIsDark)
    document.documentElement.classList.toggle('light', !nextIsDark)
    try { localStorage.setItem(KEY, nextTheme) } catch { /* ignore */ }
    setThemeState(nextTheme)
    setResolved(nextIsDark ? 'dark' : 'light')
  }, [])

  return <Ctx.Provider value={{ theme, resolved, setTheme, toggle }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTheme must be used inside ThemeProvider')
  return c
}
