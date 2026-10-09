import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { setTimeout as delay } from 'node:timers/promises'

const root = path.resolve(import.meta.dirname, '..')
const databasePath = '/tmp/cmh-users-ui.db'
const port = 3011
const base = `http://127.0.0.1:${port}`
const adminEmail = 'owner@cmhcleaning.test'
const adminPassword = 'owner-pass-88'
const managerEmail = 'sam.manager@cmhcleaning.test'
const managerPassword = 'manager-pass-88'
const replacementPassword = 'owner-pass-99'

for (const file of [databasePath, `${databasePath}-journal`, `${databasePath}-wal`, `${databasePath}-shm`]) {
  fs.rmSync(file, { force: true })
}

const env = {
  ...process.env,
  DATABASE_URL: `file:${databasePath}`,
  JWT_SECRET: 'users-ui-test-secret-key-123',
  ADMIN_NAME: 'Office Owner',
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD: adminPassword,
  PORT: String(port),
  HOST: '127.0.0.1',
  NODE_ENV: 'production',
}
delete env.CMH_BIND
delete env.RENDER
delete env.COOKIE_SECURE

execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
  cwd: root,
  env,
  stdio: 'inherit',
})

const server = spawn(process.execPath, ['dist/index.js'], {
  cwd: path.join(root, 'server'),
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (chunk) => {
  serverLog += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverLog += chunk.toString()
})

function fail(message) {
  console.error(message)
  console.error(serverLog)
  server.kill()
  process.exit(1)
}

try {
  let ready = false
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(250)
    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) {
        ready = true
        break
      }
    } catch {
      // The server is still opening its port.
    }
  }
  if (!ready) fail('The test server did not become ready.')

  const require = createRequire(path.join(root, 'package.json'))
  const playwrightPath = fs.existsSync('/tmp/pw/node_modules/playwright-core')
    ? '/tmp/pw/node_modules/playwright-core'
    : 'playwright-core'
  const { chromium } = require(playwrightPath)
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  async function signIn(email, password) {
    await page.goto(`${base}/login`)
    await page.getByTestId('login-email').fill(email)
    await page.getByTestId('login-password').fill(password)
    await page.getByTestId('login-submit').click()
    await page.waitForURL('**/dashboard')
  }

  await signIn(adminEmail, adminPassword)
  await page.goto(`${base}/settings`)
  await page.getByTestId('settings-account').waitFor()
  await page.getByRole('heading', { name: 'My account' }).waitFor()
  await page.getByTestId('settings-users').waitFor()
  await page.getByRole('heading', { name: 'Users' }).waitFor()

  await page.getByTestId('user-name').fill('Sam Manager')
  await page.getByTestId('user-email').fill(managerEmail)
  await page.getByTestId('user-password').fill(managerPassword)
  await page.getByTestId('user-role').selectOption('MANAGER')
  await page.getByTestId('user-create').click()
  await page.getByText('Account created. Share the password in person. It is not shown again.').waitFor()
  await page.getByTestId(`account-${managerEmail}`).waitFor()
  const bodyAfterCreate = await page.locator('body').innerText()
  if (bodyAfterCreate.includes(managerPassword)) fail('The new password was visible on the page.')

  await page.getByRole('button', { name: 'Language' }).first().click()
  await page.getByRole('option', { name: 'Português (Brasil)' }).click()
  await page.getByRole('heading', { name: 'Minha conta' }).waitFor()
  await page.getByRole('heading', { name: 'Usuários' }).waitFor()
  await page.getByRole('button', { name: 'Idioma' }).first().click()
  await page.getByRole('option', { name: 'English' }).click()
  await page.getByRole('heading', { name: 'My account' }).waitFor()

  const mobile = await context.newPage()
  await mobile.setViewportSize({ width: 390, height: 844 })
  await mobile.goto(`${base}/settings`)
  await mobile.getByTestId('settings-account').waitFor()
  await mobile.getByTestId('settings-users').waitFor()
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  if (overflow) fail('Settings overflowed the mobile viewport.')
  await mobile.close()

  await page.getByTestId('current-password').fill(adminPassword)
  await page.getByTestId('new-password').fill(replacementPassword)
  await page.getByTestId('confirm-password').fill(replacementPassword)
  await page.getByTestId('password-submit').click()
  await page.getByText('Password updated. Other browsers signed in with this account will need to sign in again.').waitFor()
  await page.getByRole('heading', { name: 'My account' }).waitFor()

  await page.getByRole('button', { name: 'Logout' }).click()
  await page.waitForURL('**/login')
  const oldLogin = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  if (oldLogin.status !== 401) fail(`Old password status was ${oldLogin.status}, expected 401.`)
  await signIn(adminEmail, replacementPassword)

  await page.goto(`${base}/settings`)
  await page.getByTestId(`account-${managerEmail}`).getByRole('button', { name: 'Deactivate' }).click()
  await page.getByText('Account deactivated. They can no longer sign in.').waitFor()
  const inactive = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: managerEmail, password: managerPassword }),
  })
  if (inactive.status !== 403) fail(`Inactive login status was ${inactive.status}, expected 403.`)
  await page.getByTestId(`account-${managerEmail}`).getByRole('button', { name: 'Activate' }).click()
  await page.getByText('Account activated.').waitFor()

  await page.getByRole('button', { name: 'Logout' }).click()
  await page.waitForURL('**/login')
  await signIn(managerEmail, managerPassword)
  await page.goto(`${base}/settings`)
  await page.getByTestId('settings-account').waitFor()
  if (await page.getByRole('heading', { name: 'Users' }).count()) fail('A manager could see user management.')
  if (await page.getByTestId('settings-users').count()) fail('A manager could see user management.')

  await browser.close()
  console.log('Users interface check passed.')
} finally {
  server.kill()
  for (const file of [databasePath, `${databasePath}-journal`, `${databasePath}-wal`, `${databasePath}-shm`]) {
    fs.rmSync(file, { force: true })
  }
}
