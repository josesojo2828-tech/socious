# Archive menus and exchange lists

Objective: add an explicit archive state (`archivedAt`) to `Menu` and `ExchangeList`, expose it through a new "Archived" tab in both dashboard lists, block modifications/detail for archived records, and keep archived/deleted records out of the patient plan.
Branch: `feat/archive-menus-exchange-lists` (from `main`). Delivery: `ask-on-risk`, merge to `main` on user request.
Test runners: `serverapp` → `npx jest <path>` (focused) and `npm test` (suite); `webapp` → `npm test` (vitest). Typecheck: `npm run typecheck` in both.

## Specs

S1. Menus and exchange lists gain an explicit archive state persisted as `archivedAt DateTime?`. Archiving must not delete or unassign anything.
   - Exact user intent: "poder archivar y eliminar los menus y las listas de intercambios, para no eliminarlas directamente solo archivarlas".
   - Exact decision: "un menu eliminado el usuario no lo debe de ver, por eso creo que debemos agregar un tipo de archivedAt, para el archivado".

S2. Archived records are visible only from a new tab in each list.
   - Exact user intent: "si estan archivados, que se muestren en otra tab en las listas y los menus".
   - List contract: `includeArchived=true` returns only archived (`archivedAt != null AND deletedAt: null`); absent/false returns only active (`archivedAt: null AND deletedAt: null`).

S3. Archived records cannot be modified and their detail ("ficha") cannot be viewed.
   - Exact user intent: "estando archivado no se debe poder modificar ni ver la ficha".
   - Applies to update, unique/detail, and every nested mutation (menu items, condiments, image; exchange list items).

S4. Deleted records (`deletedAt != null`) are invisible everywhere: no tab, no metrics, no community feed, no patient plan.
   - Exact user intent: "un menu eliminado el usuario no lo debe de ver".

S5. Patients cannot see archived or deleted menus/exchange lists in their nutrition plan.
   - Exact user intent: "estando archivados los pacientes no pueden verlo en su plan de alimentacion".
   - Applies to every patient read path: plan detail, public plan, share token, shopping list, menu/exchange-list detail.

S6. Delete is only offered for already-archived records; the active list offers Archive, the archived tab offers Unarchive and Delete.
   - Exact user intent: "para no eliminarlas directamente solo archivarlas".

S7. Scope: server + webapp dashboard. Mobile UI is out of scope; the backend contract stays compatible with the existing mobile calls.

## Tasks

| ID | Specs | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T1 | S1, S4 | inline | done | `prisma/schema.prisma` (`archivedAt` + `@@index` on `Menu` and `ExchangeList`), migration `20261022000000_add_archived_at_menu_exchange_list`, `schema.types.ts`, both repositories expose `archivedAt` |
| T2 | S1, S2, S3 | inline | done | `menu.service.ts` (`archive`/`unarchive`/`findOwnedForLifecycle`, guards on `update`/`unique`/items/condiments/image, `includeArchived` in `getPaginate`), `menu.api.controller.ts` (`POST /:id/archive/api`, `POST /:id/unarchive/api`) |
| T3 | S1, S2, S3 | inline | done | same pattern in `exchange-list.service.ts` + `exchange-list.api.controller.ts` |
| T4 | S4, S5 | inline | done | `PLAN_DEFAULT_INCLUDE`, `nutritional-plan.repository.findPlanWithFoods`, `nutritional-plan.service.findByShareToken`, `patient.service` assign guards |
| T5 | S4 | inline | done | `community.service.ts` (all `Menu`/`ExchangeList` reads), `menu-metrics.service.ts`, `exchange-list-metrics.service.ts`, `adoption-analytics.service.ts`, `organization.service.ts` counts, `food.service.ts` category options |
| T6 | S1-S5 | inline | done | jest: 2 archive suites extended (19 new cases), new `nutritional-plan.service.spec.ts`. No DB-backed plan spec exists in this branch, so the plan filter is pinned at the query level |
| T7 | S2, S6 | inline | done | `dashboard/menu/page.tsx`, `dashboard/exchange-list/page.tsx` (tabs, archive/unarchive/delete row actions, `actionsOverride`), endpoints, i18n keys, optional `reload` third arg in `GenerateCrud` |
| T8 | all | inline | done | server typecheck 67 errors = baseline; webapp typecheck 0; webapp vitest 280/280; server suite 12 failures identical at HEAD (verified by stashing this work) |

