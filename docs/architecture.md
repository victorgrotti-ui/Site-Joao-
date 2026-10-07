# Architecture

CMH Cleaning Management System is a local web app in three parts.

```text
client/     React, TypeScript, Vite, Tailwind CSS
server/     Express, TypeScript
prisma/     SQLite schema and migrations
public/     Logo used by the Vite app
docs/       Finance rules and this note
```

The browser talks only to `/api`. It never opens the database file. In development, Vite proxies that path to the Express server. After `npm run build`, `npm start` serves the built client and the API from one process on port 3001. That process is the single source of truth: other devices on the private network open its address, and they do not run their own database.

The office server listens on all network interfaces unless `HOST` is set. The sign-in cookie is `httpOnly`. It is marked secure only when `COOKIE_SECURE=true`, so a normal internal `http://` address can still sign in. Do not publish the port on the public internet.

## Data

Prisma models:

- `User` — administrator sign-in. Passwords are bcrypt hashes. Role is `ADMIN` today and `MANAGER` is reserved.
- `Employee` — team members. Disabling an employee keeps their history.
- `Service` — one cleaning job, including revenue and the employee’s work payment.
- `Expense` — the cost ledger. Rows created from a service are marked `SERVICE_PRODUCTS` or `SERVICE_OTHER`. Anything typed on the Expenses page is `MANUAL`.
- `Payment` and `PaymentItem` — a settled weekly payment and the services or reimbursements it covers.
- `CompanySettings` — company name, contact details and the usual payment day. Currency is GBP.

Identifiers are CUIDs. Money is an integer number of pence. Foreign keys use `ON DELETE RESTRICT` so financial history cannot be removed by accident. Payment rows are unique per employee, period and instalment.

## API

Authenticated routes use an httpOnly cookie named `cmh_session`. The token is a JWT signed with `JWT_SECRET` and expires after 7 days. Failed sign-in attempts are limited. Successful sign-ins are not. The API checks the cookie on every company-data route, so opening an API address without signing in returns 401.

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Employees | `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/:id` |
| Services | `GET/POST /api/services`, `GET/PUT/DELETE /api/services/:id` |
| Expenses | `GET/POST /api/expenses`, `GET/PUT/DELETE /api/expenses/:id` |
| Payments | `GET /api/payments/period`, `GET /api/payments`, `POST /api/payments/mark-paid`, `GET /api/payments/:id` |
| Dashboard | `GET /api/dashboard` |
| Reports | `GET /api/reports`, `GET /api/reports/export` |
| Settings | `GET/PUT /api/settings` |

Request bodies are checked with Zod on the server. The screens also check the form before sending it.

Deleting an employee who already has services, expenses or payments disables them instead of removing the history.

## Later database move

Keep money in integer pence and keep the Prisma models. Changing `provider` from `sqlite` to `postgresql` and supplying a Postgres `DATABASE_URL` is the migration path. The SQLite `PRAGMA` used at startup runs only when the URL starts with `file:`.
