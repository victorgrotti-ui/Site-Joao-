import { z } from 'zod'
import { isDateOnly } from './dates'
import { EXPENSE_CATEGORIES, PAYMENT_DAYS, SERVICE_TYPES } from './labels'
import { parseMoneyToPence } from './money'

function emptyToNull(value: unknown): unknown {
  if (value == null) return null
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function optionalText(max: number) {
  return z.preprocess(emptyToNull, z.string().max(max).nullable())
}

const optionalEmail = z
  .preprocess(emptyToNull, z.string().max(160).nullable())
  .transform((value, ctx) => {
    if (value == null) return null
    const email = value.toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address.' })
      return z.NEVER
    }
    return email
  })

const optionalPhone = optionalText(30).transform((value, ctx) => {
  if (value == null) return null
  if (!/^[0-9+\s()-]{6,30}$/.test(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number.' })
    return z.NEVER
  }
  return value
})

export const moneyField = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const pence = parseMoneyToPence(value)
  if (pence == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a valid amount in pounds, such as 110 or 110.50. Amounts cannot be negative.',
    })
    return z.NEVER
  }
  return pence
})

const dateField = z.string().trim().refine(isDateOnly, 'Enter a valid date.')

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z.string().min(8, 'Use at least 8 characters.').max(72, 'Password is too long.'),
})

export const employeeSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the employee’s full name.').max(120),
  phone: optionalPhone,
  email: optionalEmail,
  defaultRate: moneyField,
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  notes: optionalText(2000),
})

export const serviceSchema = z.object({
  serviceDate: dateField,
  propertyAddress: z.string().trim().min(3, 'Enter the property or address.').max(300),
  serviceType: z.enum(SERVICE_TYPES),
  clientName: z.string().trim().min(2, 'Enter the contracting company or client.').max(160),
  employeeId: z.string().trim().min(1, 'Choose an employee.'),
  revenue: moneyField,
  employeePayment: moneyField,
  cleaningProductsCost: moneyField,
  otherExpenses: moneyField,
  productsReimbursable: z.boolean().optional().default(false),
  otherReimbursable: z.boolean().optional().default(false),
  notes: optionalText(2000),
})

export const expenseSchema = z.object({
  date: dateField,
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(2, 'Enter a short description.').max(300),
  amount: moneyField.refine((pence) => pence > 0, 'Enter an amount greater than zero.'),
  employeeId: z.preprocess(emptyToNull, z.string().nullable()),
  serviceId: z.preprocess(emptyToNull, z.string().nullable()),
  reimbursable: z.boolean().optional().default(false),
  notes: optionalText(2000),
})

export const markPaidSchema = z
  .object({
    employeeId: z.string().trim().min(1, 'Choose an employee.'),
    periodStart: dateField,
    periodEnd: dateField,
    paymentDate: dateField,
    confirmAdditional: z.boolean().optional().default(false),
    notes: optionalText(2000),
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    message: 'The period start must be on or before the period end.',
    path: ['periodEnd'],
  })

export const settingsSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter the company name.').max(120),
  phone: optionalPhone,
  email: optionalEmail,
  address: optionalText(300),
  defaultPaymentDay: z.enum(PAYMENT_DAYS),
})

export type EmployeeInput = z.infer<typeof employeeSchema>
export type ServiceInput = z.infer<typeof serviceSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type MarkPaidInput = z.infer<typeof markPaidSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
