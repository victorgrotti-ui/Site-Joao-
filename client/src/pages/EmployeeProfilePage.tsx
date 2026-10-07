import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmployeeFields, validateEmployee, type EmployeeFormState } from '../components/EmployeeForm'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, EmptyState, ErrorBanner, LoadingState, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
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
  const { t, text } = useI18n()
  const { id } = useParams()
  const toast = useToast()
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<EmployeeFormState | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useTitle(data?.employee.fullName ?? t('common.employee'))

  function load() {
    if (!id) return
    setLoading(true)
    api<ProfileResponse>(`/api/employees/${id}`)
      .then((result) => {
        setData(result)
        setError('')
      })
      .catch((caught) => setError(text(errorMessage(caught))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function save() {
    if (!form || !data) return
    const nextErrors = validateEmployee(form, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      await api(`/api/employees/${data.employee.id}`, { method: 'PUT', body: form })
      toast.success(t('employees.updated'))
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

  if (loading) return <LoadingState label={t('employees.loadingOne')} />
  if (error || !data) return <ErrorBanner message={error || t('employees.notFound')} onRetry={load} />

  const stats = [
    [t('employees.totalServices'), String(data.stats.totalServices)],
    [t('employees.totalEarned'), formatGBP(data.stats.totalEarned)],
    [t('employees.pendingPayments'), formatGBP(data.stats.pendingPayments)],
    [t('employees.paidPayments'), formatGBP(data.stats.paidPayments)],
  ]

  return (
    <div>
      <Link to="/employees" className="text-sm font-semibold text-brand">{t('employees.back')}</Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{data.employee.fullName}</h1>
            <Badge tone={statusTone(data.employee.status)}>{statusLabel(data.employee.status, t)}</Badge>
          </div>
          <dl className="mt-3 grid gap-1 text-sm text-ink-muted sm:grid-cols-3">
            <div><dt className="sr-only">{t('common.phone')}</dt><dd>{data.employee.phone || t('common.noPhoneNumber')}</dd></div>
            <div><dt className="sr-only">{t('common.email')}</dt><dd>{data.employee.email || t('common.noEmail')}</dd></div>
            <div><dt className="sr-only">{t('employees.defaultRate')}</dt><dd>{t('employees.defaultRateValue', { amount: formatGBP(data.employee.defaultRate) })}</dd></div>
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
          {t('common.edit')}
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

      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">{t('employees.serviceHistory')}</h2>
      {data.services.length === 0 ? (
        <EmptyState title={t('employees.emptyServicesTitle')} body={t('employees.emptyServicesBody')} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full">
              <thead className="border-b border-line bg-brand-soft">
                <tr>{[t('common.date'), t('dashboard.columns.property'), t('dashboard.columns.type'), t('common.revenue'), t('employees.payment'), t('common.profit'), t('common.status')].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.id} className="border-b border-line last:border-0">
                    <td className={tdClass}>{formatDate(service.serviceDate)}</td>
                    <td className={tdClass}>{service.propertyAddress}</td>
                    <td className={tdClass}>{serviceTypeLabel(service.serviceType, t)}</td>
                    <td className={tdClass}>{formatGBP(service.revenue)}</td>
                    <td className={tdClass}>{formatGBP(service.employeePayment)}</td>
                    <td className={`${tdClass} font-semibold ${service.profit < 0 ? 'text-danger' : 'text-success'}`}>{formatGBP(service.profit)}</td>
                    <td className={tdClass}><Badge tone={statusTone(service.paymentStatus)}>{statusLabel(service.paymentStatus, t)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">{t('employees.paymentHistory')}</h2>
      {data.payments.length === 0 ? (
        <EmptyState title={t('employees.emptyPaymentsTitle')} body={t('employees.emptyPaymentsBody')} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full">
              <thead className="border-b border-line bg-brand-soft">
                <tr>{[t('payments.periodColumn'), t('payments.work'), t('payments.reimbursements'), t('payments.totalPaid'), t('payments.paymentDate'), t('common.status')].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-line last:border-0">
                    <td className={tdClass}>{formatDateRange(payment.periodStart, payment.periodEnd)}{payment.installment > 1 ? ` · ${t('common.additional')}` : ''}</td>
                    <td className={tdClass}>{formatGBP(payment.workEarnings)}</td>
                    <td className={tdClass}>{formatGBP(payment.reimbursements)}</td>
                    <td className={`${tdClass} font-semibold`}>{formatGBP(payment.totalAmount)}</td>
                    <td className={tdClass}>{payment.paymentDate ? formatDate(payment.paymentDate) : t('common.none')}</td>
                    <td className={tdClass}><Badge tone={statusTone(payment.status)}>{statusLabel(payment.status, t)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} title={t('employees.editTitle')} onClose={() => !busy && setOpen(false)}>
        {form ? <EmployeeFields form={form} onChange={setForm} errors={errors} /> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={() => void save()} disabled={busy}>{busy ? t('common.saving') : t('employees.save')}</Button>
        </div>
      </Modal>
    </div>
  )
}
