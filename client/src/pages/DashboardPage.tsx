import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, TrendingUp, Users, Wallet } from 'lucide-react'
import { ChartCard, EmployeeBars, MoneyBars, ProfitBars, TypeDonut, seriesIsEmpty } from '../components/Charts'
import { DateRangeControl, type DatePreset } from '../components/DateRangeControl'
import { Badge, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { presetRange } from '../lib/dates'
import { formatDate, formatGBP, formatPercent } from '../lib/format'
import { serviceTypeLabel } from '../lib/labels'
import type { DashboardData, Kpi } from '../lib/types'
import { useTitle } from '../lib/useTitle'

const initial = presetRange('month')

function changeText(kpi: Kpi) {
  if (kpi.changePercent == null) {
    return kpi.previous === 0 && kpi.amount !== 0 ? 'New this period' : 'No change from the previous period'
  }
  return `${formatPercent(kpi.changePercent)} vs previous period`
}

export function DashboardPage() {
  useTitle('Dashboard')
  const [preset, setPreset] = useState<DatePreset>('month')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load(nextFrom = from, nextTo = to) {
    if (!nextFrom || !nextTo || nextFrom > nextTo) {
      setError('The start date must be on or before the end date.')
      setLoading(false)
      return
    }
    setLoading(true)
    api<DashboardData>(`/api/dashboard?from=${nextFrom}&to=${nextTo}`)
      .then((result) => {
        setData(result)
        setError('')
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(from, to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const cards = data
    ? [
        { label: 'Total revenue', value: data.kpis.revenue, icon: Wallet, hint: 'Money received for services' },
        { label: 'Employee payments', value: data.kpis.employeePayments, icon: Users, hint: 'Work earnings, excluding reimbursements' },
        { label: 'Total expenses', value: data.kpis.expenses, icon: Receipt, hint: 'Products, supplies and other costs' },
        { label: 'Net profit', value: data.kpis.profit, icon: TrendingUp, hint: 'Revenue − work payments − expenses' },
      ]
    : []

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your cleaning operations and finances." />
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
      {loading && !data ? <LoadingState label="Loading dashboard" /> : null}
      {data ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const profit = card.label === 'Net profit'
              return (
                <Card key={card.label} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{card.label}</p>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light text-brand">
                      <card.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className={`mt-3 text-2xl font-semibold tracking-tight ${profit && card.value.amount < 0 ? 'text-danger' : profit && card.value.amount > 0 ? 'text-success' : 'text-ink'}`}>
                    {formatGBP(card.value.amount)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{changeText(card.value)}</p>
                  <p className="mt-3 text-xs leading-5 text-ink-muted">{card.hint}</p>
                </Card>
              )
            })}
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Net profit = revenue − employee work payments − expenses. A reimbursement pays back an expense that is already included, so it is not deducted again.
          </p>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <ChartCard title="Revenue, expenses and profit" subtitle="For the dates selected above." empty={seriesIsEmpty(data.series)}>
              <MoneyBars data={data.series} />
            </ChartCard>
            <ChartCard
              title="Profit by month"
              subtitle="The six months up to the end of the selected range."
              empty={data.monthlyProfit.every((point) => point.profit === 0 && point.revenue === 0 && point.expenses === 0)}
            >
              <ProfitBars data={data.monthlyProfit} />
            </ChartCard>
            <ChartCard title="Services by employee" empty={data.servicesByEmployee.length === 0}>
              <EmployeeBars data={data.servicesByEmployee} />
            </ChartCard>
            <ChartCard title="Service type distribution" empty={data.serviceTypes.length === 0}>
              <TypeDonut data={data.serviceTypes} />
            </ChartCard>
          </div>

          <div className="mt-8 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Recent services</h2>
            <Link to="/services" className="text-sm font-semibold text-brand">
              View all services
            </Link>
          </div>
          {data.recentServices.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No services in this period" body="Add a cleaning service and it will appear here with its revenue, costs and profit." />
            </div>
          ) : (
            <Card className="mt-3 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full">
                  <thead className="border-b border-line bg-brand-soft">
                    <tr>
                      {['Date', 'Property', 'Service type', 'Employee', 'Revenue', 'Employee payment', 'Expenses', 'Profit', 'Status'].map((heading) => (
                        <th key={heading} className={thClass}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentServices.map((service) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Pending employee payments</h2>
            <p className="mt-1 text-sm text-ink-muted">All unpaid work and reimbursements, including earlier weeks, so a payment is not forgotten.</p>
          </div>
          {data.pendingPayments.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No pending payments" body="When a service or reimbursable expense is unpaid, the employee and the amount due will show here." />
            </div>
          ) : (
            <Card className="mt-3 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full">
                  <thead className="border-b border-line bg-brand-soft">
                    <tr>
                      {['Employee', 'Services', 'Work earnings', 'Reimbursements', 'Total due', 'Status'].map((heading) => (
                        <th key={heading} className={thClass}>{heading}</th>
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
                        <td className={tdClass}><Badge tone="warning">Pending</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-line px-4 py-3">
                <Link to="/payments" className="text-sm font-semibold text-brand">Open weekly payments</Link>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
