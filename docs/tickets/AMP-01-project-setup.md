# AMP-1: Project setup & tooling

| Field | Value |
|---|---|
| Type | Task |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | Highest |
| Story Points | 2 |
| Depends on | — |
| Blocks | AMP-2 … AMP-11 |

## Description

Prepare the existing create-next-app scaffold (Next.js 16, App Router, TypeScript, yarn 1) to be the foundation for the CSR portal: prune boilerplate, install all project dependencies, create the folder skeleton for the layered architecture, and add formatting/tooling config.

## Scope

**In scope**
- Remove create-next-app boilerplate (demo page content, `page.module.css`, unused public SVGs).
- Install all runtime and dev dependencies (list below).
- Create empty folder skeleton matching the architecture.
- Prettier config + `format`, `typecheck`, `test` package scripts.
- `.nvmrc` pinning Node 22, `.env.example`.

**Out of scope**
- Prisma schema/migrations (AMP-2). Any actual feature code (AMP-3+). CI (AMP-9).

## Acceptance Criteria

- [ ] `yarn build` and `yarn lint` pass clean.
- [ ] `yarn typecheck` script exists (`tsc --noEmit`) and passes.
- [ ] Visiting `/` no longer shows the create-next-app demo page (a temporary placeholder or redirect is fine; the real redirect to `/users` lands in AMP-6).
- [ ] `.env.example` documents `DATABASE_URL`.
- [ ] Folder skeleton exists: `src/server/services`, `src/server/repositories`, `src/lib/schemas`, `src/components/{users,user-detail,common}`, `src/hooks`.
- [ ] `.nvmrc` contains `22`.

## Tech Notes / Implementation Guide

**Environment gotcha (verified on this machine):** the default `node` is v23.6.1, which fails yarn engine checks for some transitive deps (`eslint-visitor-keys` wants `^20.19 || ^22.13 || >=24`). Node v22.23.1 is installed under nvm. Prefix commands with:

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
```

and create `.nvmrc` containing `22`.

**Install (yarn 1):**

```bash
# runtime
yarn add @prisma/client @prisma/adapter-pg zod @tanstack/react-query \
  react-hook-form @hookform/resolvers \
  @mui/material @mui/material-nextjs @emotion/react @emotion/styled @emotion/cache \
  @mui/x-data-grid @mui/icons-material
# dev
yarn add -D prisma vitest tsx prettier dotenv
```

Versions verified compatible at planning time: `@mui/material` 9.x (has `@mui/material-nextjs/v16-appRouter` subpath), `@prisma/client` 7.8, `zod` 4.x, `@tanstack/react-query` 5.x. Do **not** downgrade to match older tutorials.

**package.json scripts** (add/modify):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "format": "prettier --write ."
  }
}
```

**Prettier:** add `.prettierrc` with `{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }` and `.prettierignore` (`.next`, `node_modules`, `yarn.lock`, `src/generated`).

**Boilerplate prune:**
- `src/app/page.tsx` → replace with a minimal placeholder component (AMP-6 replaces it with `redirect('/users')`).
- Delete `src/app/page.module.css`; strip `globals.css` down to a minimal reset (keep the font variables from `layout.tsx` if you like, they're harmless).
- Delete `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`.

**.env.example:**

```
# PostgreSQL connection string (Neon pooled string in production)
DATABASE_URL="postgresql://user:password@localhost:5432/amp_csr"
```

`.gitignore` already ignores `.env` — verify, don't duplicate.

## Definition of Done

Build/lint/typecheck green; committed as `chore: project setup and tooling` (conventional commits from here on).
