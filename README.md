# CMH Cleaning — Internal Office Deployment

The installation steps for the owner’s computer are in [OFFICE_DEPLOYMENT.md](OFFICE_DEPLOYMENT.md).

CMH Cleaning runs on **one office computer**. That computer keeps the company records in `prisma/production.db`. You open the system in a web browser. A phone on the same office Wi-Fi opens the same records. Nothing is put on the public internet. Do not use `prisma/dev.db` for company records. That file is only for development.

**Do not forward port 3001 to the internet.**

The address to remember is:

```text
http://cmh-cleaning.local:3001
```

## What you need

- The office computer, left on while you use the system
- Node.js 20 or newer, installed once from [https://nodejs.org](https://nodejs.org)
- This project folder on that same computer

You do not need a website address, a cloud service, or a second copy of the program on the phone.

## One-time setup

In the project folder:

```bash
npm install
cp .env.example .env
```

Open `.env`. Find `JWT_SECRET`. Replace the placeholder with a long random code. You can create one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Leave `PORT=3001`. Do not type the office computer’s number address into the program. The program finds that address itself.

```bash
npm run db:office
npm run admin:create
npm run build
```

`npm run admin:create` asks for your name, email and a password of at least 8 characters. This is the only sign-in. There is no public registration page. Use your own email and password. Do not reuse an example password.

There is one administrator account for the owner. A second person can have an account later with `npm run admin:create` and a different email. Both accounts use the same records on the office computer.

## Every day

A. Turn on the office computer.
B. Start the CMH server. Double-click `scripts/start-cmh` on Windows (`start-cmh.cmd`) or run `scripts/start-cmh.sh` on a Mac. You can also run `npm start` in the project folder.
C. Open the browser on that computer.
D. Go to http://cmh-cleaning.local:3001
E. Sign in.
F. Use the system. Add employees, cleaning jobs, expenses and payments here.
G. When you want a spare copy of the records, create a backup. The steps are below.

Leave the server window open. Closing it stops the system for every device.

If the friendly name does not open on the office computer yet, use http://127.0.0.1:3001 on that computer only. The hosts-file step below makes the friendly name work.

## Keep the same office address

On the router, reserve the office computer’s address. The router setting is often called DHCP reservation, “always use this IP address”, or an address reservation. Choose the office computer and save.

Do not type that address into CMH. If the number ever changes, start the server again and it will use the new one. A reserved address means you should not have to do that.

## The name cmh-cleaning.local

When the server is running, it tells the office network that `cmh-cleaning.local` means this computer. The office computer, and many phones on the same Wi-Fi, can then open http://cmh-cleaning.local:3001

Phones do not all understand that announcement. Guest Wi-Fi usually blocks it. The address on a phone looks like `http://192.168.1.20:3001`. The server window prints the exact address. You can also find it on the office computer:

- Windows: open Command Prompt and run `ipconfig`. Use the IPv4 Address for the Wi-Fi adapter. It usually starts with `192.168.`
- Mac: open System Settings, then Network, then Wi-Fi, then Details. Or in Terminal run `ipconfig getifaddr en0`.

If a phone cannot open the name:

1. Connect the phone to the same private office Wi-Fi, not the guest network.
2. Use the number address printed in the server window, for example `http://192.168.1.20:3001`.
3. Keep the router reservation so that number stays the same, then save it as a bookmark.

On the office computer, you can also make the name work even when the network announcement does not. Add one line to the hosts file:

```text
127.0.0.1 cmh-cleaning.local
```

- Windows: open Notepad as administrator, open `C:\Windows\System32\drivers\etc\hosts`, add the line, and save.
- Mac: in Terminal, run `sudo nano /etc/hosts`, add the line, and save.

This line points only at the office computer itself. It does not publish the system on the internet. A phone cannot use `127.0.0.1`. The phone uses the name announcement or the number address above.

Do not buy a public website name for this.

## A phone sees the same records

The phone does not get its own copy of the records. It talks to the office computer.

If you add an employee on the phone, open the system on the office computer and the same employee is there. If you add a job on the office computer, it is on the phone as well.

## Start the server when the computer starts

Windows:

1. Press the Windows key and type `shell:startup`, then press Enter.
2. Copy a shortcut to `scripts\start-cmh.cmd` into that folder.

The server window will open when you sign in to Windows. Leave it open.

Mac:

1. Open System Settings, then General, then Login Items.
2. Add `scripts/start-cmh.sh`.

## Backup

On the office computer, in the project folder, while the server can stay running:

```bash
npm run db:backup
```

The file is created here:

```text
backups/cmh-backup-YYYYMMDD-HHMMSS.db
```

Example: `backups/cmh-backup-20261007-093000.db`

Copy that file onto a USB drive that stays in the office. Do not email it. Do not upload it. Do not commit it.

Take a backup before replacing the office computer.

## Restore

1. Close the server window.
2. In the project folder, run:

```bash
npm run db:restore -- backups/cmh-backup-YYYYMMDD-HHMMSS.db
```

3. Type `RESTORE` and press Enter.
4. Start the server again and sign in.

The command stops if the server is still using the records, and it stops if the file is not a database backup.

## Forgot the password

There is no email reset. On the office computer:

```bash
npm run admin:reset-password
```

## Where the records live

```text
prisma/production.db
```

Employees, jobs, expenses, payments, reimbursements and profit all come from this file. Reports are calculated from it. Restarting the server does not delete it. The phone never stores a separate copy. `npm run db:office` creates this file empty. It does not copy `prisma/dev.db`.

While the server is running, two extra files may appear next to it: `prisma/production.db-wal` and `prisma/production.db-shm`. Leave them alone. Do not copy those files by hand while the server is open. Use `npm run db:backup`, which saves one consistent file.

## Troubleshooting

- The page does not open: the office computer must be on, and the server window must still be open.
- The friendly name does not open on the office computer: use http://127.0.0.1:3001 there, then add the hosts line above.
- The phone cannot connect: use the office Wi-Fi, not guest Wi-Fi. Try the number address from the server window. On Windows, if a firewall question appears, allow the program on private networks only.
- Sign-in is rejected: use the administrator email and password created on the office computer.
- **Do not forward port 3001 to the internet.**

## Security

- No public registration
- No anonymous access to company records
- No cloud database
- No payment-provider connection
- The secret in `.env` stays on the office computer and must not be committed

Mark as Paid only updates the record. The system does not send money.

---

# Technical reference

The sections below are for the person who installs or maintains the system.

## Install and configure

```bash
npm install
cp .env.example .env
npm run db:office
npm run admin:create
npm run build
npm start
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development only, on the office computer, at http://localhost:5173. Other devices must not use this. |
| `npm start` | The internal system. The browser and the records are served together on port 3001. |
| `npm run db:office` | Creates empty `prisma/production.db` and company settings. It refuses to use `prisma/dev.db`. |
| `npm run db:setup` | Development only. Uses whatever `DATABASE_URL` is set, usually `prisma/dev.db`. |
| `npm run db:backup` | Writes `backups/cmh-backup-YYYYMMDD-HHMMSS.db` with SQLite `VACUUM INTO` |
| `npm run db:restore -- <file>` | Replaces the database with a backup after you type `RESTORE` |
| `npm run admin:create` | Creates an administrator. Passwords are stored as bcrypt hashes. |
| `npm run admin:reset-password` | Sets a new administrator password on this computer |

`DATABASE_URL="file:./production.db"` is relative to the `prisma` folder. `HOST` stays unset so the server listens on this computer and on private office addresses only. It does not listen on a public internet address. Set `HOST=127.0.0.1` only to keep other devices out. Leave `COOKIE_SECURE` unset for the internal `http://` address. Leave `CMH_BIND` unset.

To avoid showing the password while creating the account:

```bash
ADMIN_NAME="Your Name" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-password" npm run admin:create
```

Use a real password. Do not commit it.

## Files that must not be committed

| Item | Why |
| --- | --- |
| `.env` | Contains `JWT_SECRET` |
| `JWT_SECRET` | Signs the sign-in cookie |
| `ADMIN_PASSWORD` | Only for the one command that creates an account |
| `prisma/production.db` and its `-wal` / `-shm` files | Company records |
| `prisma/dev.db` and its `-wal` / `-shm` files | Development records. Do not use them as the company database. |
| `backups/` | Copies of those records |

`.env.example` is safe to commit because its secret is a placeholder.

## Language

English is the default. Português (Brasil) stays selected after a refresh. Names, addresses, notes and amounts are not translated. Currency stays GBP (£).

## Daily records

1. Add employees and a usual rate.
2. Add a service. Profit is revenue minus the employee payment, cleaning products and other expenses.
3. If the employee paid for products, tick the reimbursement box. That cost is one company expense, and it is added to what the employee is owed.
4. Open Payments, choose the week, and mark the employee as paid.
5. If that week was already paid, the system stops and asks before recording anything else.
6. Use Reports for totals and a CSV export.

The calculation rules are in [docs/finance.md](docs/finance.md). The layout of the code is in [docs/architecture.md](docs/architecture.md).

## Logo

The sign-in page, sidebar and browser icon use `public/cmh-cleaning-logo.png`. Replace that file with the official logo when you have it. Keep the filename.

## Checks

```bash
npm test
npm run test:integration
npm run typecheck
```

## What is intentionally not included

- No public hosting, public domain or cloud database
- No sample financial records
- No email password reset
- No bank, card or payment-provider connection
- No extra permission levels. Each account created with `npm run admin:create` is an administrator
