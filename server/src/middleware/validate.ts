import type { NextFunction, Request, Response } from 'express'
import type { ZodError, ZodType } from 'zod'
import { HttpError } from '../lib/errors'

function detailsFrom(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!details[key]) details[key] = issue.message
  }
  return details
}

export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      next(
        new HttpError(400, 'Please check the form.', {
          code: 'VALIDATION',
          details: detailsFrom(parsed.error),
        }),
      )
      return
    }
    req.body = parsed.data
    next()
  }
}
