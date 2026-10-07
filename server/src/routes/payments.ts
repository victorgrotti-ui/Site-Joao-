import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { asyncRoute } from '../lib/async'
import { loadBooks } from '../lib/books'
import { dateOnlyToDate, inRange, toDateKey } from '../lib/dates'
import { DUPLICATE_PAYMENT_MESSAGE, HttpError } from '../lib/errors'
import { outstandingRows } from '../lib/finance'
import { prisma } from '../lib/prisma'
import { readRange } from '../lib/query'
import { markPaidSchema, type MarkPaidInput } from '../lib/schemas'
import { serializePayment } from '../lib/serialize'
import { validate } from '../middleware/validate'

export const paymentsRouter = Router()

function effectiveExpenseDate(
  expense: { date: string; serviceId: string | null },
  serviceDates: Map<string, string>,
) {
  if (expense.serviceId && serviceDates.has(expense.serviceId)) return serviceDates.get(expense.serviceId)!
  return expense.date
}

paymentsRouter.get(
  '/period',
  asyncRoute(async (req, res) => {
    const { from, to } = readRange(req.query)
    if (!from || !to) throw new HttpError(400, 'Choose a valid date range.')
    const books = await loadBooks()
    const periodOutstanding = outstandingRows(books.services, books.expenses, books.employees, { from, to })
    const serviceDates = new Map(books.services.map((service) => [service.id, service.serviceDate]))
    const outsideBooks = {
      services: books.services.map((service) => ({
        ...service,
        paid: service.paid || inRange(service.serviceDate, from, to),
      })),
      expenses: books.expenses.map((expense) => ({
        ...expense,
        paid: expense.paid || inRange(effectiveExpenseDate(expense, serviceDates), from, to),
      })),
    }
    const attention = outstandingRows(outsideBooks.services, outsideBooks.expenses, books.employees)
    const recorded = await prisma.payment.findMany({
      where: { periodStart: dateOnlyToDate(from), periodEnd: dateOnlyToDate(to) },
      include: { employee: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const rows = new Map<
      string,
      {
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
    >()

    for (const payment of recorded) {
      const current = rows.get(payment.employeeId) ?? {
        employeeId: payment.employeeId,
        employeeName: payment.employee.fullName,
        serviceCount: 0,
        workEarnings: 0,
        reimbursements: 0,
        totalDue: 0,
        status: 'PAID' as const,
        paymentDate: null,
        alreadyPaidPence: 0,
      }
      current.serviceCount += payment.serviceCount
      current.workEarnings += payment.workEarnings
      current.reimbursements += payment.reimbursements
      current.totalDue += payment.totalAmount
      current.alreadyPaidPence += payment.totalAmount
      const paidOn = payment.paymentDate ? toDateKey(payment.paymentDate) : null
      if (paidOn && (!current.paymentDate || paidOn > current.paymentDate)) current.paymentDate = paidOn
      rows.set(payment.employeeId, current)
    }

    for (const outstanding of periodOutstanding) {
      const existing = rows.get(outstanding.employeeId)
      rows.set(outstanding.employeeId, {
        employeeId: outstanding.employeeId,
        employeeName: outstanding.employeeName,
        serviceCount: outstanding.serviceCount,
        workEarnings: outstanding.workEarnings,
        reimbursements: outstanding.reimbursements,
        totalDue: outstanding.totalDue,
        status: 'PENDING',
        paymentDate: existing?.paymentDate ?? null,
        alreadyPaidPence: existing?.alreadyPaidPence ?? 0,
      })
    }

    res.json({
      from,
      to,
      rows: [...rows.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
      attention: attention.map((row) => ({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        totalDue: row.totalDue,
        serviceCount: row.serviceCount,
      })),
    })
  }),
)

paymentsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const where: Prisma.PaymentWhereInput = {}
    if (typeof req.query.employeeId === 'string' && req.query.employeeId) where.employeeId = req.query.employeeId
    if (req.query.status === 'PAID' || req.query.status === 'PENDING') where.status = req.query.status
    const range = readRange(req.query, { optional: true })
    if (range.from && range.to) {
      where.periodStart = { lte: dateOnlyToDate(range.to) }
      where.periodEnd = { gte: dateOnlyToDate(range.from) }
    }
    const payments = await prisma.payment.findMany({
      where,
      include: { employee: { select: { fullName: true } } },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
    })
    res.json({ payments: payments.map(serializePayment) })
  }),
)

paymentsRouter.post(
  '/mark-paid',
  validate(markPaidSchema),
  asyncRoute(async (req, res) => {
    const body = req.body as MarkPaidInput
    const employee = await prisma.employee.findUnique({ where: { id: body.employeeId } })
    if (!employee) throw new HttpError(404, 'Employee not found.')

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const books = await loadBooks(tx)
        const outstanding = outstandingRows(books.services, books.expenses, books.employees, {
          from: body.periodStart,
          to: body.periodEnd,
        }).find((row) => row.employeeId === body.employeeId)
        const existing = await tx.payment.findMany({
          where: {
            employeeId: body.employeeId,
            periodStart: dateOnlyToDate(body.periodStart),
            periodEnd: dateOnlyToDate(body.periodEnd),
          },
        })

        if (!outstanding) {
          if (existing.length > 0) {
            throw new HttpError(409, DUPLICATE_PAYMENT_MESSAGE, {
              code: 'DUPLICATE_PAYMENT',
              outstandingPence: 0,
            })
          }
          throw new HttpError(400, 'There is nothing outstanding to pay for this employee in this period.')
        }

        if (existing.length > 0 && !body.confirmAdditional) {
          throw new HttpError(409, DUPLICATE_PAYMENT_MESSAGE, {
            code: 'DUPLICATE_PAYMENT',
            outstandingPence: outstanding.totalDue,
          })
        }

        const installment = existing.reduce((max, item) => Math.max(max, item.installment), 0) + 1
        return tx.payment.create({
          data: {
            employeeId: body.employeeId,
            periodStart: dateOnlyToDate(body.periodStart),
            periodEnd: dateOnlyToDate(body.periodEnd),
            installment,
            serviceCount: outstanding.serviceCount,
            workEarnings: outstanding.workEarnings,
            reimbursements: outstanding.reimbursements,
            totalAmount: outstanding.totalDue,
            status: 'PAID',
            paymentDate: dateOnlyToDate(body.paymentDate),
            notes: body.notes,
            items: {
              create: [
                ...outstanding.serviceIds.map((serviceId) => ({
                  serviceId,
                  kind: 'WORK' as const,
                  amount: books.services.find((service) => service.id === serviceId)?.employeePayment ?? 0,
                })),
                ...outstanding.expenseIds.map((expenseId) => ({
                  expenseId,
                  kind: 'REIMBURSEMENT' as const,
                  amount: books.expenses.find((expense) => expense.id === expenseId)?.amount ?? 0,
                })),
              ],
            },
          },
          include: { employee: { select: { fullName: true } } },
        })
      })
      res.status(201).json({ payment: serializePayment(payment) })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, DUPLICATE_PAYMENT_MESSAGE, { code: 'DUPLICATE_PAYMENT', outstandingPence: 0 })
      }
      throw error
    }
  }),
)

paymentsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { employee: { select: { fullName: true } }, items: true },
    })
    if (!payment) throw new HttpError(404, 'Payment not found.')
    res.json({
      payment: serializePayment(payment),
      items: payment.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        amount: item.amount,
        serviceId: item.serviceId,
        expenseId: item.expenseId,
      })),
    })
  }),
)
