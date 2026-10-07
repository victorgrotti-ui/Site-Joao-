import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, LoadingState, MoneyInput, PageHeader, SelectInput, TextArea, TextInput, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
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

function validate(form: ServiceForm) {
  const errors: Record<string, string> = {}
  if (!form.serviceDate) errors.serviceDate = 'Enter the service date.'
  if (form.propertyAddress.trim().length < 3) errors.propertyAddress = 'Enter the property or address.'
  if (form.clientName.trim().length < 2) errors.clientName = 'Enter the contracting company or client.'
  if (!form.employeeId) errors.employeeId = 'Choose an employee.'
  if (parseMoneyToPence(form.revenue) == null) errors.revenue = 'Enter the revenue received.'
  if (parseMoneyToPence(form.employeePayment) == null) errors.employeePayment = 'Enter the employee payment.'
  if (parseMoneyToPence(form.cleaningProductsCost) == null) errors.cleaningProductsCost = 'Enter the cleaning products cost, or 0.'
  if (parseMoneyToPence(form.otherExpenses) == null) errors.otherExpenses = 'Enter other expenses, or 0.'
  return errors
}

export function ServicesPage() {
  useTitle('Services')
  const toast = useToast()
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
      .catch((caught) => setError(errorMessage(caught)))
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
      toast.success('Service saved successfully.')
      setOpen(false)
      load()
    } catch (caught) {
      setErrors(fieldErrors(caught))
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!removeTarget) return
    setBusy(true)
    try {
      await api(`/api/services/${removeTarget.id}`, { method: 'DELETE' })
      toast.success('Service deleted.')
      setRemoveTarget(null)
      load()
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Each service is one cleaning job. Profit is revenue minus the employee payment and costs."
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
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        }
      />
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm font-medium text-ink">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
        <label className="text-sm font-medium text-ink">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
        <label className="text-sm font-medium text-ink">Employee
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">Service type
          <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All types</option>
            {SERVICE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">Client<TextInput className="mt-1" value={client} onChange={(event) => setClient(event.target.value)} placeholder="Contracting company" /></label>
        <label className="text-sm font-medium text-ink">Payment status
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </label>
        <label className="text-sm font-medium text-ink md:col-span-2">Property / address
          <TextInput className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search address" />
        </label>
        <div className="flex items-end">
          <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setEmployeeId(''); setServiceType(''); setClient(''); setPaymentStatus(''); setSearch('') }}>Clear filters</Button>
        </div>
      </Card>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingState label="Loading services" /> : null}
      {!loading && services.length === 0 ? (
        <EmptyState title="No services match" body="Add a cleaning job, or change the filters. Figures stay at zero until a service is saved." />
      ) : null}
      {!loading && services.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {services.map((service) => (
              <Card key={service.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{service.propertyAddress}</p>
                    <p className="text-sm text-ink-muted">{formatDate(service.serviceDate)} · {serviceTypeLabel(service.serviceType)}</p>
                    <p className="text-sm text-ink-muted">{service.employeeName} · {service.clientName}</p>
                  </div>
                  <Badge tone={statusTone(service.paymentStatus)}>{statusLabel(service.paymentStatus)}</Badge>
                </div>
                <p className={`mt-3 text-lg font-semibold ${service.profit < 0 ? 'text-danger' : 'text-success'}`}>Profit {formatGBP(service.profit)}</p>
                <p className="text-sm text-ink-muted">Revenue {formatGBP(service.revenue)} · Payment {formatGBP(service.employeePayment)} · Expenses {formatGBP(service.totalExpenses)}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setViewing(service)}>View</Button>
                  <Button variant="secondary" onClick={() => { setEditing(service); setForm(fromService(service)); setErrors({}); setOpen(true) }}>Edit</Button>
                  <Button variant="ghost" onClick={() => setRemoveTarget(service)}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead className="border-b border-line bg-brand-soft">
                  <tr>{['Date', 'Property', 'Service type', 'Employee', 'Revenue', 'Employee payment', 'Expenses', 'Profit', 'Payment status', 'Actions'].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="border-b border-line last:border-0">
                      <td className={tdClass}>{formatDate(service.serviceDate)}</td>
                      <td className={tdClass}>{service.propertyAddress}</td>
                      <td className={tdClass}>{serviceTypeLabel(service.serviceType)}</td>
                      <td className={tdClass}>{service.employeeName}</td>
                      <td className={tdClass}>{formatGBP(service.revenue)}</td>
                      <td className={tdClass}>{formatGBP(service.employeePayment)}</td>
                      <td className={tdClass}>{formatGBP(service.totalExpenses)}</td>
                      <td className={`${tdClass} font-semibold ${service.profit < 0 ? 'text-danger' : 'text-success'}`}>{formatGBP(service.profit)}</td>
                      <td className={tdClass}><Badge tone={statusTone(service.paymentStatus)}>{statusLabel(service.paymentStatus)}</Badge></td>
                      <td className={tdClass}>
                        <div className="flex">
                          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft" aria-label="View service" title="View" onClick={() => setViewing(service)}><Eye className="h-4 w-4" /></button>
                          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft" aria-label="Edit service" title="Edit" onClick={() => { setEditing(service); setForm(fromService(service)); setErrors({}); setOpen(true) }}><Pencil className="h-4 w-4" /></button>
                          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-danger" aria-label="Delete service" title="Delete" onClick={() => setRemoveTarget(service)}><Trash2 className="h-4 w-4" /></button>
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

      <Modal open={open} wide title={editing ? 'Edit service' : 'Add service'} subtitle="Enter the job once. The profit is calculated for you." onClose={() => !busy && setOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service date" error={errors.serviceDate}>
            <TextInput type="date" value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} />
          </Field>
          <Field label="Service type">
            <SelectInput value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })}>
              {SERVICE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Property / address" error={errors.propertyAddress}>
              <TextInput value={form.propertyAddress} onChange={(event) => setForm({ ...form, propertyAddress: event.target.value })} />
            </Field>
          </div>
          <Field label="Contracting company / client" error={errors.clientName}>
            <TextInput value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
          </Field>
          <Field label="Assigned employee" error={errors.employeeId} hint="Choosing an employee fills their usual rate. You can type a different payment for this job.">
            <SelectInput value={form.employeeId} onChange={(event) => updateEmployee(event.target.value)}>
              <option value="">Choose an employee</option>
              {choices.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName} — {formatGBP(employee.defaultRate)}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Revenue received" error={errors.revenue}>
            <MoneyInput value={form.revenue} onChange={(revenue) => setForm({ ...form, revenue })} />
          </Field>
          <Field label="Employee payment" error={errors.employeePayment}>
            <MoneyInput value={form.employeePayment} onChange={(employeePayment) => setForm({ ...form, employeePayment })} />
          </Field>
          <Field label="Cleaning products cost" error={errors.cleaningProductsCost}>
            <MoneyInput value={form.cleaningProductsCost} onChange={(cleaningProductsCost) => setForm({ ...form, cleaningProductsCost })} />
          </Field>
          <Field label="Other expenses" error={errors.otherExpenses}>
            <MoneyInput value={form.otherExpenses} onChange={(otherExpenses) => setForm({ ...form, otherExpenses })} />
          </Field>
          <label className="flex items-start gap-3 rounded-xl bg-brand-soft p-3 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={form.productsReimbursable} onChange={(event) => setForm({ ...form, productsReimbursable: event.target.checked })} />
            <span>
              <span className="font-medium text-ink">Employee paid for the cleaning products and should be reimbursed</span>
              <span className="mt-1 block text-ink-muted">The cost is counted once as a company expense. It is also added to the employee’s payment. It is not deducted from profit twice.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-brand-soft p-3 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={form.otherReimbursable} onChange={(event) => setForm({ ...form, otherReimbursable: event.target.checked })} />
            <span>
              <span className="font-medium text-ink">Employee paid the other expenses personally</span>
              <span className="mt-1 block text-ink-muted">Use this only for the amount in Other expenses above.</span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
          </div>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl bg-brand-light p-4 sm:grid-cols-2" aria-live="polite">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Net profit</p>
            <p className={`text-3xl font-semibold ${preview && preview.profit < 0 ? 'text-danger' : 'text-brand'}`}>{preview ? formatGBP(preview.profit) : '—'}</p>
            <p className="mt-1 text-xs text-ink-muted">Revenue − employee payment − cleaning products − other expenses{preview ? ` = ${formatGBP(preview.revenue)} − ${formatGBP(preview.payment)} − ${formatGBP(preview.products)} − ${formatGBP(preview.other)}` : ''}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Employee total due for this job</p>
            <p className="text-2xl font-semibold text-ink">{preview ? formatGBP(preview.due) : '—'}</p>
            <p className="mt-1 text-xs text-ink-muted">{preview && preview.reimbursement > 0 ? `${formatGBP(preview.payment)} work + ${formatGBP(preview.reimbursement)} reimbursement` : 'Work payment only. No reimbursement on this job.'}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={() => void save()} disabled={busy} data-testid="save-service">{busy ? 'Saving…' : 'Save service'}</Button>
        </div>
      </Modal>

      <Modal open={Boolean(viewing)} title={viewing?.propertyAddress ?? 'Service'} onClose={() => setViewing(null)}>
        {viewing ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-ink-muted">Date</dt><dd className="font-medium">{formatDate(viewing.serviceDate)}</dd></div>
            <div><dt className="text-ink-muted">Type</dt><dd className="font-medium">{serviceTypeLabel(viewing.serviceType)}</dd></div>
            <div><dt className="text-ink-muted">Client</dt><dd className="font-medium">{viewing.clientName}</dd></div>
            <div><dt className="text-ink-muted">Employee</dt><dd className="font-medium">{viewing.employeeName}</dd></div>
            <div><dt className="text-ink-muted">Revenue</dt><dd className="font-medium">{formatGBP(viewing.revenue)}</dd></div>
            <div><dt className="text-ink-muted">Employee payment</dt><dd className="font-medium">{formatGBP(viewing.employeePayment)}</dd></div>
            <div><dt className="text-ink-muted">Expenses</dt><dd className="font-medium">{formatGBP(viewing.totalExpenses)}</dd></div>
            <div><dt className="text-ink-muted">Profit</dt><dd className="font-semibold">{formatGBP(viewing.profit)}</dd></div>
            <div className="col-span-2"><dt className="text-ink-muted">Payment status</dt><dd className="mt-1"><Badge tone={statusTone(viewing.paymentStatus)}>{statusLabel(viewing.paymentStatus)}</Badge></dd></div>
            {viewing.notes ? <div className="col-span-2"><dt className="text-ink-muted">Notes</dt><dd>{viewing.notes}</dd></div> : null}
          </dl>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Delete service"
        message={`Delete the service at ${removeTarget?.propertyAddress ?? 'this property'}? This cannot be undone. A service already included in a payment is kept.`}
        confirmLabel="Delete service"
        tone="danger"
        busy={busy}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void remove()}
      />
    </div>
  )
}
