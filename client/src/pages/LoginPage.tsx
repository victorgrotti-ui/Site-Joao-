import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Button, TextInput } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/api'
import { useTitle } from '../lib/useTitle'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  useTitle('Sign in')

  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="bg-brand px-6 py-10 text-white lg:px-12 lg:py-16">
        <div className="mx-auto flex h-full max-w-md flex-col justify-between">
          <div>
            <div className="inline-flex rounded-2xl bg-white px-4 py-3">
              <Logo className="h-14 w-auto" />
            </div>
            <p className="mt-8 text-sm font-semibold tracking-[0.16em] text-white/80">CMH CLEANING</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Cleaning Management System</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-white/85">
              Employees, cleaning jobs, weekly payments and profit, kept in one place.
            </p>
          </div>
          <ul className="mt-10 space-y-3 text-sm text-white/90">
            <li>Record each cleaning service and see the profit immediately.</li>
            <li>Pay employees once for the week, including reimbursements.</li>
            <li>Keep cleaning product costs from being counted twice.</li>
          </ul>
        </div>
      </section>
      <section className="flex items-center bg-white px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">Use the administrator account created on this computer.</p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-ink">
              Email
              <TextInput
                className="mt-1.5"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                data-testid="login-email"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Password
              <TextInput
                className="mt-1.5"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                data-testid="login-password"
              />
            </label>
            <button type="button" className="text-sm font-semibold text-brand" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit" disabled={busy} data-testid="login-submit">
              {busy ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          <button type="button" className="mt-4 text-sm font-semibold text-brand" onClick={() => setHelp((value) => !value)}>
            Forgot password
          </button>
          {help ? (
            <p className="mt-3 rounded-xl bg-brand-soft p-4 text-sm leading-6 text-ink">
              Password reset by email is not available while the system is running on this computer. An administrator can set a new
              password with the local command <span className="font-semibold">npm run admin:reset-password</span>.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
