# AMP-7: User detail page + account editing

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | High |
| Story Points | 5 |
| Depends on | AMP-6 |
| Blocks | AMP-8 |

## Description

Build `/users/[id]`: a single scannable page a CSR can read top-to-bottom while on a call. Header with identity + status + Cancel Account; account info card with an edit dialog; purchase history table; plus the read-only skeleton of the subscriptions and vehicles sections (interactive actions land in AMP-8). Includes the OVERDUE alert banner that answers the "I can't get a wash" call.

## Scope

**In scope**
- Page layout: header, OVERDUE banner, `AccountInfoCard` + `EditAccountDialog`, `SubscriptionsSection` (read-only render), `VehiclesSection` (read-only render), `PurchaseHistoryTable` (paginated).
- Hooks: `useUser(id)`, `usePurchases(id, page)`, `useUpdateUser`, `useCancelAccount`.
- `ConfirmDialog` common component; cancel-account flow.
- `not-found` handling for bad ids; loading skeletons for each card.

**Out of scope**
- Add/edit/remove vehicle, add/cancel/transfer subscription (AMP-8).

## Acceptance Criteria

- [ ] Header: name, contact line, `StatusChip`, "Member since", Cancel Account button (hidden/disabled when already CANCELLED).
- [ ] OVERDUE user → prominent warning `Alert` at top: "Account overdue — payment failed on {date}: {failureReason}" derived from the most recent FAILED purchase.
- [ ] Account card shows name/email/phone/payment method (brand ····last4 or "None on file"). Edit opens a dialog pre-filled with current values.
- [ ] Edit dialog validates with the **shared zod schema** (same one the API uses); saving a duplicate email shows the server's field error inline under the email input; success closes the dialog, refreshes the page data, and shows a success snackbar.
- [ ] Cancel Account requires typed-out confirm ("cancel {name}'s account"?) via `ConfirmDialog`; on success the chip flips to CANCELLED and subscription cards show CANCELLED.
- [ ] Purchases table: date, description, type, amount ($ from cents), status chip; FAILED rows show `failureReason` (tooltip or secondary line); paginated newest-first.
- [ ] Unknown id renders the Next.js `not-found` UI (trigger `notFound()` when the API 404s).
- [ ] Each section has a loading skeleton; API errors render an `Alert` with retry, not a blank screen.

## Tech Notes / Implementation Guide

**Data flow:** `useUser(id)` → `useQuery({ queryKey: ['user', id], queryFn: () => api<UserDetail>(\`/api/users/\${id}\`) })`. The detail endpoint already returns vehicles + subscriptions (AMP-4); purchases are a separate paginated query `['purchases', id, page]`.

**Mutation + invalidation pattern (establish here, reuse in AMP-8):**

```ts
export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserInput) =>
      api<UserDetail>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });   // list may show stale name/status
    },
  });
}
```

No optimistic updates anywhere — invalidate + refetch is plenty for a CSR tool and much less code.

**Form pattern (`EditAccountDialog`):**

```ts
const form = useForm<UpdateUserInput>({
  resolver: zodResolver(updateUserSchema),   // SAME schema the route handler parses
  values: { name: user.name, email: user.email, phone: user.phone },  // 'values' keeps dialog in sync
});
const onSubmit = form.handleSubmit(async (data) => {
  try {
    await updateUser.mutateAsync(data);
    snackbar.success('Account updated');
    onClose();
  } catch (e) {
    if (e instanceof ApiError && e.fieldErrors) {
      for (const [field, message] of Object.entries(e.fieldErrors))
        form.setError(field as keyof UpdateUserInput, { message });
    } else snackbar.error(e instanceof Error ? e.message : 'Update failed');
  }
});
```

Use MUI `TextField` with `{...form.register('email')} error={!!errors.email} helperText={errors.email?.message}`.

**zod 4 + @hookform/resolvers:** import `{ zodResolver }` from `'@hookform/resolvers/zod'` — v5 of the resolvers package supports zod 4. If types complain about the resolver generic, type the form with `z.infer<typeof updateUserSchema>`.

**OVERDUE banner source:** the detail payload should carry the latest FAILED purchase (either include it in the detail response in AMP-4's repository include — `purchases: { where: { status: 'FAILED' }, orderBy: { createdAt: 'desc' }, take: 1 }` — or find it from the first purchases page; prefer the include: banner renders without waiting for the purchases query).

**`ConfirmDialog` (common):** props `{ open, title, body, confirmLabel, danger?: boolean, onConfirm, onClose, loading }` → MUI Dialog with `color="error"` confirm button when `danger`. Reused for cancel-account (here) and cancel-sub / remove-vehicle (AMP-8).

**not-found:** in the page component, when the user query fails with `ApiError.status === 404`, call `notFound()` from `next/navigation`. Add `src/app/users/[id]/not-found.tsx` with a link back to `/users`.

**Layout:** `Stack spacing={3}` of `Card`s inside a `Container maxWidth="lg"`. Sections in order: banner → header → Account / Subscriptions / Vehicles (read-only lists for now, AMP-8 adds buttons) → Purchases. Skeletons: `<Skeleton variant="rounded" height={140}/>` per card while `isPending`.

**Money/date formatters (`src/lib/format.ts`):** `formatMoney(cents)` via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`, `formatDate(iso)` via `Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })`. Use everywhere; never hand-roll `$${x/100}`.

## Definition of Done

Full page renders for ACTIVE, OVERDUE, and CANCELLED seed users; duplicate-email inline error demoed; cancel flow demoed; lint/typecheck/test green; committed as `feat: user detail page with account editing and cancel flow`.
