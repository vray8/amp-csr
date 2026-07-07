# AMP-4: Users API (list, search, detail, update, cancel, purchases)

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | Highest |
| Story Points | 5 |
| Depends on | AMP-3 |
| Blocks | AMP-6, AMP-7 |

## Description

Implement the user-facing half of the API through all three layers (controller → service → repository): paginated/searchable user list, full user detail, account update, account cancellation, and paginated purchase history. Includes unit tests for `user.service`.

## Scope

**In scope**
- Routes: `GET /api/users`, `GET/PATCH /api/users/[id]`, `POST /api/users/[id]/cancel`, `GET /api/users/[id]/purchases`.
- `user.service.ts`, `purchase.service.ts`; `user.repository.ts`, `purchase.repository.ts`.
- zod schemas: `user.schema.ts` (list query, update body) shared with the frontend later.
- Unit tests for `user.service` with hand-rolled repository fakes.

**Out of scope**
- Vehicles/subscriptions endpoints (AMP-5) — but the detail response DOES include vehicles + subscriptions read via the user repository's include.

## Acceptance Criteria

- [ ] `GET /api/users?search=smi` matches name OR email OR phone OR any vehicle license plate, case-insensitively; `status=OVERDUE` filters; results paginated `{ data: { items, total, page, pageSize } }`.
- [ ] Sortable by `name`, `createdAt`, `status` via `sort=name:asc` style param (default `createdAt:desc`).
- [ ] `GET /api/users/[id]` returns account fields + vehicles + subscriptions (each with plan, vehicle, and transfer history) — one round trip.
- [ ] `PATCH /api/users/[id]` validates body; changing email to an existing one returns **409** with `fieldErrors.email`.
- [ ] `POST /api/users/[id]/cancel` atomically sets user CANCELLED and cancels all their non-cancelled subscriptions (sets `cancelledAt`); idempotent-safe (cancelling a cancelled user is a no-op returning current state).
- [ ] `GET /api/users/[id]/purchases?page=` returns newest-first pages.
- [ ] Unknown user id → 404 envelope on all `[id]` routes.
- [ ] `user.service` unit tests cover: duplicate email conflict, cancel cascade, not-found, list param passthrough.

## Tech Notes / Implementation Guide

**Layer responsibilities — follow exactly:**
- Route file: parse query/body with zod schema, call one service function, return `ok(...)`. Nothing else.
- Service: business rules, orchestration, `NotFoundError`/`ConflictError` throwing.
- Repository: the only Prisma import; explicit `select`/`include`; returns plain data.

**Next 16:** route context params are async:

```ts
export const GET = handleRoute(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return ok(await userService.getById(id));
});
```

**Search where-clause (in `user.repository.ts`):**

```ts
const where: Prisma.UserWhereInput = {
  ...(status ? { status } : {}),
  ...(search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { vehicles: { some: { licensePlate: { contains: search, mode: 'insensitive' } } } },
        ],
      }
    : {}),
};
```

List query = `prisma.$transaction([count(where), findMany({ where, skip, take, orderBy, select })])` so `total` and `items` are consistent. In the list `select`, include `_count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } }` to surface "# active subs" as a list column cheaply.

**Detail include (single query):** user → `vehicles`, `subscriptions: { include: { plan, vehicle, transfers: { include: { fromVehicle, toVehicle }, orderBy: { transferredAt: 'desc' } } }, orderBy: { createdAt: 'asc' } }`. Order subscriptions so ACTIVE ones can be shown first client-side (or sort in service).

**`user.schema.ts` (shared with frontend forms in AMP-7 — keep it framework-free):**

```ts
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number').max(20),
});
export const userListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'OVERDUE', 'CANCELLED']).optional(),
  sort: z
    .string()
    .regex(/^(name|createdAt|status):(asc|desc)$/)
    .default('createdAt:desc'),
});
```

Parse query strings in the route with `userListQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams))`.

**Duplicate email check (service):** look up `findByEmail(email)`; if found and `found.id !== id`, `throw new ConflictError('A user with this email already exists', { email: 'Already in use' })`. Do the check inside the same transaction as the update OR rely on the DB unique constraint as backstop by catching Prisma `P2002` in the service and rethrowing as ConflictError (do both — cheap and race-safe).

**Cancel cascade (service):**

```ts
await prisma.$transaction([
  subscriptionRepo.cancelAllForUser(userId, now),   // updateMany status != CANCELLED
  userRepo.setStatus(userId, 'CANCELLED'),
]);
```

Repositories may accept an optional `tx` (Prisma transaction client) parameter, or expose multi-step functions that build the array — pick ONE pattern and use it everywhere (recommended: repo functions accept `tx: PrismaTx = prisma` as last arg, where `type PrismaTx = Prisma.TransactionClient | PrismaClient`).

**Unit tests:** hand-rolled fakes, no mocking library:

```ts
const userRepoFake = { findById: vi.fn(), findByEmail: vi.fn(), update: vi.fn(), ... };
const service = createUserService(userRepoFake, subscriptionRepoFake);
```

This implies services are **factory functions taking their repos as arguments** (plain constructor injection, no DI framework) — that is the pattern to establish here and reuse in AMP-5. Export a default instance wired with real repos for routes: `export const userService = createUserService(userRepo, subscriptionRepo)`.

**Verify with curl** (dev server running, seeded DB):

```bash
curl -s 'localhost:3000/api/users?search=smith&status=ACTIVE' | jq
curl -s localhost:3000/api/users/<id> | jq
curl -s -X PATCH localhost:3000/api/users/<id> -H 'content-type: application/json' -d '{"name":"New Name","email":"taken@example.com","phone":"555-0100"}' | jq   # expect 409
curl -s -X POST localhost:3000/api/users/<id>/cancel | jq
```

## Definition of Done

All ACs demoed via curl against seeded data; `yarn test` green; committed as `feat: users API — list/search/detail/update/cancel + purchases`.
