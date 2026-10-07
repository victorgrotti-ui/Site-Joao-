export const SERVICE_TYPES = [
  { value: 'REGULAR_CLEANING', label: 'Regular Cleaning' },
  { value: 'DEEP_CLEANING', label: 'Deep Cleaning' },
  { value: 'END_OF_TENANCY', label: 'End of Tenancy' },
  { value: 'MOVE_IN_MOVE_OUT', label: 'Move In / Move Out' },
  { value: 'OTHER', label: 'Other' },
] as const

export const EXPENSE_CATEGORIES = [
  { value: 'CLEANING_PRODUCTS', label: 'Cleaning Products' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'OTHER', label: 'Other' },
] as const

export const PAYMENT_DAYS = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
] as const

export function serviceTypeLabel(value: string): string {
  return SERVICE_TYPES.find((item) => item.value === value)?.label ?? value
}

export function categoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((item) => item.value === value)?.label ?? value
}

export function paymentDayLabel(value: string): string {
  return PAYMENT_DAYS.find((item) => item.value === value)?.label ?? value
}
