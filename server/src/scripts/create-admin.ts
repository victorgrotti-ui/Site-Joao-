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
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ''
  const envName = process.env.ADMIN_NAME?.trim() ?? ''
  const envPassword = process.env.ADMIN_PASSWORD ?? ''
  const usingEnv = Boolean(process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD || process.env.ADMIN_NAME)

  let email = envEmail
  let name = envName
  let password = envPassword

  if (!email || !name || !password) {
    if (usingEnv) {
      console.error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD together.')
      process.exit(1)
    }
    if (!process.stdin.isTTY) {
      console.error('Run this in a terminal, or set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD.')
      process.exit(1)
    }
    console.log('Create the CMH Cleaning administrator\n')
    name = await ask('Full name: ')
    email = (await ask('Email: ')).toLowerCase()
    password = await ask('Password (at least 8 characters): ')
    const confirm = await ask('Confirm password: ')
    if (password !== confirm) {
      console.error('Passwords do not match.')
      process.exit(1)
    }
  }

  if (name.trim().length < 2) {
    console.error('Enter the administrator’s name.')
    process.exit(1)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Enter a valid email address.')
    process.exit(1)
  }
  if (password.length < 8 || password.length > 72) {
    console.error('Use a password of at least 8 characters.')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error('An account with this email already exists. Use npm run admin:reset-password to change it.')
    process.exit(1)
  }

  await prisma.user.create({
    data: {
      email,
      name: name.trim(),
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    },
  })
  console.log(`\nAdministrator created for ${email}.`)
  console.log('Start the app with npm run dev and sign in at http://localhost:5173')
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
