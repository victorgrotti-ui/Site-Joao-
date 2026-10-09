import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
import { api, errorMessage, fieldErrors } from '../lib/api'
import type { AccountUser } from '../lib/types'
import { Modal } from './Modal'
import { Badge, Button, Field, SelectInput, TextInput, statusLabel } from './ui'

const emptyForm = { name: '', email: '', password: '', role: 'MANAGER' }

function lastActiveAdmin(account: AccountUser, users: AccountUser[]) {
  return account.role === 'ADMIN' && account.active && users.filter((item) => item.role === 'ADMIN' && item.active).length === 1
}

export function UsersSection() {
  const { t, text } = useI18n()
  const { user: current } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState<AccountUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [resetTarget, setResetTarget] = useState<AccountUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetError, setResetError] = useState('')

  function load() {
    setLoading(true)
    api<{ users: AccountUser[] }>('/api/users')
      .then((data) => {
        setUsers(data.users)
        setError('')
      })
      .catch((caught) => setError(text(errorMessage(caught))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createAccount() {
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = t('validation.personName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = t('validation.email')
    if (form.password.length < 8) next.password = t('validation.passwordLength')
    if (form.password.length > 72) next.password = t('errors.passwordLong')
    setFormErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await api('/api/users', { method: 'POST', body: form })
      setForm(emptyForm)
      toast.success(t('settings.created'))
      load()
    } catch (caught) {
      const details = fieldErrors(caught)
      setFormErrors(Object.fromEntries(Object.entries(details).map(([key, value]) => [key, text(value)])))
      toast.error(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  async function updateAccount(account: AccountUser, path: 'active' | 'role', body: { active?: boolean; role?: string }, success: string) {
    try {
      await api(`/api/users/${account.id}/${path}`, { method: 'POST', body })
      toast.success(success)
      load()
    } catch (caught) {
      toast.error(text(errorMessage(caught)))
    }
  }

  async function saveReset() {
    if (!resetTarget) return
    if (resetPassword.length < 8 || resetPassword.length > 72) {
      setResetError(resetPassword.length > 72 ? t('errors.passwordLong') : t('validation.passwordLength'))
      return
    }
    if (resetPassword !== resetConfirm) {
      setResetError(t('validation.passwordMatch'))
      return
    }
    setBusy(true)
    setResetError('')
    try {
      await api(`/api/users/${resetTarget.id}/reset-password`, { method: 'POST', body: { password: resetPassword } })
      setResetTarget(null)
      setResetPassword('')
      setResetConfirm('')
      toast.success(t('settings.resetDone'))
    } catch (caught) {
      setResetError(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div data-testid="settings-users">
      <p className="mt-1 text-sm leading-6 text-ink-muted">{t('settings.usersHint')}</p>
      {loading ? <p className="mt-4 text-sm text-ink-muted">{t('settings.usersLoading')}</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <ul className="mt-4 space-y-3">
        {users.map((account) => {
          const self = account.id === current?.id
          const locked = lastActiveAdmin(account, users)
          return (
            <li key={account.id} className="rounded-xl border border-line p-4" data-testid={`account-${account.email}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {account.name}
                    {self ? <span className="ml-2 text-sm font-medium text-ink-muted">{t('settings.you')}</span> : null}
                  </p>
                  <p className="text-sm text-ink-muted">{account.email}</p>
                </div>
                <Badge tone={account.active ? 'success' : 'neutral'}>{statusLabel(account.active ? 'ACTIVE' : 'INACTIVE', t)}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SelectInput
                  aria-label={t('settings.role')}
                  className="w-auto min-w-40"
                  value={account.role}
                  disabled={locked}
                  onChange={(event) => void updateAccount(account, 'role', { role: event.target.value }, t('settings.roleSaved'))}
                >
                  <option value="ADMIN">{t('common.administrator')}</option>
                  <option value="MANAGER">{t('common.manager')}</option>
                </SelectInput>
                {self ? null : (
                  <Button variant="secondary" onClick={() => { setResetTarget(account); setResetPassword(''); setResetConfirm(''); setResetError('') }}>
                    {t('settings.reset')}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  disabled={self || locked}
                  onClick={() =>
                    void updateAccount(
                      account,
                      'active',
                      { active: !account.active },
                      account.active ? t('settings.deactivated') : t('settings.activated'),
                    )
                  }
                >
                  {account.active ? t('settings.deactivate') : t('settings.activate')}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <h3 className="mt-6 text-sm font-semibold text-ink">{t('settings.addTitle')}</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label={t('settings.personName')} error={formErrors.name}>
          <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} data-testid="user-name" />
        </Field>
        <Field label={t('common.email')} error={formErrors.email}>
          <TextInput type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} data-testid="user-email" />
        </Field>
        <Field label={t('settings.initialPassword')} error={formErrors.password}>
          <TextInput type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} data-testid="user-password" />
        </Field>
        <Field label={t('settings.role')}>
          <SelectInput value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} data-testid="user-role">
            <option value="ADMIN">{t('common.administrator')}</option>
            <option value="MANAGER">{t('common.manager')}</option>
          </SelectInput>
        </Field>
      </div>
      <div className="mt-4">
        <Button onClick={() => void createAccount()} disabled={busy} data-testid="user-create">
          {busy ? t('common.saving') : t('settings.create')}
        </Button>
      </div>

      <Modal
        open={resetTarget != null}
        title={t('settings.resetTitle')}
        subtitle={resetTarget ? `${resetTarget.name} · ${resetTarget.email}` : undefined}
        onClose={() => setResetTarget(null)}
      >
        <p className="mb-4 text-sm leading-6 text-ink-muted">{t('settings.resetHint')}</p>
        <div className="space-y-4">
          <Field label={t('profile.next')} error={resetError}>
            <TextInput type="password" autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} data-testid="reset-password" />
          </Field>
          <Field label={t('profile.confirm')}>
            <TextInput type="password" autoComplete="new-password" value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} data-testid="reset-confirm" />
          </Field>
          <Button onClick={() => void saveReset()} disabled={busy} data-testid="reset-save">
            {busy ? t('common.saving') : t('settings.resetSave')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
