import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { sqliteFilePath } from '../lib/database-file'
import { prisma } from '../lib/prisma'

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function isSqliteFile(file: string): boolean {
  const header = Buffer.alloc(16)
  const handle = fs.openSync(file, 'r')
  try {
    fs.readSync(handle, header, 0, 16, 0)
  } finally {
    fs.closeSync(handle)
  }
  return header.toString('utf8') === 'SQLite format 3\u0000'
}

async function main() {
  const requested = process.argv[2]
  if (!requested) {
    console.error('Usage: npm run db:restore -- backups/cmh-backup-YYYYMMDD-HHMMSS.db')
    process.exit(1)
  }
  const source = path.resolve(requested)
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    console.error(`Backup file not found: ${source}`)
    process.exit(1)
  }
  if (!isSqliteFile(source)) {
    console.error('That file is not a SQLite database backup.')
    process.exit(1)
  }

  const destination = sqliteFilePath()
  console.log(`This will replace the company database at ${destination}`)
  console.log(`with the backup ${source}`)
  console.log('Stop npm start and npm run dev before continuing.')

  if (process.stdin.isTTY) {
    const answer = await ask('Type RESTORE to continue: ')
    if (answer !== 'RESTORE') {
      console.error('Restore cancelled.')
      process.exit(1)
    }
  } else if (process.env.CMH_RESTORE_CONFIRM !== 'RESTORE') {
    console.error('Run this in a terminal so you can confirm, or set CMH_RESTORE_CONFIRM=RESTORE for this one command.')
    process.exit(1)
  }

  if (fs.existsSync(destination)) {
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 2000;')
    try {
      await prisma.$executeRawUnsafe('BEGIN EXCLUSIVE')
      await prisma.$executeRawUnsafe('ROLLBACK')
    } catch {
      console.error('The database is in use. Stop the application, then run the restore again.')
      process.exit(1)
    }
  }

  await prisma.$disconnect()
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(source, destination)
  fs.rmSync(`${destination}-wal`, { force: true })
  fs.rmSync(`${destination}-shm`, { force: true })
  console.log(`Database restored to ${destination}`)
  console.log('Start the application again and sign in.')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
