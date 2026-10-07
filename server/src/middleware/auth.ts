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
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      throw new HttpError(401, 'Please sign in.')
    }
    req.user = user
    next()
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Please sign in.'))
  }
}
