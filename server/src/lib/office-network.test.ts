import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FRIENDLY_HOST,
  buildMdnsResponse,
  friendlyNameQuery,
  isPrivateLanAddress,
  officeListenAddresses,
} from './office-network'

describe('office network', () => {
  it('recognises private office addresses and ignores public ones', () => {
    assert.equal(isPrivateLanAddress('192.168.1.20'), true)
    assert.equal(isPrivateLanAddress('10.0.0.4'), true)
    assert.equal(isPrivateLanAddress('172.16.5.8'), true)
    assert.equal(isPrivateLanAddress('172.30.0.2'), true)
    assert.equal(isPrivateLanAddress('172.32.0.2'), false)
    assert.equal(isPrivateLanAddress('8.8.8.8'), false)
    assert.equal(isPrivateLanAddress('127.0.0.1'), false)
    assert.equal(isPrivateLanAddress('169.254.1.1'), false)
  })

  it('listens on this computer and private addresses, not a public address', () => {
    assert.deepEqual(officeListenAddresses('', ['192.168.1.20', '8.8.8.8']), ['127.0.0.1', '192.168.1.20'])
    assert.deepEqual(officeListenAddresses('0.0.0.0', ['8.8.8.8']), ['127.0.0.1'])
    assert.deepEqual(officeListenAddresses('127.0.0.1', ['192.168.1.20']), ['127.0.0.1'])
  })

  it('answers a lookup for the friendly office name with the private address', () => {
    const response = buildMdnsResponse(friendlyNameQuery(), ['192.168.1.20', '8.8.8.8'])
    assert.ok(response)
    assert.equal(response.readUInt16BE(6), 1)
    assert.equal(response.subarray(response.length - 4).join('.'), '192.168.1.20')
    assert.equal(response.includes(Buffer.from(FRIENDLY_HOST.split('.')[0])), true)
  })

  it('ignores lookups for other names', () => {
    const other = Buffer.from(friendlyNameQuery())
    Buffer.from('not-this-name').copy(other, 13)
    assert.equal(buildMdnsResponse(other, ['192.168.1.20']), null)
  })
})
