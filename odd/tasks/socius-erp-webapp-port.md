# ODD Task: Socius ERP — Port del backend al frontend (webapp)

**Status:** IN PROGRESS
**Type:** Feature / Frontend
**Area:** `webapp` (Next.js 16 App Router + React 19 + Tailwind 4 + Zustand + TanStack Query)
**Branch:** `feat/webapp-erp` (desde `main`, ya sincronizado con `origin/main`)
**Delivery strategy:** `single-pr` — unidades commiteadas en la rama; push/PR solo si el usuario lo pide
**Test runner:** `npm run typecheck` (baseline medido: **62 errores** → objetivo 0) y `npm test` (vitest: **16 suites / 161 tests**, deben seguir verdes). Nunca `npm run build`.

---

## Context & Motivation

El backend de Socius ERP está cerrado y verificado (doc `odd/tasks/socius-erp-backend-ops.md`).
El frontend es un híbrido: navegación ya traída por el backend y páginas de nutrición que
llaman endpoints que ya no existen. Fase A (auditoría read-only) ya midió el estado real:

- `npm ci` necesario: la copia no tenía `node_modules` desde la fase 1.
- `npm run typecheck` → **62 errores** (49 `TS2307` por imports a `@/features/nutringest|calculadora|marketplace` que no existen en disco, 12 `TS7006`, 1 `TS2769`).
- `npm test` → **16 suites / 161 tests verdes**.
- `AGENTS.md` declara baseline 0 para webapp → **desactualizado**, se corrige en el cierre.
- El sidebar ya consume `GET /api/dashboard/sidebar` (backend manda); `sidebarGroups.ts` tiene cero importadores.
- `api.client.ts` (axios) ya manda `X-Workspace-Id` cuando el workspace es de organización.
- El sidebar del backend ya apunta a `/dashboard/pos|ventas|productos|...` y esas páginas **no existen**: el catch-all `[entity]` las ahoga hoy.

## Specs

### S1: El frontend compila de nuevo (reparación sin cambio de comportamiento vivo)
> "Procede" (sobre un plan cuyo primer paso es "Reparación + poda: Cero los 62 errores")

**Aceptación:** `npm run typecheck` → **0 errores**. Los imports a `@/features/nutringest/*`,
`@/features/calculadora/*` y `@/features/marketplace/*` se re-apuntan a los módulos que sí
existen (`features/organization`, `features/dashboard`, etc.) o se eliminan junto con su uso;
los `TS7006`/`TS2769` se resuelven tipando, nunca con `any` nuevo.

### S2: Se elimina la nutrición huérfana
Rutas sin backend (lista de la auditoría, con evidencia `path:line`): `dashboard/patients` y sus
6 subrutas, `dashboard/plans/{create,[id],[id]/edit}`, `dashboard/adoption`,
`dashboard/calendar` (mock estático), `dashboard/crud` (mock), la rama `universities` de
`[entity]`, el cupón de campus en `register`, y los endpoints muertos que usan:
`/api/patients*`, `/api/campus/validate-coupon/*`, `/api/universities*`, `/api/portfolio/*`,
`/api/dashboard/adoption/*`, `/api/consultations`, `/api/institutional-calculations/*`,
`/api/organizations/:id/agenda/history`, `/api/user/subscriptions/:id/{update,delete}`,
`/user/location` (le falta el prefijo `/api`).

**Aceptación:** ninguna ruta o import del frontend apunta a un endpoint inexistente;
`typecheck` 0 y `npm test` verde después de cada rebanada.

### S3: Una sola fuente de navegación y configuración
**Aceptación:** `Sidebar.tsx` sigue mandando (ya es backend-driven) y `sidebarGroups.ts`
(muerto) se elimina; la app lee `GET /api/settings` para los checks del tenant; el header
`X-Workspace-Id` viaja en las llamadas autenticadas (ya lo hace: `api.client.ts`) y se prueba
con sesión de un tenant real.

### S4: Configuración del negocio (port de S1/S3 del backend)
Pantalla con los checks reales: `cash.shiftControl`, monedas (`showUSD/showVES/showUSDT/showBCV/showEUR`),
tipos de entrega, agencias habilitadas, `delivery.enabled` + `feeUSD`, `routes.enabled`.
**Aceptación:** leer con `GET /api/settings`, escribir con `PATCH`, y el cambio de
`routes.enabled` hace aparecer/desaparecer el ítem "Rutas de entrega" (contrato ya verificado
en el backend).

