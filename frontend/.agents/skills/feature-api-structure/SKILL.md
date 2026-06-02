---
name: feature-api-structure
description: Keep API routes and client API helpers colocated with their owning feature in this repo. Use when adding, moving, refactoring, or reviewing Hono API routes, feature APIs, route aggregators, or client API helpers under src/features or src/server/api.
---

# Feature API Structure

## Overview

Use the feature-owned API structure already established by `src/features/demo/**`.
The shared `src/server/api` tree is infrastructure, not a home for feature behavior.

## Required Pattern

- Put feature-owned Hono route modules in `src/features/<feature>/api/*.route.ts`.
- Put feature client API helpers in `src/features/<feature>/api/*.client.ts`.
- Keep feature services in `src/features/<feature>/services`.
- Keep `src/server/api` limited to shared API infrastructure: `app.ts`, route aggregation, auth guards, errors, config, and shared types.
- Register feature routes from `src/server/api/routes/index.ts` by importing from the feature folder.
- Do not create feature-owned files in `src/server/api/routes`.

## Examples

Use this:

```ts
// src/features/root/api/root.route.ts
export const rootRoutes = new Hono<ApiEnv>();
```

```ts
// src/server/api/routes/index.ts
import { rootRoutes } from "@/features/root/api/root.route";

export const apiRoutes = new Hono<ApiEnv>().route("/root", rootRoutes);
```

Avoid this:

```ts
// src/server/api/routes/root.ts
export const rootRoutes = new Hono<ApiEnv>();
```

## Workflow

1. Identify the owning feature before creating or moving an API route.
2. Create or update `src/features/<feature>/api/<name>.route.ts`.
3. Import shared API helpers through absolute aliases such as `@/server/api/errors`, `@/server/api/auth-guards`, and `@/server/api/types`.
4. Update `src/server/api/routes/index.ts` to mount the feature route.
5. Run `rg "export const .*Routes|new Hono" src/server/api/routes src/features -n` and confirm feature route implementations are under `src/features/**/api`.
6. Run `npm run typecheck`.
