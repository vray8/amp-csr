# AMP-3: Server foundation (layers, errors, validation)

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | Highest |
| Story Points | 3 |
| Depends on | AMP-2 |
| Blocks | AMP-4, AMP-5 |

## Description

Build the plumbing every API feature sits on: the Prisma client singleton, the `DomainError` hierarchy, the `handleRoute()` controller wrapper that maps errors to HTTP responses in a consistent envelope, and the shared zod schema layout. This ticket is the heart of the clean-architecture story — get it right and every later route is ~15 lines.

## Scope

**In scope**
- `src/server/db.ts` — Prisma singleton (Prisma 7 + pg adapter, globalThis pattern).
- `src/server/errors.ts` — `DomainError`, `NotFoundError`, `ConflictError`, `ValidationError`.
- `src/server/api-helpers.ts` — `handleRoute()` + `ok()`/`fail()` envelope helpers.
- `src/lib/schemas/common.schema.ts` — pagination/id/query primitives.
- One throwaway demo route proving the envelope end-to-end (deleted in AMP-4).

**Out of scope**
- Real endpoints (AMP-4/5). Frontend api-client (AMP-6).

## Acceptance Criteria

- [ ] Success responses are `{ "data": ... }`; failures are `{ "error": { "code", "message", "fieldErrors"? } }`.
- [ ] A zod parse failure returns **400** with `fieldErrors` keyed by field path.
- [ ] `NotFoundError` → **404**, `ConflictError` → **409**, `ValidationError` → **400**, unexpected errors → **500** (logged via `console.error`, generic message to client — never leak internals).
- [ ] Exactly one `PrismaClient` instance exists across dev hot reloads (globalThis pattern).
- [ ] No file under `src/app/api/**` imports `PrismaClient` directly (enforced by convention; note it in the README later).
- [ ] Vitest is configured and one unit test exercises the error→status mapping.

## Tech Notes / Implementation Guide

**`src/server/db.ts`** — Prisma 7 with the new generated client + pg adapter:

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

Import path note: the generated client lives at `src/generated/prisma/` (AMP-2), so `@/generated/prisma/client` works with the existing `@/*` tsconfig alias. Enums (e.g. `AccountStatus`) are exported from `@/generated/prisma/enums` — check the generated folder for exact filenames after `prisma generate`.

**`src/server/errors.ts`:**

```ts
export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND');
  }
}
export class ConflictError extends DomainError {
  constructor(message: string, public readonly fieldErrors?: Record<string, string>) {
    super(message, 'CONFLICT');
  }
}
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION');
  }
}
```

**`src/server/api-helpers.ts`:**

```ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ConflictError, DomainError, NotFoundError, ValidationError } from './errors';

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

function statusFor(e: DomainError): number {
  if (e instanceof NotFoundError) return 404;
  if (e instanceof ConflictError) return 409;
  if (e instanceof ValidationError) return 400;
  return 500;
}

// Wrap every route handler body. Usage:
//   export const GET = handleRoute(async (req, ctx) => { ... return ok(result) })
export function handleRoute<Ctx>(
  fn: (req: Request, ctx: Ctx) => Promise<NextResponse>,
) {
  return async (req: Request, ctx: Ctx): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of e.issues) fieldErrors[issue.path.join('.')] = issue.message;
        return NextResponse.json(
          { error: { code: 'VALIDATION', message: 'Invalid request', fieldErrors } },
          { status: 400 },
        );
      }
      if (e instanceof DomainError) {
        return NextResponse.json(
          {
            error: {
              code: e.code,
              message: e.message,
              ...(e instanceof ConflictError && e.fieldErrors ? { fieldErrors: e.fieldErrors } : {}),
            },
          },
          { status: statusFor(e) },
        );
      }
      console.error('Unhandled API error:', e);
      return NextResponse.json(
        { error: { code: 'INTERNAL', message: 'Internal server error' } },
        { status: 500 },
      );
    }
  };
}
```

**zod 4 notes** (installed version is zod 4 — some zod 3 idioms changed):
- Use `z.email()` instead of deprecated `z.string().email()`.
- Error customization is `z.string().min(1, { error: 'Required' })` — but plain string messages still work: `z.string().min(1, 'Required')`.
- `error.issues` (not `error.errors`) for the issue list.
- `z.coerce.number()` works as before for query params.

**`src/lib/schemas/common.schema.ts`:**

```ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const idParamSchema = z.string().min(1);
```

**Vitest config** (`vitest.config.ts` at repo root):

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

Write `src/server/api-helpers.test.ts`: call a `handleRoute`-wrapped function that throws each error type and assert `res.status` + parsed JSON envelope. `NextResponse` works in node vitest without extra setup (Next 16 ships web-standard Response).

**Next 16 gotcha for later tickets (document in code comment now):** dynamic route context is `{ params: Promise<{ id: string }> }` — handlers must `await ctx.params`.

## Definition of Done

Demo route proves all envelope branches; unit test green; committed as `feat: server foundation — layered plumbing, errors, validation`.
