const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function isDateOnly(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function dateOnlyToDate(iso: string): Date {
  if (!isDateOnly(iso)) {
    throw new Error('Enter a valid date.')
  }
  return new Date(`${iso}T00:00:00.000Z`)
}

export function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function enumerateDates(from: string, to: string): string[] {
  if (!isDateOnly(from) || !isDateOnly(to) || from > to) return []
  const dates: string[] = []
  let cursor = from
  while (cursor <= to) {
    dates.push(cursor)
    cursor = addDaysISO(cursor, 1)
    if (dates.length > 3700) break
  }
  return dates
}

export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const days = enumerateDates(from, to).length
  const prevTo = addDaysISO(from, -1)
  const prevFrom = addDaysISO(prevTo, -(days - 1))
  return { from: prevFrom, to: prevTo }
}

export function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function formatUkShort(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function formatUkDay(iso: string): string {
  const [, month, day] = iso.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}`
}

export function formatUkMonth(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`
}

export function formatUkLong(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${day} ${MONTHS_LONG[month - 1]} ${year}`
}

export function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to
}
