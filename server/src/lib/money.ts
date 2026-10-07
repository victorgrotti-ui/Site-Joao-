/** Money is stored as integer pence so totals cannot drift. */

export function parseMoneyToPence(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null
    return parseMoneyToPence(input.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1'))
  }
  if (typeof input !== 'string') return null
  const cleaned = input.replace(/£/g, '').replace(/,/g, '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(pence) || pence > 100_000_000) return null
  return pence
}

export function penceToPoundsString(pence: number): string {
  const sign = pence < 0 ? '-' : ''
  const absolute = Math.abs(pence)
  const whole = Math.floor(absolute / 100)
  const fraction = String(absolute % 100).padStart(2, '0')
  return `${sign}${whole}.${fraction}`
}

export function formatCsvMoney(pence: number): string {
  return penceToPoundsString(pence)
}
