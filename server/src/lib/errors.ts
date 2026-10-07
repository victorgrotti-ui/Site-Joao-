export class HttpError extends Error {
  status: number
  code?: string
  details?: Record<string, string>
  outstandingPence?: number

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: Record<string, string>; outstandingPence?: number },
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = options?.code
    this.details = options?.details
    this.outstandingPence = options?.outstandingPence
  }
}

export const DUPLICATE_PAYMENT_MESSAGE =
  'Payment already recorded for this employee for this payment period.'
