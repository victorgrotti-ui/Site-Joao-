import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import { officeDatabaseCommands } from './office-setup'

describe('office database setup', () => {
  it('runs migration and seed with node instead of npm', () => {
    const commands = officeDatabaseCommands(path.join('C:', 'cmh'), 'node')
    assert.equal(commands.length, 2)
    assert.deepEqual(
      commands.map((command) => command.command),
      ['node', 'node'],
    )
    assert.equal(commands.some((command) => command.command === 'npm' || command.command === 'npm.cmd'), false)
    assert.deepEqual(commands[0].args.slice(1), ['migrate', 'deploy'])
    assert.ok(commands[0].args[0].endsWith(path.join('node_modules', 'prisma', 'build', 'index.js')))
    assert.ok(commands[1].args[0].endsWith(path.join('node_modules', 'tsx', 'dist', 'cli.mjs')))
    assert.ok(commands[1].args[1].endsWith(path.join('prisma', 'seed.ts')))
  })
})
