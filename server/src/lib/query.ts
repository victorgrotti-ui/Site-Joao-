import type { Request } from 'express'
import { enumerateDates, isDateOnly } from './dates'
import { HttpError } from './errors'
import type { ReportFilters } from './finance'
import { EXPENSE_CATEGORIES, SERVICE_TYPES } from './labels'

export function readRange(query: Request['query'], options?: { optional?: boolean }): { from?: string; to?: string } {
  const from = typeof query.from === 'string' ? query.from : ''
  const to = typeof query.to === 'string' ? query.to : ''
  if (!from && !to && options?.optional) return {}
  if (!isDateOnly(from) || !isDateOnly(to)) {
    throw new HttpError(400, 'Choose a valid date range.')
  }
  if (from > to) {
    throw new HttpError(400, 'The start date must be on or before the end date.')
  }
  if (enumerateDates(from, to).length > 3660) {
    throw new HttpError(400, 'Choose a shorter date range.')
  }
  return { from, to }
}

export function readReportFilters(query: Request['query']): ReportFilters {
  const range = readRange(query)
  const filters: ReportFilters = { from: range.from!, to: range.to! }
  if (typeof query.employeeId === 'string' && query.employeeId.trim()) {
    filters.employeeId = query.employeeId.trim()
  }
  if (typeof query.serviceType === 'string' && query.serviceType) {
    if (!(SERVICE_TYPES as readonly string[]).includes(query.serviceType)) {
      throw new HttpError(400, 'Choose a valid service type.')
    }
    filters.serviceType = query.serviceType
  }
  if (typeof query.client === 'string' && query.client.trim()) {
    filters.client = query.client.trim()
  }
  if (typeof query.paymentStatus === 'string' && query.paymentStatus) {
    if (query.paymentStatus !== 'PAID' && query.paymentStatus !== 'PENDING') {
      throw new HttpError(400, 'Choose a valid payment status.')
    }
    filters.paymentStatus = query.paymentStatus
  }
  return filters
}

export function readExpenseCategory(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(value)) {
    throw new HttpError(400, 'Choose a valid category.')
  }
  return value
}
