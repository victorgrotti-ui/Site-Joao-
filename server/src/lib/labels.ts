export const SERVICE_TYPES = [
  'REGULAR_CLEANING',
  'DEEP_CLEANING',
  'END_OF_TENANCY',
  'MOVE_IN_MOVE_OUT',
  'OTHER',
] as const

export type ServiceType = (typeof SERVICE_TYPES)[number]

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  REGULAR_CLEANING: 'Regular Cleaning',
  DEEP_CLEANING: 'Deep Cleaning',
  END_OF_TENANCY: 'End of Tenancy',
  MOVE_IN_MOVE_OUT: 'Move In / Move Out',
  OTHER: 'Other',
}

export const EXPENSE_CATEGORIES = [
  'CLEANING_PRODUCTS',
  'TRANSPORTATION',
  'EQUIPMENT',
  'SUPPLIES',
  'OTHER',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  CLEANING_PRODUCTS: 'Cleaning Products',
  TRANSPORTATION: 'Transportation',
  EQUIPMENT: 'Equipment',
  SUPPLIES: 'Supplies',
  OTHER: 'Other',
}

export const PAYMENT_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

export const PAYMENT_DAY_LABELS: Record<(typeof PAYMENT_DAYS)[number], string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
}
