import readline from 'readline'
import { hashPassword } from '../lib/auth'
import { prisma } from '../lib/prisma'

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  const usingEnv = Boolean(process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD)
  let email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ''
  let password = process.env.ADMIN_PASSWORD ?? ''

  if (!email || !password) {
    if (usingEnv) {
      console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD together.')
      process.exit(1)
    }
    if (!process.stdin.isTTY) {
      console.error('Run this in a terminal, or set ADMIN_EMAIL and ADMIN_PASSWORD.')
      process.exit(1)
    }
    console.log('Reset a CMH Cleaning administrator password\n')
    email = (await ask('Email: ')).toLowerCase()
    password = await ask('New password (at least 8 characters): ')
    const confirm = await ask('Confirm password: ')
    if (password !== confirm) {
      console.error('Passwords do not match.')
      process.exit(1)
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Enter a valid email address.')
    process.exit(1)
  }
  if (password.length < 8 || password.length > 72) {
    console.error('Use a password of at least 8 characters.')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error('No account was found with that email.')
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } },
  })
  console.log(`Password updated for ${email}. Other browsers using this account must sign in again.`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
