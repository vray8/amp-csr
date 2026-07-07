# AMP-9: CI pipeline (GitHub Actions)

| Field | Value |
|---|---|
| Type | Task |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | High |
| Story Points | 2 |
| Depends on | AMP-1 (scripts exist); ideally after AMP-3 (tests exist) |
| Blocks | AMP-10 |

## Description

Add a GitHub Actions CI workflow that gates every PR and push to `main`: install → prisma generate → lint → typecheck → test → build. Enable branch protection so red CI blocks merges.

## Scope

**In scope**
- `.github/workflows/ci.yml`.
- Branch protection on `main` (requires repo admin — manual step, documented).

**Out of scope**
- Deployments (AMP-10). Migration job (AMP-10).

## Acceptance Criteria

- [ ] CI runs on `pull_request` and on `push` to `main`.
- [ ] Steps: checkout → Node 22 with yarn cache → `yarn install --frozen-lockfile` → `npx prisma generate` → `yarn lint` → `yarn typecheck` → `yarn test` → `yarn build`.
- [ ] Build succeeds **without a real database** (dummy `DATABASE_URL`).
- [ ] A deliberately failing test on a branch shows a red check on its PR.
- [ ] Branch protection: `main` requires the CI check to pass before merge (documented in README if it can't be enabled on a free private repo).

## Tech Notes / Implementation Guide

**`.github/workflows/ci.yml`:**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    env:
      # build/generate need a syntactically valid URL, but nothing connects during build
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: yarn
      - run: yarn install --frozen-lockfile
      - run: npx prisma generate
      - run: yarn lint
      - run: yarn typecheck
      - run: yarn test
      - run: yarn build
```

**Why the dummy DATABASE_URL works:** all pages are client-rendered against `/api/*` at runtime; nothing queries the DB at build time. If `next build` starts failing because a route/page gets statically prerendered and touches Prisma, mark that route `export const dynamic = 'force-dynamic'` rather than adding a DB to CI.

**Prisma 7 note:** `prisma generate` reads `prisma.config.ts`, which imports `dotenv/config` — absence of a `.env` file in CI is fine (env comes from the job `env:` block).

**Branch protection (manual, via GitHub UI or CLI):**

```bash
gh api repos/vray8/amp-csr/branches/main/protection -X PUT \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=ci' \
  -F 'enforce_admins=false' \
  -F 'required_pull_request_reviews=null' -F 'restrictions=null'
```

(If the plan/repo tier doesn't allow it, note in the README that CI is the intended merge gate.)

## Definition of Done

Green run visible on `main` and on a test PR; committed as `ci: add lint/typecheck/test/build pipeline`.
