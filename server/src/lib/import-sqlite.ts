import { DatabaseSync } from 'node:sqlite'
import type { Prisma, PrismaClient } from '@prisma/client'
import { isDevelopmentDatabaseFile, isPostgresUrl } from './database-file'
import { prisma } from './prisma'

type Row = Record<string, unknown>
type Tx = Prisma.TransactionClient

export interface ImportCounts {
  users: number
  employees: number
  services: number
  expenses: number
  payments: number
  paymentItems: number
  settings: number
}

function asDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) throw new Error('A date in the SQLite file could not be read.')
  return date
}

function asDateOrNull(value: unknown): Date | null {
  if (value == null || value === '') return null
  return asDate(value)
}

function asInt(value: unknown): number {
  const number = typeof value === 'bigint' ? Number(value) : Number(value)
  if (!Number.isInteger(number)) throw new Error('A money or count value in the SQLite file could not be read.')
  return number
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return fallback
}

function asText(value: unknown): string | null {
  if (value == null) return null
  return String(value)
}

function rows(db: DatabaseSync, table: string): Row[] {
  return db.prepare(`SELECT * FROM "${table}"`).all() as Row[]
}

function hasColumn(row: Row, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, name)
}

async function importUsers(tx: Tx, source: Row[]) {
  for (const row of source) {
    const data = {
      id: String(row.id),
      email: String(row.email).toLowerCase(),
      passwordHash: String(row.passwordHash),
      name: String(row.name),
      role: (hasColumn(row, 'role') ? row.role : 'ADMIN') as 'ADMIN' | 'MANAGER',
      active: asBool(hasColumn(row, 'active') ? row.active : null, true),
      tokenVersion: hasColumn(row, 'tokenVersion') && row.tokenVersion != null ? asInt(row.tokenVersion) : 0,
      createdAt: asDate(row.createdAt),
      updatedAt: asDate(row.updatedAt),
    }
    await tx.user.upsert({ where: { id: data.id }, create: data, update: data })
  }
}

async function importEmployees(tx: Tx, source: Row[]) {
  for (const row of source) {
    const data = {
      id: String(row.id),
      fullName: String(row.fullName),
      phone: asText(row.phone),
      email: asText(row.email)?.toLowerCase() ?? null,
      defaultRate: asInt(row.defaultRate),
      status: String(row.status) as 'ACTIVE' | 'INACTIVE',
      notes: asText(row.notes),
      createdAt: asDate(row.createdAt),
      updatedAt: asDate(row.updatedAt),
    }
    await tx.employee.upsert({ where: { id: data.id }, create: data, update: data })
  }
}

async function importServices(tx: Tx, source: Row[]) {
  for (const row of source) {
    const data = {
      id: String(row.id),
      serviceDate: asDate(row.serviceDate),
      propertyAddress: String(row.propertyAddress),
      serviceType: String(row.serviceType) as 'REGULAR_CLEANING',
      clientName: String(row.clientName),
      employeeId: String(row.employeeId),
      revenue: asInt(row.revenue),
      employeePayment: asInt(row.employeePayment),
      cleaningProductsCost: asInt(row.cleaningProductsCost ?? 0),
      otherExpenses: asInt(row.otherExpenses ?? 0),
      notes: asText(row.notes),
      createdAt: asDate(row.createdAt),
      updatedAt: asDate(row.updatedAt),
    }
    await tx.service.upsert({ where: { id: data.id }, create: data, update: data })
  }
}

async function importExpenses(tx: Tx, source: Row[]) {
  for (const row of source) {
    const data = {
      id: String(row.id),
      date: asDate(row.date),
      category: String(row.category) as 'CLEANING_PRODUCTS',
      description: String(row.description),
      amount: asInt(row.amount),
      employeeId: asText(row.employeeId),
      serviceId: asText(row.serviceId),
      reimbursable: asBool(row.reimbursable, false),
      origin: String(row.origin ?? 'MANUAL') as 'MANUAL',
      notes: asText(row.notes),
      createdAt: asDate(row.createdAt),
      updatedAt: asDate(row.updatedAt),
    }
    await tx.expense.upsert({ where: { id: data.id }, create: data, update: data })
  }
}

async function importPayments(tx: Tx, source: Row[]) {
  for (const row of source) {
    const data = {
      id: String(row.id),
      employeeId: String(row.employeeId),
      periodStart: asDate(row.periodStart),
      periodEnd: asDate(row.periodEnd),
      installment: asInt(row.installment ?? 1),
      serviceCount: asInt(row.serviceCount ?? 0),
      workEarnings: asInt(row.workEarnings),
      reimbursements: asInt(row.reimbursements),
      totalAmount: asInt(row.totalAmount),
      status: String(row.status ?? 'PAID') as 'PAID' | 'PENDING',
      paymentDate: asDateOrNull(row.paymentDate),
      notes: asText(row.notes),
      createdAt: asDate(row.createdAt),
      updatedAt: asDate(row.updatedAt),
    }
    await tx.payment.upsert({ where: { id: data.id }, create: data, update: data })
  }
}

async function importPaymentItems(tx: Tx, source: Row[]) {
  for (const row of source) {
    const data = {
      id: String(row.id),
      paymentId: String(row.paymentId),
      serviceId: asText(row.serviceId),
      expenseId: asText(row.expenseId),
      kind: String(row.kind) as 'WORK' | 'REIMBURSEMENT',
      amount: asInt(row.amount),
      createdAt: asDate(row.createdAt),
    }
    await tx.paymentItem.upsert({ where: { id: data.id }, create: data, update: data })
  }
}

async function importSettings(tx: Tx, source: Row[]) {
  for (const row of source) {
    const data = {
      id: String(row.id),
      companyName: String(row.companyName),
      currency: String(row.currency),
      defaultPaymentDay: String(row.defaultPaymentDay) as 'SATURDAY',
      email: asText(row.email),
      phone: asText(row.phone),
      address: asText(row.address),
      createdAt: asDate(row.createdAt),
      updatedAt: asDate(row.updatedAt),
    }
    await tx.companySettings.upsert({ where: { id: data.id }, create: data, update: data })
  }
}

/** Copy every company table from a SQLite file into the connected Supabase database. */
export async function importSqliteFile(sourcePath: string, client: PrismaClient = prisma): Promise<ImportCounts> {
  if (!isPostgresUrl()) throw new Error('DATABASE_URL must be the Supabase PostgreSQL URL before importing.')
  if (isDevelopmentDatabaseFile(sourcePath)) throw new Error('Refusing to import prisma/dev.db.')
  const db = new DatabaseSync(sourcePath, { readOnly: true })
  try {
    const settings = rows(db, 'CompanySettings')
    const users = rows(db, 'User')
    const employees = rows(db, 'Employee')
    const services = rows(db, 'Service')
    const expenses = rows(db, 'Expense')
    const payments = rows(db, 'Payment')
    const paymentItems = rows(db, 'PaymentItem')
    await client.$transaction(
      async (tx) => {
        await importSettings(tx, settings)
        await importUsers(tx, users)
        await importEmployees(tx, employees)
        await importServices(tx, services)
        await importExpenses(tx, expenses)
        await importPayments(tx, payments)
        await importPaymentItems(tx, paymentItems)
      },
      { timeout: 120000 },
    )
    return {
      settings: settings.length,
      users: users.length,
      employees: employees.length,
      services: services.length,
      expenses: expenses.length,
      payments: payments.length,
      paymentItems: paymentItems.length,
    }
  } finally {
    db.close()
  }
}
