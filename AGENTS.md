# Nutringest_Arch — Agent Guide

Project-specific rules for any agent working in this repository. Global agent rules
still apply (conventional commits, no AI attribution, never build, verify before claiming).

## Stack and layout

| Path | Stack | Notes |
| --- | --- | --- |
| `serverapp/` | NestJS 11 + Fastify + Prisma 6 + PostgreSQL + Redis | API. Modules own controller, service, repository, DTOs, guards. |
| `webapp/` | Next.js 16 (App Router) + React 19 + Tailwind 4 + Zustand + TanStack Query | Public site, portal, admin dashboard. |
| `nutringest_mobile/` | Flutter | The only mobile app. The old Expo template in `mobile/` was deleted (commit `6d58304`). |
| `docs/` | Markdown | `docs/legal/` holds the Terms and the Privacy Notice. |
| `odd/tasks/` | Markdown | ODD feature documents (one per large feature). |

`ARCHITECTURE.md` describes the real structure. If it disagrees with the filesystem,
the filesystem wins — fix the doc.

## Commands

Never build. Typecheck and test only.

```bash
# serverapp (NestJS)
cd serverapp
npm test                                    # jest
npm run typecheck                           # tsc --noEmit -p tsconfig.build.json
npx jest <path/to/file.spec.ts>             # focused test

# webapp (Next.js)
cd webapp
npm test                                    # vitest run
npm run typecheck                           # tsc --noEmit
```

### Baseline debt (measured, not assumed)

Two different typecheck commands give two different baselines. Use the matching pair:

| Command | Errors at baseline `37172e8` |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit -p tsconfig.build.json`, excludes specs) | **67** |
| `npx tsc --noEmit` (includes `**/*spec.ts`) | **90** |

Same error count as the baseline means no regression; anything above it is yours.

- `webapp` typecheck: **0 errors**. Keep it at 0.
- Full serverapp suite: 78 suites / 644 tests, **0 failures** (the last 12 pre-existing
  failures were closed on 2026-10-20 by fixing the test fixtures, not by weakening any
  assertion — see `odd/tasks/security-hardening-followups.md`).
- **The DB-backed suites need the local database up** (`docker compose -f docker-compose.dev.yml up -d`).
  Without it they fail with connection errors. With it up, they also need the entitlement seed:
  `cd serverapp && npm run seed:entitlements` (idempotent, `upsert`-based) — otherwise they fail
  with "Integration fixtures missing: need at least one Organization, User and active AddOn".
- **A DB-backed suite must create its own fixtures.** Picking "the first row in the database"
  inherits that database's state: the first user has no ACTIVE organization membership, so the
  requested organization degrades to the personal context and the assertion fails for a reason
  that has nothing to do with the code under test.

## Branch and commit conventions

- Work happens on feature branches (`feat/…`, `feature/…`); `main` and `develop` are release branches.
- Conventional Commits, one behavior per commit, ~400 authored changed lines per work unit.
- Tests and docs ship with the behavior they cover, in the same commit.
- Never push, open a PR, or merge without the user asking.

## ODD workflow

Large features get a feature document at `odd/tasks/<feature-name>.md` with this exact order:

1. Two or three header lines (objective, branch, delivery strategy, test runner).
2. `## Specs` — numbered `S#`, quoting the user's exact strings verbatim.
3. `## Tasks` — one line per task: ID, linked `S#`, route (inline or delegated), commit.
4. `## Log` — last. `L1` is the user's original request verbatim; later entries append.

The feature document is the specification subagents read by reference, never by paraphrase.
The Engram mirror lives under topic `odd/<feature-name>/tasks`.

Current feature documents:

- `odd/tasks/legal-compliance.md` — legal/compliance closure (Fase 1 closed and verified, Fase 2 closed in code).
- `odd/tasks/pediatric-frisancho.md` — pediatric history form.

## Known gotchas

- **Migrations are reconciled with the database (2026-10-20).** `prisma migrate deploy` and
  `prisma migrate status` are green, and `prisma migrate dev` no longer demands a reset. Two rules
  learned the hard way:
  - A migration folder that is applied in the database must never be deleted from the repository
    without also removing its row from `_prisma_migrations`. A deleted folder plus an applied row is
    drift, and `migrate dev` then demands a full reset that destroys the data.
  - A migration that is applied must not be edited afterwards: Prisma compares the stored checksum
    with the file and refuses with "was modified after it was applied". Write a new migration instead.
  - The database was drifted from the repository (objects created with `db push` and never captured
    as migrations). `20261020000004_reconcile_schema_drift` closed that gap, so a database built from
    this folder is now complete. Keep it that way: every schema change needs a migration.
  - The model's `@map` must match the column the migration creates. The share-link access log was
    created as `accessedAt` while the model maps it to `accessed_at`, which broke every shared plan
    link at runtime. `nutritional-plan.share-access.db.integration.spec.ts` now guards that against a
    real database.
- **localhost:11000 is the dev compose, not production.** The containers are named `nutrigest_prod_*`
  but they run `docker-compose.dev.yml` with hot reload and bind-mount the local checkout.
- **Entitlement flags are off by default.** `ENTITLEMENTS_ENABLED` and `MODULE_FRAMEWORK_ENABLED`
  default to off; the guards are no-ops until both are flipped together. See the
  `entitlements-rollout` SDD artifacts in Engram (`sdd/entitlements-rollout/*`).
- **Legal documents are published, not edited in place.** `docs/legal/privacy-policy.md` and
  `docs/legal/terms-and-conditions.md` are the source of truth; the public pages `/privacy` and
  `/terms` read the CMS entries with the matching key. After changing a document, publish it:
  `cd serverapp && npm run seed:legal` (idempotent; `LEGAL_DOCS_DIR` when the documents are not
  next to the serverapp). The production image only contains `serverapp/`, so this runs from a
  checkout — never assume a deploy publishes the legal text.
- **The bootstrap fixture does not overwrite the legal entries.** `DataFixtureService` upserts the
  corporate content on every backend boot; the `terms` and `privacy` keys are created only when
  missing, so a restart never replaces the published document. The other keys (mission, vision,
  values, objectives) are still overwritten on every boot, so an admin edit to them is lost.
- **Legal documents are versioned facts.** `docs/legal/terms-and-conditions.md` and
  `docs/legal/privacy-policy.md` must only state behavior that exists in the code. If a change
  alters a declared fact, the document is part of the change.
- **The legal pages render through a shared markdown renderer.** `parseMarkdown` (in
  `webapp/src/shared/components/organisms/DynamicForm/MarkdownEditor.tsx`) also powers `/about` and
  the CMS editor preview. It supports headings, emphasis, links, blockquotes, lists and GFM tables;
  it escapes raw HTML. Nested legal numbering like `18.2.` must stay as text — an `<ol>` would
  renumber it. `MarkdownEditor.spec.ts` pins all of this.
- **Spanish artifacts stay neutral.** Legal and product copy for users is Spanish in neutral
  professional register — no voseo, no marketing claims that cannot be verified.

## Skill registry

`.atl/skill-registry.md` is the project skill index (generated). The orchestrator resolves skill
paths from it once per session and passes exact paths to subagents.
