import { Router } from 'express'
import { asyncRoute } from '../lib/async'
import { loadBooks } from '../lib/books'
import { previousPeriod } from '../lib/dates'
import { changePercent, monthlyTrend, outstandingRows, servicesByEmployee, servicesByType, summarise, buildSeries } from '../lib/finance'
import { prisma } from '../lib/prisma'
import { readReportFilters } from '../lib/query'
import { serializeService, serviceIncludeArgs } from '../lib/serialize'

export const dashboardRouter = Router()

dashboardRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const filters = readReportFilters(req.query)
    const books = await loadBooks()
    const current = summarise(books.services, books.expenses, filters)
    const previousFilters = { ...filters, ...previousPeriod(filters.from, filters.to) }
    const previous = summarise(books.services, books.expenses, previousFilters)
    const recent = await prisma.service.findMany({
      where: {
        serviceDate: {
          gte: new Date(`${filters.from}T00:00:00.000Z`),
          lte: new Date(`${filters.to}T00:00:00.000Z`),
        },
      },
      ...serviceIncludeArgs,
      orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    })

    const kpi = (amount: number, previousAmount: number) => ({
      amount,
      previous: previousAmount,
      changePercent: changePercent(amount, previousAmount),
    })
    const pending = outstandingRows(books.services, books.expenses, books.employees)
    const outstandingPayments = pending.reduce((total, row) => total + row.totalDue, 0)
    const activeEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } })

    res.json({
      from: filters.from,
      to: filters.to,
      previousFrom: previousFilters.from,
      previousTo: previousFilters.to,
      kpis: {
        revenue: kpi(current.revenue, previous.revenue),
        employeePayments: kpi(current.employeePayments, previous.employeePayments),
        expenses: kpi(current.expenses, previous.expenses),
        reimbursements: kpi(current.reimbursements, previous.reimbursements),
        profit: kpi(current.profit, previous.profit),
      },
      counts: {
        jobs: current.serviceCount,
        activeEmployees,
        outstandingPayments,
        outstandingEmployees: pending.length,
      },
      series: buildSeries(books.services, books.expenses, filters),
      monthlyProfit: monthlyTrend(books.services, books.expenses, filters.to),
      servicesByEmployee: servicesByEmployee(books.services, filters),
      serviceTypes: servicesByType(books.services, filters),
      recentServices: recent.map(serializeService),
      pendingPayments: pending.slice(0, 8),
    })
  }),
)
