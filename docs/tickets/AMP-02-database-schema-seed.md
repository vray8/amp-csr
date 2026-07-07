# AMP-2: Database schema, migrations & seed data

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | Highest |
| Story Points | 3 |
| Depends on | AMP-1 |
| Blocks | AMP-3, AMP-4, AMP-5 |

## Description

Define the full Prisma schema (6 models, 4 enums), create the initial migration, and write a deterministic, idempotent seed script that produces demo data covering every CSR call scenario from the epic.

## Scope

**In scope**
- Prisma 7 setup (`prisma.config.ts`, new `prisma-client` generator, pg driver adapter).
- Schema: `User`, `Vehicle`, `Plan`, `Subscription`, `SubscriptionTransfer`, `Purchase` + enums.
- Initial migration; seed script wired into `prisma db seed`.
- Local dev database (Docker Postgres).

**Out of scope**
- The Prisma client singleton used by app code (AMP-3). Neon/prod database (AMP-10).

## Acceptance Criteria

- [ ] `npx prisma migrate dev --name init` runs clean against a fresh local DB.
- [ ] `npx prisma db seed` is idempotent (safe to run twice) and creates: 3 plans; ~25 users of which ~16 ACTIVE, ~4 OVERDUE, ~3 CANCELLED.
- [ ] Every OVERDUE user has ≥1 OVERDUE subscription **and** a FAILED `SUBSCRIPTION_PAYMENT` purchase with a human-readable `failureReason` (e.g. "Card declined — insufficient funds").
- [ ] At least one user has **two vehicles and exactly one active subscription** (the transfer demo target).
- [ ] At least one `SubscriptionTransfer` row is pre-seeded.
- [ ] All license plates unique and realistic (e.g. `7TQX412`); at least two users share a surname (search demo).
- [ ] Each user with any subscription has 3–10 purchases spread over ~8 months (monthly `SUBSCRIPTION_PAYMENT`s aligned to their sub, scattered `SINGLE_WASH`es, a couple of REFUNDED rows overall).
- [ ] Prisma Studio (`npx prisma studio`) visually confirms the above.

## Tech Notes / Implementation Guide

**Local database (verified on this machine):** port 5432 is occupied by another project's container. Use a dedicated container on **5433**:

```bash
docker run -d --name amp-csr-postgres \
  -e POSTGRES_USER=amp -e POSTGRES_PASSWORD=amp -e POSTGRES_DB=amp_csr \
  -p 5433:5432 postgres:16
```

`.env`: `DATABASE_URL="postgresql://amp:amp@localhost:5433/amp_csr"`

**Prisma 7 specifics (this is NOT Prisma 5/6 — older tutorials will mislead you):**
- Run `npx prisma init --datasource-provider postgresql` once. It creates `prisma.config.ts` (which must `import "dotenv/config"` — env vars are no longer auto-loaded) and a schema using the new generator:

```prisma
generator client {
  provider = "prisma-client"          // NOT "prisma-client-js"
  output   = "../src/generated/prisma" // generated TS client, git-ignored
}

datasource db {
  provider = "postgresql"             // URL comes from prisma.config.ts, not schema
}
```

- `prisma init` adds `/src/generated/prisma` to `.gitignore` — keep that.
- Seed hook lives in `prisma.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env['DATABASE_URL'] },
});
```

- App code will instantiate the client with the pg adapter (AMP-3): `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` from `@prisma/adapter-pg`. The seed script should do the same, importing from `../src/generated/prisma/client`.

**Schema (write exactly this shape):**

```prisma
enum AccountStatus      { ACTIVE OVERDUE CANCELLED }
enum SubscriptionStatus { ACTIVE PAUSED OVERDUE CANCELLED }
enum PurchaseType       { SINGLE_WASH SUBSCRIPTION_PAYMENT }
enum PurchaseStatus     { PAID FAILED REFUNDED }

model User {
  id                 String        @id @default(cuid())
  name               String
  email              String        @unique
  phone              String
  status             AccountStatus @default(ACTIVE)
  paymentMethodBrand String?
  paymentMethodLast4 String?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  vehicles           Vehicle[]
  subscriptions      Subscription[]
  purchases          Purchase[]

  @@index([name])
  @@index([status])
}

model Vehicle {
  id            String   @id @default(cuid())
  userId        String
  make          String
  model         String
  year          Int
  color         String
  licensePlate  String   @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id])
  subscriptions Subscription[]
  transfersFrom SubscriptionTransfer[] @relation("TransferFromVehicle")
  transfersTo   SubscriptionTransfer[] @relation("TransferToVehicle")

  @@index([userId])
}

model Plan {
  id            String @id @default(cuid())
  name          String @unique
  priceCents    Int
  description   String
  subscriptions Subscription[]
}

model Subscription {
  id              String             @id @default(cuid())
  userId          String
  vehicleId       String             // mutable: transfer = update this in place
  planId          String
  status          SubscriptionStatus @default(ACTIVE)
  startedAt       DateTime           @default(now())
  cancelledAt     DateTime?
  nextBillingDate DateTime?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  user            User     @relation(fields: [userId], references: [id])
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id])
  plan            Plan     @relation(fields: [planId], references: [id])
  transfers       SubscriptionTransfer[]
  purchases       Purchase[]

  @@index([userId])
  @@index([vehicleId])
}

model SubscriptionTransfer {
  id             String   @id @default(cuid())
  subscriptionId String
  fromVehicleId  String
  toVehicleId    String
  transferredAt  DateTime @default(now())
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  fromVehicle    Vehicle @relation("TransferFromVehicle", fields: [fromVehicleId], references: [id])
  toVehicle      Vehicle @relation("TransferToVehicle", fields: [toVehicleId], references: [id])

  @@index([subscriptionId])
}

model Purchase {
  id             String         @id @default(cuid())
  userId         String
  type           PurchaseType
  status         PurchaseStatus
  amountCents    Int
  description    String         // e.g. "Premium Monthly — March 2026", "Single Wash — Deluxe"
  subscriptionId String?
  failureReason  String?        // set on FAILED rows
  createdAt      DateTime       @default(now())
  user           User          @relation(fields: [userId], references: [id])
  subscription   Subscription? @relation(fields: [subscriptionId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
}
```

**Seed script (`prisma/seed.ts`) guidance:**
- No faker dependency — hand-rolled arrays of first/last names, car makes/models/colors. Deterministic: no `Math.random()`; derive variation from array index arithmetic (e.g. `i % 3`).
- Idempotent: start with `deleteMany` in FK-safe order: `purchase, subscriptionTransfer, subscription, vehicle, plan, user`.
- Plans: Basic 999 / Premium 1999 / Ultimate 2999 (cents), with one-line descriptions.
- Anchor all dates to a fixed constant (e.g. `new Date('2026-07-01')`) minus offsets — never `Date.now()` — so reruns produce identical data.
- Business-consistency rules the seed must respect (the app relies on them):
  - user.status OVERDUE ⇔ they have ≥1 subscription with status OVERDUE ⇔ that sub has a FAILED payment purchase.
  - CANCELLED users: all their subs CANCELLED with `cancelledAt` set.
  - No vehicle has more than one non-cancelled subscription.

## Definition of Done

Migration + seed run clean and idempotently; Studio spot-check matches ACs; committed as `feat: database schema, migration, and seed data`.
