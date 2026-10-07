import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, LoadingState, MoneyInput, PageHeader, SelectInput, TextArea, TextInput, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { presetRange, todayISO } from '../lib/dates'
import { formatDate, formatGBP, parseMoneyToPence, penceToInput } from '../lib/format'
import { SERVICE_TYPES, serviceTypeLabel } from '../lib/labels'
import type { Employee, ServiceRecord } from '../lib/types'
import { useTitle } from '../lib/useTitle'

interface ServiceForm {
  serviceDate: string
  propertyAddress: string
  serviceType: string
  clientName: string
  employeeId: string
  revenue: string
  employeePayment: string
  cleaningProductsCost: string
  otherExpenses: string
  productsReimbursable: boolean
  otherReimbursable: boolean
  notes: string
}

function blankForm(): ServiceForm {
  return {
    serviceDate: todayISO(),
    propertyAddress: '',
    serviceType: 'REGULAR_CLEANING',
    clientName: '',
    employeeId: '',
    revenue: '',
    employeePayment: '',
    cleaningProductsCost: '0.00',
    otherExpenses: '0.00',
    productsReimbursable: false,
    otherReimbursable: false,
    notes: '',
  }
}

function fromService(service: ServiceRecord): ServiceForm {
  return {
    serviceDate: service.serviceDate,
    propertyAddress: service.propertyAddress,
    serviceType: service.serviceType,
    clientName: service.clientName,
    employeeId: service.employeeId,
    revenue: penceToInput(service.revenue),
    employeePayment: penceToInput(service.employeePayment),
    cleaningProductsCost: penceToInput(service.cleaningProductsCost),
    otherExpenses: penceToInput(service.otherExpenses),
    productsReimbursable: service.productsReimbursable,
    otherReimbursable: service.otherReimbursable,
    notes: service.notes ?? '',
  }
}

