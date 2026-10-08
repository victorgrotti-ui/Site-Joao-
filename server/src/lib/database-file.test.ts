import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isDevelopmentDatabaseFile } from './database-file'

describe('database file', () => {
  it('recognises the development database and not the office database', () => {
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/dev.db'), true)
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/DEV.DB'), true)
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/production.db'), false)
    assert.equal(isDevelopmentDatabaseFile('/office/prisma/production.db-wal'), false)
  })
})
