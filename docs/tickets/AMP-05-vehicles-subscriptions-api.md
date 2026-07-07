# AMP-5: Vehicles & subscriptions API (create, cancel, transfer)

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | Highest |
| Story Points | 5 |
| Depends on | AMP-3 (foundation), AMP-4 (service/repo patterns) |
| Blocks | AMP-8 |

## Description

Implement the subscription-management half of the API — the core of the assignment. Vehicle CRUD, subscription create/cancel, and **transfer** (move a subscription to another vehicle of the same user) with a transactional audit trail. The business rules here are the project's centerpiece and get the most thorough unit tests.

## Scope

**In scope**
- Routes: `POST /api/users/[id]/vehicles`, `PATCH/DELETE /api/vehicles/[id]`, `POST /api/users/[id]/subscriptions`, `POST /api/subscriptions/[id]/cancel`, `POST /api/subscriptions/[id]/transfer`, `GET /api/plans`.
- `vehicle.service.ts`, `subscription.service.ts`; `vehicle.repository.ts`, `subscription.repository.ts`, `plan.repository.ts`.
- zod schemas: `vehicle.schema.ts`, `subscription.schema.ts`.
- Unit tests on every transfer/cancel business rule.

**Out of scope**
- Any UI (AMP-8). Payment retry / reactivation flows (future work).

## Acceptance Criteria

**Vehicles**
- [ ] Add vehicle validates make/model/year/color/licensePlate; duplicate plate → 409 with `fieldErrors.licensePlate`.
- [ ] Delete vehicle with a non-cancelled subscription → **409** with message telling the CSR to cancel or transfer the subscription first.

**Subscriptions**
- [ ] Create: rejects (409) if target vehicle already has a non-cancelled subscription; rejects (400/`ValidationError`) if the vehicle belongs to a different user; writes the subscription **and** an initial PAID `SUBSCRIPTION_PAYMENT` purchase in one transaction; sets `nextBillingDate` = startedAt + 1 month.
- [ ] Cancel: sets CANCELLED + `cancelledAt`; if the user has no remaining OVERDUE subs and their status was OVERDUE, user status flips to ACTIVE; cancelling an already-cancelled sub → 409.
- [ ] Transfer: moves `vehicleId` and inserts a `SubscriptionTransfer` row **in one transaction**. Rejected when: target vehicle belongs to another user (400), target vehicle already has a non-cancelled sub (409), subscription is CANCELLED (409), target vehicle == current vehicle (400).
- [ ] `GET /api/plans` returns the three seeded plans.

**Tests (`subscription.service.test.ts` — the flagship)**
- [ ] transfer happy path (repo calls asserted: update + audit insert, same tx)
- [ ] transfer → target has active sub → ConflictError
- [ ] transfer → cross-owner → ValidationError
- [ ] transfer → cancelled subscription → ConflictError
- [ ] cancel clears user OVERDUE when last overdue sub; leaves OVERDUE when another overdue sub remains

## Tech Notes / Implementation Guide

Reuse the patterns established in AMP-4: factory-function services with injected repos, repos accepting an optional `tx` client, `handleRoute` controllers, shared zod schemas.

**Schemas:**

```ts
export const createVehicleSchema = z.object({
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.coerce.number().int().min(1980).max(2030),
  color: z.string().min(1).max(30),
  licensePlate: z.string().min(2).max(10).transform((s) => s.toUpperCase()),
});
export const updateVehicleSchema = createVehicleSchema.partial();
export const createSubscriptionSchema = z.object({ vehicleId: z.string().min(1), planId: z.string().min(1) });
export const transferSubscriptionSchema = z.object({ toVehicleId: z.string().min(1) });
```

**Transfer service — reference implementation shape:**

```ts
async transfer(subscriptionId: string, toVehicleId: string) {
  const sub = await subscriptionRepo.findById(subscriptionId);        // throws NotFound if missing
  if (!sub) throw new NotFoundError('Subscription', subscriptionId);
  if (sub.status === 'CANCELLED')
    throw new ConflictError('Cannot transfer a cancelled subscription');
  if (sub.vehicleId === toVehicleId)
    throw new ValidationError('Subscription is already on this vehicle');

  const target = await vehicleRepo.findById(toVehicleId);
  if (!target) throw new NotFoundError('Vehicle', toVehicleId);
  if (target.userId !== sub.userId)
    throw new ValidationError('Target vehicle belongs to a different user');

  const existing = await subscriptionRepo.findActiveByVehicle(toVehicleId); // status != CANCELLED
  if (existing)
    throw new ConflictError('Target vehicle already has a subscription');

  return prisma.$transaction(async (tx) => {
    const updated = await subscriptionRepo.updateVehicle(subscriptionId, toVehicleId, tx);
    await subscriptionRepo.recordTransfer(
      { subscriptionId, fromVehicleId: sub.vehicleId, toVehicleId }, tx);
    return updated;
  });
}
```

Note for tests: because `prisma.$transaction(fn)` is awkward to fake, have the service depend on a `runInTransaction<T>(fn: (tx) => Promise<T>)` function injected alongside the repos; the real one wraps `prisma.$transaction`, the test fake just calls `fn(undefined)`. Keep this tiny — no unit-of-work framework.

**Cancel + OVERDUE recomputation:**

```ts
await runInTransaction(async (tx) => {
  await subscriptionRepo.cancel(subscriptionId, now, tx);
  const overdueLeft = await subscriptionRepo.countByUserAndStatus(sub.userId, 'OVERDUE', tx);
  const user = await userRepo.findById(sub.userId, tx);
  if (user.status === 'OVERDUE' && overdueLeft === 0)
    await userRepo.setStatus(sub.userId, 'ACTIVE', tx);
});
```

(If the cancelled sub was itself the overdue one, count after cancelling is naturally correct.)

**Create subscription:** validate vehicle ownership the same way as transfer, then in one transaction: create sub (status ACTIVE, `startedAt` now, `nextBillingDate` +1 month) + create purchase `{ type: SUBSCRIPTION_PAYMENT, status: PAID, amountCents: plan.priceCents, description: \`\${plan.name} Monthly — first payment\`, subscriptionId }`. Fetch the plan first; unknown planId → NotFoundError.

**Duplicate plate:** catch Prisma `P2002` on create/update and rethrow `new ConflictError('License plate already registered', { licensePlate: 'Already registered' })`.

**Vehicle delete guard:** `findActiveByVehicle(vehicleId)` → if present, `throw new ConflictError('Vehicle has a subscription — cancel or transfer it first')`. Also delete any `SubscriptionTransfer` rows referencing the vehicle? **No** — transfers reference vehicles historically; instead block deletion if the vehicle appears in any transfer history (`ConflictError`) OR relax by making transfer FKs optional. Decision: keep it simple — block deletion when the vehicle has ANY subscription or transfer history; seed guarantees at least one freely deletable vehicle for the demo.

**curl verification** examples:

```bash
curl -s -X POST localhost:3000/api/subscriptions/<subId>/transfer \
  -H 'content-type: application/json' -d '{"toVehicleId":"<vehId>"}' | jq
# rerun same command → expect 409 (target now has the sub)
```

## Definition of Done

All rule branches proven by unit tests; curl walkthrough of transfer happy path + each rejection; committed as `feat: vehicles and subscriptions API with transactional transfer + audit`.
