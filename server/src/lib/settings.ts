import { prisma } from './prisma'

export async function ensureSettings() {
  return prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'CMH Cleaning',
      currency: 'GBP',
      defaultPaymentDay: 'SATURDAY',
    },
  })
}

export function serializeSettings(settings: {
  companyName: string
  currency: string
  defaultPaymentDay: string
  email: string | null
  phone: string | null
  address: string | null
  updatedAt: Date
}) {
  return {
    companyName: settings.companyName,
    currency: 'GBP',
    currencyLabel: 'GBP (£)',
    defaultPaymentDay: settings.defaultPaymentDay,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    updatedAt: settings.updatedAt.toISOString(),
  }
}
