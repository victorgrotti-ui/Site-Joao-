import { prisma } from '../server/src/lib/prisma'

async function main() {
  await prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'CMH Cleaning',
      currency: 'GBP',
      defaultPaymentDay: 'SATURDAY',
    },
  })
  console.log('Company settings are ready. No sample employees, services or payments were added.')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
