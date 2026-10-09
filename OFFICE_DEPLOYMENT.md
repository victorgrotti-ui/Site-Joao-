# CMH Cleaning — office computer installation

CMH Cleaning runs on one office computer. That computer holds the company database. Other phones and laptops on the same office Wi-Fi open it in a browser. The system is not published on the internet.

Do not forward port 3001. Do not use a cloud database. Do not copy `prisma/dev.db` onto this computer and use it as the company database. `prisma/dev.db` is only for development.

Company records belong in:

```text
prisma/production.db
```

The setting in `.env` is:

```text
DATABASE_URL="file:./production.db"
```

That path is relative to the `prisma` folder.

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

Open `.env` in a text editor. `DATABASE_URL` must stay:

```text
DATABASE_URL="file:./production.db"
```

Replace `JWT_SECRET` with a long random value. On either computer:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Paste the result between the quotes. Do not put it in an email or in the git repository. Leave `PORT=3001`. Leave `HOST` unset. Leave `COOKIE_SECURE` unset. Leave `CMH_BIND` unset.

Create the empty company database, then the administrator, then build:

```bash
npm run db:office
npm run admin:create
npm run build
```

`npm run db:office` creates `prisma/production.db`, applies the Prisma migrations, and saves the company name CMH Cleaning with currency GBP. It does not add employees, services, expenses or payments. If `.env` still points at `prisma/dev.db`, the command stops and leaves that file unchanged.

When you download a newer copy of this project, run `npm run db:office` again before `npm start`. It applies new migrations and leaves existing people, jobs, expenses and payments in place. Do not run `npm run db:reset` on the office computer.

## First administrator

`npm run admin:create` asks for a name, an email and a password of at least 8 characters. Type them on the office computer. The password is stored only as a bcrypt hash inside `prisma/production.db`. It is not written into the source code, and it must not be saved in `.env`.

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

The database uses SQLite WAL mode. While the server is running, the newest rows may sit in `prisma/production.db-wal`. Copying `prisma/production.db` by hand at that moment can save an incomplete file.

Use this instead. It is safe while the server is running. SQLite writes one consistent file with `VACUUM INTO`:

```bash
npm run db:backup
```

The file is:

```text
backups/cmh-backup-YYYYMMDD-HHMMSS.db
```

Copy it to a USB drive that stays in the office. Do not email it. Do not upload it. Do not commit it.

## Restore

1. Close the server window.
2. Run:

```bash
npm run db:restore -- backups/cmh-backup-YYYYMMDD-HHMMSS.db
```

3. Type `RESTORE` and press Enter.
4. Start the server again with `npm start` and sign in.

The command refuses to run while the server still has the database open. It also refuses a file that is not a SQLite database. Do not run `npm run db:reset` on the office computer.

## Money

Amounts are stored as whole pence. Profit is revenue minus the employee payment, cleaning products and other expenses. A reimbursable cost is one expense, and it is also added to what the employee is owed. It is not subtracted a second time. Mark as Paid only updates the record on this computer. It does not send a bank or card payment.
