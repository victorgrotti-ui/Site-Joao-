import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { Button, Field, TextInput } from './ui'

export function PasswordForm() {
  const { t, text } = useI18n()
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
    if (newPassword.length > 72) next.newPassword = t('errors.passwordLong')
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
    <div className="space-y-4">
      <Field label={t('profile.current')} error={errors.currentPassword}>
        <TextInput
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          data-testid="current-password"
        />
      </Field>
      <Field label={t('profile.next')} error={errors.newPassword}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          data-testid="new-password"
        />
      </Field>
      <Field label={t('profile.confirm')} error={errors.confirm}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          data-testid="confirm-password"
        />
      </Field>
      <Button onClick={() => void save()} disabled={busy} data-testid="password-submit">
        {busy ? t('common.saving') : t('profile.update')}
      </Button>
    </div>
  )
}
