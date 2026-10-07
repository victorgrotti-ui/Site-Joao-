import fs from 'fs'
import os from 'os'
import { createApp } from './app'
import { ensureBootstrapAdmin } from './lib/bootstrap-admin'
import { isDevelopmentDatabaseFile, sqliteFilePath } from './lib/database-file'
import { FRIENDLY_HOST, advertiseFriendlyName, isPrivateLanAddress, listenTargets, publicBindRequested } from './lib/office-network'
import { prisma } from './lib/prisma'
import { ensureSettings } from './lib/settings'

function detectedAddresses(): string[] {
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
    console.error('DATABASE_URL is missing. Copy .env.example to .env. On the office computer, run npm run db:office.')
    process.exit(1)
  }
  const secret = process.env.JWT_SECRET ?? ''
  if (secret.length < 16 || secret.includes('replace-with')) {
    console.error('Set JWT_SECRET in .env to a long random string before starting the server.')
    process.exit(1)
  }

  if (process.env.DATABASE_URL.startsWith('file:')) {
    const databaseFile = sqliteFilePath()
    if (!fs.existsSync(databaseFile)) {
      console.error(`Database file not found at ${databaseFile}`)
      console.error('On the office computer run: npm run db:office')
      console.error('That creates prisma/production.db. It does not copy prisma/dev.db.')
      process.exit(1)
    }
    if (isDevelopmentDatabaseFile(databaseFile)) {
      console.warn('This window is using the development database prisma/dev.db.')
      console.warn('Do not enter company records here.')
      console.warn('On the office computer set DATABASE_URL="file:./production.db" and run npm run db:office.')
    } else {
      console.log(`Company database: ${databaseFile}`)
    }
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;')
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;')
  }
  await ensureSettings()
  await ensureBootstrapAdmin()

  const port = Number(process.env.PORT || 3001)
  const host = process.env.HOST?.trim() || '0.0.0.0'
  const detected = detectedAddresses()
  const bindAll = publicBindRequested(process.env)
  const targets = listenTargets(host, detected, bindAll)
  const app = createApp()
  let ready = 0

  const onReady = () => {
    ready += 1
    if (ready !== targets.length) return
    console.log('CMH Cleaning is ready.')
    if (bindAll) {
      console.log(`Listening on 0.0.0.0:${port} for a temporary hosting test.`)
      if (process.env.RENDER_EXTERNAL_URL) console.log(`Temporary test address: ${process.env.RENDER_EXTERNAL_URL}`)
      console.log('SQLite data on a free host is deleted when the service restarts or spins down.')
      console.log('The office computer should leave CMH_BIND unset and keep the local database.')
      return
    }
    const privateAddresses = targets.filter(isPrivateLanAddress)
    console.log(`Open http://${FRIENDLY_HOST}:${port}`)
    console.log(`On this computer, if that name does not open yet, use http://127.0.0.1:${port}`)
    if (privateAddresses.length === 0) {
      console.log('No private office address was found. Other devices cannot reach this computer yet.')
    } else {
      advertiseFriendlyName(privateAddresses)
      console.log(`Phones on the same office Wi-Fi can use http://${FRIENDLY_HOST}:${port} as well.`)
      for (const address of privateAddresses) {
        console.log(`If a phone cannot open the name, use http://${address}:${port}`)
      }
    }
    console.log('Do not forward port 3001 to the internet.')
  }

  for (const address of targets) {
    const server = app.listen(port, address, onReady)
    server.on('error', (error: NodeJS.ErrnoException) => {
      console.error(`Could not open port ${port} on ${address}. ${error.message}`)
      process.exit(1)
    })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
