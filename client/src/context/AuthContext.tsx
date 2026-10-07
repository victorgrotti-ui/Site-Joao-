import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setUnauthorizedHandler } from '../lib/api'
import type { User } from '../lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      if (!window.location.pathname.startsWith('/login')) navigate('/login', { replace: true })
    })
  }, [navigate])

  useEffect(() => {
    let active = true
    api<{ user: User }>('/api/auth/me', { allowUnauthorized: true })
      .then((data) => {
        if (active) setUser(data.user)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async login(email: string, password: string) {
        const data = await api<{ user: User }>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        })
        setUser(data.user)
      },
      async logout() {
        await api('/api/auth/logout', { method: 'POST' })
        setUser(null)
        navigate('/login', { replace: true })
      },
    }),
    [user, loading, navigate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}
