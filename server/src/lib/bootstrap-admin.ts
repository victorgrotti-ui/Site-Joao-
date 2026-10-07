import { hashPassword } from './auth'
import { prisma } from './prisma'

/**
 * Free hosts such as Render have no shell, and their disk is wiped on restart.
 * When the three ADMIN_ variables are set, create the test administrator if missing.
 * Leave them unset on the office computer.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ''
  const name = process.env.ADMIN_NAME?.trim() ?? ''
  const password = process.env.ADMIN_PASSWORD ?? ''
  if (!email && !name && !password) return
  if (!email || !name || !password) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD together, or leave all three unset.')
  }
  if (name.length < 2) throw new Error('ADMIN_NAME must be at least 2 characters.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address.')
  if (password.length < 8 || password.length > 72) throw new Error('ADMIN_PASSWORD must be 8 to 72 characters.')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    },
  })
  console.log(`Test administrator is ready for ${email}.`)
}
