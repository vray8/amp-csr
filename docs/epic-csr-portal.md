# Epic: AMP CSR Portal

| | |
|---|---|
| **Status** | Planned |
| **Repo** | https://github.com/vray8/amp-csr |
| **Deliverables** | GitHub repo + deployed link (Vercel) |

## Overview

Build a Customer Service Representative (CSR) portal for **AMP**, a membership and loyalty platform for car washes. Customers hold subscription-based monthly memberships per vehicle, buy single washes, and manage payment info. CSRs use this portal to support customers who call in.

The four call scenarios the portal must handle well:

1. *"I want to cancel my account."*
2. *"I have a question about a recent purchase."*
3. *"I purchased a new vehicle and I want my subscription transferred."*
4. *"I am not able to get a wash."* (account **overdue** after a failed membership payment)

### Required features

1. **View a list of users** — all registered users of the mobile app.
2. **Quickly find and view a specific user** — account info, active vehicle subscriptions, purchase history.
3. **Edit account information** — name, email, phone, etc.
4. **View/edit vehicle subscriptions** — add, remove, **transfer** subscriptions between vehicles.

Extra feature (chosen): **debounced search + status filter** on the users list (search by name / email / phone / license plate).

## Architecture

**One Next.js app, single deploy on Vercel.** The back-end is implemented as Next.js Route Handlers acting as thin controllers over an internal **controller → service → repository** layered architecture.

```
   Browser (MUI + React Query)
        │  fetch /api/...
        ▼
   Route Handlers  (src/app/api/…)      ← controllers: zod parse → one service call → serialize
        │
        ▼
   Services        (src/server/services)     ← business rules, transactions, DomainErrors
        │
        ▼
   Repositories    (src/server/repositories) ← only layer that imports Prisma
        │
        ▼
   Prisma → PostgreSQL (Neon)
```

**Stack:** Next.js (App Router, TypeScript) · MUI (+ DataGrid) · Prisma + Neon Postgres · zod · TanStack React Query · react-hook-form · Vitest.

### Layering rules

- **Route handlers** validate input with zod and call exactly one service method — no Prisma imports, no business logic (~15 lines each).
- **Services** own business rules and `prisma.$transaction`; throw typed `DomainError`s (`NotFoundError` → 404, `ValidationError` → 400, `ConflictError` → 409); know nothing of HTTP.
- **Repositories** are the only Prisma consumers, returning explicit `select`/`include` shapes so raw DB models never leak to the client.
- **Shared zod schemas** (`src/lib/schemas/`) are used by both API validation and frontend forms — one schema, validated on both sides.
- **Response envelope** everywhere: `{ data }` on success, `{ error: { code, message, fieldErrors? } }` on failure (via a `handleRoute()` wrapper).

### Key design decisions

- **Transfer = mutable `vehicleId`**: a subscription is a first-class entity pointing at a vehicle; transferring updates `vehicleId` in place so the subscription's identity, plan, and billing history survive — matching the real-world semantics of "I bought a new car, move my membership". A `SubscriptionTransfer` audit row is written in the same transaction.
- **Invariant**: at most one non-cancelled subscription per vehicle (service-enforced).
- **Overdue modeling**: a FAILED `SUBSCRIPTION_PAYMENT` purchase is what puts a user/subscription in OVERDUE; seed data wires these together so the "can't get a wash" scenario is demoable.
- **Scope cuts (deliberate)**: no CSR auth (internal tool, documented), no real payment processing (payment method is display-only metadata).

## Data model

Enums: `AccountStatus { ACTIVE, OVERDUE, CANCELLED }` · `SubscriptionStatus { ACTIVE, PAUSED, OVERDUE, CANCELLED }` · `PurchaseType { SINGLE_WASH, SUBSCRIPTION_PAYMENT }` · `PurchaseStatus { PAID, FAILED, REFUNDED }`

| Model | Fields (key ones) |
|---|---|
| **User** | id, name, email (unique), phone, status, paymentMethodBrand/Last4 (nullable), timestamps |
| **Vehicle** | id, userId, make, model, year, color, licensePlate (unique, searchable) |
| **Plan** | id, name (Basic/Premium/Ultimate), priceCents, description — seeded lookup |
| **Subscription** | id, userId, **vehicleId (mutable)**, planId, status, startedAt, cancelledAt?, nextBillingDate? |
| **SubscriptionTransfer** | id, subscriptionId, fromVehicleId, toVehicleId, transferredAt — audit trail |
| **Purchase** | id, userId, type, status, amountCents, description, subscriptionId?, failureReason?, createdAt |

