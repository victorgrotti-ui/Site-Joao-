import { Router } from 'express'
import { asyncRoute } from '../lib/async'
import { ensureSettings, serializeSettings } from '../lib/settings'
import { settingsSchema, type SettingsInput } from '../lib/schemas'
import { prisma } from '../lib/prisma'
import { validate } from '../middleware/validate'

export const settingsRouter = Router()

settingsRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const settings = await ensureSettings()
    res.json({ settings: serializeSettings(settings) })
  }),
)

settingsRouter.put(
  '/',
  validate(settingsSchema),
  asyncRoute(async (req, res) => {
    const body = req.body as SettingsInput
    await ensureSettings()
    const settings = await prisma.companySettings.update({
      where: { id: 'default' },
      data: {
        companyName: body.companyName,
        phone: body.phone,
        email: body.email,
        address: body.address,
        defaultPaymentDay: body.defaultPaymentDay,
        currency: 'GBP',
      },
    })
    res.json({ settings: serializeSettings(settings) })
  }),
)
