# ODD Task: Socius ERP — Configuración de tenant, envíos, rutas y planes

**Status:** IN PROGRESS — T1-T3 y T9 cerrados (caja opcional, config del tenant, devoluciones). Pendientes: F2 envíos, F3 rutas, F4 planes, F5 subcursales, cierre.
**Type:** Feature / Backend
**Area:** `serverapp`
**Branch:** `feat/tenant-ops` (desde `main`)
**Delivery strategy:** `single-pr` — unidades de trabajo commiteadas en la rama; push/PR solo si el usuario lo pide
**Test runner:** `npx jest` (serverapp). Typecheck baseline: **0 errores** (midido al cerrar la fase backend anterior, commit `bf0099c`).

---

## Context & Motivation

Fase de negocio posterior al backend cerrado: el tenant configura su operación con checks
(caja opcional, monedas visibles, tipos de entrega, agencias, rutas), el pedido público cobra
forma (contacto obligatorio, envío/delivery), se agregan rutas de entrega y se despliega la
oferta comercial de tres planes sobre la infra de `SubscriptionPlan`/`AddOn`/`Entitlement`
que **ya existe**. Subcursales resueltas con `Branch` + `branchId` nullable (decisión del usuario, ver L5).

## Specs

> Los fragments del usuario están verbatim en su idioma original (es-LA).

### S1: Configuraciones por tenant
El dueño configura su operación desde un panel de configuración con checks, todo resuelto por organización.

> "Podemos implementar unas configuraciones por el tenant, y que de ahi vean todo el tema de cuadre por caja y todo eso asi habilitado, y asi?"

**Aceptación:** `Organization.settings` (Json, merge con defaults) + `GET/PATCH /api/settings`
resuelto por `x-workspace-id`; solo `OWNER`/`ADMIN` de la organización (o rol global) puede escribir;
cualquier miembro autenticado puede leer; claves desconocidas se descartan.

### S2: Caja opcional (emprendedores vs comercios establecidos)
Debe funcionar **sin** apertura/cierre de caja: la caja siempre activa.

> "quiero que tambien funcione sin la caja, ya que la caja con aprtura y cierre seria para comercios mas establecidos pero para emprendedores es menos util eso, es mejor tener la caja siempre activa"

**Aceptación:** `settings.cash.shiftControl = false` → se crean ventas **sin** `cashShiftId` y
las aperturas/cierres de turno no son exigidos; con `true` se comporta como hoy. El cuadre
diario queda disponible como resumen (`GET /api/cash/daily?date=`) cuando el turno está apagado.

### S3: Moneda principal y monedas visibles (USD, VES, USDT, BCV, EUR)
> "y que ahi configure la moneda principal, y checks de la moneda que quiera mostrar USDT (binance), BCV, EURO, y asi"

**Aceptación:** `Organization.defaultCurrency` sigue siendo la moneda base; las claves de
visibilidad (`showUSD`, `showVES`, `showUSDT`, `showBCV`, `showEUR`) viven en settings y controlan
**solo la presentación**: el almacenamiento siempre persiste USD/VES/USDT (S1 de la fase anterior).

### S4: Envíos — agencias como semilla y checks de configuración
> "seria tipo, tener agencias de envio (montalas como datos semilla zoom y mrw) y que el cliente al hacer el pedido pueda agregar si quiere envio, entrega, coordinar por ws (por defecto) y asi (que mostrar aca en los tipos tambien debe estar en las configuraciones, con checks) (las agencias de envio tambien deben de estar en las configuraciones, con checks)"

**Aceptación:** semilla `ShippingAgency` con **ZOOM** y **MRW** (registro global, solo la
plataforma lo mantiene); `settings.fulfillment.enabledTypes` con checks
(`PICKUP`/`DELIVERY`/`SHIPPING`), `settings.shipping.enabledAgencies` con checks por agencia, y
`coordination` con default `WHATSAPP`. El checkout público solo ofrece los tipos habilitados.

### S5: Contacto obligatorio en el pedido y vínculo con Client
> "quiero que los clientes lo puedan hacer, pero que antes de realizarlo ellos agreguen que si su nombre, y correo y asi, para poder enlazarlo con los clientes que ya tenemos"

**Aceptación:** el pedido público exige `customerName` + `customerEmail` (o `customerPhone`);
se busca el `Client` existente por email y después por teléfono → si hay match se guarda
`clientId`; si no hay match se crea un `Client` con la nota "Creado desde pedido web" (supuesto, L7).

### S6: Delivery como opción de retiro, con monto configurable
> "tambien agregar el delivery, en las opciones de retiro. el monto del delivery variaria, pero puede estar en las configuraciones tambien"

