# ODD Task: Security Hardening Follow-ups

**Status:** PLANNED
**Type:** Security / Bugfix
**Area:** `serverapp` / `webapp`
**Created:** 2026-10-20
**Delivery strategy:** `ask-on-risk` (forecast > 400 authored lines)
**Test runner:** `npx jest` (serverapp), `npm test` (webapp) — test-first RED → GREEN applies

---

## Context & Motivation

La auditoría de legal-compliance cerró sus huecos, pero el trabajo dejó cuatro cosas abiertas que son de seguridad, no de compliance. La más grave es una **credencial pública** sobre cuentas reales.

## Specs

### S1: La contraseña temporal conocida no puede seguir viva
> Del reporte de seguridad: "32 de 37 pacientes con la contraseña temporal conocida (Nutringest2026!), cuyo hash está en el historial de git (commits 12b0d33 y e1e915b). Verificado ahora mismo en la DB. Y el propio commit dice que esa migración ya corrió en prod."

- Ninguna cuenta debe quedar con una contraseña conocida por el público.
- La migración `20260903000000_reset_patient_passwords` (que puso esa misma contraseña a todos los pacientes) **nunca debe volver a aplicarse** y no debe quedar registrada en el repo.
- El hash presente en el historial de git es un dato comprometido: hay que decidir si se reescribe el historial.

### S2: Un tenant sin membresía no puede leer estadísticas globales
> "un tenant sin membresía resuelve `organizationId = null` y `getDashboardStats(null)` lo interpreta como platform-wide → lee estadísticas globales"

- `GET /api/dashboard/stats` con `organizationId = null` **no** puede devolver datos de la plataforma a un usuario que no es administrador global.
- La autorización debe apoyarse en el rol, no en la ausencia de organización.

### S3: La red de seguridad de las rutas de aislamiento debe estar viva
> "9 de los 12 tests rotos cubren justo las rutas de seguridad: el mock de Prisma del spec de entitlements no tiene `subscription` ni `organizationMember` (o sea, el spec de T13 no ejercita el check de membresía), y el spec del dashboard construye el controller con 5 de 6 argumentos (el scoping no está cubierto)."

- El spec de aislamiento de `EntitlementService` debe **ejercitar** el check de membresía ACTIVE (hoy el mock no puede).
- El spec de `DashboardController` debe construir el controller con su aridad real y cubrir el scoping por organización.
- `permission.service.spec.ts` (1 fallo) y `entitlement.db.integration.spec.ts` (3 fallos) deben quedar explicados: o arreglados, o documentados como deuda con su premisa real.

### S4: Los tokens de un solo uso no se guardan en claro
- `emailVerificationToken` y `resetPasswordToken` se guardan **en claro** en `User`. Un dump de la DB permite usable directamente.
- El código de recuperación es de **6 dígitos** (1M de combinaciones) y vive 1 hora; con throttling es atacable.
- La regla para el trabajo nuevo (Fase 2): el token se guarda **hasheado** y es de un solo uso.

## Tasks