export function ServicesPage() {
  const { t, text } = useI18n()
  useTitle(t('services.title'))
  const toast = useToast()

  function validate(form: ServiceForm) {
    const errors: Record<string, string> = {}
    if (!form.serviceDate) errors.serviceDate = t('validation.serviceDate')
    if (form.propertyAddress.trim().length < 3) errors.propertyAddress = t('validation.property')
    if (form.clientName.trim().length < 2) errors.clientName = t('validation.client')
    if (!form.employeeId) errors.employeeId = t('validation.chooseEmployee')
    if (parseMoneyToPence(form.revenue) == null) errors.revenue = t('validation.revenue')
    if (parseMoneyToPence(form.employeePayment) == null) errors.employeePayment = t('validation.payment')
    if (parseMoneyToPence(form.cleaningProductsCost) == null) errors.cleaningProductsCost = t('validation.products')
    if (parseMoneyToPence(form.otherExpenses) == null) errors.otherExpenses = t('validation.other')
    return errors
  }
  const month = presetRange('month')
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [from, setFrom] = useState(month.from)
  const [to, setTo] = useState(month.to)
  const [employeeId, setEmployeeId] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [client, setClient] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<ServiceRecord | null>(null)
  const [editing, setEditing] = useState<ServiceRecord | null>(null)
  const [form, setForm] = useState<ServiceForm>(blankForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ServiceRecord | null>(null)

  function load() {
    const params = new URLSearchParams()
    if (from && to) {
      params.set('from', from)
      params.set('to', to)
    }
    if (employeeId) params.set('employeeId', employeeId)
    if (serviceType) params.set('serviceType', serviceType)
    if (client.trim()) params.set('client', client.trim())
    if (paymentStatus) params.set('paymentStatus', paymentStatus)
    if (search.trim()) params.set('search', search.trim())
    setLoading(true)
    Promise.all([
      api<{ services: ServiceRecord[] }>(`/api/services?${params.toString()}`),
      api<{ employees: Employee[] }>('/api/employees'),
    ])
      .then(([serviceData, employeeData]) => {
        setServices(serviceData.services)
        setEmployees(employeeData.employees)
        setError('')
      })
      .catch((caught) => setError(text(errorMessage(caught))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, employeeId, serviceType, client, paymentStatus, search])

  const preview = useMemo(() => {
    const revenue = parseMoneyToPence(form.revenue)
    const payment = parseMoneyToPence(form.employeePayment)
    const products = parseMoneyToPence(form.cleaningProductsCost)
    const other = parseMoneyToPence(form.otherExpenses)
    if (revenue == null || payment == null || products == null || other == null) return null
    const reimbursement = (form.productsReimbursable ? products : 0) + (form.otherReimbursable ? other : 0)
    return { revenue, payment, products, other, profit: revenue - payment - products - other, due: payment + reimbursement, reimbursement }
  }, [form])

  const choices = employees.filter((employee) => employee.status === 'ACTIVE' || employee.id === form.employeeId)

  function updateEmployee(id: string) {
    const employee = employees.find((item) => item.id === id)
    setForm((current) => ({
      ...current,
      employeeId: id,
      employeePayment: employee ? penceToInput(employee.defaultRate) : current.employeePayment,
    }))
  }

  async function save() {
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      const path = editing ? `/api/services/${editing.id}` : '/api/services'
      await api(path, { method: editing ? 'PUT' : 'POST', body: form })
      toast.success(t('services.saved'))
      setOpen(false)
      load()
    } catch (caught) {
      const details = fieldErrors(caught)
      setErrors(Object.fromEntries(Object.entries(details).map(([key, value]) => [key, text(value)])))
      toast.error(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!removeTarget) return
    setBusy(true)
    try {
      await api(`/api/services/${removeTarget.id}`, { method: 'DELETE' })
      toast.success(t('services.deleted'))
      setRemoveTarget(null)
      load()
    } catch (caught) {
      toast.error(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('services.title')}
        subtitle={t('services.subtitle')}
        action={
          <Button
            data-testid="add-service"
            onClick={() => {
              setEditing(null)
              setForm(blankForm())
              setErrors({})
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> {t('services.add')}
          </Button>
        }
      />
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm font-medium text-ink">{t('common.from')}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
        <label className="text-sm font-medium text-ink">{t('common.to')}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
        <label className="text-sm font-medium text-ink">{t('common.employee')}
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">{t('services.allEmployees')}</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">{t('services.serviceType')}
          <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">{t('services.allTypes')}</option>
            {SERVICE_TYPES.map((type) => <option key={type.value} value={type.value}>{t(`serviceTypes.${type.value}`)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">{t('common.client')}<TextInput className="mt-1" value={client} onChange={(event) => setClient(event.target.value)} placeholder={t('services.clientPlaceholder')} /></label>
        <label className="text-sm font-medium text-ink">{t('services.paymentStatus')}
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">{t('common.all')}</option>
            <option value="PENDING">{t('status.PENDING')}</option>
            <option value="PAID">{t('status.PAID')}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-ink md:col-span-2">{t('services.property')}
          <TextInput className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('services.searchAddress')} />
        </label>
        <div className="flex items-end">
          <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setEmployeeId(''); setServiceType(''); setClient(''); setPaymentStatus(''); setSearch('') }}>{t('common.clearFilters')}</Button>
        </div>
      </Card>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingState label={t('services.loading')} /> : null}
      {!loading && services.length === 0 ? (
        <EmptyState title={t('services.emptyTitle')} body={t('services.emptyBody')} />
      ) : null}
      {!loading && services.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {services.map((service) => (
              <Card key={service.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{service.propertyAddress}</p>
                    <p className="text-sm text-ink-muted">{formatDate(service.serviceDate)} · {serviceTypeLabel(service.serviceType, t)}</p>
                    <p className="text-sm text-ink-muted">{service.employeeName} · {service.clientName}</p>
                  </div>
                  <Badge tone={statusTone(service.paymentStatus)}>{statusLabel(service.paymentStatus, t)}</Badge>
                </div>
                <p className={`mt-3 text-lg font-semibold ${service.profit < 0 ? 'text-danger' : 'text-success'}`}>{t('services.profitLine', { amount: formatGBP(service.profit) })}</p>
                <p className="text-sm text-ink-muted">{t('services.moneyLine', { revenue: formatGBP(service.revenue), payment: formatGBP(service.employeePayment), expenses: formatGBP(service.totalExpenses) })}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setViewing(service)}>{t('common.view')}</Button>
                  <Button variant="secondary" onClick={() => { setEditing(service); setForm(fromService(service)); setErrors({}); setOpen(true) }}>{t('common.edit')}</Button>
                  <Button variant="ghost" onClick={() => setRemoveTarget(service)}>{t('common.delete')}</Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead className="border-b border-line bg-brand-soft">
                  <tr>{[t('common.date'), t('dashboard.columns.property'), t('dashboard.columns.type'), t('common.employee'), t('common.revenue'), t('services.payment'), t('common.expenses'), t('common.profit'), t('services.paymentStatus'), t('common.actions')].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="border-b border-line last:border-0">
                      <td className={tdClass}>{formatDate(service.serviceDate)}</td>
                      <td className={tdClass}>{service.propertyAddress}</td>
                      <td className={tdClass}>{serviceTypeLabel(service.serviceType, t)}</td>
                      <td className={tdClass}>{service.employeeName}</td>
                      <td className={tdClass}>{formatGBP(service.revenue)}</td>
                      <td className={tdClass}>{formatGBP(service.employeePayment)}</td>
                      <td className={tdClass}>{formatGBP(service.totalExpenses)}</td>
                      <td className={`${tdClass} font-semibold ${service.profit < 0 ? 'text-danger' : 'text-success'}`}>{formatGBP(service.profit)}</td>
                      <td className={tdClass}><Badge tone={statusTone(service.paymentStatus)}>{statusLabel(service.paymentStatus, t)}</Badge></td>
                      <td className={tdClass}>
                        <div className="flex">
                          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft" aria-label={t('services.view')} title={t('common.view')} onClick={() => setViewing(service)}><Eye className="h-4 w-4" /></button>
                          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft" aria-label={t('services.edit')} title={t('common.edit')} onClick={() => { setEditing(service); setForm(fromService(service)); setErrors({}); setOpen(true) }}><Pencil className="h-4 w-4" /></button>
                          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-danger" aria-label={t('services.delete')} title={t('common.delete')} onClick={() => setRemoveTarget(service)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      <Modal open={open} wide title={editing ? t('services.editTitle') : t('services.addTitle')} subtitle={t('services.formHint')} onClose={() => !busy && setOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('services.serviceDate')} error={errors.serviceDate}>
            <TextInput type="date" value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} />
          </Field>
          <Field label={t('services.serviceType')}>
            <SelectInput value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })}>
              {SERVICE_TYPES.map((type) => <option key={type.value} value={type.value}>{t(`serviceTypes.${type.value}`)}</option>)}
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('services.propertyField')} error={errors.propertyAddress}>
              <TextInput value={form.propertyAddress} onChange={(event) => setForm({ ...form, propertyAddress: event.target.value })} />
            </Field>
          </div>
          <Field label={t('services.client')} error={errors.clientName}>
            <TextInput value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
          </Field>
          <Field label={t('services.assigned')} error={errors.employeeId} hint={t('services.assignedHint')}>
            <SelectInput value={form.employeeId} onChange={(event) => updateEmployee(event.target.value)}>
              <option value="">{t('services.chooseEmployee')}</option>
              {choices.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName} — {formatGBP(employee.defaultRate)}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t('services.revenue')} error={errors.revenue}>
            <MoneyInput value={form.revenue} onChange={(revenue) => setForm({ ...form, revenue })} />
          </Field>
          <Field label={t('services.payment')} error={errors.employeePayment}>
            <MoneyInput value={form.employeePayment} onChange={(employeePayment) => setForm({ ...form, employeePayment })} />
          </Field>
          <Field label={t('services.products')} error={errors.cleaningProductsCost}>
            <MoneyInput value={form.cleaningProductsCost} onChange={(cleaningProductsCost) => setForm({ ...form, cleaningProductsCost })} />
          </Field>
          <Field label={t('services.other')} error={errors.otherExpenses}>
            <MoneyInput value={form.otherExpenses} onChange={(otherExpenses) => setForm({ ...form, otherExpenses })} />
          </Field>
          <label className="flex items-start gap-3 rounded-xl bg-brand-soft p-3 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={form.productsReimbursable} onChange={(event) => setForm({ ...form, productsReimbursable: event.target.checked })} />
            <span>
              <span className="font-medium text-ink">{t('services.productsCheck')}</span>
              <span className="mt-1 block text-ink-muted">{t('services.productsHint')}</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-brand-soft p-3 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={form.otherReimbursable} onChange={(event) => setForm({ ...form, otherReimbursable: event.target.checked })} />
            <span>
              <span className="font-medium text-ink">{t('services.otherCheck')}</span>
              <span className="mt-1 block text-ink-muted">{t('services.otherHint')}</span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <Field label={t('common.notes')}>
              <TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl bg-brand-light p-4 sm:grid-cols-2" aria-live="polite">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t('services.netProfit')}</p>
            <p className={`text-3xl font-semibold ${preview && preview.profit < 0 ? 'text-danger' : 'text-brand'}`}>{preview ? formatGBP(preview.profit) : t('common.none')}</p>
            <p className="mt-1 text-xs text-ink-muted">{t('services.formula')}{preview ? ` = ${t('services.formulaValues', { revenue: formatGBP(preview.revenue), payment: formatGBP(preview.payment), products: formatGBP(preview.products), other: formatGBP(preview.other) })}` : ''}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('services.dueTitle')}</p>
            <p className="text-2xl font-semibold text-ink">{preview ? formatGBP(preview.due) : t('common.none')}</p>
            <p className="mt-1 text-xs text-ink-muted">{preview && preview.reimbursement > 0 ? t('services.dueSplit', { payment: formatGBP(preview.payment), reimbursement: formatGBP(preview.reimbursement) }) : t('services.dueOnly')}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={() => void save()} disabled={busy} data-testid="save-service">{busy ? t('common.saving') : t('services.save')}</Button>
        </div>
      </Modal>

      <Modal open={Boolean(viewing)} title={viewing?.propertyAddress ?? t('nav.services')} onClose={() => setViewing(null)}>
        {viewing ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-ink-muted">{t('common.date')}</dt><dd className="font-medium">{formatDate(viewing.serviceDate)}</dd></div>
            <div><dt className="text-ink-muted">{t('common.type')}</dt><dd className="font-medium">{serviceTypeLabel(viewing.serviceType, t)}</dd></div>
            <div><dt className="text-ink-muted">{t('common.client')}</dt><dd className="font-medium">{viewing.clientName}</dd></div>
            <div><dt className="text-ink-muted">{t('common.employee')}</dt><dd className="font-medium">{viewing.employeeName}</dd></div>
            <div><dt className="text-ink-muted">{t('common.revenue')}</dt><dd className="font-medium">{formatGBP(viewing.revenue)}</dd></div>
            <div><dt className="text-ink-muted">{t('services.payment')}</dt><dd className="font-medium">{formatGBP(viewing.employeePayment)}</dd></div>
            <div><dt className="text-ink-muted">{t('common.expenses')}</dt><dd className="font-medium">{formatGBP(viewing.totalExpenses)}</dd></div>
            <div><dt className="text-ink-muted">{t('common.profit')}</dt><dd className="font-semibold">{formatGBP(viewing.profit)}</dd></div>
            <div className="col-span-2"><dt className="text-ink-muted">{t('services.paymentStatusLabel')}</dt><dd className="mt-1"><Badge tone={statusTone(viewing.paymentStatus)}>{statusLabel(viewing.paymentStatus, t)}</Badge></dd></div>
            {viewing.notes ? <div className="col-span-2"><dt className="text-ink-muted">{t('common.notes')}</dt><dd>{viewing.notes}</dd></div> : null}
          </dl>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={t('services.deleteTitle')}
        message={t('services.deleteMessage', { property: removeTarget?.propertyAddress ?? '' })}
        confirmLabel={t('services.delete')}
        tone="danger"
        busy={busy}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void remove()}
      />
    </div>
  )
}
