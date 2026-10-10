# CMH Cleaning — office computer installation

CMH Cleaning runs on one office computer. Company records are stored in Supabase. Other phones and laptops on the same office Wi-Fi open the office computer in a browser. The database password stays in `.env` on that computer. The browser never receives it.

Do not forward port 3001. Do not import `prisma/dev.db`. That file is only for development.

In `.env`, set the two Supabase connection strings from Project Settings → Database:

```text
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"
```

## Required software

- The office computer (Windows or Mac), left on while people use the system
- Node.js 20 or newer, from [https://nodejs.org](https://nodejs.org)
- This project folder on that same computer

A phone does not need Node.js. It only needs the office Wi-Fi and a browser.

## Install

Open a terminal in the project folder.

Windows Command Prompt:

```bat
npm install
copy .env.example .env
```

Mac Terminal:

```bash
npm install
cp .env.example .env
```

Open `.env` in a text editor. Paste the Supabase `DATABASE_URL` and `DIRECT_URL`. Replace `JWT_SECRET` with a long random value. On either computer:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Paste the result between the quotes. Do not put it in an email or in the git repository. Leave `PORT=3001`. Leave `HOST` unset. Leave `COOKIE_SECURE` unset. Leave `CMH_BIND` unset.

Create the Supabase tables, then the administrator, then build:

```bash
npm run db:office
npm run admin:create
npm run build
```

`npm run db:office` creates the Supabase tables, applies the Prisma migrations, and saves the company name CMH Cleaning with currency GBP when that settings row is missing. It does not delete employees, services, expenses or payments.

To copy an existing SQLite company file into Supabase, stop the old server and run:

```bash
npm run db:import-sqlite -- path\to\production.db
```

That copies accounts, employees, jobs, expenses, payments and company settings. Password hashes are copied and are not printed. Do not point this command at `prisma/dev.db`.

When you download a newer copy of this project, run `npm run db:office` again before `npm start`. It applies new migrations and leaves existing rows in place. Do not run `npm run db:reset`.

## First administrator

`npm run admin:create` asks for a name, an email and a password of at least 8 characters. Type them on the office computer. The password is stored only as a bcrypt hash in Supabase. It is not written into the source code, and it must not be saved in `.env`. Skip this command if `npm run db:import-sqlite` already copied the administrator.

There is no public registration page. After the first administrator signs in, further administrators and managers are added in Settings. The same command can still add an administrator from this computer. Cleaning employees are not login accounts.

If the password is forgotten, another administrator can set a new one in Settings. That signs the account out of other browsers. If nobody can sign in, on the office computer:

```bash
npm run admin:reset-password
```

## Start and stop

Start:

```bash
npm start
```

Or double-click `scripts\start-cmh.cmd` on Windows, or run `scripts/start-cmh.sh` on a Mac.

Leave that window open. Closing it, or pressing Ctrl+C in it, stops the system for every device.

On the office computer, open:

```text
http://127.0.0.1:3001
```

The friendly name, after the hosts step below, is:

```text
http://cmh-cleaning.local:3001
```

Sign in with the administrator created above.

To start the server when the computer signs in:

- Windows: press the Windows key, run `shell:startup`, and copy a shortcut to `scripts\start-cmh.cmd` into that folder.
- Mac: System Settings, General, Login Items, and add `scripts/start-cmh.sh`.

## Other devices on the office Wi-Fi

The server listens on this computer and on the computer’s private office address. It does not listen on a public internet address.

The phone address looks like:

```text
http://192.168.x.x:3001
```

The server window prints the exact line. You can also read the address on the office computer:

- Windows: open Command Prompt and run `ipconfig`. Use the IPv4 Address on the Wi-Fi adapter. It usually starts with `192.168.`
- Mac: System Settings, Network, Wi-Fi, Details. Or in Terminal run `ipconfig getifaddr en0`.

Use the office Wi-Fi, not the guest network. On Windows, if a firewall question appears, allow Node.js on private networks only.

On the router, reserve that address for the office computer (DHCP reservation). Do not type the address into the program. Do not forward port 3001.

On the office computer itself, this hosts line makes the friendly name open:

```text
127.0.0.1 cmh-cleaning.local
```

- Windows: Notepad as administrator, file `C:\Windows\System32\drivers\etc\hosts`
- Mac: `sudo nano /etc/hosts`

A phone cannot use `127.0.0.1`. The phone uses `http://192.168.x.x:3001`.

## Backup

Open the Supabase dashboard, then Database, then Backups. Do not email an export and do not commit it. `npm run db:backup` does not copy Supabase.

## Restore

Restore from the Supabase dashboard. `npm run db:restore` refuses to replace the Supabase database. Do not run `npm run db:reset`.

## Money

Amounts are stored as whole pence. Profit is revenue minus the employee payment, cleaning products and other expenses. A reimbursable cost is one expense, and it is also added to what the employee is owed. It is not subtracted a second time. Mark as Paid only updates the record in Supabase. It does not send a bank or card payment.
