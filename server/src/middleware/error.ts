import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/errors'

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.details ? { details: error.details } : {}),
      ...(error.outstandingPence != null ? { outstandingPence: error.outstandingPence } : {}),
    })
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'That record already exists.' })
      return
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      res.status(409).json({ error: 'That record is linked to other data and cannot be removed.' })
      return
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Record not found.' })
      return
    }
  }

  console.error(error)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}
