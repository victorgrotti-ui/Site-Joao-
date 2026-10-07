import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { isDevelopmentDatabaseFile, sqliteFilePath } from '../lib/database-file'
import { prisma } from '../lib/prisma'

function targetsDevelopmentDatabase(file: string): boolean {
  if (isDevelopmentDatabaseFile(file)) return true
  try {
    return fs.existsSync(file) && isDevelopmentDatabaseFile(fs.realpathSync(file))
  } catch {
    return false
  }
}

function run(script: string) {
  const root = path.resolve(__dirname, '../../..')
  execFileSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
}

async function main() {
  const file = sqliteFilePath()
  if (targetsDevelopmentDatabase(file)) {
    console.error('Refusing to use prisma/dev.db as the company database.')
    console.error('In .env set DATABASE_URL="file:./production.db"')
    console.error('The development database was not changed.')
    process.exit(1)
  }
  if (path.basename(file) !== 'production.db') {
    console.error(`Refusing to create a company database at ${file}`)
    console.error('The office database must be prisma/production.db.')
    console.error('In .env set DATABASE_URL="file:./production.db"')
    process.exit(1)
  }

  console.log(`Preparing an empty company database at ${file}`)
  console.log('Nothing is copied from prisma/dev.db.')
  run('db:deploy')
  run('db:seed')

  const [users, employees, services, expenses, payments, settings] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count(),
    prisma.service.count(),
    prisma.expense.count(),
    prisma.payment.count(),
    prisma.companySettings.count(),
  ])
  console.log(`Administrators: ${users}`)
  console.log(`Employees: ${employees}`)
  console.log(`Services: ${services}`)
  console.log(`Expenses: ${expenses}`)
  console.log(`Payments: ${payments}`)
  console.log(`Company settings: ${settings}`)
  if (employees + services + expenses + payments > 0) {
    console.log('This database already has records. They were left in place.')
    return
  }
  console.log('The company database is ready. It has no employees, services, expenses or payments.')
  console.log('Create the administrator next with npm run admin:create')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
