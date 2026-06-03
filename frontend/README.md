# SaaS Starter

A multi-tenant SaaS starter built on Next.js 16 App Router, Better Auth, Drizzle ORM, and Hono.

## Stack

- **Framework**: Next.js 16 (App Router, React 19, React Compiler)
- **Auth**: Better Auth with organization, admin, two-factor, and api-key plugins
- **Database**: Postgres + Drizzle ORM (beta)
- **API**: Hono mounted at `/api/[[...route]]` with shared auth, error, and request-id middleware
- **Client state**: TanStack React Query
- **UI**: Tailwind CSS v4 + shadcn/ui primitives
- **Background jobs**: Inngest
- **Tooling**: npm, Biome, TypeScript

## What's included

- Multi-tenant data model: `organizations`, `members`, `invitations`, `organization_domains`, `organization_join_requests`
- Root (super-admin) console at `/root` for tenant + user management
- Tenant workspace at `/t/[tenantSlug]` with sidebar shell, login, join, and invite-accept flows
- Demo `tasks` feature at `/tasks` showing the Hono route + React Query + Drizzle + Inngest pattern (see `src/features/demo/`)

## Getting started

```bash
npm install
cp .env.example .env  # fill in DATABASE_URL, secrets
npm run db:generate    # create initial migration from schema
npm run db:migrate
npm run auth:seed-super-admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/root/login`.

## Where to put your code

- **API routes**: `src/features/<feature>/api/<name>.route.ts` (Hono), `<name>.client.ts` (React Query)
- **Tenant pages**: `src/app/t/[tenantSlug]/<feature>/page.tsx`
- **Top-level pages**: `src/app/<feature>/page.tsx`
- **DB schema**: `src/db/schema/<feature>.ts`, then add the export to `src/db/schema/index.ts` and relations to `src/db/relations.ts`
- **Register API**: import from your feature route file in `src/server/api/routes/index.ts`
- **Add to sidebar**: edit `src/components/shared/nav-config.ts`

See `AGENTS.md` for the conventions this project follows.