### Fase 1 — Cierre local
- [x] **T26** · S2 · inline · `getDashboardStats` no debe devolver stats globales a un tenant sin membresía (hoy `organizationId=null` ⇒ platform-wide) · commit: 263da8e (misma regla que `resolveAdoptionScope`: solo un rol global lee stats globales; un tenant sin organización recibe 403. RED→GREEN con 4 tests nuevos. Además se corrigió un test flaky pre-existente: `auth.service.spec.ts` armaba la fecha de nacimiento con `setFullYear`+`toISOString()` y al cruzar a 2008 el huso local venezolano pasaba de -04:00 a -04:30 → la fecha se corría un día y el test 'exactly 18' fallaba por zona horaria desde las 19:30 locales — commit 4e94395)
- [x] **T27** · S3 · inline · `entitlement.service.integration.spec.ts`: el mock de Prisma debe incluir `subscription` y `organizationMember` para que el spec ejercite el check de membresía (4 tests) · commit: 83c2f72 (el mock pasó a ser una mini base en memoria; **la regla S6 era inalcanzable**, no solo no asertada: el código reventaba antes de llegar al check. 3 tests nuevos: org ajena degrada a personal y su id nunca llega a la query, miembro ACTIVE resuelve su org, sin membresía → personal)
- [x] **T28** · S3 · inline · `dashboard.controller.adoption.spec.ts`: construir el controller con su aridad real (6 args) y cubrir el scoping (5 tests) · commit: 62bde63 (el mock de `organizationMember` ahora honra la fixture y el de entitlements devuelve los permisos del llamador — que es lo que lee el gate: `entitlements.permissions ?? user.permits.list`, y un array vacío NO es nullish, así que el mock silenciosamente rechazaba todos los caminos felices. 2 casos nuevos: membresía INACTIVE y rechazo de alcance global en la ruta de depth)
- [x] **T29** · S3 · inline · `entitlement.db.integration.spec.ts`: la premisa del test cross-tenant (el primer usuario es miembro ACTIVE de la primera org) debe satisfied por el propio test, no por el azar de la DB (3 tests) · commit: 91ce635 (el suite ahora crea sus propias fixtures dentro de la transacción con rollback: organization, user, membresía ACTIVE y una org ajena real. Conteos de filas verificados sin cambios después de la corrida)
- [x] **T30** · S3 · inline · `permission.service.spec.ts`: resolver o documentar el fallo de gating por plan-name (1 test) · commit: 41aa4b6 (**no era un bug de producto**: la expectativa estaba desactualizada desde `1b81d8b`, que hizo que `PermissionService` pase la identidad del plan al normalizador compartido; `subscription-plan-content.util.ts` resuelve `DEFAULT_PLAN_ENTITLEMENTS` por el nombre del plan cuando el plan no declara keys, y ese fallback lo pinea su propio spec verde. El spec ahora fija lo que realmente ocurre: el nombre nunca se usa COMO key, las keys declaradas ganan, y el fallback por tier aplica cuando el plan no declara ninguna)
- [ ] **T31** · S4 · inline · Guardar los tokens de verificación y de reset **hasheados** y usar un token aleatorio largo en vez del código de 6 dígitos · commit: — (rompe los tokens en vuelo; es aceptable)

- [ ] **T32** · S3 · inline · El gating por plan sigue resolviendo el tier por el **nombre** del plan (`subscription-plan-content.util.ts:108-111`: `DEFAULT_PLAN_ENTITLEMENTS[normalizedKey]` y además cualquier nombre que *contenga* "PREMIUM"/"CLINIC"). Un plan sin `grants` declarados pero con nombre "Premium" otorga `PREMIUM_ACCESS`/`COMMUNITY_ACCESS` sin fila de entitlement. Decisión del usuario: (a) eliminar el fallback por nombre y sembrar `grants` explícitos en los planes existentes, o (b) dejarlo y corregir el comentario de `permission.service.ts:100-103`. Toca item 2 (seguridad) · commit: —

### Fase 2 — Publicación (operación, no código)
- [ ] **T32** · S1 · decisión usuario · Historial de git: reescribir (`git filter-repo`) o dejar el hash documentado. Reescribir rompe clones y PRs abiertos · commit: —
- [ ] **T33** · S1 · operación · Invitar a los 32 pacientes con la contraseña temporal a definir la suya (flujo de la Fase 2 de `patient-onboarding.md`); hasta entonces, rotar su contraseña a un valor aleatorio y forzar el cambio · commit: —
- [ ] **T34** · S1 · operación · Verificar en **producción** si la migración corrió y cuántos pacientes quedaron con la contraseña temporal · commit: —
- [ ] **T35** · S1 · operación · Publicar en producción: migraciones (`migrate deploy`) + documentos legales (`npm run seed:legal` desde un checkout) · commit: —

## Route declaration

| Trigger | Aplicación |
| --- | --- |
| Writer | T31 (toca auth compartido) y las correcciones de spec de T27-T30 son unidades distintas con superficies disjuntas |
| Verification (alto riesgo) | T26 (item 2 seguridad), T31 (item 2), T33 (item 1 datos) |
| Tracking | Este documento + mirror Engram + commits por unidad |

