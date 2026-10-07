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

const csvCopy = {
  en: {
    title: 'CMH Cleaning report',
    to: 'to',
    revenue: 'Total revenue',
    payments: 'Total employee payments',
    reimbursements: 'Reimbursements',
    expenses: 'Total expenses',
    profit: 'Total profit',
    count: 'Number of services',
    averageRevenue: 'Average revenue per service',
    averageProfit: 'Average profit per service',
    date: 'Date',
    property: 'Property',
    type: 'Service type',
    client: 'Client',
    employee: 'Employee',
    revenueCol: 'Revenue',
    paymentCol: 'Employee payment',
    products: 'Cleaning products',
    other: 'Other expenses',
    totalExpenses: 'Total expenses',
    profitCol: 'Profit',
    status: 'Payment status',
    notes: 'Notes',
    paid: 'Paid',
    pending: 'Pending',
  },
  'pt-BR': {
    title: 'Relatório CMH Cleaning',
    to: 'a',
    revenue: 'Receita total',
    payments: 'Total de pagamentos dos colaboradores',
    reimbursements: 'Reembolsos',
    expenses: 'Despesas totais',
    profit: 'Lucro líquido',
    count: 'Número de serviços',
    averageRevenue: 'Receita média por serviço',
    averageProfit: 'Lucro médio por serviço',
    date: 'Data',
    property: 'Imóvel',
    type: 'Tipo de serviço',
    client: 'Cliente',
    employee: 'Colaborador',
    revenueCol: 'Receita',
    paymentCol: 'Pagamento do colaborador',
    products: 'Produtos de limpeza',
    other: 'Outras despesas',
    totalExpenses: 'Despesas totais',
    profitCol: 'Lucro',
    status: 'Situação do pagamento',
    notes: 'Observações',
    paid: 'Pago',
    pending: 'Pendente',
  },
} as const

const ptTypes: Record<string, string> = {
  REGULAR_CLEANING: 'Limpeza regular',
  DEEP_CLEANING: 'Limpeza pesada',
  END_OF_TENANCY: 'Fim de contrato',
  MOVE_IN_MOVE_OUT: 'Entrada / saída',
  OTHER: 'Outro',
}

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
    const copy = req.query.lang === 'pt-BR' ? csvCopy['pt-BR'] : csvCopy.en
    const books = await loadBooks()
    const summary = summarise(books.services, books.expenses, filters)
    const viewed = new Set(servicesInView(books.services, filters).map((service) => service.id))
    const services = await prisma.service.findMany({
      where: { id: { in: [...viewed] } },
      ...serviceIncludeArgs,
      orderBy: [{ serviceDate: 'asc' }, { createdAt: 'asc' }],
    })
    const rows = [
      line([copy.title, `${formatUkShort(filters.from)} ${copy.to} ${formatUkShort(filters.to)}`]),
      line([copy.revenue, formatCsvMoney(summary.revenue)]),
      line([copy.payments, formatCsvMoney(summary.employeePayments)]),
      line([copy.reimbursements, formatCsvMoney(summary.reimbursements)]),
      line([copy.expenses, formatCsvMoney(summary.expenses)]),
      line([copy.profit, formatCsvMoney(summary.profit)]),
      line([copy.count, summary.serviceCount]),
      line([copy.averageRevenue, formatCsvMoney(summary.averageRevenue)]),
      line([copy.averageProfit, formatCsvMoney(summary.averageProfit)]),
      '',
      line([
        copy.date,
        copy.property,
        copy.type,
        copy.client,
        copy.employee,
        copy.revenueCol,
        copy.paymentCol,
        copy.products,
        copy.other,
        copy.totalExpenses,
        copy.profitCol,
        copy.status,
        copy.notes,
      ]),
      ...services.map((service) => {
        const row = serializeService(service)
        return line([
          formatUkShort(row.serviceDate),
          row.propertyAddress,
          req.query.lang === 'pt-BR'
            ? (ptTypes[row.serviceType] ?? row.serviceType)
            : (SERVICE_TYPE_LABELS[row.serviceType as ServiceType] ?? row.serviceType),
          row.clientName,
          row.employeeName,
          formatCsvMoney(row.revenue),
          formatCsvMoney(row.employeePayment),
          formatCsvMoney(row.cleaningProductsCost),
          formatCsvMoney(row.otherExpenses),
          formatCsvMoney(row.totalExpenses),
          formatCsvMoney(row.profit),
          row.paymentStatus === 'PAID' ? copy.paid : copy.pending,
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
