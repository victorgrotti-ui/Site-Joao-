import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isDevelopmentDatabaseFile, isPostgresUrl } from './database-file'

describe('database file', () => {
  it('recognises the development database and not the office database', () => {
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/dev.db'), true)
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/DEV.DB'), true)
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/production.db'), false)
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/production.db-wal'), false)
  })

  it('recognises a Supabase PostgreSQL URL and rejects a SQLite file URL', () => {
    assert.equal(isPostgresUrl('postgresql://postgres.example:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'), true)
    assert.equal(isPostgresUrl('postgres://localhost:5432/cmh'), true)
    assert.equal(isPostgresUrl('file:./production.db'), false)
  })
})
