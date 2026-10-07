import { useState } from 'react'
import { Button, Card, Field, PageHeader, TextInput } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { useTitle } from '../lib/useTitle'

export function ProfilePage() {
  const { t, text } = useI18n()
  useTitle(t('profile.title'))
  const { user, logout } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function save() {
    const next: Record<string, string> = {}
    if (!currentPassword) next.currentPassword = t('validation.currentPassword')
    if (newPassword.length < 8) next.newPassword = t('validation.passwordLength')
    if (newPassword !== confirm) next.confirm = t('validation.passwordMatch')
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } })
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
      toast.success(t('profile.updated'))
    } catch (caught) {
      const details = fieldErrors(caught)
      setErrors(Object.fromEntries(Object.entries(details).map(([key, value]) => [key, text(value)])))
      toast.error(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-ink-muted">{t('common.name')}</dt><dd className="text-base font-semibold text-ink">{user?.name}</dd></div>
            <div><dt className="text-ink-muted">{t('common.email')}</dt><dd className="font-medium">{user?.email}</dd></div>
            <div><dt className="text-ink-muted">{t('common.role')}</dt><dd className="font-medium">{user?.role === 'ADMIN' ? t('common.administrator') : t('common.manager')}</dd></div>
          </dl>
          <Button className="mt-6" variant="secondary" onClick={() => void logout()}>{t('nav.logout')}</Button>
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold">{t('profile.change')}</h2>
          <div className="mt-4 space-y-4">
            <Field label={t('profile.current')} error={errors.currentPassword}>
              <TextInput type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </Field>
            <Field label={t('profile.next')} error={errors.newPassword}>
              <TextInput type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </Field>
            <Field label={t('profile.confirm')} error={errors.confirm}>
              <TextInput type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </Field>
            <Button onClick={() => void save()} disabled={busy}>{busy ? t('common.saving') : t('profile.update')}</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
