import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, HandCoins, Receipt, TrendingUp, Users, Wallet, Clock3, UserCheck } from 'lucide-react'
import { ChartCard, EmployeeBars, MoneyBars, ProfitBars, TypeDonut, seriesIsEmpty } from '../components/Charts'
import { DateRangeControl, type DatePreset } from '../components/DateRangeControl'
import { Badge, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useI18n } from '../i18n'
import { api, errorMessage } from '../lib/api'
import { presetRange } from '../lib/dates'
import { formatDate, formatGBP, formatPercent } from '../lib/format'
import { serviceTypeLabel } from '../lib/labels'
import type { DashboardData, Kpi } from '../lib/types'
import { useTitle } from '../lib/useTitle'

const initial = presetRange('month')

export function DashboardPage() {
  const { t, text } = useI18n()
  useTitle(t('dashboard.title'))
  const [preset, setPreset] = useState<DatePreset>('month')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function changeText(kpi: Kpi) {
    if (kpi.changePercent == null) {
      return kpi.previous === 0 && kpi.amount !== 0 ? t('dashboard.newPeriod') : t('dashboard.noChange')
    }
    return t('dashboard.vsPrevious', { percent: formatPercent(kpi.changePercent) })
  }

  function load(nextFrom = from, nextTo = to) {
    if (!nextFrom || !nextTo || nextFrom > nextTo) {
      setError(t('dates.invalid'))
      setLoading(false)
      return
    }
    setLoading(true)
    api<DashboardData>(`/api/dashboard?from=${nextFrom}&to=${nextTo}`)
      .then((result) => {
        setData(result)
        setError('')
      })
      .catch((caught) => setError(text(errorMessage(caught))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(from, to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, t])

  const serviceTypes = data?.serviceTypes.map((slice) => ({
    ...slice,
    label: serviceTypeLabel(slice.key, t),
  }))

  return (
    <div>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
      <DateRangeControl
        preset={preset}
        from={from}
        to={to}
        onChange={(next) => {
          setPreset(next.preset)
          setFrom(next.from)
          setTo(next.to)
        }}
      />
      {error ? <div className="mt-4"><ErrorBanner message={error} onRetry={() => load()} /></div> : null}
      {loading && !data ? <LoadingState label={t('dashboard.loading')} /> : null}
      {data ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: t('dashboard.revenue'), value: formatGBP(data.kpis.revenue.amount), hint: t('dashboard.revenueHint'), change: changeText(data.kpis.revenue), icon: Wallet, tone: '' },
              { label: t('dashboard.payments'), value: formatGBP(data.kpis.employeePayments.amount), hint: t('dashboard.paymentsHint'), change: changeText(data.kpis.employeePayments), icon: Users, tone: '' },
              { label: t('dashboard.expenses'), value: formatGBP(data.kpis.expenses.amount), hint: t('dashboard.expensesHint'), change: changeText(data.kpis.expenses), icon: Receipt, tone: '' },
              { label: t('dashboard.profit'), value: formatGBP(data.kpis.profit.amount), hint: t('dashboard.profitHint'), change: changeText(data.kpis.profit), icon: TrendingUp, tone: data.kpis.profit.amount < 0 ? 'text-danger' : data.kpis.profit.amount > 0 ? 'text-success' : 'text-ink' },
            ].map((card) => (
              <Card key={card.label} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{card.label}</p>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light text-brand">
                    <card.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <p className={`mt-3 text-2xl font-semibold tracking-tight ${card.tone || 'text-ink'}`}>{card.value}</p>
                <p className="mt-1 text-xs text-ink-muted">{card.change}</p>
                <p className="mt-3 text-xs leading-5 text-ink-muted">{card.hint}</p>
              </Card>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('dashboard.reimbursements')}</p>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light text-brand"><HandCoins className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{formatGBP(data.kpis.reimbursements.amount)}</p>
              <p className="mt-1 text-xs text-ink-muted">{changeText(data.kpis.reimbursements)}</p>
              <p className="mt-3 text-xs leading-5 text-ink-muted">{t('dashboard.reimbursementsHint')}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('dashboard.outstanding')}</p>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{formatGBP(data.counts.outstandingPayments)}</p>
              <p className="mt-3 text-xs leading-5 text-ink-muted">{t('dashboard.outstandingHint')}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('dashboard.jobs')}</p>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light text-brand"><Briefcase className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{data.counts.jobs}</p>
              <p className="mt-3 text-xs leading-5 text-ink-muted">{t('dashboard.jobsHint')}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('dashboard.activeEmployees')}</p>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light text-brand"><UserCheck className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{data.counts.activeEmployees}</p>
              <p className="mt-3 text-xs leading-5 text-ink-muted">{t('dashboard.activeEmployeesHint')}</p>
            </Card>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-muted">{t('dashboard.formula')}</p>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <ChartCard title={t('dashboard.chartCompare')} subtitle={t('dashboard.chartCompareHint')} empty={seriesIsEmpty(data.series)}>
              <MoneyBars data={data.series} />
            </ChartCard>
            <ChartCard
              title={t('dashboard.chartProfit')}
              subtitle={t('dashboard.chartProfitHint')}
              empty={data.monthlyProfit.every((point) => point.profit === 0 && point.revenue === 0 && point.expenses === 0)}
            >
              <ProfitBars data={data.monthlyProfit} />
            </ChartCard>
            <ChartCard title={t('dashboard.chartEmployees')} empty={data.servicesByEmployee.length === 0}>
              <EmployeeBars data={data.servicesByEmployee} />
            </ChartCard>
            <ChartCard title={t('dashboard.chartTypes')} empty={(serviceTypes ?? []).length === 0}>
              <TypeDonut data={serviceTypes ?? []} />
            </ChartCard>
          </div>

          <div className="mt-8 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">{t('dashboard.recent')}</h2>
            <Link to="/services" className="text-sm font-semibold text-brand">{t('dashboard.viewAll')}</Link>
          </div>
          {data.recentServices.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={t('dashboard.emptyServicesTitle')} body={t('dashboard.emptyServicesBody')} />
            </div>
          ) : (
            <Card className="mt-3 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full">
                  <thead className="border-b border-line bg-brand-soft">
                    <tr>
                      {['date', 'property', 'type', 'employee', 'revenue', 'payment', 'expenses', 'profit', 'status'].map((heading) => (
                        <th key={heading} className={thClass}>{t(`dashboard.columns.${heading}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentServices.map((service) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-ink">{t('dashboard.pendingTitle')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t('dashboard.pendingHint')}</p>
          </div>
          {data.pendingPayments.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={t('dashboard.emptyPendingTitle')} body={t('dashboard.emptyPendingBody')} />
            </div>
          ) : (
            <Card className="mt-3 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full">
                  <thead className="border-b border-line bg-brand-soft">
                    <tr>
                      {['employee', 'services', 'earnings', 'reimbursements', 'due', 'status'].map((heading) => (
                        <th key={heading} className={thClass}>{t(`dashboard.columns.${heading}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pendingPayments.map((row) => (
                      <tr key={row.employeeId} className="border-b border-line last:border-0">
                        <td className={`${tdClass} font-medium`}>{row.employeeName}</td>
                        <td className={tdClass}>{row.serviceCount}</td>
                        <td className={tdClass}>{formatGBP(row.workEarnings)}</td>
                        <td className={tdClass}>{formatGBP(row.reimbursements)}</td>
                        <td className={`${tdClass} font-semibold`}>{formatGBP(row.totalDue)}</td>
                        <td className={tdClass}><Badge tone="warning">{t('status.PENDING')}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-line px-4 py-3">
                <Link to="/payments" className="text-sm font-semibold text-brand">{t('dashboard.openPayments')}</Link>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
