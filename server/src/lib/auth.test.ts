import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { clearCookieOptions, cookieOptions } from './auth'

const original = process.env.COOKIE_SECURE

afterEach(() => {
  if (original === undefined) delete process.env.COOKIE_SECURE
  else process.env.COOKIE_SECURE = original
})

describe('session cookie', () => {
  it('stays usable on an internal HTTP address unless HTTPS is requested', () => {
    delete process.env.COOKIE_SECURE
    assert.equal(cookieOptions().secure, false)
    assert.equal(cookieOptions().httpOnly, true)
    assert.equal(clearCookieOptions().secure, false)
    process.env.COOKIE_SECURE = 'true'
    assert.equal(cookieOptions().secure, true)
    assert.equal(clearCookieOptions().secure, true)
  })
})
