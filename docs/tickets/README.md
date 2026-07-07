# Tickets — AMP CSR Portal epic

Tickets for [the epic](../epic-csr-portal.md), in implementation order. Each is self-contained: scope, acceptance criteria, and tech notes detailed enough to implement without extra context.

| ID | Ticket | Points | Depends on |
|---|---|---|---|
| AMP-1 | [Project setup & tooling](AMP-01-project-setup.md) | 2 | — |
| AMP-2 | [Database schema, migrations & seed](AMP-02-database-schema-seed.md) | 3 | AMP-1 |
| AMP-3 | [Server foundation (layers, errors, validation)](AMP-03-server-foundation.md) | 3 | AMP-2 |
| AMP-4 | [Users API](AMP-04-users-api.md) | 5 | AMP-3 |
| AMP-5 | [Vehicles & subscriptions API](AMP-05-vehicles-subscriptions-api.md) | 5 | AMP-3, AMP-4 |
| AMP-6 | [Web shell + users list](AMP-06-web-shell-users-list.md) | 5 | AMP-4 |
| AMP-7 | [User detail + account editing](AMP-07-user-detail-account-editing.md) | 5 | AMP-6 |
| AMP-8 | [Subscriptions & vehicles UI + transfer](AMP-08-subscriptions-vehicles-ui.md) | 5 | AMP-5, AMP-7 |
| AMP-9 | [CI pipeline](AMP-09-ci-pipeline.md) | 2 | AMP-1 (ideally after AMP-3) |
| AMP-10 | [Deployment (Vercel + Neon)](AMP-10-deployment.md) | 3 | AMP-9, features merged |
| AMP-11 | [Polish, README & demo walkthrough](AMP-11-polish-readme.md) | 3 | AMP-8, AMP-10 |

**Suggested workflow:** one short-lived branch + PR per ticket, conventional commit messages, CI green before merge. AMP-5 and AMP-6 can proceed in parallel after AMP-4; AMP-9 can be done any time after AMP-1.
