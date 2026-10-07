import { Field, MoneyInput, SelectInput, TextArea, TextInput } from './ui'
import { parseMoneyToPence } from '../lib/format'

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

export function validateEmployee(form: EmployeeFormState) {
  const errors: Record<string, string> = {}
  if (form.fullName.trim().length < 2) errors.fullName = 'Enter the employee’s full name.'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (form.phone.trim() && !/^[0-9+\s()-]{6,30}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number.'
  }
  if (parseMoneyToPence(form.defaultRate) == null) errors.defaultRate = 'Enter the default rate, such as 110 or 110.50.'
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
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Full name" error={errors.fullName}>
          <TextInput value={form.fullName} onChange={(event) => onChange({ ...form, fullName: event.target.value })} autoFocus />
        </Field>
      </div>
      <Field label="Phone number" error={errors.phone}>
        <TextInput value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} inputMode="tel" />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextInput type="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} />
      </Field>
      <Field label="Default payment rate" hint="The usual amount for one service. You can change it on an individual job." error={errors.defaultRate}>
        <MoneyInput value={form.defaultRate} onChange={(defaultRate) => onChange({ ...form, defaultRate })} />
      </Field>
      <Field label="Status">
        <SelectInput value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as 'ACTIVE' | 'INACTIVE' })}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </SelectInput>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <TextArea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} />
        </Field>
      </div>
    </div>
  )
}
