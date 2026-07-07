# AMP-10: Deployment — Vercel + Neon + migration job

| Field | Value |
|---|---|
| Type | Task |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | High |
| Story Points | 3 |
| Depends on | AMP-9; features AMP-1…AMP-8 merged |
| Blocks | AMP-11 (README documents the live URL) |

## Description

Ship the portal: Neon Postgres in production, Vercel Git-integration deploys (preview per PR, production on `main`), an automated `prisma migrate deploy` job, a one-time production seed, and a post-deploy smoke check.

## Scope

**In scope**
- Neon project + connection strings; Vercel project + env vars; `postinstall` prisma generate; migrate-deploy GitHub Actions job; prod seed; smoke check.

**Out of scope**
- Custom domains, monitoring/alerting, multi-env (staging).

## Acceptance Criteria

- [ ] Production URL serves the portal against Neon; all four demo call-scenarios work on it.
- [ ] Opening a PR produces a working Vercel preview deployment (previews may share the prod database — acceptable for a take-home, documented).
- [ ] Pushing a new migration to `main` applies it to Neon automatically via the Actions job.
- [ ] `curl -f https://<prod-url>/api/plans` returns the seeded plans (smoke check step in the workflow).
- [ ] `.env.example`, README (AMP-11) and Vercel env vars are consistent.

## Tech Notes / Implementation Guide

**Neon setup:** create a project (free tier) → copy the **pooled** connection string (`...-pooler.<region>.aws.neon.tech`) for the app and the **direct** string for migrations. Serverless functions need the pooled one.

**Vercel setup:** import the GitHub repo (framework auto-detected). Env vars for Production + Preview: `DATABASE_URL` = pooled Neon string. Add to `package.json`: `"postinstall": "prisma generate"` — Vercel caches `node_modules`, so without this the Prisma client can be stale/missing on deploys.

**Prisma 7 note:** `prisma generate` needs `prisma` + `dotenv` available at install time on Vercel — they are devDependencies, which Vercel installs by default (`NODE_ENV` handling is fine); if the build ever prunes dev deps, move `prisma`, `tsx`, `dotenv` to dependencies.

**Migration job — append to `.github/workflows/ci.yml` or a new `deploy.yml`:**

```yaml
  migrate:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: yarn }
      - run: yarn install --frozen-lockfile
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.NEON_DIRECT_DATABASE_URL }}

  smoke:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Vercel deploy to settle
        run: sleep 90
      - run: curl -fsS "${{ vars.PROD_URL }}/api/plans" | head -c 400
```

Add repo secret `NEON_DIRECT_DATABASE_URL` (direct string) and repo variable `PROD_URL`. The `sleep` is a pragmatic take-home shortcut; note in the epic that production-grade would use a Vercel deploy hook/API poll instead.

Ordering caveat (accepted risk, document it): Vercel deploys on push while migrations run in Actions — a ~1-minute window can serve new code against the old schema. All planned migrations are additive, so this is acceptable here; the robust fix (deploy hooks after migrate) goes in "future work".

**One-time prod seed (local shell):**

```bash
DATABASE_URL='<neon-direct-string>' npx prisma db seed
```

Do NOT wire seeding into CI — it wipes data by design (deleteMany).

**Local `vercel` CLI is not required** — everything goes through the Git integration.

## Definition of Done

Live URL demoed end-to-end; migration job proven with a no-op migration or the initial one; committed as `ci: add production migration and smoke-check jobs`.
