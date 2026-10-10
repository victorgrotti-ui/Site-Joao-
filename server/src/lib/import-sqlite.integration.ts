import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'

const root = path.resolve(__dirname, '../../..')
const databaseUrl = process.env.CMH_IMPORT_DATABASE_URL ?? 'postgresql://cmh:cmh-local-test@127.0.0.1:5432/cmh_import'
const sourcePath = `/tmp/cmh-import-source-${process.pid}.db`
process.env.DATABASE_URL = databaseUrl
process.env.DIRECT_URL = databaseUrl

execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`, {
  stdio: 'inherit',
})
execSync('npx prisma migrate deploy', {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

async function main() {
  fs.rmSync(sourcePath, { force: true })
  const db = new DatabaseSync(sourcePath)
  db.exec(`
    CREATE TABLE "User" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE TABLE "Employee" (
      "id" TEXT PRIMARY KEY,
      "fullName" TEXT NOT NULL,
      "phone" TEXT,
      "email" TEXT,
      "defaultRate" INTEGER NOT NULL,
      "status" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE TABLE "Service" (
      "id" TEXT PRIMARY KEY,
      "serviceDate" TEXT NOT NULL,
      "propertyAddress" TEXT NOT NULL,
      "serviceType" TEXT NOT NULL,
      "clientName" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "revenue" INTEGER NOT NULL,
      "employeePayment" INTEGER NOT NULL,
      "cleaningProductsCost" INTEGER NOT NULL,
      "otherExpenses" INTEGER NOT NULL,
      "notes" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE TABLE "Expense" (
      "id" TEXT PRIMARY KEY,
      "date" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "employeeId" TEXT,
      "serviceId" TEXT,
      "reimbursable" INTEGER NOT NULL,
      "origin" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE TABLE "Payment" (
      "id" TEXT PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "periodStart" TEXT NOT NULL,
      "periodEnd" TEXT NOT NULL,
      "installment" INTEGER NOT NULL,
      "serviceCount" INTEGER NOT NULL,
      "workEarnings" INTEGER NOT NULL,
      "reimbursements" INTEGER NOT NULL,
      "totalAmount" INTEGER NOT NULL,
      "status" TEXT NOT NULL,
      "paymentDate" TEXT,
      "notes" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE TABLE "PaymentItem" (
      "id" TEXT PRIMARY KEY,
      "paymentId" TEXT NOT NULL,
      "serviceId" TEXT,
      "expenseId" TEXT,
      "kind" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "createdAt" TEXT NOT NULL
    );
    CREATE TABLE "CompanySettings" (
      "id" TEXT PRIMARY KEY,
      "companyName" TEXT NOT NULL,
      "currency" TEXT NOT NULL,
      "defaultPaymentDay" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "address" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
  `)
  db.prepare(
    `INSERT INTO "CompanySettings" ("id", "companyName", "currency", "defaultPaymentDay", "email", "phone", "address", "createdAt", "updatedAt")
     VALUES ('default', 'CMH Cleaning', 'GBP', 'SATURDAY', 'office@cmh.local', '07000 000000', '1 High Street', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z')`,
  ).run()
  db.prepare(
    `INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
     VALUES ('user-1', 'owner@cmh.local', 'stored-hash', 'Office Owner', 'ADMIN', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z')`,
  ).run()
  db.prepare(
    `INSERT INTO "Employee" ("id", "fullName", "phone", "email", "defaultRate", "status", "notes", "createdAt", "updatedAt")
     VALUES ('emp-1', 'Existing Cleaner', NULL, 'cleaner@example.com', 11000, 'ACTIVE', 'keep me', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
  ).run()
  db.prepare(
    `INSERT INTO "Service" ("id", "serviceDate", "propertyAddress", "serviceType", "clientName", "employeeId", "revenue", "employeePayment", "cleaningProductsCost", "otherExpenses", "notes", "createdAt", "updatedAt")
     VALUES ('svc-1', '2026-10-01T00:00:00.000Z', '10 High Street', 'REGULAR_CLEANING', 'Acme Lettings', 'emp-1', 25000, 11000, 2000, 0, NULL, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')`,
  ).run()
  db.prepare(
    `INSERT INTO "Expense" ("id", "date", "category", "description", "amount", "employeeId", "serviceId", "reimbursable", "origin", "notes", "createdAt", "updatedAt")
     VALUES ('exp-1', '2026-10-01T00:00:00.000Z', 'CLEANING_PRODUCTS', 'Products', 2000, 'emp-1', 'svc-1', 1, 'SERVICE_PRODUCTS', NULL, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')`,
  ).run()
  db.prepare(
    `INSERT INTO "Payment" ("id", "employeeId", "periodStart", "periodEnd", "installment", "serviceCount", "workEarnings", "reimbursements", "totalAmount", "status", "paymentDate", "notes", "createdAt", "updatedAt")
     VALUES ('pay-1', 'emp-1', '2026-09-28T00:00:00.000Z', '2026-10-04T00:00:00.000Z', 1, 1, 11000, 2000, 13000, 'PAID', '2026-10-04T00:00:00.000Z', NULL, '2026-10-04T00:00:00.000Z', '2026-10-04T00:00:00.000Z')`,
  ).run()
  db.prepare(
    `INSERT INTO "PaymentItem" ("id", "paymentId", "serviceId", "expenseId", "kind", "amount", "createdAt")
     VALUES ('item-1', 'pay-1', 'svc-1', NULL, 'WORK', 11000, '2026-10-04T00:00:00.000Z')`,
  ).run()
  db.close()

  const { importSqliteFile } = await import('./import-sqlite')
  const { prisma } = await import('./prisma')
  const counts = await importSqliteFile(sourcePath)
  assert.deepEqual(counts, {
    settings: 1,
    users: 1,
    employees: 1,
    services: 1,
    expenses: 1,
    payments: 1,
    paymentItems: 1,
  })
  const user = await prisma.user.findUnique({ where: { email: 'owner@cmh.local' } })
  assert.equal(user?.passwordHash, 'stored-hash')
  assert.equal(user?.name, 'Office Owner')
  assert.equal(user?.active, true)
  assert.equal(user?.tokenVersion, 0)
  const service = await prisma.service.findUnique({ where: { id: 'svc-1' } })
  assert.equal(service?.revenue, 25000)
  assert.equal(service?.employeePayment, 11000)
  assert.equal(service?.cleaningProductsCost, 2000)
  const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } })
  assert.equal(settings?.companyName, 'CMH Cleaning')
  assert.equal(settings?.phone, '07000 000000')
  console.log('SQLite import into PostgreSQL passed.')
  await prisma.$disconnect()
  fs.rmSync(sourcePath, { force: true })
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})
