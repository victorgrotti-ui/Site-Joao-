export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER'
}

export interface AccountUser extends User {
  active: boolean
  createdAt: string
}

export interface Employee {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  defaultRate: number
  status: 'ACTIVE' | 'INACTIVE'
  notes: string | null
  serviceCount: number
  totalEarned: number
}

export interface ServiceRecord {
  id: string
  serviceDate: string
  propertyAddress: string
  serviceType: string
  clientName: string
  employeeId: string
  employeeName: string
  revenue: number
  employeePayment: number
  cleaningProductsCost: number
  otherExpenses: number
  manualExpenses: number
  totalExpenses: number
  profit: number
  productsReimbursable: boolean
  otherReimbursable: boolean
  paymentStatus: 'PAID' | 'PENDING'
  notes: string | null
}

export interface ExpenseRecord {
  id: string
  date: string
  category: string
  description: string
  amount: number
  employeeId: string | null
  employeeName: string | null
  serviceId: string | null
  serviceLabel: string | null
  reimbursable: boolean
  origin: 'MANUAL' | 'SERVICE_PRODUCTS' | 'SERVICE_OTHER'
  settlement: 'NOT_REIMBURSABLE' | 'REIMBURSED' | 'OUTSTANDING'
  notes: string | null
}

export interface PaymentRecord {
  id: string
  employeeId: string
  employeeName: string
  periodStart: string
  periodEnd: string
  installment: number
  serviceCount: number
  workEarnings: number
  reimbursements: number
  totalAmount: number
  status: 'PAID' | 'PENDING'
  paymentDate: string | null
  notes: string | null
}

export interface PeriodRow {
  employeeId: string
  employeeName: string
  serviceCount: number
  workEarnings: number
  reimbursements: number
  totalDue: number
  status: 'PENDING' | 'PAID'
  paymentDate: string | null
  alreadyPaidPence: number
}

export interface Kpi {
  amount: number
  previous: number
  changePercent: number | null
}

export interface SeriesPoint {
  key: string
  label: string
  revenue: number
  expenses: number
  profit: number
}

export interface NamedSlice {
  key: string
  label: string
  count: number
  revenue: number
}

export interface DashboardData {
  from: string
  to: string
  previousFrom: string
  previousTo: string
  kpis: {
    revenue: Kpi
    employeePayments: Kpi
    expenses: Kpi
    reimbursements: Kpi
    profit: Kpi
  }
  counts: {
    jobs: number
    activeEmployees: number
    outstandingPayments: number
    outstandingEmployees: number
  }
  series: SeriesPoint[]
  monthlyProfit: Array<{ key: string; label: string; profit: number; revenue: number; expenses: number }>
  servicesByEmployee: NamedSlice[]
  serviceTypes: NamedSlice[]
  recentServices: ServiceRecord[]
  pendingPayments: Array<{
    employeeId: string
    employeeName: string
    serviceCount: number
    workEarnings: number
    reimbursements: number
    totalDue: number
  }>
}

export interface ReportData {
  from: string
  to: string
  summary: {
    revenue: number
    employeePayments: number
    reimbursements: number
    expenses: number
    profit: number
    serviceCount: number
    averageRevenue: number
    averageProfit: number
  }
  series: SeriesPoint[]
  profitByEmployee: Array<{
    employeeId: string
    name: string
    revenue: number
    employeePayments: number
    expenses: number
    profit: number
    serviceCount: number
  }>
  servicesByEmployee: NamedSlice[]
  serviceTypes: NamedSlice[]
}

export interface Settings {
  companyName: string
  currency: string
  currencyLabel: string
  defaultPaymentDay: string
  email: string | null
  phone: string | null
  address: string | null
}
