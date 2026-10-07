import { ExpenseCategory, ExpenseOrigin, Prisma } from '@prisma/client'
import { HttpError } from './errors'

interface ServiceCost {
  id: string
  serviceDate: Date
  employeeId: string
  cleaningProductsCost: number
  otherExpenses: number
}

export async function syncServiceExpenses(
  tx: Prisma.TransactionClient,
  service: ServiceCost,
  flags: { productsReimbursable: boolean; otherReimbursable: boolean },
) {
  await syncOne(tx, {
    service,
    origin: 'SERVICE_PRODUCTS',
    amount: service.cleaningProductsCost,
    category: 'CLEANING_PRODUCTS',
    description: 'Cleaning products',
    reimbursable: flags.productsReimbursable && service.cleaningProductsCost > 0,
  })
  await syncOne(tx, {
    service,
    origin: 'SERVICE_OTHER',
    amount: service.otherExpenses,
    category: 'OTHER',
    description: 'Other service expenses',
    reimbursable: flags.otherReimbursable && service.otherExpenses > 0,
  })
}

async function syncOne(
  tx: Prisma.TransactionClient,
  input: {
    service: ServiceCost
    origin: ExpenseOrigin
    amount: number
    category: ExpenseCategory
    description: string
    reimbursable: boolean
  },
) {
  const existing = await tx.expense.findFirst({
    where: { serviceId: input.service.id, origin: input.origin },
    include: { paymentItems: { select: { id: true } } },
  })

  if (input.amount <= 0) {
    if (!existing) return
    if (existing.paymentItems.length > 0) {
      throw new HttpError(400, 'This service is already included in a payment. Financial details cannot be changed.')
    }
    await tx.expense.delete({ where: { id: existing.id } })
    return
  }

  const data = {
    date: input.service.serviceDate,
    category: input.category,
    description: existing?.description || input.description,
    amount: input.amount,
    employeeId: input.reimbursable ? input.service.employeeId : null,
    serviceId: input.service.id,
    reimbursable: input.reimbursable,
    origin: input.origin,
  }

  if (!existing) {
    await tx.expense.create({ data })
    return
  }

  const locked = existing.paymentItems.length > 0
  const changed =
    existing.amount !== data.amount ||
    existing.reimbursable !== data.reimbursable ||
    existing.employeeId !== data.employeeId ||
    existing.date.getTime() !== data.date.getTime()
  if (locked && changed) {
    throw new HttpError(400, 'This service is already included in a payment. Financial details cannot be changed.')
  }
  await tx.expense.update({ where: { id: existing.id }, data })
}
