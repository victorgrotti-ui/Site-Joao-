# CMH Cleaning Management System

A local management system for CMH Cleaning. It keeps employees, cleaning services, expenses, weekly payments and profit in a SQLite database on your computer.

Nothing in this project needs to be deployed. The application runs at `http://localhost:5173`.

## What you need

- Node.js 20 or newer
- npm

## 1. Install dependencies

From the project folder:

```bash
npm install
```

## 2. Create the environment file

```bash
cp .env.example .env
```

Open `.env` and replace `JWT_SECRET` with a long random string. The server will not start while the placeholder is still there.

```bash
openssl rand -base64 48
```

Paste the result into `JWT_SECRET`. Do not commit `.env`.

`DATABASE_URL` can stay as:

```text
DATABASE_URL="file:./dev.db"
```

That file is created at `prisma/dev.db`.

## 3. Create the database and run migrations

```bash
npm run db:setup
```

This generates the Prisma client, applies the migrations, and saves the company settings. It does **not** add sample employees, services or money.

Useful database commands:

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Regenerates the Prisma client |
| `npm run db:migrate` | Creates a new migration while developing |
| `npm run db:deploy` | Applies existing migrations |
| `npm run db:seed` | Ensures company settings exist, without sample finance data |
| `npm run db:reset` | Deletes the local database, reapplies migrations and settings |

## 4. Create the first administrator

The app has no public registration page. Create the first account from the terminal:

```bash
npm run admin:create
```

The command asks for:

- Full name
- Email
- Password (at least 8 characters)
- Password confirmation

The password is visible while you type. To avoid that, you can pass the values in the environment for that one command:

```bash
ADMIN_NAME="Your Name" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-password" npm run admin:create
```

Passwords are stored as bcrypt hashes. If you forget the password:

```bash
npm run admin:reset-password
```

Email recovery is not included. The sign-in page explains that.

## 5. Start the development server

```bash
npm run dev
```

This starts:

- the API at `http://localhost:3001`
- the app at `http://localhost:5173`

## 6. Open the application

Go to [http://localhost:5173](http://localhost:5173) and sign in.

You will land on `/dashboard`.

## 7. Reset the local database

This deletes employees, services, expenses, payments and the administrator account:

```bash
npm run db:reset
```

Then create the administrator again with `npm run admin:create`.

## Other commands

```bash
npm test                 # financial calculation tests
npm run test:integration # login, services, profit, payments and duplicate protection
npm run typecheck
npm run build            # builds the API and the React app
npm start                # serves the built app from the API
```

`npm start` is still local. It is not a deployment step. Run `npm run build` first. The built site is served from the API port in `.env` (3001 by default).

## Daily use

1. Add employees and a default rate.
2. Add a service. Revenue, the employee payment and costs calculate the profit on the form.
3. If the employee paid for products, tick the reimbursement box on that service. The cost is an expense once, and it is added to what the employee is owed.
4. Open Payments, choose the week, and mark the employee as paid.
5. If that week was already paid, the system stops and asks before recording anything else.
6. Use Reports for totals, charts and a CSV export.

The calculation rules are written in [docs/finance.md](docs/finance.md). The layout of the code is in [docs/architecture.md](docs/architecture.md).

## Logo

The sidebar, sign-in page and browser icon use:

```text
public/cmh-cleaning-logo.png
```

Replace that file with the official CMH Cleaning logo when you have it. Keep the filename. The image is shown with its original proportions.

## Moving to PostgreSQL later

The schema uses Prisma, integer pence for money, and ordinary relations. A later deployment can switch the datasource provider to PostgreSQL and point `DATABASE_URL` at the new database. Do that as a separate piece of work. This version is SQLite only.

## What is intentionally not included

- No production hosting, domain or paid service
- No sample financial records
- No email password reset
- No extra user roles yet. The account you create is an administrator, and the database role can be extended later.
