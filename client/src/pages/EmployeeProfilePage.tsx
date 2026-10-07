import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmployeeFields, validateEmployee, type EmployeeFormState } from '../components/EmployeeForm'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, EmptyState, ErrorBanner, LoadingState, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { formatDate, formatDateRange, formatGBP, penceToInput } from '../lib/format'
import { serviceTypeLabel } from '../lib/labels'
import type { Employee, PaymentRecord, ServiceRecord } from '../lib/types'
import { useTitle } from '../lib/useTitle'

interface ProfileResponse {
  employee: Employee
  stats: { totalServices: number; totalEarned: number; pendingPayments: number; paidPayments: number }
  services: ServiceRecord[]
  payments: PaymentRecord[]
}

export function EmployeeProfilePage() {
  const { id } = useParams()
  const toast = useToast()
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<EmployeeFormState | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useTitle(data?.employee.fullName ?? 'Employee')

  function load() {
    if (!id) return
    setLoading(true)
    api<ProfileResponse>(`/api/employees/${id}`)
      .then((result) => {
        setData(result)
        setError('')
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function save() {
    if (!form || !data) return
    const nextErrors = validateEmployee(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      await api(`/api/employees/${data.employee.id}`, { method: 'PUT', body: form })
      toast.success('Employee updated successfully.')
      setOpen(false)
      load()
    } catch (caught) {
      setErrors(fieldErrors(caught))
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading employee" />
  if (error || !data) return <ErrorBanner message={error || 'Employee not found.'} onRetry={load} />

  const stats = [
    ['Total services', String(data.stats.totalServices)],
    ['Total earned', formatGBP(data.stats.totalEarned)],
    ['Pending payments', formatGBP(data.stats.pendingPayments)],
    ['Paid payments', formatGBP(data.stats.paidPayments)],
  ]

  return (
    <div>
      <Link to="/employees" className="text-sm font-semibold text-brand">Back to employees</Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{data.employee.fullName}</h1>
            <Badge tone={statusTone(data.employee.status)}>{statusLabel(data.employee.status)}</Badge>
          </div>
          <dl className="mt-3 grid gap-1 text-sm text-ink-muted sm:grid-cols-3">
            <div><dt className="sr-only">Phone</dt><dd>{data.employee.phone || 'No phone number'}</dd></div>
            <div><dt className="sr-only">Email</dt><dd>{data.employee.email || 'No email'}</dd></div>
            <div><dt className="sr-only">Default rate</dt><dd>Default rate {formatGBP(data.employee.defaultRate)}</dd></div>
          </dl>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setForm({
              fullName: data.employee.fullName,
              phone: data.employee.phone ?? '',
              email: data.employee.email ?? '',
              defaultRate: penceToInput(data.employee.defaultRate),
              status: data.employee.status,
              notes: data.employee.notes ?? '',
            })
            setErrors({})
            setOpen(true)
          }}
        >
          Edit
        </Button>
      </div>
      {data.employee.notes ? <p className="mt-4 max-w-3xl text-sm leading-6 text-ink">{data.employee.notes}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Service history</h2>
      {data.services.length === 0 ? (
        <EmptyState title="No services yet" body="Services assigned to this employee will be listed here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full">
              <thead className="border-b border-line bg-brand-soft">
                <tr>{['Date', 'Property', 'Service type', 'Revenue', 'Payment', 'Profit', 'Status'].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.id} className="border-b border-line last:border-0">
                    <td className={tdClass}>{formatDate(service.serviceDate)}</td>
                    <td className={tdClass}>{service.propertyAddress}</td>
                    <td className={tdClass}>{serviceTypeLabel(service.serviceType)}</td>
                    <td className={tdClass}>{formatGBP(service.revenue)}</td>
                    <td className={tdClass}>{formatGBP(service.employeePayment)}</td>
                    <td className={`${tdClass} font-semibold ${service.profit < 0 ? 'text-danger' : 'text-success'}`}>{formatGBP(service.profit)}</td>
                    <td className={tdClass}><Badge tone={statusTone(service.paymentStatus)}>{statusLabel(service.paymentStatus)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Payment history</h2>
      {data.payments.length === 0 ? (
        <EmptyState title="No payments recorded" body="When you mark a weekly payment as paid, it will be kept here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full">
              <thead className="border-b border-line bg-brand-soft">
                <tr>{['Payment period', 'Work earnings', 'Reimbursements', 'Total paid', 'Payment date', 'Status'].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-line last:border-0">
                    <td className={tdClass}>{formatDateRange(payment.periodStart, payment.periodEnd)}{payment.installment > 1 ? ' · Additional' : ''}</td>
                    <td className={tdClass}>{formatGBP(payment.workEarnings)}</td>
                    <td className={tdClass}>{formatGBP(payment.reimbursements)}</td>
                    <td className={`${tdClass} font-semibold`}>{formatGBP(payment.totalAmount)}</td>
                    <td className={tdClass}>{payment.paymentDate ? formatDate(payment.paymentDate) : '—'}</td>
                    <td className={tdClass}><Badge tone={statusTone(payment.status)}>{statusLabel(payment.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} title="Edit employee" onClose={() => !busy && setOpen(false)}>
        {form ? <EmployeeFields form={form} onChange={setForm} errors={errors} /> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Save employee'}</Button>
        </div>
      </Modal>
    </div>
  )
}
