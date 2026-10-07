# Architecture

CMH Cleaning Management System is a local web app in three parts.

```text
client/     React, TypeScript, Vite, Tailwind CSS
server/     Express, TypeScript
prisma/     SQLite schema and migrations
public/     Logo used by the Vite app
docs/       Finance rules and this note
```

The browser talks only to `/api`. In development, Vite proxies that path to the Express server and the login cookie stays on `localhost:5173`. After `npm run build`, Express can serve the built client itself.

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

Authenticated routes use an httpOnly cookie named `cmh_session`. The token is a JWT signed with `JWT_SECRET`.

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
