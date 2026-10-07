# CMH Cleaning Management System

Internal system for CMH Cleaning. It keeps employees, cleaning services, expenses, weekly payments and profit in one SQLite database.

One office computer runs the server. Managers and phones open that computer’s address in a browser. They do not each get a separate database, and the database file is never opened by the browser.

Mark as Paid only changes a record from pending to paid. The system does not send money and does not connect to a bank, card or payment service.

## What you need

- Node.js 20 or newer
- npm
- The office computer stays on while people are using the system

## A. Install dependencies

From the project folder:

```bash
npm install
```

## B. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and replace `JWT_SECRET` with a long random string. The server refuses to start while the placeholder is still there.

```bash
openssl rand -base64 48
```

Leave the other values as they are for normal internal use:

```text
DATABASE_URL="file:./dev.db"
PORT=3001
```

`HOST` can stay unset. The office server then accepts connections from this computer and from other devices on the same private network.

Leave `COOKIE_SECURE` unset. Set it to `true` only if you later serve the system over HTTPS. On a normal internal `http://` address, a secure-only cookie would block sign-in.

Do not commit `.env`.

## C. Create the database

```bash
npm run db:setup
```

This creates `prisma/dev.db`, applies the migrations, and saves the company settings. It does not add employees, services, expenses or payments.

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Regenerates the Prisma client |
| `npm run db:migrate` | Creates a new migration while developing |
| `npm run db:deploy` | Applies existing migrations |
| `npm run db:seed` | Ensures company settings exist, without sample finance data |
| `npm run db:reset` | Deletes the local database, reapplies migrations and settings |
| `npm run db:backup` | Writes a snapshot into `backups/` |
| `npm run db:restore -- <file>` | Replaces the database with a backup |

## D. Create the first administrator

There is no public registration page. On the office computer:

```bash
npm run admin:create
```

The command asks for a full name, email and password of at least 8 characters. The password is visible while you type. To avoid that:

```bash
ADMIN_NAME="Your Name" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-password" npm run admin:create
```

Use your own email and password. Do not reuse an example password, and do not commit those values.

Passwords are stored as bcrypt hashes. Run `npm run admin:create` again with a different email when another manager needs an account. Every account uses the same database on the office computer.

## E. Start the application for daily development

Use this only on the office computer while you are changing the software:

```bash
npm run dev
```

Open http://localhost:5173 on that same computer. This address is for development. Other devices should use the internal address in the next section.

## F. Build and run it for internal use

On the office computer:

```bash
npm run build
npm start
```

`npm start` serves the finished application and the API together. The terminal prints:

- `http://127.0.0.1:3001` for the office computer itself
- `http://<office-computer-ip>:3001` for other devices on the same network

Keep that terminal open. Closing it stops the system for everyone.

To keep the server on this computer only, set `HOST=127.0.0.1` in `.env` before `npm start`.

## G. How another device on the same network opens it

Other phones and computers only need a browser. They do not install the project and they do not create a database.

1. Connect them to the same private network as the office computer.
2. Open the network address printed by `npm start`, for example `http://192.168.1.20:3001`.
3. Sign in with an administrator account created on the office computer.

Give the office computer a reserved address on the router if you want that IP to stay the same.

Optional name, without buying a domain: on each device, add a line to its hosts file, using the office computer’s IP:

```text
192.168.1.20 cmh-cleaning.local
```

Those devices can then open http://cmh-cleaning.local:3001. The name works only on devices where that line was added.

Do not forward port 3001 on the router. Do not publish the address on the public internet. If the office computer has a firewall, allow incoming TCP port 3001 from the private network only.

## H. Where the database is stored

```text
prisma/dev.db
```

The path comes from `DATABASE_URL`. A value of `file:./dev.db` is relative to the `prisma` folder. While the server is running, SQLite may also create `prisma/dev.db-wal` and `prisma/dev.db-shm`. Those belong with the database. Do not delete them while the server is running.

Reports, profit and payments are calculated from these records. Restarting the application does not clear them.

## I. Back up the database

On the office computer:

```bash
npm run db:backup
```

The snapshot is written to `backups/cmh-backup-YYYYMMDD-HHMMSS.db`. Copy that file to a private drive that stays in the office. Do not email it and do not commit it.

Take a backup before `npm run db:reset` and before replacing the office computer.

## J. Restore a backup

1. Stop `npm start` or `npm run dev`.
2. Run:

```bash
npm run db:restore -- backups/cmh-backup-YYYYMMDD-HHMMSS.db
```

3. Type `RESTORE` when asked.
4. Start the application again and sign in.

The command refuses to continue while the database is still open, and it refuses a file that is not a SQLite database.

## K. Reset an administrator password

```bash
npm run admin:reset-password
```

Email recovery is not included. The sign-in page explains the same command.

## L. Files that must not be committed

| Item | Why |
| --- | --- |
| `.env` | Contains `JWT_SECRET` |
| `JWT_SECRET` | Signs the sign-in cookie |
| `ADMIN_PASSWORD` | Only for the one command that creates an account |
| `prisma/dev.db` and its `-wal` / `-shm` files | Company records |
| `backups/` | Copies of those records |

`.env.example` is safe to commit because the secret in it is a placeholder.

## Language

English is the default. The language menu is in the header, on the sign-in page, and in Settings. Português (Brasil) stays selected after a refresh. Names, addresses, notes and amounts are not translated. Currency stays GBP (£).

## Daily use

1. Add employees and a usual rate.
2. Add a service. Profit is revenue minus the employee payment, cleaning products and other expenses.
3. If the employee paid for products, tick the reimbursement box. That cost is one company expense, and it is added to what the employee is owed.
4. Open Payments, choose the week, and mark the employee as paid.
5. If that week was already paid, the system stops and asks before recording anything else.
6. Use Reports for totals and a CSV export.

The calculation rules are in [docs/finance.md](docs/finance.md). The layout of the code is in [docs/architecture.md](docs/architecture.md).

## Logo

The sign-in page, sidebar and browser icon use `public/cmh-cleaning-logo.png`. Replace that file with the official logo when you have it. Keep the filename. The image is shown with its original proportions.

## Checks

```bash
npm test
npm run test:integration
npm run typecheck
```

## What is intentionally not included

- No public hosting, public domain or paid service
- No sample financial records
- No email password reset
- No bank, card or payment-provider connection
- No extra permission levels yet. Each account created with `npm run admin:create` is an administrator
