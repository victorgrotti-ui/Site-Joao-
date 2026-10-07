import { Expense, Payment, PaymentItem, Prisma } from '@prisma/client'
import { toDateKey } from './dates'
import { serviceJobProfit } from './finance'

const serviceInclude = {
  employee: { select: { fullName: true } },
  expenses: {
    select: {
      id: true,
      amount: true,
      origin: true,
      reimbursable: true,
      description: true,
      date: true,
      category: true,
      paymentItems: { select: { id: true } },
    },
  },
  paymentItems: { select: { id: true, kind: true } },
} satisfies Prisma.ServiceInclude

export const serviceIncludeArgs = { include: serviceInclude }
export type ServiceRecord = Prisma.ServiceGetPayload<typeof serviceIncludeArgs>

export function serializeService(service: ServiceRecord) {
  const manualExpenses = service.expenses
    .filter((expense) => expense.origin === 'MANUAL')
    .reduce((total, expense) => total + expense.amount, 0)
  const products = service.expenses.find((expense) => expense.origin === 'SERVICE_PRODUCTS')
  const other = service.expenses.find((expense) => expense.origin === 'SERVICE_OTHER')
  const workPaid = service.paymentItems.some((item) => item.kind === 'WORK')
  const unpaidReimbursement = service.expenses.some(
    (expense) => expense.reimbursable && expense.paymentItems.length === 0,
  )
  const nothingDue = service.employeePayment === 0 && !unpaidReimbursement
  const totalExpenses = service.cleaningProductsCost + service.otherExpenses + manualExpenses
  return {
    id: service.id,
    serviceDate: toDateKey(service.serviceDate),
    propertyAddress: service.propertyAddress,
    serviceType: service.serviceType,
    clientName: service.clientName,
    employeeId: service.employeeId,
    employeeName: service.employee.fullName,
    revenue: service.revenue,
    employeePayment: service.employeePayment,
    cleaningProductsCost: service.cleaningProductsCost,
    otherExpenses: service.otherExpenses,
    manualExpenses,
    totalExpenses,
    profit: serviceJobProfit(
      {
        id: service.id,
        serviceDate: toDateKey(service.serviceDate),
        employeeId: service.employeeId,
        employeeName: service.employee.fullName,
        serviceType: service.serviceType,
        propertyAddress: service.propertyAddress,
        clientName: service.clientName,
        revenue: service.revenue,
        employeePayment: service.employeePayment,
        cleaningProductsCost: service.cleaningProductsCost,
        otherExpenses: service.otherExpenses,
        paid: workPaid,
      },
      manualExpenses,
    ),
    productsReimbursable: Boolean(products?.reimbursable),
    otherReimbursable: Boolean(other?.reimbursable),
    paymentStatus: workPaid || nothingDue ? 'PAID' : 'PENDING',
    notes: service.notes,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }
}

export function serializeExpense(
  expense: Expense & {
    employee: { fullName: string } | null
    service: { propertyAddress: string; serviceDate: Date } | null
    paymentItems: Pick<PaymentItem, 'id'>[]
  },
) {
  const settlement = !expense.reimbursable
    ? 'NOT_REIMBURSABLE'
    : expense.paymentItems.length > 0
      ? 'REIMBURSED'
      : 'OUTSTANDING'
  return {
    id: expense.id,
    date: toDateKey(expense.date),
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    employeeId: expense.employeeId,
    employeeName: expense.employee?.fullName ?? null,
    serviceId: expense.serviceId,
    serviceLabel: expense.service
      ? `${toDateKey(expense.service.serviceDate)} · ${expense.service.propertyAddress}`
      : null,
    reimbursable: expense.reimbursable,
    origin: expense.origin,
    settlement,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}

export function serializePayment(payment: Payment & { employee: { fullName: string } }) {
  return {
    id: payment.id,
    employeeId: payment.employeeId,
    employeeName: payment.employee.fullName,
    periodStart: toDateKey(payment.periodStart),
    periodEnd: toDateKey(payment.periodEnd),
    installment: payment.installment,
    serviceCount: payment.serviceCount,
    workEarnings: payment.workEarnings,
    reimbursements: payment.reimbursements,
    totalAmount: payment.totalAmount,
    status: payment.status,
    paymentDate: payment.paymentDate ? toDateKey(payment.paymentDate) : null,
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString(),
  }
}

export function serializeEmployeeBase(employee: {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  defaultRate: number
  status: 'ACTIVE' | 'INACTIVE'
  notes: string | null
  createdAt: Date
  updatedAt: Date
  serviceCount: number
  totalEarned: number
}) {
  return {
    id: employee.id,
    fullName: employee.fullName,
    phone: employee.phone,
    email: employee.email,
    defaultRate: employee.defaultRate,
    status: employee.status,
    notes: employee.notes,
    serviceCount: employee.serviceCount,
    totalEarned: employee.totalEarned,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  }
}
