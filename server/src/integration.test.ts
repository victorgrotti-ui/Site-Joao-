import { execSync } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'

const root = path.resolve(__dirname, '../..')
const databaseUrl = process.env.CMH_TEST_DATABASE_URL ?? 'postgresql://cmh:cmh-local-test@127.0.0.1:5432/cmh_integration'
process.env.DATABASE_URL = databaseUrl
process.env.DIRECT_URL = databaseUrl
process.env.JWT_SECRET = 'integration-test-secret-key-123'
process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`, {
  stdio: 'inherit',
})
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
  assert.equal(dashboard.body.kpis.reimbursements.amount, 2000)
  assert.equal(dashboard.body.kpis.expenses.amount, dashboard.body.kpis.reimbursements.amount)
  assert.equal(dashboard.body.counts.jobs, 1)
  assert.equal(dashboard.body.counts.outstandingPayments, 13000)
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

  const admin = await prisma.user.findUnique({ where: { email: 'manager@cmhcleaning.test' } })
  assert.ok(admin)
  assert.equal(admin.active, true)
  assert.equal(admin.tokenVersion, 0)
  const legacy = jwt.sign({ sub: admin.id, role: 'ADMIN' }, process.env.JWT_SECRET ?? '', { expiresIn: '1h' })
  const legacyMe = await request(app).get('/api/auth/me').set('Cookie', [`cmh_session=${legacy}`])
  assert.equal(legacyMe.status, 200)
  assert.equal(legacyMe.body.user.email, 'manager@cmhcleaning.test')

  const otherBrowser = request.agent(app)
  const otherLogin = await otherBrowser.post('/api/auth/login').send({ email: 'manager@cmhcleaning.test', password: 'correct-horse' })
  assert.equal(otherLogin.status, 200)
  const changed = await agent.post('/api/auth/change-password').send({ currentPassword: 'correct-horse', newPassword: 'updated-horse-1' })
  assert.equal(changed.status, 200)
  const stillSignedIn = await agent.get('/api/auth/me')
  assert.equal(stillSignedIn.status, 200)
  const otherSignedOut = await otherBrowser.get('/api/auth/me')
  assert.equal(otherSignedOut.status, 401)
  const oldPassword = await request(app).post('/api/auth/login').send({ email: 'manager@cmhcleaning.test', password: 'correct-horse' })
  assert.equal(oldPassword.status, 401)
  const legacyAfter = await request(app).get('/api/auth/me').set('Cookie', [`cmh_session=${legacy}`])
  assert.equal(legacyAfter.status, 401)
  const refreshed = await prisma.user.findUnique({ where: { id: admin.id } })
  assert.equal(refreshed?.tokenVersion, 1)
  assert.notEqual(refreshed?.passwordHash, admin.passwordHash)

  const anonymous = await request(app).get('/api/users')
  assert.equal(anonymous.status, 401)
  const rejected = await agent.post('/api/users').send({ name: 'A', email: 'not-an-email', password: 'short', role: 'EMPLOYEE' })
  assert.equal(rejected.status, 400)

  const createdManager = await agent.post('/api/users').send({
    name: 'Pat Manager',
    email: 'Pat.Manager@cmhcleaning.test',
    password: 'manager-pass-88',
    role: 'MANAGER',
  })
  assert.equal(createdManager.status, 201, JSON.stringify(createdManager.body))
  assert.equal(createdManager.body.user.email, 'pat.manager@cmhcleaning.test')
  assert.equal(createdManager.body.user.role, 'MANAGER')
  assert.equal(createdManager.body.user.active, true)
  assert.equal(Object.hasOwn(createdManager.body.user, 'passwordHash'), false)
  const duplicateAccount = await agent.post('/api/users').send({
    name: 'Pat Again',
    email: 'pat.manager@cmhcleaning.test',
    password: 'manager-pass-88',
    role: 'MANAGER',
  })
  assert.equal(duplicateAccount.status, 409)

  const selfOff = await agent.post(`/api/users/${admin.id}/active`).send({ active: false })
  assert.equal(selfOff.status, 400)
  assert.equal(selfOff.body.error, 'You cannot deactivate your own account.')
  const selfRole = await agent.post(`/api/users/${admin.id}/role`).send({ role: 'MANAGER' })
  assert.equal(selfRole.status, 400)
  assert.equal(selfRole.body.error, 'The last active administrator must stay an active administrator.')
  const selfReset = await agent.post(`/api/users/${admin.id}/reset-password`).send({ password: 'another-pass-88' })
  assert.equal(selfReset.status, 400)

  const secondAdmin = await agent.post('/api/users').send({
    name: 'Second Admin',
    email: 'second.admin@cmhcleaning.test',
    password: 'second-admin-88',
    role: 'ADMIN',
  })
  assert.equal(secondAdmin.status, 201)
  const secondId = secondAdmin.body.user.id as string
  const deactivated = await agent.post(`/api/users/${secondId}/active`).send({ active: false })
  assert.equal(deactivated.status, 200)
  assert.equal(deactivated.body.user.active, false)
  const inactiveLogin = await request(app).post('/api/auth/login').send({ email: 'second.admin@cmhcleaning.test', password: 'second-admin-88' })
  assert.equal(inactiveLogin.status, 403)
  assert.equal(inactiveLogin.body.error, 'This account is inactive.')
  const lastOff = await agent.post(`/api/users/${admin.id}/active`).send({ active: false })
  assert.equal(lastOff.status, 400)
  const reactivated = await agent.post(`/api/users/${secondId}/active`).send({ active: true })
  assert.equal(reactivated.status, 200)
  const secondBrowser = request.agent(app)
  const secondLogin = await secondBrowser.post('/api/auth/login').send({ email: 'second.admin@cmhcleaning.test', password: 'second-admin-88' })
  assert.equal(secondLogin.status, 200)
  const reset = await agent.post(`/api/users/${secondId}/reset-password`).send({ password: 'second-reset-88' })
  assert.equal(reset.status, 200)
  assert.equal(Object.hasOwn(reset.body, 'password'), false)
  assert.equal((await secondBrowser.get('/api/users')).status, 401)
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'second.admin@cmhcleaning.test', password: 'second-admin-88' })).status, 401)
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'second.admin@cmhcleaning.test', password: 'second-reset-88' })).status, 200)
  const demoted = await agent.post(`/api/users/${secondId}/role`).send({ role: 'MANAGER' })
  assert.equal(demoted.status, 200)
  assert.equal(demoted.body.user.role, 'MANAGER')
  assert.equal((await agent.post(`/api/users/${admin.id}/role`).send({ role: 'MANAGER' })).status, 400)

  const managerBrowser = request.agent(app)
  const managerLogin = await managerBrowser.post('/api/auth/login').send({ email: 'pat.manager@cmhcleaning.test', password: 'manager-pass-88' })
  assert.equal(managerLogin.status, 200)
  assert.equal((await managerBrowser.get('/api/users')).status, 403)
  assert.equal((await managerBrowser.post('/api/users').send({ name: 'Nope Person', email: 'nope.person@cmhcleaning.test', password: 'manager-pass-88', role: 'MANAGER' })).status, 403)
  assert.equal((await managerBrowser.get('/api/employees')).status, 200)

  const listed = await agent.get('/api/users')
  assert.equal(listed.status, 200)
  assert.equal(listed.body.users.length, 3)
  for (const row of listed.body.users as Array<Record<string, unknown>>) {
    assert.equal(Object.hasOwn(row, 'passwordHash'), false)
    assert.equal(Object.hasOwn(row, 'tokenVersion'), false)
  }
  assert.equal(await prisma.employee.count(), 1)
  assert.equal(await prisma.user.count(), 3)
  const books = await agent.get('/api/dashboard').query({ from: '2026-10-01', to: '2026-10-03' })
  assert.equal(books.body.kpis.revenue.amount, 43000)
  assert.equal(books.body.kpis.employeePayments.amount, 20000)
  assert.equal(books.body.kpis.expenses.amount, 3500)
  assert.equal(books.body.kpis.profit.amount, 19500)

  console.log('Integration workflow passed.')
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})
