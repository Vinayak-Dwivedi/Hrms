# hrms-api

REST API for HRMS. Express 4 + Drizzle + Postgres. Auth is JWT issued by us
(bcrypt password hashes; access + refresh tokens delivered as httpOnly cookies
in browsers, and as `Authorization: Bearer` for non-browser clients).

This is the API half of the split — the Next.js frontend is in a sibling repo.

## Status (Phase 2)

| Surface          | Status                                   |
|------------------|------------------------------------------|
| `GET /api/health`| ✅ live                                  |
| `POST /api/auth/login`    | ✅ bcrypt + JWT (cookie + Bearer) |
| `POST /api/auth/refresh`  | ✅ rotates both cookies           |
| `POST /api/auth/logout`   | ✅ clears cookies                 |
| `GET /api/auth/me`        | ✅ requires auth                  |
| `/api/me/*`               | 🔜 Phase 3 (port from old Hono)   |
| `/api/manager/*`          | 🔜 Phase 3                        |
| `/api/hrms/*` (CRUD)      | 🔜 Phase 3                        |

## Prerequisites

- Node ≥ 20
- A running Postgres 16 (local install, or shared with the frontend)
- The HRMS migration already applied (see "First-time DB setup" below)

## First-time setup

```bash
# 1. Install deps
npm install

# 2. Copy env and fill in
cp .env.example .env
# Generate two distinct 48-byte secrets:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to those values.

# 3. Apply the migration that lives in drizzle/
#    (Until Phase 3, the schema files here cover users + accounts only.
#    The bundled migration creates the full HRMS schema too.)
node -e "
import('postgres').then(async ({default: postgres}) => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = process.env.DATABASE_URL;
  const sql = postgres(url, { max: 1 });
  await sql.unsafe('CREATE EXTENSION IF NOT EXISTS citext');
  await sql.unsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  const dirs = fs.readdirSync('drizzle').filter(d => /^\\d/.test(d)).sort();
  for (const dir of dirs) {
    const file = path.join('drizzle', dir, 'migration.sql');
    const stmts = fs.readFileSync(file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
    let ok=0, skip=0;
    for (const s of stmts) {
      try { await sql.unsafe(s); ok++; }
      catch (e) { if (/already exists|duplicate/i.test(e.message)) skip++; else throw e; }
    }
    console.log(dir, 'applied=', ok, 'skipped=', skip);
  }
  await sql.end();
}).catch(e => { console.error(e.message); process.exit(1); });
"

# 4. Seed users with bcrypt hashes
npm run seed:users
```

## Daily

```bash
# dev (auto-reload via tsx)
npm run dev

# typecheck
npm run typecheck

# production build → dist/
npm run build && npm start

# drizzle studio (UI for the DB)
npm run db:studio
```

## Smoke test

```bash
# Health
curl -s http://localhost:4000/api/health

# Login — sets two httpOnly cookies and returns the user payload + access token
curl -s -c /tmp/jar -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rohit.mehta@ileads.example","password":"Employee@12345!"}'

# Call a protected endpoint using the cookie jar
curl -s -b /tmp/jar http://localhost:4000/api/auth/me

# Or use the Bearer header (no cookie jar needed)
AT=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rohit.mehta@ileads.example","password":"Employee@12345!"}' \
  | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);process.stdout.write(j.accessToken)})")
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $AT"

# Rotate
curl -s -b /tmp/jar -c /tmp/jar -X POST http://localhost:4000/api/auth/refresh

# Logout
curl -s -b /tmp/jar -X POST http://localhost:4000/api/auth/logout -w "%{http_code}\n"
```

## Auth design — one paragraph

`/api/auth/login` validates the request body, looks up `users` joined with
`accounts.password`, runs `bcrypt.compare`, signs an access JWT (15 m) and a
refresh JWT (7 d). Both are returned via two `httpOnly`+`Secure`+`SameSite=Lax`
cookies (`hrms_at`, `hrms_rt`) and the access token is **also** in the JSON
body so non-browser clients can use `Authorization: Bearer …`. The same pair
of tokens is acceptable on subsequent requests: `requireAuth` middleware
looks at the cookie first, then the Authorization header. `/api/auth/refresh`
verifies the refresh token, looks the user up, issues a new pair and rotates
the cookies. `/api/auth/logout` clears both cookies (the access token stays
technically valid until its 15-minute TTL; for hard logout we'd add a
revocation table — flagged as v2).

## Layout

```
src/
  index.ts                # boots the http server
  app.ts                  # express() factory: middleware + router mounts
  env.ts                  # zod-validated config
  db/
    runtime.ts            # drizzle/postgres client
    schema/
      auth.ts             # users + accounts
      index.ts            # barrel
  lib/
    jwt.ts                # sign + verify access & refresh tokens
    cookies.ts            # cookie option presets
    password.ts           # bcrypt hash + verify
  middleware/
    request-id.ts
    auth.ts               # requireAuth, optionalAuth, requireRole
    error.ts              # ApiError class, JSON error sink
  routes/
    health.router.ts
    auth.router.ts
scripts/
  seed-users.mjs          # bcrypt-rehash the five demo accounts
drizzle/
  <migration folders>     # migrations are copied from the legacy repo
```
