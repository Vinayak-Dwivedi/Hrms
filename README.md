# HRMS

Two-service HR management system: a Next.js frontend and an Express API,
sharing a single Postgres database.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser → nginx :80                                        │
│              ├── /        → hrms-web (Next.js) :3000        │
│              └── /api/*   → hrms-api (Express) :4000        │
│                                  │                          │
│                                  └── Postgres 16            │
└─────────────────────────────────────────────────────────────┘
```

## Layout

| Path         | What it is                                           |
|--------------|------------------------------------------------------|
| `frontend/`  | `hrms-web` — Next.js 16, React 19, Tailwind v4       |
| `hrms-api/`  | `hrms-api` — Express 4 + Drizzle ORM + JWT in cookies |
| `frontend/deploy/` | One-shot EC2 bootstrap (`setup.sh`) and ops guide |

## Quick start (local)

Prereqs: Node 22, Postgres 16 reachable, both services' `node_modules`
installed. From the repo root:

```bash
# 1. API
cd hrms-api
cp .env.example .env       # then fill in DATABASE_URL + JWT secrets
npm install
# If the database was imported (e.g. hrms_dev.sql) or has manual schema changes:
npm run db:baseline
npm run db:migrate
npm run seed:rbac
npm run db:verify-onboarding
npm run seed:hrms
npm run seed:users
npm run seed:admin         # admin@ileads.com / admin@ileads.com (override via SEED_ADMIN_PASSWORD)
npm run dev                # listens on :4000

# 2. Web (in a second terminal)
cd frontend
cp .env.local.example .env.local   # same-origin /api proxy → :4000
npm install --legacy-peer-deps
npm run dev                # listens on :3000
```

Open `http://localhost:3000/login` (or your LAN IP on port 3000).

The browser must call `/api/*` on the **same origin** as the UI so httpOnly auth
cookies work. `.env.local` leaves `NEXT_PUBLIC_API_URL` empty; Next rewrites
`/api/*` to Express via `API_PROXY_TARGET` (default `http://127.0.0.1:4000`).
If the API runs on another host, set `API_PROXY_TARGET=http://that-host:4000`.

**Dev server `10.24.24.248`:** run `hrms-api` and `frontend` on that box, use
`API_PROXY_TARGET=http://127.0.0.1:4000` (not another LAN IP). Restart Next after
changing `.env.local` — a wrong target causes `500` on `/api/auth/login`.

For `hrms-api`, if you call the API **directly** from the browser (without the
Next proxy), set `CORS_ORIGINS` to your UI origins, e.g.
`http://localhost:3000,http://10.24.24.248:3000`. Leave it empty in production
(nginx same-origin).

| Role     | Email                    | Password         |
|----------|--------------------------|------------------|
| Employee | `rahul@ileads.example`   | `Employee@12345!`|
| Manager  | `priya@ileads.example`   | `Manager@12345!` |

## Deploy to EC2

See [frontend/deploy/DEPLOY.md](frontend/deploy/DEPLOY.md).
