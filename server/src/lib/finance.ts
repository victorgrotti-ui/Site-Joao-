import {
  enumerateDates,
  formatUkDay,
  formatUkMonth,
  inRange,
  monthBounds,
  shiftMonth,
} from './dates'

export interface FinanceService {
  id: string
  serviceDate: string
  employeeId: string
  employeeName: string
  serviceType: string
  propertyAddress: string
  clientName: string
  revenue: number
  employeePayment: number
  cleaningProductsCost: number
  otherExpenses: number
  paid: boolean
}

export interface FinanceExpense {
  id: string
  date: string
  amount: number
  employeeId: string | null
  serviceId: string | null
  reimbursable: boolean
  origin: 'MANUAL' | 'SERVICE_PRODUCTS' | 'SERVICE_OTHER'
  category: string
  paid: boolean
}

export interface FinanceEmployee {
  id: string
  fullName: string
}

export interface ReportFilters {
  from: string
  to: string
  employeeId?: string
  serviceType?: string
  client?: string
  paymentStatus?: 'PAID' | 'PENDING'
}

export interface Totals {
  revenue: number
  employeePayments: number
  expenses: number
  profit: number
  serviceCount: number
  averageRevenue: number
  averageProfit: number
}

export interface SeriesPoint {
  key: string
  label: string
  revenue: number
  expenses: number
  profit: number
}

export interface EmployeeProfit {
  employeeId: string
  name: string
  revenue: number
  employeePayments: number
  expenses: number
  profit: number
  serviceCount: number
}

export interface ServiceSlice {
  key: string
  label: string
  count: number
  revenue: number
}

export interface OutstandingRow {
  employeeId: string
  employeeName: string
  serviceIds: string[]
  expenseIds: string[]
  serviceCount: number
  workEarnings: number
  reimbursements: number
  totalDue: number
}

