import { useEffect, useState } from 'react'
import { LanguageSwitcher, useI18n } from '../i18n'
import { Button, Card, ErrorBanner, Field, LoadingState, PageHeader, SelectInput, TextArea, TextInput } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { PAYMENT_DAYS } from '../lib/labels'
import type { Settings } from '../lib/types'
import { useTitle } from '../lib/useTitle'

export function SettingsPage() {
  const { t, text } = useI18n()
  useTitle(t('settings.title'))
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
      .catch((caught) => setError(text(errorMessage(caught))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setBusy(true)
    setErrors({})
    try {
      await api('/api/settings', { method: 'PUT', body: form })
      toast.success(t('settings.saved'))
    } catch (caught) {
      const details = fieldErrors(caught)
      setErrors(Object.fromEntries(Object.entries(details).map(([key, value]) => [key, text(value)])))
      toast.error(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label={t('settings.loading')} />
  if (error) return <ErrorBanner message={error} onRetry={load} />

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <Card className="mb-4 max-w-2xl p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink">{t('settings.languageTitle')}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{t('settings.languageHint')}</p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
      </Card>
      <Card className="max-w-2xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t('settings.company')} error={errors.companyName}>
              <TextInput value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
            </Field>
          </div>
          <Field label={t('settings.phone')} error={errors.phone}>
            <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label={t('settings.email')} error={errors.email}>
            <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('settings.address')}>
              <TextArea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </Field>
          </div>
          <Field label={t('settings.currency')}>
            <TextInput value="GBP (£)" disabled />
          </Field>
          <Field label={t('settings.paymentDay')} hint={t('settings.paymentDayHint')}>
            <SelectInput value={form.defaultPaymentDay} onChange={(event) => setForm({ ...form, defaultPaymentDay: event.target.value })}>
              {PAYMENT_DAYS.map((day) => <option key={day.value} value={day.value}>{t(`days.${day.value}`)}</option>)}
            </SelectInput>
          </Field>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-muted">{t('settings.note')}</p>
        <div className="mt-6">
          <Button onClick={() => void save()} disabled={busy}>{busy ? t('common.saving') : t('settings.save')}</Button>
        </div>
      </Card>
    </div>
  )
}
