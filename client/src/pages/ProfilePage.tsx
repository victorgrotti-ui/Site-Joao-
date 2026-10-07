import { useState } from 'react'
import { Button, Card, Field, PageHeader, TextInput } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { useTitle } from '../lib/useTitle'

export function ProfilePage() {
  useTitle('Profile')
  const { user, logout } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function save() {
    const next: Record<string, string> = {}
    if (!currentPassword) next.currentPassword = 'Enter your current password.'
    if (newPassword.length < 8) next.newPassword = 'Use at least 8 characters.'
    if (newPassword !== confirm) next.confirm = 'The new passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } })
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
      toast.success('Password updated.')
    } catch (caught) {
      setErrors(fieldErrors(caught))
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your sign-in details for this computer." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-ink-muted">Name</dt><dd className="text-base font-semibold text-ink">{user?.name}</dd></div>
            <div><dt className="text-ink-muted">Email</dt><dd className="font-medium">{user?.email}</dd></div>
            <div><dt className="text-ink-muted">Role</dt><dd className="font-medium">{user?.role === 'ADMIN' ? 'Administrator' : 'Manager'}</dd></div>
          </dl>
          <Button className="mt-6" variant="secondary" onClick={() => void logout()}>Logout</Button>
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold">Change password</h2>
          <div className="mt-4 space-y-4">
            <Field label="Current password" error={errors.currentPassword}>
              <TextInput type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </Field>
            <Field label="New password" error={errors.newPassword}>
              <TextInput type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </Field>
            <Field label="Confirm new password" error={errors.confirm}>
              <TextInput type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </Field>
            <Button onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