> "claro, esto de hacer envio deben estar en configuraciones para trabajar por checks, en la parte de configuraciones. check para delivery, check para envios y asi"

**Aceptación:** `settings.delivery.enabled` + `settings.delivery.feeUSD`; cuando el pedido
elige `DELIVERY` se le aplica ese monto (`Order.deliveryFeeUSD`) y queda congelado en el pedido.

### S7: El dueño ve sus pedidos y qué enviar por agencia
> "obviamente con esto consideremos que mi cliente (el dueño de la tienda) pueda ver que pedidos tiene, y ver que tiene que enviar por agencias y asi."

**Aceptación:** listado de pedidos filtrable por `fulfillmentType`, agencia y fecha; el detalle
muestra la agencia/tipo y el estado de envío.

### S8: Rutas de entrega por día, configurables
> "por ejemplo, si mi cliente hace entregas un mismo dia, por ejemplo, el sabado va a realizar entregas, entonces que el pueda crear una ruta con los pedidos a entragar."

> "esto para trabajar por ruta tambien debe ser configurable, y eso habilita una opcion en el sidebar para crear ruta o algo asi."

**Aceptación:** `DeliveryRoute` (org, fecha, estado, notas) + `DeliveryRouteItem` (pedido,
orden, estado `PENDING/DELIVERED/FAILED`, `deliveredAt`); CRUD con pedido por fecha;
`settings.routes.enabled = true` agrega el ítem de sidebar "Rutas"; deshabilitado ni el ítem
ni el endpoint responden (409 con mensaje claro).

### S9: Tres planes con precios exactos
> **Básico - 9.99**
> clientes, proveedores, categorias, productos, caja, ventas, compras a credito

> **Avanzado - 19.99**
> Basico+, envios, pedidos, catalogo online, calculos en multiple moneda, delivery, ruta

> **Premium - 34.99**
> Avanzado+, extender subcrusales (2), agregar empleados (2 * subcursal).
> + 4.99 * empleado
> + 9.99 * subcursal (subcursal trae 2 empleados por defecto).

**Aceptación:** planes sembrados con esos precios en USD; `Module` keys nuevas
(`ORDERS`, `CATALOG_ONLINE`, `SHIPPING`, `ROUTES`) y grants por plan que alimentan el
`entitlements.modules` que ya gatea el sidebar; add-ons `EXTRA_EMPLOYEE` (4.99) y
`EXTRA_BRANCH` (9.99) facturados por `quantity` en `InvoiceLine`.

### S10: Sucursal por defecto oculta y asientos
> "Considerando esto, por defecto los usuarios deben de tener una subcursal, para no tener problemas al momento que quieran escalar a otro plan claro esto no se le mostrara, para que todo quede bajo cuerdas."

**Aceptación:** cada organización nueva recibe una `Branch` con `isDefault = true` **oculta** en
la UI; `branchId` nullable en `Sale`, `Order`, `CashRegister`, `CashShift`, `Purchase` y
`StockMovement` con backfill de las filas existentes a esa sucursal.

### S11: Asientos por plan, habilitados desde el dashboard admin
> "Los calculos para + empleados aplican para todos los planes, pero se les habilita la opcion via dashboard administrativo"

**Aceptación:** el límite de miembros (`Organization.maxSeats`) sale del plan; el add-on
`EXTRA_EMPLOYEE` lo extiende; el alta/retiro desde el dashboard administrativo funciona vía
`Entitlement` (ya existe).

### S12: Fuera de alcance esta fase
> "es esto por ahora, ya que a futuro vamos a gestionar turnos y todo eso."

Turnos de empleados, facturación real con pasarela y frontend quedan fuera de este documento.

### S13: Devoluciones de venta
> "tmabien monta por ahi el tema de las devoluciones."

**Aceptación:** devolución parcial o total de una venta con documento propio
(`DEV-00001`, numeración por tenant): valida que las cantidades devueltas no
superen lo vendido **menos lo ya devuelto**, restaura el stock por kardex
(`RETURN`), reduce el saldo del cliente sin dejarlo negativo, congela las
mismas tasas de la venta que revierte y acepta un método de reintegro; si se
indica turno de caja (y el control de caja está activo) el reintegro se
registra como `EXPENSE` en la caja del turno. Los pedidos nunca se devuelven
(son previos a la venta). Devoluciones a proveedor: fuera de esta unidad
(ver L7).

---

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | — | inline | done | `7fd034e` (rama + doc del plan) |
| T2 | S1, S3 | inline | done | `4a487f6` (settings del tenant) |
| T3 | S2 | inline | done | `958c836` (caja opcional + cuadre diario) |
| T4 | S4, S5, S6, S7 | inline | pending | — |
| T5 | S8 | inline | pending | — |
| T6 | S9, S11 | inline | pending | — |
| T7 | S10 | inline | pending | — |
| T9 | S13 | inline | done | `e2f1b21` (devoluciones de venta) |
| T8 | Todos | inline | pending | cierre y verificación |

