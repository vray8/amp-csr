# AMP CSR Portal

A Customer Service Representative portal for **AMP**, a membership platform for car washes. Customers hold per-vehicle monthly wash subscriptions; CSRs use this portal to support them on calls — find an account fast, fix account info, explain a charge, cancel an account, or transfer a membership to a newly purchased car.

**Live demo:** https://amp-csr.vercel.app

> ⚠️ Hosted on free tiers (Vercel + Neon) — the first request after idle can take a few seconds while the database wakes up.

<!-- TODO: add a screenshot — e.g. `docs/screenshot.png` of the users list -->

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) — one app, one deploy |
| UI | MUI v9 + DataGrid, Emotion |
| Data fetching | TanStack React Query v5 |
| Forms & validation | react-hook-form + zod (schemas shared client/server) |
| ORM / DB | Prisma 7 (pg driver adapter) + PostgreSQL (Neon in prod) |
| Tests | Vitest (39 unit tests, no DB required) |
| CI/CD | GitHub Actions + Vercel Git integration |

## Architecture

One Next.js app. The back-end is Next.js Route Handlers acting as thin controllers over a **controller → service → repository** layered architecture:

```
   Browser (MUI + React Query)
        │  fetch /api/...
        ▼
   Route Handlers  (src/app/api/…)        ← controllers: zod parse → one service call → serialize
        │
        ▼
   Services        (src/server/services)  ← business rules, transactions, DomainErrors
        │
        ▼
   Repositories    (src/server/repositories) ← the only layer that imports Prisma
        │
        ▼
   Prisma → PostgreSQL (Neon)
```

**Layering rules**

- **Route handlers** validate input with zod and call exactly one service method — no Prisma imports, no business logic (~10–15 lines each).
- **Services** own business rules and `prisma.$transaction`; they throw typed `DomainError`s and know nothing about HTTP. Services take their repositories (and a `runInTransaction`) as injectable parameters, so unit tests run against hand-rolled fakes — no database.
- **Repositories** are the only Prisma consumers, returning explicit `select`/`include` shapes so raw DB models never leak to the client.
- **Shared zod schemas** (`src/lib/schemas/`) validate on both sides: the API parses requests with the same schema the form resolver uses.
- **Response envelope** everywhere: `{ data }` on success, `{ error: { code, message, fieldErrors? } }` on failure, produced by one `handleRoute()` wrapper that maps `NotFoundError → 404`, `ConflictError → 409`, `ValidationError`/zod → 400, anything else → 500 (logged, never leaked).

**Key design decisions**

