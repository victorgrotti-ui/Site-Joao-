import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { previousPeriod } from './dates'
import {
  changePercent,
  monthlyTrend,
  outstandingRows,
  profitByEmployee,
  serviceJobProfit,
  summarise,
  type FinanceExpense,
  type FinanceService,
} from './finance'

const employees = [{ id: 'e1', fullName: 'John Smith' }]

function service(overrides: Partial<FinanceService> = {}): FinanceService {
  return {
    id: 's1',
    serviceDate: '2026-10-01',
    employeeId: 'e1',
    employeeName: 'John Smith',
    serviceType: 'REGULAR_CLEANING',
    propertyAddress: '10 High Street',
    clientName: 'Acme Lettings',
    revenue: 25000,
    employeePayment: 11000,
    cleaningProductsCost: 2000,
    otherExpenses: 0,
    paid: false,
    ...overrides,
  }
}

function expense(overrides: Partial<FinanceExpense> = {}): FinanceExpense {
  return {
    id: 'x1',
    date: '2026-10-01',
    amount: 2000,
    employeeId: 'e1',
    serviceId: 's1',
    reimbursable: true,
    origin: 'SERVICE_PRODUCTS',
    category: 'CLEANING_PRODUCTS',
    paid: false,
    ...overrides,
  }
}

describe('CMH financial rules', () => {
  it('calculates the sample job as £120 profit', () => {
    const job = service()
    assert.equal(serviceJobProfit(job), 12000)
  })

  it('counts a reimbursable product cost once', () => {
    const totals = summarise([service()], [expense()], { from: '2026-10-01', to: '2026-10-01' })
    assert.equal(totals.revenue, 25000)
    assert.equal(totals.employeePayments, 11000)
    assert.equal(totals.expenses, 2000)
    assert.equal(totals.profit, 12000)
  })

  it('adds the reimbursement to the employee total due without a second expense', () => {
    const rows = outstandingRows([service()], [expense()], employees, {
      from: '2026-09-28',
      to: '2026-10-04',
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].workEarnings, 11000)
    assert.equal(rows[0].reimbursements, 2000)
    assert.equal(rows[0].totalDue, 13000)
  })

  it('keeps profit unchanged after the reimbursement is paid', () => {
    const totals = summarise([service({ paid: true })], [expense({ paid: true })], {
      from: '2026-10-01',
      to: '2026-10-07',
    })
    assert.equal(totals.profit, 12000)
    assert.equal(
      outstandingRows([service({ paid: true })], [expense({ paid: true })], employees).length,
      0,
    )
  })

  it('counts an extra manual reimbursable expense once', () => {
    const travel = expense({
      id: 'x2',
      date: '2026-10-02',
      amount: 1500,
      serviceId: null,
      origin: 'MANUAL',
      category: 'TRANSPORTATION',
    })
    const totals = summarise([service()], [expense(), travel], { from: '2026-10-01', to: '2026-10-02' })
    assert.equal(totals.expenses, 3500)
    assert.equal(totals.profit, 10500)
    const due = outstandingRows([service()], [expense(), travel], employees)
    assert.equal(due[0].reimbursements, 3500)
    assert.equal(due[0].totalDue, 14500)
  })

  it('does not treat a service-type filter as company overhead', () => {
    const travel = expense({
      id: 'x2',
      date: '2026-10-01',
      amount: 1500,
      serviceId: null,
      origin: 'MANUAL',
      category: 'TRANSPORTATION',
    })
    const totals = summarise([service()], [expense(), travel], {
      from: '2026-10-01',
      to: '2026-10-01',
      serviceType: 'DEEP_CLEANING',
    })
    assert.equal(totals.revenue, 0)
    assert.equal(totals.expenses, 0)
    assert.equal(totals.profit, 0)
  })

  it('attributes profit to the employee', () => {
    const rows = profitByEmployee([service()], [expense()], { from: '2026-10-01', to: '2026-10-01' }, employees)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].name, 'John Smith')
    assert.equal(rows[0].profit, 12000)
    assert.equal(rows[0].expenses, 2000)
  })

  it('uses the previous period of equal length', () => {
    assert.deepEqual(previousPeriod('2026-10-01', '2026-10-31'), {
      from: '2026-08-31',
      to: '2026-09-30',
    })
  })

  it('hides a percentage when the previous total is zero', () => {
    assert.equal(changePercent(100, 0), null)
    assert.equal(changePercent(150, 100), 50)
  })

  it('allows a loss when costs are higher than revenue', () => {
    const totals = summarise(
      [service({ revenue: 5000, employeePayment: 4000, cleaningProductsCost: 2000 })],
      [expense({ amount: 2000 })],
      { from: '2026-10-01', to: '2026-10-01' },
    )
    assert.equal(totals.profit, -1000)
  })

  it('builds a six-month profit trend from real months only', () => {
    const points = monthlyTrend([service()], [expense()], '2026-10-06', 6)
    assert.equal(points.length, 6)
    assert.equal(points[5].label, 'Oct 2026')
    assert.equal(points[5].profit, 12000)
    assert.equal(points[0].profit, 0)
  })
})