## Log

- **L1** (2026-10-20, verbatim del usuario): "🔴 CRÍTICO: 32 de 37 pacientes con la contraseña temporal conocida (Nutringest2026!), cuyo hash está en el historial de git (commits 12b0d33 y e1e915b). Verificado ahora mismo en la DB. Y el propio commit dice que esa migración ya corrió en prod. Eso no es una deuda de dev: es una credencial pública sobre cuentas reales. Es lo único que me deja dormir mal."
- **L2** (2026-10-20, verbatim): "🟠 ALTO — T25: un tenant sin membresía resuelve organizationId = null y getDashboardStats(null) lo interpreta como platform-wide → lee estadísticas globales. Lo abrí como tarea, no lo toqué."
- **L3** (2026-10-20, verbatim): "🟡 MEDIO — 9 de los 12 tests rotos cubren justo las rutas de seguridad: el mock de Prisma del spec de entitlements no tiene subscription ni organizationMember (o sea, el spec de T13 no ejercita el check de membresía), y el spec del dashboard construye el controller con 5 de 6 argumentos (el scoping no está cubierto)."
- **L4** (2026-10-20, verbatim): "🟡 MEDIO: los docs legales publicados con placeholders ([RIF], [RAZÓN SOCIAL]) → exposición legal, no de seguridad, pero es lo que ve un usuario."
- **L5** (2026-10-20): T26 cerrado. El endpoint `GET /api/dashboard/stats` resolvía `organizationId=null` para un tenant sin organización y `admin-analytics.service.ts:27` interpreta ese `null` como *platform-wide* → el tenant leía estadísticas globales de la plataforma. Fix: espejo de la regla que `resolveAdoptionScope` ya aplicaba en el mismo controller (403 "Workspace context required"). El rol global (ADMIN/SUPERADMIN) conserva el acceso platform-wide, que es su propósito. **Descubrimiento lateral**: dos expectativas del spec de B1 pineaban la fuga (`getDashboardStats` con `null`); se actualizaron conservando su intención original (que el id de organización ajeno nunca llegue a una query). **Bug pre-existente encontrado por el camino**: `auth.service.spec.ts` fallaba a partir de las 19:30 hora local porque el fixture de fecha de nacimiento usaba `setFullYear`+`toISOString()` y el huso venezolano cambió de -04:00 a -04:30 al cruzar a 2008; era un test flaky por zona horaria, no un fallo del gate. Fixture ahora en UTC. Baseline tras T26: 4 suites / 12 fallos pre-existentes (los mismos), 626 tests pasando (+4), typecheck 67.
- **L6** (2026-10-20): **T27-T30 cerradas — la suite del serverapp queda VERDE (78 suites / 644 tests / 0 fallos).** Los 12 fallos pre-existentes eran todos defectos de fixture, ninguno un bug de producto (verificado uno por uno con RED→GREEN). Dos aprendizajes que quedan como regla del repo: (1) un spec de integración con BD **no puede tomar "la primera fila de la base"** — hereda el estado de esa base: el primer usuario no tiene membresía ACTIVE, la org solicitada degrada al contexto personal y la aserción falla por una razón ajena al código probado; (2) un mock de Nest que construye el controller con menos argumentos de los que declara falla con un `TypeError` engañoso en vez de la excepción esperada. **Hallazgo nuevo (no era un blocker)**: el gating por plan sigue dependiendo del **nombre** del plan — `subscription-plan-content.util.ts:108-111` resuelve `DEFAULT_PLAN_ENTITLEMENTS` por nombre y además acepta cualquier nombre que *contenga* "PREMIUM" o "CLINIC". Consecuencia: un plan sin `grants` declarados cuyo nombre contenga "PREMIUM" otorga `PREMIUM_ACCESS`, `COMMUNITY_ACCESS` y el resto del tier sin ninguna fila de entitlement. El comentario de `permission.service.ts:100-103` ("NEVER the plan name") quedó desactualizado. **Registrado como T32 — es un cambio de comportamiento de producto (los planes sin grants perderían acceso) y por eso lo decide el usuario, no el agente.**
