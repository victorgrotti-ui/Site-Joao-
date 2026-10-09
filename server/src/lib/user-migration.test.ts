import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const root = path.resolve(__dirname, '../../..')
const initPath = path.join(root, 'prisma/migrations/20261006232940_init/migration.sql')
const migrationPath = path.join(root, 'prisma/migrations/20261009180000_user_account_status/migration.sql')
const watched = ['prisma/production.db', 'prisma/dev.db', 'prisma/production.db-wal', 'prisma/dev.db-wal'].map((file) =>
  path.join(root, file),
)

function snapshot(file: string) {
  if (!fs.existsSync(file)) return null
  const stat = fs.statSync(file)
  return { size: stat.size, mtimeMs: stat.mtimeMs }
}

describe('user account migration', () => {
  it('only adds columns and keeps existing users and records', () => {
    const before = watched.map(snapshot)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    assert.match(sql, /ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;/)
    assert.match(sql, /ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;/)
    assert.doesNotMatch(sql, /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE)\b/i)

    const dbPath = `/tmp/cmh-user-migration-${process.pid}.db`
    for (const file of [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`]) fs.rmSync(file, { force: true })

    const initSql = fs.readFileSync(initPath)
    const db = new DatabaseSync(dbPath)
    db.exec(initSql.toString('utf8'))
    db.exec(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`)
    db.prepare(
      `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
       VALUES (?, ?, datetime('now'), ?, datetime('now'), 1)`,
    ).run('init-applied', createHash('sha256').update(initSql).digest('hex'), '20261006232940_init')
    db.prepare(
      `INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, 'ADMIN', ?, ?)`,
    ).run('admin-1', 'owner@cmh.local', 'stored-hash', 'Office Owner', '2026-01-01 00:00:00', '2026-01-02 00:00:00')
    db.prepare(
      `INSERT INTO "Employee" ("id", "fullName", "phone", "email", "defaultRate", "status", "notes", "createdAt", "updatedAt")
       VALUES (?, ?, NULL, ?, 11000, 'ACTIVE', 'keep me', ?, ?)`,
    ).run('emp-1', 'Existing Cleaner', 'cleaner@example.com', '2026-01-01 00:00:00', '2026-01-01 00:00:00')
    db.prepare(
      `INSERT INTO "CompanySettings" ("id", "companyName", "currency", "defaultPaymentDay", "createdAt", "updatedAt")
       VALUES ('default', 'CMH Cleaning', 'GBP', 'SATURDAY', ?, ?)`,
    ).run('2026-01-01 00:00:00', '2026-01-01 00:00:00')
    db.close()

    execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    })

    const afterDb = new DatabaseSync(dbPath)
    const user = afterDb.prepare('SELECT * FROM "User"').get() as Record<string, unknown>
    const employee = afterDb.prepare('SELECT id, fullName, notes, defaultRate FROM "Employee"').get() as Record<string, unknown>
    const settings = afterDb.prepare('SELECT id, companyName, currency FROM "CompanySettings"').get() as Record<string, unknown>
    const migrations = afterDb.prepare('SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name').all() as Array<{
      migration_name: string
    }>
    afterDb.close()

    assert.equal(user.id, 'admin-1')
    assert.equal(user.email, 'owner@cmh.local')
    assert.equal(user.passwordHash, 'stored-hash')
    assert.equal(user.name, 'Office Owner')
    assert.equal(user.role, 'ADMIN')
    assert.equal(user.createdAt, '2026-01-01 00:00:00')
    assert.equal(Number(user.active), 1)
    assert.equal(user.tokenVersion, 0)
    assert.equal(employee.fullName, 'Existing Cleaner')
    assert.equal(employee.notes, 'keep me')
    assert.equal(employee.defaultRate, 11000)
    assert.equal(settings.companyName, 'CMH Cleaning')
    assert.equal(settings.currency, 'GBP')
    assert.deepEqual(
      migrations.map((row) => row.migration_name),
      ['20261006232940_init', '20261009180000_user_account_status'],
    )

    for (const file of [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`]) fs.rmSync(file, { force: true })
    assert.deepEqual(watched.map(snapshot), before)
  })
})