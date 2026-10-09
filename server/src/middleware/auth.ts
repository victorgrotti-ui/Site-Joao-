import type { NextFunction, Request, Response } from 'express'
import { COOKIE_NAME, readToken } from '../lib/auth'
import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token || typeof token !== 'string') {
      throw new HttpError(401, 'Please sign in.')
    }
    const payload = readToken(token)
    if (!payload) throw new HttpError(401, 'Please sign in.')
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, active: true, tokenVersion: true },
    })
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      throw new HttpError(401, 'Please sign in.')
    }
    if (!user.active) throw new HttpError(401, 'This account is inactive.')
    if (payload.ver !== user.tokenVersion) throw new HttpError(401, 'Please sign in.')
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role }
    next()
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Please sign in.'))
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    next(new HttpError(403, 'Only an administrator can manage accounts.'))
    return
  }
  next()
}
