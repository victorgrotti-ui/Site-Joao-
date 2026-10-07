import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const root = path.resolve(__dirname, '../..')
const databasePath = '/tmp/cmh-integration.db'
for (const file of [databasePath, `${databasePath}-journal`, `${databasePath}-wal`, `${databasePath}-shm`]) {
  fs.rmSync(file, { force: true })
}

process.env.DATABASE_URL = `file:${databasePath}`
process.env.JWT_SECRET = 'integration-test-secret-key-123'
process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

execSync('npx prisma migrate deploy', {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

async function main() {
  const { createApp } = await import('./app')
  const { prisma } = await import('./lib/prisma')
  const { hashPassword } = await import('./lib/auth')
  const request = (await import('supertest')).default
  const app = createApp()
  const agent = request.agent(app)

  await prisma.user.create({
    data: {
      email: 'manager@cmhcleaning.test',
      name: 'Alex Manager',
      passwordHash: await hashPassword('correct-horse'),
      role: 'ADMIN',
    },
  })

  const denied = await agent.get('/api/employees')
  assert.equal(denied.status, 401)

  const badLogin = await agent.post('/api/auth/login').send({ email: 'manager@cmhcleaning.test', password: 'wrong-password' })
  assert.equal(badLogin.status, 401)

  const login = await agent.post('/api/auth/login').send({ email: 'manager@cmhcleaning.test', password: 'correct-horse' })
  assert.equal(login.status, 200)
  assert.equal(login.body.user.email, 'manager@cmhcleaning.test')

  const createdEmployee = await agent.post('/api/employees').send({
    fullName: 'John Smith',
    phone: '07123 456789',
    email: 'john@example.com',
    defaultRate: '110',
    status: 'ACTIVE',
    notes: 'End of tenancy team',
  })
  assert.equal(createdEmployee.status, 201, JSON.stringify(createdEmployee.body))
  const employeeId = createdEmployee.body.employee.id as string

  const edited = await agent.put(`/api/employees/${employeeId}`).send({
    fullName: 'John Smith',
    phone: '07123 000111',
    email: 'john@example.com',
    defaultRate: '110',
    status: 'ACTIVE',
    notes: 'End of tenancy team',
  })
  assert.equal(edited.status, 200)
  assert.equal(edited.body.employee.phone, '07123 000111')

  const negative = await agent.post('/api/services').send({
    serviceDate: '2026-10-01',
    propertyAddress: '10 High Street',
    serviceType: 'REGULAR_CLEANING',
    clientName: 'Acme Lettings',
    employeeId,
    revenue: '-5',
    employeePayment: '110',
    cleaningProductsCost: '20',
    otherExpenses: '0',
    productsReimbursable: true,
    otherReimbursable: false,
  })
  assert.equal(negative.status, 400)

  const createdService = await agent.post('/api/services').send({
    serviceDate: '2026-10-01',
    propertyAddress: '10 High Street',
    serviceType: 'REGULAR_CLEANING',
    clientName: 'Acme Lettings',
    employeeId,
    revenue: '250',
    employeePayment: '110',
    cleaningProductsCost: '20',
    otherExpenses: '0',
    productsReimbursable: true,
    otherReimbursable: false,
    notes: 'Products bought by John',
  })
  assert.equal(createdService.status, 201, JSON.stringify(createdService.body))
  assert.equal(createdService.body.service.profit, 12000)
  assert.equal(createdService.body.service.totalExpenses, 2000)
  assert.equal(createdService.body.service.productsReimbursable, true)
  assert.equal(createdService.body.service.paymentStatus, 'PENDING')

  const dashboard = await agent.get('/api/dashboard').query({ from: '2026-10-01', to: '2026-10-01' })
  assert.equal(dashboard.status, 200)
  assert.equal(dashboard.body.kpis.revenue.amount, 25000)
  assert.equal(dashboard.body.kpis.employeePayments.amount, 11000)
  assert.equal(dashboard.body.kpis.expenses.amount, 2000)
  assert.equal(dashboard.body.kpis.profit.amount, 12000)
  assert.equal(dashboard.body.pendingPayments[0].totalDue, 13000)

  const period = await agent.get('/api/payments/period').query({ from: '2026-09-28', to: '2026-10-04' })
  assert.equal(period.status, 200)
  assert.equal(period.body.rows.length, 1)
  assert.equal(period.body.rows[0].workEarnings, 11000)
  assert.equal(period.body.rows[0].reimbursements, 2000)
  assert.equal(period.body.rows[0].totalDue, 13000)
  assert.equal(period.body.rows[0].status, 'PENDING')

  const paid = await agent.post('/api/payments/mark-paid').send({
    employeeId,
    periodStart: '2026-09-28',
    periodEnd: '2026-10-04',
    paymentDate: '2026-10-04',
    confirmAdditional: false,
  })
  assert.equal(paid.status, 201, JSON.stringify(paid.body))
  assert.equal(paid.body.payment.totalAmount, 13000)
  assert.equal(paid.body.payment.status, 'PAID')

  const duplicate = await agent.post('/api/payments/mark-paid').send({
    employeeId,
    periodStart: '2026-09-28',
    periodEnd: '2026-10-04',
    paymentDate: '2026-10-04',
    confirmAdditional: false,
  })
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.body.error, 'Payment already recorded for this employee for this payment period.')
  assert.equal(duplicate.body.code, 'DUPLICATE_PAYMENT')
  assert.equal(duplicate.body.outstandingPence, 0)

  const forced = await agent.post('/api/payments/mark-paid').send({
    employeeId,
    periodStart: '2026-09-28',
    periodEnd: '2026-10-04',
    paymentDate: '2026-10-04',
    confirmAdditional: true,
  })
  assert.equal(forced.status, 409)
  assert.equal(await prisma.payment.count(), 1)

  const secondService = await agent.post('/api/services').send({
    serviceDate: '2026-10-02',
    propertyAddress: '22 King Street',
    serviceType: 'END_OF_TENANCY',
    clientName: 'Acme Lettings',
    employeeId,
    revenue: '180',
    employeePayment: '90',
    cleaningProductsCost: '0',
    otherExpenses: '0',
    productsReimbursable: false,
    otherReimbursable: false,
  })
  assert.equal(secondService.status, 201)
  assert.equal(secondService.body.service.profit, 9000)

  const duplicateWithOutstanding = await agent.post('/api/payments/mark-paid').send({
    employeeId,
    periodStart: '2026-09-28',
    periodEnd: '2026-10-04',
    paymentDate: '2026-10-05',
  })
  assert.equal(duplicateWithOutstanding.status, 409)
  assert.equal(duplicateWithOutstanding.body.outstandingPence, 9000)

  const additional = await agent.post('/api/payments/mark-paid').send({
    employeeId,
    periodStart: '2026-09-28',
    periodEnd: '2026-10-04',
    paymentDate: '2026-10-05',
    confirmAdditional: true,
  })
  assert.equal(additional.status, 201, JSON.stringify(additional.body))
  assert.equal(additional.body.payment.installment, 2)
  assert.equal(additional.body.payment.totalAmount, 9000)
  assert.equal(additional.body.payment.reimbursements, 0)

  const travel = await agent.post('/api/expenses').send({
    date: '2026-10-03',
    category: 'TRANSPORTATION',
    description: 'Travel to King Street',
    amount: '15',
    employeeId,
    reimbursable: true,
  })
  assert.equal(travel.status, 201)
  const missingEmployee = await agent.post('/api/expenses').send({
    date: '2026-10-03',
    category: 'SUPPLIES',
    description: 'Cloths',
    amount: '5',
    reimbursable: true,
  })
  assert.equal(missingEmployee.status, 400)

  const afterTravel = await agent.get('/api/dashboard').query({ from: '2026-10-01', to: '2026-10-03' })
  assert.equal(afterTravel.body.kpis.revenue.amount, 43000)
  assert.equal(afterTravel.body.kpis.employeePayments.amount, 20000)
  assert.equal(afterTravel.body.kpis.expenses.amount, 3500)
  assert.equal(afterTravel.body.kpis.profit.amount, 19500)

  const reports = await agent.get('/api/reports').query({
    from: '2026-10-01',
    to: '2026-10-03',
    employeeId,
    serviceType: 'REGULAR_CLEANING',
  })
  assert.equal(reports.status, 200)
  assert.equal(reports.body.summary.serviceCount, 1)
  assert.equal(reports.body.summary.profit, 12000)

  const csv = await agent.get('/api/reports/export').query({ from: '2026-10-01', to: '2026-10-03' })
  assert.equal(csv.status, 200)
  assert.match(csv.text, /10 High Street/)
  assert.match(csv.headers['content-type'], /text\/csv/)

  const disabled = await agent.put(`/api/employees/${employeeId}`).send({
    fullName: 'John Smith',
    phone: '07123 000111',
    email: 'john@example.com',
    defaultRate: '110',
    status: 'INACTIVE',
    notes: '',
  })
  assert.equal(disabled.status, 200)
  assert.equal(disabled.body.employee.status, 'INACTIVE')

  await agent.post('/api/auth/logout')
  const afterLogout = await agent.get('/api/dashboard').query({ from: '2026-10-01', to: '2026-10-01' })
  assert.equal(afterLogout.status, 401)

  const again = await agent.post('/api/auth/login').send({ email: 'manager@cmhcleaning.test', password: 'correct-horse' })
  assert.equal(again.status, 200)
  const stillThere = await agent.get(`/api/employees/${employeeId}`)
  assert.equal(stillThere.status, 200)
  assert.equal(stillThere.body.stats.totalServices, 2)
  assert.equal(stillThere.body.payments.length, 2)
  assert.equal(stillThere.body.employee.fullName, 'John Smith')

  console.log('Integration workflow passed.')
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})