1. **Controller → service → repository layering** — business rules are HTTP-free and unit-testable with fakes; no route handler touches Prisma; swapping the transport (or the ORM) touches one layer.
2. **Transfer = mutable `vehicleId` + `SubscriptionTransfer` audit table** — a subscription is a first-class entity whose identity, plan, and billing history survive a transfer ("I bought a new car, move my membership"). The `vehicleId` update and the audit row are written in one transaction.
3. **One non-cancelled subscription per vehicle**, enforced in the service layer for create *and* transfer (a DB partial unique index is the planned backstop — see [What I'd do next](#what-id-do-next)).
4. **Overdue modeling** — a FAILED `SUBSCRIPTION_PAYMENT` purchase is what puts a user/subscription in OVERDUE; the detail page banner quotes the actual `failureReason`.
5. **Deliberate scope cuts** — no CSR auth (internal tool, documented), no real payment processing (payment method is display-only metadata).

📐 A deeper dive with diagrams (ERD, transfer sequence, request lifecycle): [`docs/system-design.html`](docs/system-design.html) — open it in a browser.

## Data model

Enums: `AccountStatus { ACTIVE, OVERDUE, CANCELLED }` · `SubscriptionStatus { ACTIVE, PAUSED, OVERDUE, CANCELLED }` · `PurchaseType { SINGLE_WASH, SUBSCRIPTION_PAYMENT }` · `PurchaseStatus { PAID, FAILED, REFUNDED }`

| Model | Key fields |
|---|---|
| **User** | name, email (unique), phone, status, paymentMethodBrand/Last4 (nullable) |
| **Vehicle** | userId, make, model, year, color, licensePlate (unique, searchable) |
| **Plan** | name (Basic / Premium / Ultimate), priceCents, description — seeded lookup |
| **Subscription** | userId, **vehicleId (mutable — transfer updates it in place)**, planId, status, startedAt, cancelledAt?, nextBillingDate? |
| **SubscriptionTransfer** | subscriptionId, fromVehicleId, toVehicleId, transferredAt — audit trail |
| **Purchase** | userId, type, status, amountCents, description, subscriptionId?, failureReason? |

## API

REST, JSON envelope, under `/api`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users?search=&status=&page=&pageSize=&sort=` | Paginated list; search ORs name/email/phone/licensePlate (case-insensitive) |
| GET / PATCH | `/api/users/[id]` | Full detail (vehicles, subs + plan + transfer history) / edit account |
| GET | `/api/users/stats` | Account-status counts for the stat strip |
| POST | `/api/users/[id]/cancel` | Cancel account — cancels all non-cancelled subs in one transaction; idempotent |
| GET | `/api/users/[id]/purchases?page=` | Paginated purchase history, newest first |
| POST | `/api/users/[id]/vehicles` | Add vehicle (duplicate plate → 409 field error) |
| PATCH / DELETE | `/api/vehicles/[id]` | Edit / remove vehicle (409 if it has a non-cancelled sub) |
| POST | `/api/users/[id]/subscriptions` | Add subscription `{ vehicleId, planId }` — writes initial PAID purchase in the same transaction |
| POST | `/api/subscriptions/[id]/cancel` | Cancel subscription; clears user OVERDUE if it was the last overdue sub |
| POST | `/api/subscriptions/[id]/transfer` | Transfer `{ toVehicleId }` — same-user + no-active-sub-on-target enforced; audit row in the same transaction |
| GET | `/api/plans` | Plans for the add-subscription form |

## Local setup

Requires Node 22 (`.nvmrc`) and a local Postgres.

```bash
# 1. Postgres (any local instance works; a dedicated container keeps it isolated)
docker run --name amp-csr-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=amp_csr -p 5433:5432 -d postgres:16

# 2. Env
cp .env.example .env   # set DATABASE_URL to your Postgres, e.g.
                       # postgresql://postgres:postgres@localhost:5433/amp_csr

# 3. Install, migrate, seed
yarn install
npx prisma migrate dev
npx prisma db seed      # deterministic + idempotent — safe to re-run

# 4. Run
yarn dev                # http://localhost:3000 → redirects to /users
```

The seed creates 3 plans and 25 users (18 ACTIVE / 4 OVERDUE / 3 CANCELLED) engineered to cover every demo scenario below.

## Testing

```bash
yarn test        # Vitest — 39 unit tests
yarn lint && yarn typecheck
```

Services are tested against hand-rolled repository fakes and an injected `runInTransaction`, so tests never touch a database. `subscription.service.test.ts` is the flagship: transfer happy path (update + audit row in the same transaction), target-already-subscribed conflict, cross-owner rejection, cancelled-sub rejection, and cancel-clears-OVERDUE.

## CI/CD

- **CI** (`.github/workflows/ci.yml`, PRs + pushes to `main`): install → `prisma generate` → lint → typecheck → test → build. The build needs no real database (dummy `DATABASE_URL`).
- **CD**: Vercel Git integration — preview deploy per PR, production on merge to `main`. Previews share the prod database (acceptable for a take-home, noted deliberately).
- **Migrations**: a GitHub Actions job runs `prisma migrate deploy` against Neon on pushes to `main`, then smoke-checks `GET /api/plans` on the production URL.

## Demo walkthrough

All on https://amp-csr.vercel.app — mapped to the four CSR call scenarios. Seeded data is deterministic, so these names always exist.

**Scenario 1 — "I want to cancel my account."**
Search `Alice` → open **Alice Johnson** → **Cancel Account** (top right) → type the confirmation phrase. Her status chip flips to CANCELLED and every subscription card shows CANCELLED — one transaction.

**Scenario 2 — "I have a question about a recent purchase."**
On any user's detail page, scroll to **Purchase history**: date, description, type, amount, status. FAILED rows show the failure reason; REFUNDED rows are chipped.

**Scenario 3 — "I purchased a new vehicle and I want my subscription transferred."**
Open **Alice Johnson** (two vehicles, one subscription). On the subscription card click **Transfer** → the dialog lists her other vehicle (ineligible ones are disabled with the reason) → confirm. The card now shows the new vehicle plus a transfer-history line. **Brian Kim** already has a historical transfer on record if you want to see the history rendering without mutating anything.

**Scenario 4 — "I am not able to get a wash."** (overdue account)
Filter Status → **Overdue** (or search `Sam`) → open **Sam Johnson**. A warning banner explains the account is overdue with the failed payment's date and reason (e.g. "Card declined — insufficient funds"). Cancelling the overdue subscription flips the account back to ACTIVE automatically.

**Extras**

- **Plate search:** copy any license plate from a detail page into the users-list search — it finds the owner.
- **Shared surname:** search `Johnson` — multiple matching users (search across name/email/phone/plate).
- **Duplicate-email error:** Edit any account and set the email to `alice.johnson@example.com` — a 409 renders inline under the email field.
- **URL state:** search/filter/page/sort round-trip through the URL — refresh or share the link and the view is preserved.

