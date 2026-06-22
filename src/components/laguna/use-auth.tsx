'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export interface CurrentUser {
  id: string
  name: string
  role: 'ADMIN' | 'CASHIER'
  username: string
}

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  refresh: () => Promise<void>
  login: (username: string, password: string) => Promise<CurrentUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth')
      const d = await r.json()
      setUser(d.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
      headers: { 'Content-Type': 'application/json' },
    })
    setUser(null)
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<CurrentUser> => {
    const r = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'فشل الدخول')
    setUser(d.user)
    return d.user as CurrentUser
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

// Helper for fetch with JSON
export async function api<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'حدث خطأ')
  return d as T
}
