import { execFileSync } from 'child_process'
import path from 'path'
import dotenv from 'dotenv'
import { isDevelopmentDatabaseFile, sqliteFilePath } from '../lib/database-file'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const file = sqliteFilePath()
if (!isDevelopmentDatabaseFile(file)) {
  console.error(`Refusing to reset ${file}`)
  console.error('npm run db:reset is only for the development database prisma/dev.db.')
  console.error('On the office computer, restore a backup with npm run db:restore instead.')
  process.exit(1)
}

const root = path.resolve(__dirname, '../../..')
execFileSync('npx', ['prisma', 'migrate', 'reset', '--force'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
