import type { Translate } from '../i18n/en'
import { useI18n } from '../i18n'
import { parseMoneyToPence } from '../lib/format'
import { Field, MoneyInput, SelectInput, TextArea, TextInput } from './ui'

export interface EmployeeFormState {
  fullName: string
  phone: string
  email: string
  defaultRate: string
  status: 'ACTIVE' | 'INACTIVE'
  notes: string
}

export function emptyEmployeeForm(): EmployeeFormState {
  return { fullName: '', phone: '', email: '', defaultRate: '', status: 'ACTIVE', notes: '' }
}

export function validateEmployee(form: EmployeeFormState, t: Translate) {
  const errors: Record<string, string> = {}
  if (form.fullName.trim().length < 2) errors.fullName = t('validation.employeeName')
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = t('validation.email')
  }
  if (form.phone.trim() && !/^[0-9+\s()-]{6,30}$/.test(form.phone.trim())) {
    errors.phone = t('validation.phone')
  }
  if (parseMoneyToPence(form.defaultRate) == null) errors.defaultRate = t('validation.rate')
  return errors
}

export function EmployeeFields({
  form,
  onChange,
  errors,
}: {
  form: EmployeeFormState
  onChange: (form: EmployeeFormState) => void
  errors: Record<string, string>
}) {
  const { t } = useI18n()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label={t('employees.fullName')} error={errors.fullName}>
          <TextInput value={form.fullName} onChange={(event) => onChange({ ...form, fullName: event.target.value })} autoFocus />
        </Field>
      </div>
      <Field label={t('employees.phone')} error={errors.phone}>
        <TextInput value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} inputMode="tel" />
      </Field>
      <Field label={t('common.email')} error={errors.email}>
        <TextInput type="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} />
      </Field>
      <Field label={t('employees.rate')} hint={t('employees.rateHint')} error={errors.defaultRate}>
        <MoneyInput value={form.defaultRate} onChange={(defaultRate) => onChange({ ...form, defaultRate })} />
      </Field>
      <Field label={t('common.status')}>
        <SelectInput value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as 'ACTIVE' | 'INACTIVE' })}>
          <option value="ACTIVE">{t('status.ACTIVE')}</option>
          <option value="INACTIVE">{t('status.INACTIVE')}</option>
        </SelectInput>
      </Field>
      <div className="sm:col-span-2">
        <Field label={t('common.notes')}>
          <TextArea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} />
        </Field>
      </div>
    </div>
  )
}
