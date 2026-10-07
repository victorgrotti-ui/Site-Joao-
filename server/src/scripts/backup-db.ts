import fs from 'fs'
import path from 'path'
import { sqliteFilePath } from '../lib/database-file'
import { prisma } from '../lib/prisma'

function stamp(): string {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${part(now.getMonth() + 1)}${part(now.getDate())}-${part(now.getHours())}${part(now.getMinutes())}${part(now.getSeconds())}`
}

async function main() {
  const source = sqliteFilePath()
  if (!fs.existsSync(source)) {
    console.error(`Database not found at ${source}. Run npm run db:setup first.`)
    process.exit(1)
  }
  const directory = path.resolve(__dirname, '../../../backups')
  fs.mkdirSync(directory, { recursive: true })
  const destination = path.join(directory, `cmh-backup-${stamp()}.db`)
  const sqlPath = destination.replaceAll("'", "''")
  await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath}'`)
  const bytes = fs.statSync(destination).size
  console.log(`Backup saved to ${destination} (${bytes} bytes).`)
  console.log('Keep this file on the office computer or a private drive. Do not commit it and do not upload it.')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
