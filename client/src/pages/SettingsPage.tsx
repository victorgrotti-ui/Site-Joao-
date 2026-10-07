import { useEffect, useState } from 'react'
import { Button, Card, ErrorBanner, Field, LoadingState, PageHeader, SelectInput, TextArea, TextInput } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { PAYMENT_DAYS } from '../lib/labels'
import type { Settings } from '../lib/types'
import { useTitle } from '../lib/useTitle'

export function SettingsPage() {
  useTitle('Settings')
  const toast = useToast()
  const [form, setForm] = useState({ companyName: '', phone: '', email: '', address: '', defaultPaymentDay: 'SATURDAY' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    setLoading(true)
    api<{ settings: Settings }>('/api/settings')
      .then((data) => {
        setForm({
          companyName: data.settings.companyName,
          phone: data.settings.phone ?? '',
          email: data.settings.email ?? '',
          address: data.settings.address ?? '',
          defaultPaymentDay: data.settings.defaultPaymentDay,
        })
        setError('')
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function save() {
    setBusy(true)
    setErrors({})
    try {
      await api('/api/settings', { method: 'PUT', body: form })
      toast.success('Settings saved.')
    } catch (caught) {
      setErrors(fieldErrors(caught))
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading settings" />
  if (error) return <ErrorBanner message={error} onRetry={load} />

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company details used across CMH Cleaning." />
      <Card className="max-w-2xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Company" error={errors.companyName}>
              <TextInput value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
            </Field>
          </div>
          <Field label="Phone" error={errors.phone}>
            <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <TextArea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </Field>
          </div>
          <Field label="Currency">
            <TextInput value="GBP (£)" disabled />
          </Field>
          <Field label="Default payment day" hint="A reminder only. Payment weeks run from Monday to Sunday.">
            <SelectInput value={form.defaultPaymentDay} onChange={(event) => setForm({ ...form, defaultPaymentDay: event.target.value })}>
              {PAYMENT_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </SelectInput>
          </Field>
        </div>
        <p className="mt-4 text-sm text-ink-muted">This version records all money in pounds sterling. Further user roles can be added later; this account is the administrator.</p>
        <div className="mt-6">
          <Button onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </Card>
    </div>
  )
}
