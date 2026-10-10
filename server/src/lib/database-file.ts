import path from 'path'

/** True when the file is the development database, which must not hold company records. */
export function isDevelopmentDatabaseFile(filePath: string): boolean {
  return path.basename(filePath).toLowerCase() === 'dev.db'
}

/** Supabase, and any other PostgreSQL URL. The password in this URL must stay on the server. */
export function isPostgresUrl(url = process.env.DATABASE_URL ?? ''): boolean {
  return /^postgres(ql)?:/i.test(url)
}

/** Absolute path of the SQLite file named by DATABASE_URL. Relative paths follow the Prisma folder. */
export function sqliteFilePath(): string {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.startsWith('file:')) {
    throw new Error('This command works with the local SQLite database. DATABASE_URL must start with file:')
  }
  let spec = url.slice('file:'.length)
  if (spec.startsWith('//')) spec = spec.slice(2)
  const prismaDir = path.resolve(__dirname, '../../../prisma')
  return path.isAbsolute(spec) ? spec : path.resolve(prismaDir, spec)
}
