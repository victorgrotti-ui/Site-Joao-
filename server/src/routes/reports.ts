import { Router } from 'express'
import { asyncRoute } from '../lib/async'
import { loadBooks } from '../lib/books'
import { formatUkShort } from '../lib/dates'
import { buildSeries, profitByEmployee, servicesByEmployee, servicesByType, servicesInView, summarise } from '../lib/finance'
import { SERVICE_TYPE_LABELS, type ServiceType } from '../lib/labels'
import { formatCsvMoney } from '../lib/money'
import { readReportFilters } from '../lib/query'
import { prisma } from '../lib/prisma'
import { serializeService, serviceIncludeArgs } from '../lib/serialize'

export const reportsRouter = Router()

function csvCell(value: string | number) {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function line(values: Array<string | number>) {
  return values.map(csvCell).join(',')
}

reportsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const filters = readReportFilters(req.query)
    const books = await loadBooks()
    const summary = summarise(books.services, books.expenses, filters)
    res.json({
      from: filters.from,
      to: filters.to,
      summary,
      series: buildSeries(books.services, books.expenses, filters),
      profitByEmployee: profitByEmployee(books.services, books.expenses, filters, books.employees),
      servicesByEmployee: servicesByEmployee(books.services, filters),
      serviceTypes: servicesByType(books.services, filters),
    })
  }),
)

reportsRouter.get(
  '/export',
  asyncRoute(async (req, res) => {
    const filters = readReportFilters(req.query)
    const books = await loadBooks()
    const summary = summarise(books.services, books.expenses, filters)
    const viewed = new Set(servicesInView(books.services, filters).map((service) => service.id))
    const services = await prisma.service.findMany({
      where: { id: { in: [...viewed] } },
      ...serviceIncludeArgs,
      orderBy: [{ serviceDate: 'asc' }, { createdAt: 'asc' }],
    })
    const rows = [
      line(['CMH Cleaning report', `${formatUkShort(filters.from)} to ${formatUkShort(filters.to)}`]),
      line(['Total revenue', formatCsvMoney(summary.revenue)]),
      line(['Total employee payments', formatCsvMoney(summary.employeePayments)]),
      line(['Total expenses', formatCsvMoney(summary.expenses)]),
      line(['Total profit', formatCsvMoney(summary.profit)]),
      line(['Number of services', summary.serviceCount]),
      line(['Average revenue per service', formatCsvMoney(summary.averageRevenue)]),
      line(['Average profit per service', formatCsvMoney(summary.averageProfit)]),
      '',
      line([
        'Date',
        'Property',
        'Service type',
        'Client',
        'Employee',
        'Revenue',
        'Employee payment',
        'Cleaning products',
        'Other expenses',
        'Total expenses',
        'Profit',
        'Payment status',
        'Notes',
      ]),
      ...services.map((service) => {
        const row = serializeService(service)
        return line([
          formatUkShort(row.serviceDate),
          row.propertyAddress,
          SERVICE_TYPE_LABELS[row.serviceType as ServiceType] ?? row.serviceType,
          row.clientName,
          row.employeeName,
          formatCsvMoney(row.revenue),
          formatCsvMoney(row.employeePayment),
          formatCsvMoney(row.cleaningProductsCost),
          formatCsvMoney(row.otherExpenses),
          formatCsvMoney(row.totalExpenses),
          formatCsvMoney(row.profit),
          row.paymentStatus === 'PAID' ? 'Paid' : 'Pending',
          row.notes ?? '',
        ])
      }),
    ]
    const filename = `cmh-report-${filters.from}-to-${filters.to}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(`\uFEFF${rows.join('\n')}`)
  }),
)