export interface MonthPoint {
  key: string
  label: string
  profit: number
  revenue: number
  expenses: number
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

export function serviceJobExpenses(service: FinanceService, manualLinked = 0): number {
  return service.cleaningProductsCost + service.otherExpenses + manualLinked
}

export function serviceJobProfit(service: FinanceService, manualLinked = 0): number {
  return service.revenue - service.employeePayment - serviceJobExpenses(service, manualLinked)
}

export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function serviceMatches(
  service: FinanceService,
  filters: ReportFilters,
  options?: { ignoreDate?: boolean },
): boolean {
  if (!options?.ignoreDate && !inRange(service.serviceDate, filters.from, filters.to)) return false
  if (filters.employeeId && service.employeeId !== filters.employeeId) return false
  if (filters.serviceType && service.serviceType !== filters.serviceType) return false
  if (filters.client && !service.clientName.toLowerCase().includes(filters.client.trim().toLowerCase())) return false
  if (filters.paymentStatus === 'PAID' && !service.paid) return false
  if (filters.paymentStatus === 'PENDING' && service.paid) return false
  return true
}

export function servicesInView(services: FinanceService[], filters: ReportFilters): FinanceService[] {
  return services.filter((service) => serviceMatches(service, filters))
}

function hasServiceSpecificFilter(filters: ReportFilters): boolean {
  return Boolean(filters.serviceType || filters.client || filters.paymentStatus)
}

/** Expenses that belong in a filtered financial view. Synced service costs are included once. */
export function expensesInView(
  expenses: FinanceExpense[],
  services: FinanceService[],
  filters: ReportFilters,
): FinanceExpense[] {
  const byId = new Map(services.map((service) => [service.id, service]))
  const serviceSpecific = hasServiceSpecificFilter(filters)
  return expenses.filter((expense) => {
    if (!inRange(expense.date, filters.from, filters.to)) return false
    if (expense.serviceId) {
      const service = byId.get(expense.serviceId)
      if (!service) return false
      return serviceMatches(service, filters, { ignoreDate: true })
    }
    if (serviceSpecific) return false
    if (filters.employeeId && expense.employeeId !== filters.employeeId) return false
    return true
  })
}

function embeddedShortfall(services: FinanceService[], expenses: FinanceExpense[]): number {
  let shortfall = 0
  for (const service of services) {
    const expected = service.cleaningProductsCost + service.otherExpenses
    const ledger = sum(
      expenses
        .filter((expense) => expense.serviceId === service.id && expense.origin !== 'MANUAL')
        .map((expense) => expense.amount),
    )
    if (ledger < expected) shortfall += expected - ledger
  }
  return shortfall
}

export function summarise(
  services: FinanceService[],
  expenses: FinanceExpense[],
  filters: ReportFilters,
): Totals {
  const viewed = servicesInView(services, filters)
  const viewedExpenses = expensesInView(expenses, services, filters)
  const revenue = sum(viewed.map((service) => service.revenue))
  const employeePayments = sum(viewed.map((service) => service.employeePayment))
  const ledgerExpenses = sum(viewedExpenses.map((expense) => expense.amount))
  const expenseTotal = ledgerExpenses + embeddedShortfall(viewed, expenses)
  const profit = revenue - employeePayments - expenseTotal
  const serviceCount = viewed.length
  return {
    revenue,
    employeePayments,
    expenses: expenseTotal,
    profit,
    serviceCount,
    averageRevenue: serviceCount ? Math.round(revenue / serviceCount) : 0,
    averageProfit: serviceCount ? Math.round(profit / serviceCount) : 0,
  }
}

function bucketKey(iso: string, mode: 'day' | 'week' | 'month'): string {
  if (mode === 'month') return iso.slice(0, 7)
  if (mode === 'day') return iso
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

function bucketLabel(key: string, mode: 'day' | 'week' | 'month'): string {
  if (mode === 'month') {
    const [year, month] = key.split('-').map(Number)
    return formatUkMonth(year, month)
  }
  return formatUkDay(key)
}

export function buildSeries(
  services: FinanceService[],
  expenses: FinanceExpense[],
  filters: ReportFilters,
): SeriesPoint[] {
  const days = enumerateDates(filters.from, filters.to)
  const mode: 'day' | 'week' | 'month' = days.length <= 31 ? 'day' : days.length <= 120 ? 'week' : 'month'
  const viewed = servicesInView(services, filters)
  const viewedExpenses = expensesInView(expenses, services, filters)
  const buckets = new Map<string, { revenue: number; labor: number; expenses: number }>()

  const ensure = (key: string) => {
    if (!buckets.has(key)) buckets.set(key, { revenue: 0, labor: 0, expenses: 0 })
    return buckets.get(key)!
  }

  if (mode === 'day') {
    for (const day of days) ensure(day)
  } else if (mode === 'week') {
    for (const day of days) ensure(bucketKey(day, 'week'))
  } else {
    for (const day of days) ensure(bucketKey(day, 'month'))
  }

  for (const service of viewed) {
    const bucket = ensure(bucketKey(service.serviceDate, mode))
    bucket.revenue += service.revenue
    bucket.labor += service.employeePayment
  }

  for (const expense of viewedExpenses) {
    const bucket = ensure(bucketKey(expense.date, mode))
    bucket.expenses += expense.amount
  }

  const shortfall = embeddedShortfall(viewed, expenses)
  if (shortfall > 0 && viewed.length > 0) {
    const first = [...viewed].sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))[0]
    ensure(bucketKey(first.serviceDate, mode)).expenses += shortfall
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => ({
      key,
      label: bucketLabel(key, mode),
      revenue: bucket.revenue,
      expenses: bucket.expenses,
      profit: bucket.revenue - bucket.labor - bucket.expenses,
    }))
}

export function monthlyTrend(
  services: FinanceService[],
  expenses: FinanceExpense[],
  endIso: string,
  months = 6,
): MonthPoint[] {
  const [endYear, endMonth] = endIso.split('-').map(Number)
  const points: MonthPoint[] = []
  for (let offset = -(months - 1); offset <= 0; offset += 1) {
    const { year, month } = shiftMonth(endYear, endMonth, offset)
    const bounds = monthBounds(year, month)
    const to = bounds.to < endIso ? bounds.to : endIso
    if (to < bounds.from) continue
    const totals = summarise(services, expenses, { from: bounds.from, to })
    points.push({
      key: bounds.from.slice(0, 7),
      label: formatUkMonth(year, month),
      profit: totals.profit,
      revenue: totals.revenue,
      expenses: totals.expenses,
    })
  }
  return points
}

