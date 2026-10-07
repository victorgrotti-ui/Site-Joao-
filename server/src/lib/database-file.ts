import path from 'path'

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
