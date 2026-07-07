# AMP-8: Subscriptions & vehicles UI + transfer flow

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | High |
| Story Points | 5 |
| Depends on | AMP-5 (API), AMP-7 (detail page) |
| Blocks | — |

## Description

Make the subscriptions and vehicles sections of the user detail page fully interactive: add/edit/remove vehicles, add/cancel subscriptions, and the **transfer dialog** — the flagship UX of the portal ("I bought a new car, move my membership").

## Scope

**In scope**
- `VehiclesSection`: add vehicle dialog, edit vehicle dialog, remove with confirm.
- `SubscriptionsSection`: add subscription dialog (vehicle + plan pickers), cancel with confirm, per-card transfer button + `TransferDialog`, transfer-history display on each card.
- Hooks: `usePlans`, `useVehicleMutations`, `useSubscriptionMutations`.

**Out of scope**
- Pause/resume, payment retry (future work).

## Acceptance Criteria

**Vehicles**
- [ ] Add-vehicle dialog validates via shared `createVehicleSchema`; duplicate plate shows inline field error from the server's 409.
- [ ] Remove vehicle asks for confirmation; if the API returns 409 (has subscription / transfer history) the error message is shown in a snackbar or inline alert — not a crash.

**Subscriptions**
- [ ] Each subscription renders as a card: plan name + price/mo, status chip, vehicle (year make model · plate), started date, next billing date, and transfer history ("Transferred from {plate} to {plate} on {date}") when present.
- [ ] Add-subscription dialog: vehicle Select (user's vehicles; those with a non-cancelled sub are **disabled with the reason** "Already has a subscription") + plan Select (from `/api/plans`, showing name + price); succeeds → new card appears.
- [ ] Cancel subscription: confirm dialog; on success card shows CANCELLED and, if the user was OVERDUE because of it, the header chip and banner update (invalidation handles this).
- [ ] **Transfer dialog**: shows current vehicle, radio/select of the user's *other* vehicles with ineligible ones disabled + tooltip reason ("Already has a subscription"); confirm calls the API; success → card shows the new vehicle + a new transfer-history line + success snackbar.
- [ ] Forcing a conflict (e.g. two tabs) surfaces the API's 409 message inside the dialog as an `Alert` — the dialog stays open, no crash.
- [ ] All buttons disable while their mutation is pending.

## Tech Notes / Implementation Guide

Reuse everything from AMP-7: mutation+invalidate pattern (`['user', id]` and `['users']`), `ConfirmDialog`, snackbar, RHF+zod dialog pattern, formatters, `StatusChip`.

**Eligibility is computed client-side from data already on hand** (the detail payload has all vehicles and all subscriptions):

```ts
const subscribedVehicleIds = new Set(
  user.subscriptions.filter((s) => s.status !== 'CANCELLED').map((s) => s.vehicleId),
);
// Add-subscription dialog: vehicle option disabled if subscribedVehicleIds.has(v.id)
// TransferDialog: options = user.vehicles.filter(v => v.id !== sub.vehicleId);
//   disabled if subscribedVehicleIds.has(v.id)
```

The server re-validates everything (AMP-5) — the client-side disabling is UX, not enforcement. The dialog must still handle a 409 response gracefully (race with another CSR): render `<Alert severity="error">{apiError.message}</Alert>` above the actions and keep the dialog open.

**Disabled options with tooltips:** MUI `MenuItem disabled` swallows pointer events, so wrap: `<Tooltip title="Already has a subscription"><span><MenuItem disabled …/></span></Tooltip>`, or simpler: render the reason as secondary text inside the MenuItem (`<ListItemText primary={label} secondary="Already has a subscription"/>`) — pick the simpler one if Tooltip fights the Select.

**TransferDialog state:** `useState<string | null>(selectedVehicleId)`; confirm button disabled until a selection exists. On success: `qc.invalidateQueries({ queryKey: ['user', id] })`, snackbar "Subscription transferred to {plate}", close.

**Mutations file (`src/hooks/useSubscriptionMutations.ts`):** `useCreateSubscription(userId)`, `useCancelSubscription(userId)`, `useTransferSubscription(userId)` — each POSTs the AMP-5 endpoint and invalidates `['user', userId]` (+ `['users']` for status-affecting ones). Signature convention: pass `userId` to the hook (for invalidation), entity ids to `mutate()`.

**Empty states:** vehicles: "No vehicles on file" + Add button; subscriptions: "No subscriptions" + Add button (disabled with helper text when the user has no vehicles, or when CANCELLED). Don't allow adding subscriptions/vehicles for a CANCELLED account (hide/disable with reason).

**Demo target:** seeded user with two vehicles and one sub (AMP-2) — verify the happy path on them, then verify the conflict path by transferring onto a vehicle that has a sub (pick a two-sub user or create one via the UI).

## Definition of Done

All ACs demoed in the browser (happy + conflict paths); lint/typecheck/test green; committed as `feat: subscriptions and vehicles management UI with transfer flow`.