export function profitByEmployee(
  services: FinanceService[],
  expenses: FinanceExpense[],
  filters: ReportFilters,
  employees: FinanceEmployee[],
): EmployeeProfit[] {
  const viewed = servicesInView(services, filters)
  const names = new Map(employees.map((employee) => [employee.id, employee.fullName]))
  for (const service of viewed) names.set(service.employeeId, service.employeeName)

  const rows = new Map<string, EmployeeProfit>()
  const ensure = (employeeId: string, name: string) => {
    if (!rows.has(employeeId)) {
      rows.set(employeeId, {
        employeeId,
        name,
        revenue: 0,
        employeePayments: 0,
        expenses: 0,
        profit: 0,
        serviceCount: 0,
      })
    }
    return rows.get(employeeId)!
  }

  for (const service of viewed) {
    const row = ensure(service.employeeId, service.employeeName)
    const embedded = service.cleaningProductsCost + service.otherExpenses
    row.revenue += service.revenue
    row.employeePayments += service.employeePayment
    row.expenses += embedded
    row.serviceCount += 1
    row.profit += service.revenue - service.employeePayment - embedded
  }

  for (const expense of expensesInView(expenses, services, filters)) {
    if (expense.origin !== 'MANUAL') continue
    let employeeId = expense.employeeId
    if (!employeeId && expense.serviceId) {
      employeeId = services.find((service) => service.id === expense.serviceId)?.employeeId ?? null
    }
    if (!employeeId) {
      const overhead = ensure('overhead', 'Company overhead')
      overhead.expenses += expense.amount
      overhead.profit -= expense.amount
      continue
    }
    const row = ensure(employeeId, names.get(employeeId) ?? 'Employee')
    row.expenses += expense.amount
    row.profit -= expense.amount
  }

  return [...rows.values()]
    .filter((row) => row.serviceCount > 0 || row.expenses !== 0 || row.revenue !== 0)
    .sort((a, b) => b.profit - a.profit || a.name.localeCompare(b.name))
}

export function servicesByEmployee(services: FinanceService[], filters: ReportFilters): ServiceSlice[] {
  const rows = new Map<string, ServiceSlice>()
  for (const service of servicesInView(services, filters)) {
    const current = rows.get(service.employeeId) ?? {
      key: service.employeeId,
      label: service.employeeName,
      count: 0,
      revenue: 0,
    }
    current.count += 1
    current.revenue += service.revenue
    rows.set(service.employeeId, current)
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

const TYPE_LABELS: Record<string, string> = {
  REGULAR_CLEANING: 'Regular Cleaning',
  DEEP_CLEANING: 'Deep Cleaning',
  END_OF_TENANCY: 'End of Tenancy',
  MOVE_IN_MOVE_OUT: 'Move In / Move Out',
  OTHER: 'Other',
}

export function servicesByType(services: FinanceService[], filters: ReportFilters): ServiceSlice[] {
  const rows = new Map<string, ServiceSlice>()
  for (const service of servicesInView(services, filters)) {
    const current = rows.get(service.serviceType) ?? {
      key: service.serviceType,
      label: TYPE_LABELS[service.serviceType] ?? service.serviceType,
      count: 0,
      revenue: 0,
    }
    current.count += 1
    current.revenue += service.revenue
    rows.set(service.serviceType, current)
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function outstandingRows(
  services: FinanceService[],
  expenses: FinanceExpense[],
  employees: FinanceEmployee[],
  range?: { from: string; to: string },
): OutstandingRow[] {
  const serviceDates = new Map(services.map((service) => [service.id, service.serviceDate]))
  const names = new Map(employees.map((employee) => [employee.id, employee.fullName]))
  for (const service of services) names.set(service.employeeId, service.employeeName)

  const grouped = new Map<string, OutstandingRow>()
  const ensure = (employeeId: string) => {
    if (!grouped.has(employeeId)) {
      grouped.set(employeeId, {
        employeeId,
        employeeName: names.get(employeeId) ?? 'Employee',
        serviceIds: [],
        expenseIds: [],
        serviceCount: 0,
        workEarnings: 0,
        reimbursements: 0,
        totalDue: 0,
      })
    }
    return grouped.get(employeeId)!
  }

  const within = (iso: string) => !range || inRange(iso, range.from, range.to)

  for (const service of services) {
    if (service.paid || !within(service.serviceDate)) continue
    const row = ensure(service.employeeId)
    row.serviceIds.push(service.id)
    row.serviceCount += 1
    row.workEarnings += service.employeePayment
  }

  for (const expense of expenses) {
    if (!expense.reimbursable || expense.paid || !expense.employeeId || expense.amount <= 0) continue
    const effective =
      expense.serviceId && serviceDates.has(expense.serviceId)
        ? serviceDates.get(expense.serviceId)!
        : expense.date
    if (!within(effective)) continue
    const row = ensure(expense.employeeId)
    row.expenseIds.push(expense.id)
    row.reimbursements += expense.amount
  }

  return [...grouped.values()]
    .map((row) => ({ ...row, totalDue: row.workEarnings + row.reimbursements }))
    .filter((row) => row.totalDue > 0)
    .sort((a, b) => b.totalDue - a.totalDue || a.employeeName.localeCompare(b.employeeName))
}
