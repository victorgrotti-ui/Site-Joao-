import os from 'os'
import { createApp } from './app'
import { prisma } from './lib/prisma'
import { ensureSettings } from './lib/settings'

function lanAddresses(): string[] {
  const found: string[] = []
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = entry.family as string | number
      if ((family === 'IPv4' || family === 4) && !entry.internal) found.push(entry.address)
    }
  }
  return found
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Copy .env.example to .env and run npm run db:setup.')
    process.exit(1)
  }
  const secret = process.env.JWT_SECRET ?? ''
  if (secret.length < 16 || secret.includes('replace-with')) {
    console.error('Set JWT_SECRET in .env to a long random string before starting the server.')
    process.exit(1)
  }

  if (process.env.DATABASE_URL.startsWith('file:')) {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;')
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;')
  }
  await ensureSettings()

  const port = Number(process.env.PORT || 3001)
  const host = process.env.HOST?.trim() || '0.0.0.0'
  const app = createApp()
  app.listen(port, host, () => {
    console.log(`CMH Cleaning is running on this computer at http://127.0.0.1:${port}`)
    if (host === '0.0.0.0' || host === '::') {
      const addresses = lanAddresses()
      if (addresses.length === 0) {
        console.log('No other network address was found. Other devices cannot reach this computer yet.')
      }
      for (const address of addresses) {
        console.log(`Other devices on the same network: http://${address}:${port}`)
      }
    }
    console.log('Use one office computer as the server. Other people open that address in a browser.')
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
