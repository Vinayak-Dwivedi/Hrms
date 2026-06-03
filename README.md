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
npm run db:migrate
npm run seed:hrms
npm run seed:users
npm run dev                # listens on :4000

# 2. Web (in a second terminal)
cd frontend
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000' > .env.local
npm install --legacy-peer-deps
npm run dev                # listens on :3000
```

Open `http://localhost:3000/login`.

| Role     | Email                    | Password         |
|----------|--------------------------|------------------|
| Employee | `rahul@ileads.example`   | `Employee@12345!`|
| Manager  | `priya@ileads.example`   | `Manager@12345!` |

## Deploy to EC2

See [frontend/deploy/DEPLOY.md](frontend/deploy/DEPLOY.md).
