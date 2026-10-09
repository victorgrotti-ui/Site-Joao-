import { Prisma, type UserRole } from '@prisma/client'
import { Router } from 'express'
import { hashPassword } from '../lib/auth'
import { asyncRoute } from '../lib/async'
import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { accountActiveSchema, accountRoleSchema, createAccountSchema, resetAccountPasswordSchema } from '../lib/schemas'
import { validate } from '../middleware/validate'

const publicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
} as const

async function applyAccountChange(
  id: string,
  actorId: string,
  next: { active?: boolean; role?: UserRole },
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'Account not found.')
    const nextActive = next.active ?? target.active
    const nextRole = next.role ?? target.role
    if (target.id === actorId && nextActive === false) {
      throw new HttpError(400, 'You cannot deactivate your own account.')
    }
    const otherActiveAdmins = await tx.user.count({
      where: { role: 'ADMIN', active: true, id: { not: target.id } },
    })
    const removesLastAdmin =
      target.role === 'ADMIN' && target.active && otherActiveAdmins === 0 && (nextRole !== 'ADMIN' || nextActive === false)
    if (removesLastAdmin) {
      throw new HttpError(400, 'The last active administrator must stay an active administrator.')
    }
    return tx.user.update({
      where: { id: target.id },
      data: {
        active: nextActive,
        role: nextRole,
        ...(target.active && nextActive === false ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: publicSelect,
    })
  })
}

export const usersRouter = Router()

usersRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: publicSelect,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    })
    res.json({ users })
  }),
)

usersRouter.post(
  '/',
  validate(createAccountSchema),
  asyncRoute(async (req, res) => {
    const body = req.body as { name: string; email: string; password: string; role: UserRole }
    try {
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash: await hashPassword(body.password),
          role: body.role,
          active: true,
          tokenVersion: 0,
        },
        select: publicSelect,
      })
      res.status(201).json({ user })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'An account with this email already exists.')
      }
      throw error
    }
  }),
)

usersRouter.post(
  '/:id/reset-password',
  validate(resetAccountPasswordSchema),
  asyncRoute(async (req, res) => {
    const password = (req.body as { password: string }).password
    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) throw new HttpError(404, 'Account not found.')
    if (target.id === req.user!.id) {
      throw new HttpError(400, 'Use My account to change your own password.')
    }
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } },
    })
    res.json({ ok: true })
  }),
)

usersRouter.post(
  '/:id/active',
  validate(accountActiveSchema),
  asyncRoute(async (req, res) => {
    const { active } = req.body as { active: boolean }
    const user = await applyAccountChange(req.params.id, req.user!.id, { active })
    res.json({ user })
  }),
)

usersRouter.post(
  '/:id/role',
  validate(accountRoleSchema),
  asyncRoute(async (req, res) => {
    const { role } = req.body as { role: UserRole }
    const user = await applyAccountChange(req.params.id, req.user!.id, { role })
    res.json({ user })
  }),
)
