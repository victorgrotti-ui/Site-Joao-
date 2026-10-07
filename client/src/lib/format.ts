let activeLocale = 'en-GB'

export function setFormatLocale(locale: 'en' | 'pt-BR') {
  activeLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-GB'
}

export function formatGBP(pence: number): string {
  return new Intl.NumberFormat(activeLocale, { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(activeLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  )
}

export function formatChartKey(key: string | undefined, fallback: string): string {
  if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const [year, month, day] = key.split('-').map(Number)
    return new Intl.DateTimeFormat(activeLocale, { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day))
  }
  if (key && /^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split('-').map(Number)
    return new Intl.DateTimeFormat(activeLocale, { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
  }
  return fallback
}

export function formatDateRange(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(1)}%`
}

export function penceToInput(pence: number): string {
  return (pence / 100).toFixed(2)
}

export function parseMoneyToPence(input: string): number | null {
  const cleaned = input.replace(/£/g, '').replace(/,/g, '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(pence)) return null
  return pence
}

export function moneyOrZero(input: string): number {
  if (!input.trim()) return 0
  return parseMoneyToPence(input) ?? 0
}
