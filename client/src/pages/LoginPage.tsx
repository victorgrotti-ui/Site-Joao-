import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LanguageSwitcher, useI18n } from '../i18n'
import { Logo } from '../components/Logo'
import { Button, TextInput } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/api'
import { useTitle } from '../lib/useTitle'

export function LoginPage() {
  const { t, text } = useI18n()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  useTitle(t('login.title'))

  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
    } catch (caught) {
      setError(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="bg-brand px-6 py-10 text-white lg:px-12 lg:py-16">
        <div className="mx-auto flex h-full max-w-md flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex rounded-2xl bg-white px-4 py-3">
                <Logo className="h-14 w-auto" />
              </div>
              <LanguageSwitcher />
            </div>
            <p className="mt-8 text-sm font-semibold tracking-[0.16em] text-white/80">CMH CLEANING</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t('login.system')}</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-white/85">{t('login.intro')}</p>
          </div>
          <ul className="mt-10 space-y-3 text-sm text-white/90">
            <li>{t('login.point1')}</li>
            <li>{t('login.point2')}</li>
            <li>{t('login.point3')}</li>
          </ul>
        </div>
      </section>
      <section className="flex items-center bg-white px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-semibold text-ink">{t('login.title')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('login.hint')}</p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-ink">
              {t('login.email')}
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
              {t('login.password')}
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
              {showPassword ? t('login.hide') : t('login.show')}
            </button>
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit" disabled={busy} data-testid="login-submit">
              {busy ? t('login.busy') : t('login.submit')}
            </Button>
          </form>
          <button type="button" className="mt-4 text-sm font-semibold text-brand" onClick={() => setHelp((value) => !value)}>
            {t('login.forgot')}
          </button>
          {help ? <p className="mt-3 rounded-xl bg-brand-soft p-4 text-sm leading-6 text-ink">{t('login.forgotBody')}</p> : null}
        </div>
      </section>
    </div>
  )
}