### S5: Caja (port de S2 del backend)
Registros, apertura/cierre de turno cuando `shiftControl` está activo, y el cuadre diario
(`/api/cash/daily`) cuando está desactivado.
**Aceptación:** la venta desde el POS funciona en ambos modos.

### S6: POS y Ventas con devoluciones (port de S7/S13 del backend)
Crear venta (cliente opcional, artículos, tasas congeladas), abonos con fecha real, listado,
anular y **devolución** (`POST /api/sales/:id/returns`) con el chequeo de cantidades del backend.
**Aceptación:** una venta emitida ve su devolución reflejada en stock (kardex) y en el saldo
del cliente; el reporte de devengo/cobro (`/api/sales/report`) es visible.

### S7: Inventario (port de S6 del backend)
Productos con estados, ajuste de stock con motivo/referencia, kardex por producto y catálogo
de categorías (solo lectura para el tenant).

### S8: Clientes y Proveedores (port de S3/S4 del backend)
CRUD rápido con búsqueda y saldo (cuentas por cobrar/pagar).

### S9: Pedidos y Envíos (port de S4/S7 del backend)
Bandeja con filtros por tipo de entrega, agencia, fecha y despachado; marcar envío con número
de seguimiento; catálogo de agencias (`/api/shipping-agencies`).

### S10: Rutas de entrega (port de S8 del backend)
Alta por día, asignar pedidos confirmados, marcar entregado/fallido, cerrar ruta — disponible
**solo** con `settings.routes.enabled`.

### S11: Planes y Sucursales (port de S9/S10 del backend)
Precios reales (Básico 9.99 / Avanzado 19.99 / Premium 34.99), add-ons (4.99 empleado,
9.99 sucursal) y alta de sucursales con la compuerta de capacidad del plan.

### S12: Tienda pública `/shop/[slug]`
Catálogo público (`GET /api/products/public?organization=`), carrito y `POST /api/orders/public`
con contacto obligatorio y tipo de entrega.

### S13: Cierre
`npm run typecheck` 0, `npm test` verdes (≥161), smoke HTTP contra el backend Docker, y
baseline de `AGENTS.md` corregido a 0 una vez logrado.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | — | inline | pending | rama `feat/webapp-erp` |
| T2 | S1 | inline | pending | — |
| T3 | S2 | inline | pending | — |
| T4 | S3 | inline | pending | — |
| T5 | S4 | inline | pending | — |
| T6 | S5 | inline | pending | — |
| T7 | S6 | inline | pending | — |
| T8 | S7 | inline | pending | — |
| T9 | S8 | inline | pending | — |
| T10 | S9 | inline | pending | — |
| T11 | S10 | inline | pending | — |
| T12 | S11 | inline | pending | — |
| T13 | S12 | inline | pending | — |
| T14 | S13 | inline | pending | cierre |

> Ruta: todo inline. Cada pantalla es una unidad de ~200-400 líneas siguiendo el patrón
> existente (`[entity]/page.tsx` + apiClient + useState), con su spec junto al código.

## Log

### L1 — Auditoría pedida (usuario, 2026-10-30)

> y planifica una auditoria de el front para subir nuestros cambios al front!

### L2 — Verde para arrancar (usuario, 2026-10-30)

> Procede, monta la lista de tareas aca, para ir viendo tu progreso

### L3 — Evidencia de la Fase A (auditoría, 2026-10-30)

- Remoto agregado y push: `origin = git@github.com:josesojo2828-tech/socious.git`, `origin/main = 8632280` (35 commits).
- `npm ci` → 569 paquetes; baseline medido: typecheck **62 errores** (49 TS2307 / 12 TS7006 / 1 TS2769), vitest **16/16 suites, 161 tests**.
- `AGENTS.md` afirma typecheck 0 para webapp → falso en esta copia; se corrige en T14.
- Hallazgos del mapa (explore `ses_e721802b2ffeVYImwwnYg4ALDK`): sidebar ya backend-driven,
  `sidebarGroups.ts` sin importadores, `api.client.ts` ya manda `X-Workspace-Id`, patrón CRUD a
  copiar en `[entity]/page.tsx` + `useAdminCrud.ts`, `src/app/api/*` no es proxy del backend.
