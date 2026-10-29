# Adoption Analytics — Timezone Model & Verification Checklist

Reference for the adoption dashboard (`dashboard-adopcion`): DAU/WAU/MAU,
dormant users, cohort retention, clinical funnel and feature depth.

## Timezone model (design decision DB)

| Layer | Choice |
| --- | --- |
| **Storage** | UTC. Adoption-relevant `DateTime` columns are `@db.Timestamptz(3)`; existing values were written as UTC and converted with `USING col AT TIME ZONE 'UTC'`. |
| **Bucket / metric TZ** | Business default `ADOPTION_TZ` env (default `America/Caracas`). Per-request override via the optional `?tz=` query param. |
| **Display** | The viewer's session timezone, rendered client-side (the page also offers a TZ selector). |
| **Bucketing SQL** | `date_trunc(unit, ts AT TIME ZONE :tz)`. Window boundaries are computed in LOCAL wall-clock and converted back with `AT TIME ZONE :tz`, so DST transitions are handled (a 7-day window across a DST change spans 167/169 real hours). |

Why: metrics stay stable/comparable (fixed default) while still allowing a
per-viewer override; storage stays UTC and unambiguous.

### Columns marked `timestamptz`

`UserActivityLog.createdAt`, `UserSession.startedAt/endedAt`, `Patient.createdAt`,
`Anamnesis.updatedAt`, `Anthropometry.date`, `Consultation.createdAt/scheduledAt`,
`NutritionalPlan.createdAt` (migration `20260928140000_adoption_timestamptz`).

### Configuration

```bash
# serverapp/.env
ADOPTION_TZ=America/Caracas
```

Resolution order in `AdoptionAnalyticsService.resolveTimezone`:
per-request `?tz=` → `ADOPTION_TZ` → `America/Caracas`.

## Endpoints & gating

Routes live on `DashboardController` under `/dashboard/api/adoption/*`
(`active-users`, `dormant`, `cohorts`, `funnel`, `depth`), guarded by
`SessionAuthGuard`.

- **Org scope** (default or `?scope=org`): requires `PERMIT_DASHBOARD` **and** a
  resolvable organization (workspace header or active membership). A tenant
  without an org is rejected (403) and NEVER falls back to global.
- **Global scope** (`?scope=global`): requires role `SUPERADMIN`/`ADMIN`
  (role check — no separate permit key). The scope must be explicit; there is no
  implicit admin fallback.
- Sidebar/tab entries are served by the backend (`DashboardService.getSidebarSections`
  / `getTabs`) with the same audience: `PERMIT_DASHBOARD` for org members, role
  for global admins.

## Verification checklist (task 7.2)

For sdd-verify. Each item must hold for **every** metric.

### 1. `isDemo` exclusion

- [ ] Telemetry metrics (DAU/WAU/MAU, dormant, cohorts) exclude `User.isDemo = true`
      at the SQL level (`u."isDemo" = false`).
- [ ] Clinical funnel excludes patients whose `createdBy`/`user` is demo, while
      keeping unlinked patients (`createdById: null` / `userId: null`).
- [ ] Feature depth excludes demo users for calculators (`User.isDemo`) and demo
      creators for menus/exchange lists.
- [ ] Empty-period / demo-only fixtures return **0**, not an error or `NaN`.

### 2. Tenant isolation

- [ ] Org A reads never include org B rows (strict `organizationId = A`).
- [ ] Org A reads never include `null`-org rows.
- [ ] Global reads include all orgs plus `null`-org rows, only for
      `SUPERADMIN`/`ADMIN`.
- [ ] A tenant read without a resolvable org throws (`MissingOrganizationScopeError`
      / 403) and never degrades to global.
- [ ] `CalculatorUsage` is scoped through `User`/`OrganizationMember`
      (`status = ACTIVE`) — never a cross-tenant count.

### 3. Zero-safe math

- [ ] Funnel conversion percentages are 0 when a denominator is 0 (no `NaN`/`Infinity`).
- [ ] Cohort `retention[i]` is 0 for empty cohorts; `retention[0]` is 100 for a
      non-empty cohort.
- [ ] Dormant report returns `{ days: 30, count: 0, users: [] }` with no query
      when there are no dormant users.
- [ ] `active-users` returns `{ tz, asOf, dau, wau, mau }` with numeric zeros on
      an empty period.

### 4. TZ correctness

- [ ] `?tz=` override wins over `ADOPTION_TZ`; blank override falls back to the env.
- [ ] Calendar buckets use `date_trunc(unit, ts AT TIME ZONE tz)` and DST-safe
      local-wall-clock boundaries.
- [ ] Dormant threshold is FIXED at 30 days; `windowDays` only bounds the outer
      lookback.

## Tests

| Layer | File |
| --- | --- |
| Unit (TZ override, funnel math, dormant 30d, demo, SQL) | `serverapp/src/modules/dashboard/service/adoption-analytics.service.spec.ts`, `serverapp/src/modules/activity/repositories/user-activity-log.adoption-calendar.spec.ts` |
| Integration (isolation, funnel filters, calculator join) | `serverapp/src/modules/dashboard/service/adoption-analytics.integration.spec.ts`, `serverapp/src/modules/dashboard/dashboard.controller.adoption.spec.ts` |
| Frontend hook (permit, scope switch, tz) | `webapp/src/features/dashboard/hooks/useAdoptionAnalytics.spec.ts` |
