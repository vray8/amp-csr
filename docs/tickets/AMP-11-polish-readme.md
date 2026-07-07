# AMP-11: Polish, README & demo walkthrough

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | Medium |
| Story Points | 3 |
| Depends on | AMP-8, AMP-10 |
| Blocks | — (final ticket) |

## Description

Final quality pass: consistent loading/empty/error states, route-level error boundaries, and a README that lets a reviewer evaluate the project in ten minutes — architecture, design decisions, setup, and a demo walkthrough mapped to the four CSR call scenarios.

## Scope

**In scope**
- `src/app/error.tsx` (global) and `src/app/users/[id]/not-found.tsx`.
- Skeletons/empty states audit across list + detail sections.
- README rewrite; screenshot (or GIF) of the portal.
- Full manual verification pass on the deployed URL.

**Out of scope**
- New features of any kind.

## Acceptance Criteria

- [ ] Every data section has: skeleton while loading, friendly empty state, `Alert` + retry on error. No blank screens, no unhandled promise rejections in the console.
- [ ] `error.tsx` renders a reset-able error page; bad user id renders `not-found` with a link back to `/users`.
- [ ] README contains, in order: one-paragraph pitch + **live URL** + screenshot; tech stack; architecture section (layer diagram + the design-decision bullets below); data model summary; API table; local setup; testing; CI/CD summary; demo walkthrough; "What I'd do next".
- [ ] The demo walkthrough can be followed by someone with zero context, on the deployed URL, covering all four call scenarios plus plate-search, status filter, and the duplicate-email error.
- [ ] `yarn lint && yarn typecheck && yarn test && yarn build` all green at the end.

## Tech Notes / Implementation Guide

**Design-decision bullets the README must include** (copy the reasoning from the epic, keep each to 2–3 lines):
1. Controller → service → repository layering and why (testability, no Prisma in routes, HTTP-free business rules).
2. Transfer = mutable `vehicleId` + `SubscriptionTransfer` audit table (subscription identity survives).
3. One-non-cancelled-subscription-per-vehicle invariant, enforced in the service layer.
4. Shared zod schemas: one schema validates the API request and the form.
5. Consistent `{ data } / { error }` envelope with typed domain errors → HTTP mapping.
6. URL-persisted list state (shareable searches, back-button).
7. React Query over server-component data flow for this interactive tool — and why.
8. Deliberate scope cuts: no auth (internal tool), display-only payment method, no payment retry.

**Demo walkthrough skeleton (README section):**

```md
## Demo walkthrough (CSR call scenarios)
1. "I want to cancel my account" — search "…", open the user, Cancel Account, watch the
   status chip and subscriptions flip to CANCELLED.
2. "A question about a recent purchase" — open …'s Purchase History; note the FAILED row
   with its reason on hover.
3. "I bought a new car — transfer my subscription" — open … (two vehicles, one sub),
   Transfer → pick the other vehicle → see the card update + transfer history line.
   Try transferring onto an already-subscribed vehicle to see the clean conflict error.
4. "I can't get a wash" — open … (OVERDUE): the banner explains the failed payment.
Also try: searching a license-plate fragment, the status filter, and editing an email
to one that already exists (inline field error).
```

Fill the `…` with actual seeded names (from AMP-2) so the reviewer doesn't hunt.

**Screenshot:** run the seeded app, capture the users list and a user detail page (Cmd-Shift-4 on macOS), commit under `docs/img/` and embed both.

**Error boundary (`src/app/error.tsx`):** `'use client'`; render MUI `Alert severity="error"` + "Try again" `Button onClick={reset}`. Keep it 20 lines.

**Final sweep checklist:**
- Console: zero React key warnings, zero act()/hydration warnings on both pages.
- Every date/money value goes through `format.ts`.
- Buttons show `loading` state (MUI `loading` prop on Button v9) during mutations.
- Dead code/boilerplate: no unused scaffold files, no commented-out blocks, no `console.log`s outside `api-helpers`'s error logger.
- `README` badges/links point at the real repo and live URL.

## Definition of Done

Reviewer-ready: README walkthrough verified on production, all checks green, committed as `docs: README with architecture, setup, and demo walkthrough` (+ `fix:`/`chore:` commits from the sweep).
