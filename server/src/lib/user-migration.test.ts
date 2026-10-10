import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const root = path.resolve(__dirname, '../../..')
const migrationPath = path.join(root, 'prisma/migrations/20261010010000_supabase_init/migration.sql')
const schemaPath = path.join(root, 'prisma/schema.prisma')

describe('Supabase schema', () => {
  it('creates every company table in PostgreSQL and does not delete rows', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    assert.match(schema, /provider\s+=\s+"postgresql"/)
    for (const table of ['User', 'Employee', 'Service', 'Expense', 'Payment', 'PaymentItem', 'CompanySettings']) {
      assert.match(sql, new RegExp(`CREATE TABLE "${table}"`))
    }
    assert.match(sql, /"active" BOOLEAN NOT NULL DEFAULT true/)
    assert.match(sql, /"tokenVersion" INTEGER NOT NULL DEFAULT 0/)
    assert.match(sql, /"passwordHash" TEXT NOT NULL/)
    assert.match(sql, /CHECK \("revenue" >= 0\)/)
    assert.doesNotMatch(sql, /\b(DROP TABLE|DELETE FROM|TRUNCATE)\b/i)
  })
})