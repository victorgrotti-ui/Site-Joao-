export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = copy.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  copy.setDate(copy.getDate() + diff)
  return copy
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

export function presetRange(preset: 'today' | 'week' | 'month' | 'lastMonth'): { from: string; to: string } {
  const today = new Date()
  if (preset === 'today') {
    const iso = toISODate(today)
    return { from: iso, to: iso }
  }
  if (preset === 'week') {
    return { from: toISODate(startOfWeek(today)), to: toISODate(endOfWeek(today)) }
  }
  if (preset === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from: toISODate(start), to: toISODate(end) }
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { from: toISODate(start), to: toISODate(end) }
}

export function shiftISODate(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function todayISO(): string {
  return toISODate(new Date())
}
