import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

export const prisma = new PrismaClient()
