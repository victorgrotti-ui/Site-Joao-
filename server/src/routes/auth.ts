import { Router } from 'express'
import { clearCookieOptions, cookieOptions, COOKIE_NAME, hashPassword, signToken, verifyPassword } from '../lib/auth'
import { asyncRoute } from '../lib/async'
import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { changePasswordSchema, loginSchema } from '../lib/schemas'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'

const attempts = new Map<string, { count: number; resetAt: number }>()

function assertLoginAllowed(key: string) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt < now) return
  if (current.count >= 20) {
    throw new HttpError(429, 'Too many sign-in attempts. Please wait a few minutes and try again.')
  }
}

function recordLoginFailure(key: string) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return
  }
  current.count += 1
}

export const authRouter = Router()

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncRoute(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string }
    const normalised = email.toLowerCase()
    assertLoginAllowed(`${req.ip}:${normalised}`)
    const user = await prisma.user.findUnique({ where: { email: normalised } })
    const valid = user ? await verifyPassword(password, user.passwordHash) : false
    if (!user || !valid) {
      recordLoginFailure(`${req.ip}:${normalised}`)
      throw new HttpError(401, 'Email or password is incorrect.')
    }
    attempts.delete(`${req.ip}:${normalised}`)
    const token = signToken(user)
    res.cookie(COOKIE_NAME, token, cookieOptions())
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  }),
)

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, clearCookieOptions())
  res.json({ ok: true })
})

authRouter.get(
  '/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json({ user: req.user })
  }),
)

authRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncRoute(async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new HttpError(401, 'Please sign in.')
    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) throw new HttpError(400, 'The current password is incorrect.', { details: { currentPassword: 'The current password is incorrect.' } })
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    })
    res.json({ ok: true })
  }),
)
