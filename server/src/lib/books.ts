import { Prisma, PrismaClient } from '@prisma/client'
import { toDateKey } from './dates'
import type { FinanceEmployee, FinanceExpense, FinanceService } from './finance'
import { prisma } from './prisma'

export type Db = PrismaClient | Prisma.TransactionClient

export interface Books {
  services: FinanceService[]
  expenses: FinanceExpense[]
  employees: FinanceEmployee[]
}

export async function loadBooks(db: Db = prisma): Promise<Books> {
  const [services, expenses, workItems, reimbursementItems, employees] = await Promise.all([
    db.service.findMany({ include: { employee: { select: { fullName: true } } } }),
    db.expense.findMany(),
    db.paymentItem.findMany({
      where: { kind: 'WORK', serviceId: { not: null } },
      select: { serviceId: true },
    }),
    db.paymentItem.findMany({
      where: { kind: 'REIMBURSEMENT', expenseId: { not: null } },
      select: { expenseId: true },
    }),
    db.employee.findMany({ select: { id: true, fullName: true } }),
  ])

  const paidServices = new Set(workItems.map((item) => item.serviceId).filter((id): id is string => Boolean(id)))
  const paidExpenses = new Set(
    reimbursementItems.map((item) => item.expenseId).filter((id): id is string => Boolean(id)),
  )

  return {
    employees,
    services: services.map((service) => ({
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
      paid: paidServices.has(service.id),
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      date: toDateKey(expense.date),
      amount: expense.amount,
      employeeId: expense.employeeId,
      serviceId: expense.serviceId,
      reimbursable: expense.reimbursable,
      origin: expense.origin,
      category: expense.category,
      paid: paidExpenses.has(expense.id),
    })),
  }
}
