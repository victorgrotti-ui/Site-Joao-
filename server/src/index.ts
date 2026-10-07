import { createApp } from './app'
import { prisma } from './lib/prisma'
import { ensureSettings } from './lib/settings'

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
  }
  await ensureSettings()

  const port = Number(process.env.PORT || 3001)
  const app = createApp()
  app.listen(port, () => {
    console.log(`CMH Cleaning API listening on http://localhost:${port}`)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
