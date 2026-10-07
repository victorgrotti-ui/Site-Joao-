import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { en } from './en.ts'
import { pt } from './pt.ts'

function leaves(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key))
}

describe('interface languages', () => {
  it('keeps Brazilian Portuguese aligned with English', () => {
    assert.deepEqual(leaves(pt), leaves(en))
  })
})
