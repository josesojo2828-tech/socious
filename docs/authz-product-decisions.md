# Authz — decisiones de producto pendientes de confirmar

Contexto: durante el change `roles-permisos` se eliminó la clase de bugs de
`user.role` (código muerto) y se centralizó la autorización en `permits.name` +
`permits.list` (+ `userPermissions`). Quedaron **tres decisiones de producto** que
se resolvieron con un *default* razonable y que conviene confirmar formalmente.

## R3 — `isNutritionist` excluye `CLINIC_STAFF`

- **Definición actual:** un nutricionista es `permits.name === "USER"` (el permit
  `USER` se describe literalmente como *"User / Nutritionist Permit"* y el backend
  crea el `nutritionistProfile` solo para ese permit).
- **Limitación aceptada:** un profesional con permit `CLINIC_STAFF` que ejerza como
  nutricionista **queda excluido** de los chequeos de `isNutritionist` (p. ej. el
  tour del dashboard).
- **A confirmar:** ¿los `CLINIC_STAFF` que son nutricionistas deberían contar como
  tales? De ser así, extender `isNutritionist` para aceptarlos.

## R4 — KPI de nutricionistas por organización

- **Default actual:** el dashboard de clínica cuenta nutricionistas por
  `permits.name === "USER"` (tanto en la rama org como global de
  `admin-analytics.service.ts`).
- **Alternativa abierta:** contar por `OrganizationMember.role === "NUTRITIONIST"`.
- **A confirmar:** ¿cuál semántica quiere gerencia? (la primera cuenta *cuentas con
  permit de nutricionista*; la segunda cuenta *miembros con rol de nutricionista en
  la organización*).

## R5 — `"OWNER"` (eliminado)

- **Situación:** varias comparaciones usaban `"OWNER"`, que **no es un permit ni un
  rol** en ningún dominio (código muerto que nunca matcheaba).
- **Default aplicado:** se trató como admin (`ADMIN`/`SUPERADMIN`) y luego se
  eliminó el string. El efecto es que los admins ahora **sí** pueden moderar.
- **A confirmar:** que la intención original de `"OWNER"` era efectivamente
  admin/moderador.

## R1 — `userPermissions` ya se entrega (sin cambio de payload)

Verificado: `/user/me` y `/api/auth/login` ya exponen `permits` + `userPermissions`
(vía `DEFAULT_INCLUDE` → `format()` en `user.repository.ts`). No requirió cambios de
backend; solo un test de regresión.
