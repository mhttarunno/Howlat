import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '@/services/api'
import type { TokenOut, User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: User) => void
  adoptToken: (t: TokenOut) => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => !!tokenStore.get())

  const clearSession = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    qc.clear() // never leave one account's figures in memory for the next
  }, [qc])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  useEffect(() => {
    if (!tokenStore.get()) return
    let cancelled = false
    api.get<User>('/auth/me')
      .then((u) => !cancelled && setUser(u))
      .catch(() => { /* 401 already cleared the session; network errors leave the token for retry */ })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const adoptToken = useCallback((t: TokenOut) => {
    qc.clear()
    tokenStore.set(t.access_token)
    setUser(t.user)
  }, [qc])

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    setUser,
    adoptToken,
    login: async (email, password) => adoptToken(await api.post<TokenOut>('/auth/login', { email, password }, undefined, false)),
    register: async (email, password, fullName) =>
      adoptToken(await api.post<TokenOut>('/auth/register', { email, password, full_name: fullName }, undefined, false)),
    logout: async () => {
      try { await api.post('/auth/logout') } catch { /* token may already be invalid */ }
      clearSession()
    },
  }), [user, loading, adoptToken, clearSession])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