> Ruta: todo inline. Cada unidad es de ~200-400 líneas autorizadas con el patrón ya
> establecido en la fase anterior (scope por `OrganizationScopeService`, DTO con
> class-validator, spec junto al service), así que la regla Writer no se dispara.

---

## Log

### L1 — Requerimiento original (usuario, 2026-10-30)

> ok, el tema de la caja, es algo ambiguo si lo quiero, pero, quiero que tambien funcione sin la caja, ya que la caja con aprtura y cierre seria para comercios mas establecidos pero para emprendedores es menos util eso, es mejor tener la caja siempre activa.
>
> Podemos implementar unas configuraciones por el tenant, y que de ahi vean todo el tema de cuadre por caja y todo eso asi habilitado, y asi? y que ahi configure la moneda principal, y checks de la moneda que quiera mostrar USDT (binance), BCV, EURO, y asi
>
> -----
>
> y el tema de los pedidos, que los clientes lo puedan hacer, pero que antes de realizarlo ellos agreguen que si su nombre, y correo y asi, para poder enlazarlo con los clientes que ya tenemos
>
> tambien agreguemos de una el tema de el envio, seria tipo, tener agencias de envio (montalas como datos semilla zoom y mrw) y que el cliente al hacer el pedido pueda agregar si quiere envio, entrega, coordinar por ws (por defecto) y asi (que mostrar aca en los tipos tambien debe estar en las configuraciones, con checks) (las agencias de envio tambien deben de estar en las configuraciones, con checks)
>
> Obviamente con esto consideremos que mi cliente (el dueño de la tienda) pueda ver que pedidos tiene, y ver que tiene que enviar por agencias y asi.
>
> tambien agregar el delivery, en las opciones de retiro. el monto del delivery variaria, pero puede estar en las configuraciones tambien.
>
> claro, esto de hacer envio deben estar en configuraciones para trabajar por checks, en la parte de configuraciones. check para delivery, check para envios y asi.
>
> -----
>
> tambien vamos a agregar algo como ruta de entrega, por ejemplo, si mi cliente hace entregas un mismo dia, por ejemplo, el sabado va a realizar entregas, entonces que el pueda crear una ruta con los pedidos a entragar.
>
> esto para trabajar por ruta tambien debe ser configurable, y eso habilita una opcion en el sidebar para crear ruta o algo asi.
>
> -----
>
> arma una planificacion para abordar eso de una vez que estamos en el backend.

### L2 — Oferta de planes (usuario, 2026-10-30)

> y para esto quiero que se para otro plan, entonces seria:
>
> - Basico - 9.99
> clientes, proveedores, categorias, productos, caja, ventas, compras a credito
>
> - Avanzado - 19.99
> Basico+, envios, pedidos, catalogo online, calculos en multiple moneda, delivery, ruta
>
> - Premium - 34.99
> Avanzado+, extender subcrusales (2), agregar empleados (2 * subcursal).
> + 4.99 * empleado
> + 9.99 * subcursal (subcursal trae 2 empleados por defecto).
>
> Considerando esto, por defecto los usuarios deben de tener una subcursal, para no tener problemas al momento que quieran escalar a otro plan claro esto no se le mostrara, para que todo quede bajo cuerdas.
>
> Los calculos para + empleados aplican para todos los planes, pero se les habilita la opcion via dashboard administrativo
>
> -----
>
> es esto por ahora, ya que a futuro vamos a gestionar turnos y todo eso.

### L3 — Decisión de diseño (usuario, 2026-10-30)

Modelo de subcursales elegido de entre tres opciones presentadas:

> **Tabla Branch + branchId (Recomendado)**

Modelo `Branch` propio por negocio con `branchId` opcional en los documentos operativos y
backfill a la sucursal por defecto; catálogo de productos/clientes compartido entre sucursales.

### L4 — Aprobación (usuario, 2026-10-30)

> Me parece perfecto, procede con eso

### L6 — Devoluciones (usuario, 2026-10-30)

> tmabien monta por ahi el tema de las devoluciones.

### L7 — Supuestos adoptados (vetoables, declarados antes de implementar)

- Catálogo (productos, clientes, proveedores) **compartido** entre sucursales; solo stock,
  caja, ventas y pedidos se scoping por `branchId`.
- Un pedido público sin vínculo **crea** el `Client` (nota "Creado desde pedido web").
- Coordinación por defecto en envíos: `WHATSAPP`.
- Config del tenant como `Organization.settings Json` + merge con defaults (patrón de
  `currencyVisibility`), no una tabla nueva.