## Log

L1 (original request, verbatim):
"Vamos a hacer la funcionalidad de poder archivar y eliminar los menus y las listas de intercambios, para no eliminarlas directamente solo archivarlas y que solo se visualice desde una nueva tab que seria igual en la lista de listas de intercambio o de menus respectivamente, estando archivado no se debe poder modificar ni ver la ficha, y estando archivados los pacientes no pueden verlo en su plan de alimentacion. Estos cambios que vamos a hacer van a main, pero como te dije hay otro agente trabajando, puedes hacer eso de forma limpia, solo planifica y luego codeamos"

L2 (decision, verbatim):
"ok, pero un menu eliminado el usuario no lo debe de ver, por eso creo que debemos agregar un tipo de archivedAt, para el archivado, si estan archivados, que se muestren en otra tab en las listas y los menus"

L3 (go, verbatim):
"dale bro, implementa eso"

L4 (findings, evidence):
- `Menu.deletedAt` at `serverapp/prisma/schema.prisma:824`, `ExchangeList.deletedAt` at `:890`. Today `delete` is already a soft delete (`menu.repository.ts:195`, `exchange-list.repository.ts:181`).
- Real gap: `menu.service.unique()` (`:779`), `menu.service.update()` (`:612`) and `exchange-list.service.update()` (`:417`) do not filter `deletedAt`, so deleted records are still editable/viewable.
- `GenerateCrud` already supports `tabs`, `actionsOverride`, `extraActions`, `onTabChange` (`webapp/src/shared/components/organisms/crud/generate-crud.types.ts:37-49`); the patients page is the reference implementation.
- Patient plan reads include `assignedMenus`/`assignedExchangeLists` without any archive filter (`nutritional-plan.service.ts` `findByShareToken`, `webapp/src/app/patient/shared/[id]/page.tsx:178,225`).
- Existing migrations must never be edited; new migration only (AGENTS.md).

L5 (implementation log, evidence):
- Three-state contract implemented exactly: active = `archivedAt: null, deletedAt: null`; archived = `archivedAt != null, deletedAt: null`; deleted = `deletedAt != null` (invisible everywhere).
- `includeArchived=true` lists only archived; `false`/absent lists only active. The webapp list hook drops `false` values, which is why the active tab sends nothing.
- Server `delete` stays permissive (accepts an archived record, rejects a deleted one) so `deleteMenu`/`deleteExchangeList` in `nutringest_mobile` keep working. S6 ("no direct delete") is enforced in the dashboard, where the active tab hides the delete action and only the archived tab shows Unarchive + Delete.
- Detail ("ficha") is closed for archived records on both sides: `findOneWithItems` filters `archivedAt: null`, and the archived tab hides view/update.
- `GenerateCrud.extraActions` gained an optional third `reload` argument so a successful archive/unarchive/delete refreshes the current tab instead of leaving a stale row. Existing two-argument callers (patients page) are unaffected.

L6 (verification):
- `serverapp`: `npx jest` focused suites green; full suite 539 passed / 12 failed / 11 skipped, and the same 12 failures reproduce with this work stashed at HEAD (`permission.service`, `entitlement.service.integration`, `auth.service`, `dashboard.controller.adoption`) — pre-existing, not caused here.
- `serverapp`: `npm run typecheck` = 67 errors, equal to the documented baseline.
- `webapp`: `npm run typecheck` clean, `npm test` 280/280.
- Not run: DB-backed integration (this worktree has no `.env`, so `DATABASE_URL` is unset and the DB suite self-skips).

L7 (commits):
- `907ad8a` feat(menu): add archivedAt state to menus and exchange lists — schema, migration, shared types, repositories, this document.
- `51344ae` feat(menu): archive lifecycle endpoints and archived-record filtering — services, controllers, patient/community/metrics/adoption/organization/food filters, unit tests.
- `46422b8` feat(webapp): archived tabs for menus and exchange lists — dashboard pages, endpoints, i18n keys, `GenerateCrud` reload arg.