**Seed data** (`prisma/seed.ts`, deterministic + idempotent): 3 plans; ~25 users — ~16 ACTIVE (0–2 vehicles, mixed subs / single-wash-only), ~4 OVERDUE (each with an OVERDUE sub + FAILED payment with `failureReason`), ~3 CANCELLED; 1–2 users with two vehicles and one sub (live transfer demo target); one pre-seeded transfer; realistic unique plates; 3–10 purchases per user over ~8 months incl. a couple REFUNDED; duplicate surnames so search demos well.

## API design

REST, JSON envelope, under `/api`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users?search=&status=&page=&pageSize=&sort=` | Paginated list; search ORs name/email/phone/licensePlate (case-insensitive) |
| GET / PATCH | `/api/users/[id]` | Full detail (vehicles, subs + plan + transfer history) / edit account |
| POST | `/api/users/[id]/cancel` | Cancel account (cancels all active subs in one transaction) |
| GET | `/api/users/[id]/purchases?page=` | Paginated purchase history |
| POST | `/api/users/[id]/vehicles` | Add vehicle |
| PATCH / DELETE | `/api/vehicles/[id]` | Edit / remove vehicle (409 if it has a non-cancelled sub) |
| POST | `/api/users/[id]/subscriptions` | Add subscription `{ vehicleId, planId }` |
| POST | `/api/subscriptions/[id]/cancel` | Cancel subscription |
| POST | `/api/subscriptions/[id]/transfer` | Transfer `{ toVehicleId }` |
| GET | `/api/plans` | Plans for the add-subscription form |

**Business rules (service layer):**

- `transfer`: target vehicle must belong to the same user; target must not already have an active/paused/overdue sub; sub must not be CANCELLED; transaction updates `vehicleId` + inserts audit row.
- `create subscription`: same one-sub-per-vehicle check; writes an initial PAID purchase.
- `cancel subscription`: sets CANCELLED + `cancelledAt`; clears user OVERDUE if it was the last overdue sub.
- `update account`: unique-email check → 409 with field error.
- `cancel account`: transaction cancelling the user and all active subs.

## Frontend design

Client-side **React Query** against the API routes (interactive internal tool: search-as-you-type, dialog mutations, cache invalidation); server components only as thin shells.

- **`/users`** — MUI DataGrid in server mode (pagination/sorting), debounced (300 ms) search + status filter; **search/filter/page state lives in the URL** (shareable links, back button works); `keepPreviousData` for smooth paging. Row click → detail.
- **`/users/[id]`** — stacked scannable cards (not tabs — a CSR on a call wants everything visible): header (name, status chip, Cancel Account), account info + edit dialog, subscriptions (Add / per-card Transfer & Cancel, transfer history), vehicles, purchase history (FAILED rows get an error chip + failure reason). OVERDUE account → prominent alert banner referencing the failed payment.
- **Forms** — react-hook-form + zod resolvers using the same shared schemas the API parses; server field errors map back into the form (`setError`), non-field errors → snackbar; TransferDialog disables ineligible target vehicles with tooltip reasons and surfaces API 409s in-dialog.
- Common components: `StatusChip` (single source of truth for status→color), `ConfirmDialog` (destructive actions).

## CI/CD

**CI — GitHub Actions** (`.github/workflows/ci.yml`, on PRs + pushes to `main`):
`yarn install --frozen-lockfile` → `prisma generate` → lint → typecheck (`tsc --noEmit`) → test (Vitest) → build (dummy `DATABASE_URL`; no DB needed at build time). Branch protection on `main` requires CI green; work happens in short-lived feature branches per story → PR → merge.

**CD — Vercel Git integration** (deliberate choice over a custom deploy action): preview deploy per PR, production deploy on merge to `main`. `DATABASE_URL` (Neon pooled string) in Vercel env; `"postinstall": "prisma generate"` in package.json.

**Migrations**: a small GitHub Actions job runs `prisma migrate deploy` on pushes to `main` that touch `prisma/migrations/**` (`DATABASE_URL` from a GitHub secret). Seed run manually once against prod. Post-deploy smoke check: `curl -f https://<prod-url>/api/plans`.

## Testing strategy

- **Unit tests (Vitest, node env, hand-rolled repository fakes)** — `subscription.service` is the flagship: transfer happy path; conflict when target vehicle already has an active sub; cross-owner transfer rejected; cancelled-sub transfer rejected; cancel clears user OVERDUE when it's the last overdue sub. Plus `user.service` (duplicate email, cancel cascade, not-found) and one zod query-param parsing test.
- **Manual demo walkthrough** (documented in README, mapped to the four call scenarios) run against the deployed URL.

## Stories

> Each story below has an individual ticket in [`docs/tickets/`](tickets/README.md) with full scope, acceptance criteria, and implementation tech notes. IDs are stable references.

### AMP-1 — Project setup & tooling
Prune create-next-app boilerplate; add prettier; install deps (Prisma, zod, MUI, React Query, react-hook-form, Vitest); folder skeleton (`src/server`, `src/lib/schemas`, `src/components`, `src/hooks`); `.env.example`; pin Node LTS (`.nvmrc`).
**AC:** app builds and lints clean; `.env.example` documents `DATABASE_URL`; folder structure matches the architecture section.

### AMP-2 — Database schema, migrations, seed
Prisma schema for all six models + four enums; initial migration; deterministic idempotent seed covering every demo scenario.
**AC:** `prisma migrate dev` + `prisma db seed` run clean; Prisma Studio shows ~25 users incl. OVERDUE users with FAILED payments, a two-vehicle/one-sub user, and a pre-seeded transfer.

### AMP-3 — Server foundation
Prisma client singleton; `DomainError` hierarchy; `handleRoute()` wrapper (zod → 400 with field errors, DomainError → mapped status, unknown → 500); response envelope; shared zod schemas package.
**AC:** a sample route demonstrates the envelope for success, validation failure, and domain error; no route handler imports Prisma directly.

### AMP-4 — Users API + unit tests
List (search/status filter/pagination/sort), detail (vehicles + subs + plan + transfer history), update account, cancel account, purchase history — through all three layers.
**AC:** endpoints verified with curl; duplicate email returns 409 with a field error; cancel account cancels all active subs atomically; `user.service` unit tests pass.

### AMP-5 — Vehicles & subscriptions API + transfer tests
Vehicle add/edit/remove; subscription create/cancel/**transfer** with transactions + `SubscriptionTransfer` audit row; the invariant and all transfer rules enforced in the service.
**AC:** unit tests cover: transfer happy path, target-has-active-sub conflict, cross-owner rejection, cancelled-sub rejection, cancel-clears-OVERDUE; vehicle delete with a live sub returns 409.

### AMP-6 — Web shell + users list
MUI theme/providers/AppBar; React Query provider; typed api-client; users list page with DataGrid (server pagination/sorting), debounced search, status filter, URL-persisted state.
**AC:** searching by partial name/email/phone/plate narrows the list; filter + page state survive refresh/back; row click navigates to detail.

### AMP-7 — User detail + account editing
Detail page with account card, status chip, overdue alert banner, purchases table; edit-account dialog (RHF + shared zod schema, server field-error mapping); cancel-account flow with confirm dialog.
**AC:** all four sections render from live API data; editing email to a duplicate shows an inline field error; cancelling flips the status chip and cancels subs.

### AMP-8 — Subscriptions & vehicles UI + transfer flow
Vehicles section (add/edit/remove); subscriptions section (add subscription dialog with plan picker, cancel, **TransferDialog** with ineligible vehicles disabled + tooltip reasons, transfer history display).
**AC:** the two-vehicle demo user can transfer their sub and the card updates + history row appears; transferring onto an already-subscribed vehicle surfaces a clean 409 in the dialog.

### AMP-9 — CI pipeline
`ci.yml` (install → generate → lint → typecheck → test → build); branch protection on `main`.
**AC:** CI runs on PRs and `main`; a red test blocks merge.

### AMP-10 — Deployment (Vercel + Neon) + migration job
Neon project; Vercel project with env vars; `postinstall` prisma generate; migrate-deploy workflow job; seed prod; smoke check.
**AC:** production URL serves the portal against Neon; PRs get preview deploys; `curl -f <prod>/api/plans` succeeds post-deploy.

### AMP-11 — Polish, README, demo walkthrough
Loading skeletons, empty states, `error.tsx` + `not-found` for bad user ids; README (architecture + design decisions, data model, API table, local setup, testing, CI/CD, demo walkthrough mapped to the four call scenarios, "what I'd do next").
**AC:** README walkthrough can be followed end-to-end on the deployed URL by a reviewer with no prior context.

## Risks

- MUI + latest Next.js Emotion integration subpath naming — verify `@mui/material-nextjs` adapter at install; DataGrid fallback = plain MUI Table + TablePagination.
- Neon free-tier cold starts — first request after idle is slow; note in README.
- Next.js async route `params` (Promise) in newer versions — await it in every handler.
- Prisma 7 uses `prisma.config.ts` + the new `prisma-client` generator (generated client checked into `src/generated/`-style output path, driver adapter for Postgres) — follow current docs during AMP-2.

## Future work (out of scope)

CSR authentication/roles · real payments (Stripe) · full CSR action audit log · pause/resume subscription · coupon redemption · Playwright e2e suite.
