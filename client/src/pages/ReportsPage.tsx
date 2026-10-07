import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { ChartCard, EmployeeBars, MoneyBars, ProfitBars, TypeDonut, seriesIsEmpty } from '../components/Charts'
import { DateRangeControl, type DatePreset } from '../components/DateRangeControl'
import { Button, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { downloadCsv, api, errorMessage } from '../lib/api'
import { presetRange } from '../lib/dates'
import { formatGBP } from '../lib/format'
import { SERVICE_TYPES } from '../lib/labels'
import type { Employee, ReportData } from '../lib/types'
import { useTitle } from '../lib/useTitle'

const initial = presetRange('month')

export function ReportsPage() {
  useTitle('Reports')
  const toast = useToast()
  const [preset, setPreset] = useState<DatePreset>('month')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [employeeId, setEmployeeId] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [client, setClient] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function query() {
    const params = new URLSearchParams({ from, to })
    if (employeeId) params.set('employeeId', employeeId)
    if (serviceType) params.set('serviceType', serviceType)
    if (client.trim()) params.set('client', client.trim())
    if (paymentStatus) params.set('paymentStatus', paymentStatus)
    return params
  }

  function load() {
    if (!from || !to || from > to) {
      setError('The start date must be on or before the end date.')
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([api<ReportData>(`/api/reports?${query().toString()}`), api<{ employees: Employee[] }>('/api/employees')])
      .then(([reportData, employeeData]) => {
        setReport(reportData)
        setEmployees(employeeData.employees)
        setError('')
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, employeeId, serviceType, client, paymentStatus])

  async function exportCsv() {
    try {
      await downloadCsv(`/api/reports/export?${query().toString()}`, `cmh-report-${from}-to-${to}.csv`)
      toast.success('Report exported.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  const summary = report
    ? [
        ['Total revenue', formatGBP(report.summary.revenue)],
        ['Total employee payments', formatGBP(report.summary.employeePayments)],
        ['Total expenses', formatGBP(report.summary.expenses)],
        ['Total profit', formatGBP(report.summary.profit)],
        ['Number of services', String(report.summary.serviceCount)],
        ['Average revenue per service', formatGBP(report.summary.averageRevenue)],
        ['Average profit per service', formatGBP(report.summary.averageProfit)],
      ]
    : []

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Revenue, costs and profit for the dates and work you choose."
        action={<Button onClick={() => void exportCsv()}><Download className="h-4 w-4" /> Export CSV</Button>}
      />
      <DateRangeControl preset={preset} from={from} to={to} onChange={(next) => { setPreset(next.preset); setFrom(next.from); setTo(next.to) }} />
      <Card className="mt-4 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium">Employee
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Service type
          <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All types</option>
            {SERVICE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Contracting company
          <input value={client} onChange={(event) => setClient(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" placeholder="Client name" />
        </label>
        <label className="text-sm font-medium">Payment status
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </label>
      </Card>
      {error ? <div className="mt-4"><ErrorBanner message={error} onRetry={load} /></div> : null}
      {loading && !report ? <LoadingState label="Loading report" /> : null}
      {report ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
                <p className={`mt-2 text-xl font-semibold ${label === 'Total profit' && report.summary.profit < 0 ? 'text-danger' : 'text-ink'}`}>{value}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <ChartCard title="Revenue, expenses and profit" empty={seriesIsEmpty(report.series)}><MoneyBars data={report.series} /></ChartCard>
            <ChartCard title="Profit" empty={seriesIsEmpty(report.series)}><ProfitBars data={report.series} /></ChartCard>
            <ChartCard title="Profit by employee" empty={report.profitByEmployee.length === 0}>
              <ProfitBars data={report.profitByEmployee.map((row) => ({ label: row.name, profit: row.profit }))} />
            </ChartCard>
            <ChartCard title="Services by employee" empty={report.servicesByEmployee.length === 0}><EmployeeBars data={report.servicesByEmployee} /></ChartCard>
            <ChartCard title="Services by type" empty={report.serviceTypes.length === 0}><TypeDonut data={report.serviceTypes} /></ChartCard>
          </div>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Profit by employee</h2>
          {report.profitByEmployee.length === 0 ? (
            <EmptyState title="No results" body="Nothing in the database matches these filters." />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full">
                  <thead className="border-b border-line bg-brand-soft">
                    <tr>{['Employee', 'Services', 'Revenue', 'Employee payments', 'Expenses', 'Profit'].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    {report.profitByEmployee.map((row) => (
                      <tr key={row.employeeId} className="border-b border-line last:border-0">
                        <td className={tdClass}>{row.name}</td>
                        <td className={tdClass}>{row.serviceCount}</td>
                        <td className={tdClass}>{formatGBP(row.revenue)}</td>
                        <td className={tdClass}>{formatGBP(row.employeePayments)}</td>
                        <td className={tdClass}>{formatGBP(row.expenses)}</td>
                        <td className={`${tdClass} font-semibold ${row.profit < 0 ? 'text-danger' : 'text-success'}`}>{formatGBP(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
