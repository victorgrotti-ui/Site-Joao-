import path from 'path'
import { isDevelopmentDatabaseFile } from '../lib/database-file'
import { importSqliteFile } from '../lib/import-sqlite'
import { prisma } from '../lib/prisma'

async function main() {
  const requested = process.argv[2]
  if (!requested) {
    console.error('Usage: npm run db:import-sqlite -- path\\to\\production.db')
    process.exit(1)
  }
  const source = path.resolve(requested)
  if (isDevelopmentDatabaseFile(source)) {
    console.error('Refusing to import prisma/dev.db.')
    process.exit(1)
  }
  const counts = await importSqliteFile(source)
  console.log(`Imported settings: ${counts.settings}`)
  console.log(`Imported accounts: ${counts.users}`)
  console.log(`Imported employees: ${counts.employees}`)
  console.log(`Imported services: ${counts.services}`)
  console.log(`Imported expenses: ${counts.expenses}`)
  console.log(`Imported payments: ${counts.payments}`)
  console.log(`Imported payment lines: ${counts.paymentItems}`)
  console.log('Passwords were copied as hashes and were not printed.')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
