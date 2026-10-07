import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ConfirmDialog } from '../components/Modal'
import { Badge, Button, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
import { ApiError, api, errorMessage } from '../lib/api'
import { endOfWeek, shiftISODate, startOfWeek, todayISO, toISODate } from '../lib/dates'
import { formatDate, formatDateRange, formatGBP } from '../lib/format'
import type { Employee, PaymentRecord, PeriodRow, Settings } from '../lib/types'
import { useTitle } from '../lib/useTitle'

function currentWeek() {
  const today = new Date()
  return { from: toISODate(startOfWeek(today)), to: toISODate(endOfWeek(today)) }
}

export function PaymentsPage() {
  const { t, text } = useI18n()
  useTitle(t('payments.title'))
  const toast = useToast()
  const initial = currentWeek()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [rows, setRows] = useState<PeriodRow[]>([])
  const [attention, setAttention] = useState<Array<{ employeeId: string; employeeName: string; totalDue: number }>>([])
  const [history, setHistory] = useState<PaymentRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [paymentDay, setPaymentDay] = useState('')
  const [historyEmployee, setHistoryEmployee] = useState('')
  const [historyStatus, setHistoryStatus] = useState('')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<PeriodRow | null>(null)
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [additional, setAdditional] = useState<{ row: PeriodRow; outstanding: number } | null>(null)
  const [busy, setBusy] = useState(false)

  function load() {
    const params = new URLSearchParams()
    if (historyEmployee) params.set('employeeId', historyEmployee)
    if (historyStatus) params.set('status', historyStatus)
    if (historyFrom && historyTo) {
      params.set('from', historyFrom)
      params.set('to', historyTo)
    }
    setLoading(true)
    Promise.all([
      api<{ rows: PeriodRow[]; attention: typeof attention }>(`/api/payments/period?from=${from}&to=${to}`),
      api<{ payments: PaymentRecord[] }>(`/api/payments?${params.toString()}`),
      api<{ employees: Employee[] }>('/api/employees'),
      api<{ settings: Settings }>('/api/settings'),
    ])
      .then(([period, payments, employeeData, settings]) => {
        setRows(period.rows)
        setAttention(period.attention)
        setHistory(payments.payments)
        setEmployees(employeeData.employees)
        setPaymentDay(settings.settings.defaultPaymentDay)
        setError('')
      })
      .catch((caught) => setError(text(errorMessage(caught))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, historyEmployee, historyStatus, historyFrom, historyTo])

  async function markPaid(row: PeriodRow, confirmAdditional: boolean) {
    setBusy(true)
    try {
      await api('/api/payments/mark-paid', {
        method: 'POST',
        body: {
          employeeId: row.employeeId,
          periodStart: from,
          periodEnd: to,
          paymentDate,
          confirmAdditional,
        },
      })
      toast.success(t('payments.marked'))
      setTarget(null)
      setAdditional(null)
      load()
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'DUPLICATE_PAYMENT') {
        setTarget(null)
        if ((caught.outstandingPence ?? 0) > 0) setAdditional({ row, outstanding: caught.outstandingPence ?? 0 })
        else toast.error(text(caught.message))
      } else {
        toast.error(text(errorMessage(caught)))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('payments.title')}
        subtitle={t('payments.subtitle')}
      />
      <p className="mb-4 text-sm leading-6 text-ink-muted">
        {t('payments.intro', { day: t(`days.${paymentDay || 'SATURDAY'}`) })}
      </p>
      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" aria-label={t('payments.previous')} onClick={() => { setFrom(shiftISODate(from, -7)); setTo(shiftISODate(to, -7)) }}><ChevronLeft className="h-4 w-4" /></Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('payments.period')}</p>
            <p className="font-semibold text-ink">{formatDateRange(from, to)}</p>
          </div>
          <Button variant="secondary" aria-label={t('payments.next')} onClick={() => { setFrom(shiftISODate(from, 7)); setTo(shiftISODate(to, 7)) }}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button variant="ghost" onClick={() => { const week = currentWeek(); setFrom(week.from); setTo(week.to) }}>{t('payments.thisWeek')}</Button>
      </Card>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">{t('payments.periodStart')}
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" />
        </label>
        <label className="text-sm font-medium text-ink">{t('payments.periodEnd')}
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" />
        </label>
      </div>
      {attention.length > 0 ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{t('payments.outsideTitle')}</p>
          <ul className="mt-1 space-y-1">
            {attention.map((item) => (
              <li key={item.employeeId}>{item.employeeName}: {formatGBP(item.totalDue)}</li>
            ))}
          </ul>
          <p className="mt-2">{t('payments.outsideHint')}</p>
        </div>
      ) : null}
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingState label={t('payments.loading')} /> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState title={t('payments.emptyTitle')} body={t('payments.emptyBody')} />
      ) : null}
      {!loading && rows.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Card key={row.employeeId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{row.employeeName}</p>
                    <p className="text-sm text-ink-muted">{row.serviceCount === 1 ? t('payments.oneService', { count: row.serviceCount }) : t('payments.manyServices', { count: row.serviceCount })}</p>
                  </div>
                  <Badge tone={statusTone(row.status)}>{statusLabel(row.status, t)}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-ink-muted">{t('payments.work')}</dt><dd className="font-medium">{formatGBP(row.workEarnings)}</dd></div>
                  <div><dt className="text-ink-muted">{t('payments.reimbursements')}</dt><dd className="font-medium">{formatGBP(row.reimbursements)}</dd></div>
                  <div><dt className="text-ink-muted">{t('payments.due')}</dt><dd className="font-semibold">{formatGBP(row.totalDue)}</dd></div>
                  <div><dt className="text-ink-muted">{t('payments.paymentDate')}</dt><dd>{row.paymentDate ? formatDate(row.paymentDate) : t('common.none')}</dd></div>
                </dl>
                {row.alreadyPaidPence > 0 && row.status === 'PENDING' ? <p className="mt-2 text-xs text-ink-muted">{t('payments.already', { amount: formatGBP(row.alreadyPaidPence) })}</p> : null}
                {row.status === 'PENDING' ? <Button className="mt-3 w-full" onClick={() => { setPaymentDate(todayISO()); setTarget(row) }}>{t('payments.mark')}</Button> : null}
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full">
                <thead className="border-b border-line bg-brand-soft">
                  <tr>{[t('common.employee'), t('common.services'), t('payments.work'), t('payments.reimbursements'), t('payments.due'), t('payments.status'), t('payments.paymentDate'), ''].map((heading) => <th key={heading || 'action'} className={thClass}>{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.employeeId} className="border-b border-line last:border-0">
                      <td className={`${tdClass} font-medium`}>
                        {row.employeeName}
                        {row.alreadyPaidPence > 0 && row.status === 'PENDING' ? <span className="mt-1 block text-xs font-normal text-ink-muted">{t('payments.already', { amount: formatGBP(row.alreadyPaidPence) })}</span> : null}
                      </td>
                      <td className={tdClass}>{row.serviceCount}</td>
                      <td className={tdClass}>{formatGBP(row.workEarnings)}</td>
                      <td className={tdClass}>{formatGBP(row.reimbursements)}</td>
                      <td className={`${tdClass} font-semibold`}>{formatGBP(row.totalDue)}</td>
                      <td className={tdClass}><Badge tone={statusTone(row.status)}>{statusLabel(row.status, t)}</Badge></td>
                      <td className={tdClass}>{row.paymentDate ? formatDate(row.paymentDate) : t('common.none')}</td>
                      <td className={tdClass}>
                        {row.status === 'PENDING' ? <Button data-testid="mark-paid" onClick={() => { setPaymentDate(todayISO()); setTarget(row) }}>{t('payments.mark')}</Button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      <h2 className="mb-3 mt-10 text-lg font-semibold">{t('payments.history')}</h2>
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-4">
        <label className="text-sm font-medium">{t('common.employee')}
          <select value={historyEmployee} onChange={(event) => setHistoryEmployee(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">{t('payments.allEmployees')}</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">{t('common.status')}
          <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">{t('common.all')}</option>
            <option value="PENDING">{t('status.PENDING')}</option>
            <option value="PAID">{t('status.PAID')}</option>
          </select>
        </label>
        <label className="text-sm font-medium">{t('payments.periodFrom')}<input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
        <label className="text-sm font-medium">{t('payments.periodTo')}<input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
      </Card>
      {history.length === 0 ? (
        <EmptyState title={t('payments.emptyHistoryTitle')} body={t('payments.emptyHistoryBody')} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full">
              <thead className="border-b border-line bg-brand-soft">
                <tr>{[t('common.employee'), t('payments.periodColumn'), t('payments.work'), t('payments.reimbursements'), t('payments.totalPaid'), t('payments.paymentDate'), t('common.status')].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
              </thead>
              <tbody>
                {history.map((payment) => (
                  <tr key={payment.id} className="border-b border-line last:border-0">
                    <td className={tdClass}>{payment.employeeName}</td>
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

      <ConfirmDialog
        open={Boolean(target)}
        title={t('payments.confirmTitle')}
        message={t('payments.confirmMessage')}
        confirmLabel={t('payments.mark')}
        busy={busy}
        onClose={() => setTarget(null)}
        onConfirm={() => target && void markPaid(target, false)}
      >
        {target ? (
          <div className="mt-4 space-y-3 rounded-xl bg-brand-soft p-4 text-sm">
            <p className="font-semibold text-ink">{target.employeeName}</p>
            <p>{formatDateRange(from, to)}</p>
            <p>{t('payments.work')} {formatGBP(target.workEarnings)}</p>
            <p>{t('payments.reimbursements')} {formatGBP(target.reimbursements)}</p>
            <p className="font-semibold">{t('payments.due')} {formatGBP(target.totalDue)}</p>
            <label className="block font-medium">{t('payments.paymentDate')}
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" />
            </label>
          </div>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(additional)}
        title={t('payments.duplicateTitle')}
        message={t('payments.duplicateMessage')}
        confirmLabel={t('payments.recordAdditional')}
        busy={busy}
        onClose={() => setAdditional(null)}
        onConfirm={() => additional && void markPaid(additional.row, true)}
      >
        {additional ? (
          <p className="mt-3 text-sm text-ink">
            {t('payments.stillOutstanding', { amount: formatGBP(additional.outstanding) })}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
