# ODD Task: Socius ERP Core Modules

**Status:** **FASE BACKEND CERRADA.** Typecheck 0 errores, 68/68 suites y 557/557 tests en verde, API viva en Docker (`socius_dev_backend`, puerto 3005) verificada por HTTP de punta a punta. Queda la Fase frontend (webapp).
**Type:** Feature / Backend
**Area:** `serverapp` (NestJS + Prisma + PostgreSQL)
**Branch:** `feat/socius-erp-core`
**Delivery strategy:** `auto-chain` (backend only; no PR until user asks)
**Test runner:** `npx jest` (serverapp). Typecheck baseline: `npm run typecheck` = 67 errors at `37172e8`; same count = no regression.

---

## Specs

### S1: Multi-moneda con tasa congelada
Todos los montos se persisten en las tres monedas (`totalUSD`, `totalVES`, `totalUSDT`) y cada venta/compra/abono guarda el snapshot `rateBcv` / `rateUsdt` del momento. La moneda base (`Organization.defaultCurrency`) y la visibilidad (`Organization.currencyVisibility`) son configurables y solo afectan la presentación, nunca el cálculo ni el almacenamiento.

> "La moneda principal debe ser configurable, asi como configurar si quiere ver los calculos y eso, de igual forma se almacenan esos datos en todas las monedas, el permiso lo que hace es para mostrarlas."

Semántica de tasas (confirmada en `exchange.types.ts`): `rateBcv` = VES por USD, `rateUsdt` = VES por USDT.
- `totalVES = totalUSD × rateBcv`
- `totalUSDT = totalVES ÷ rateUsdt`

### S2: Métodos de pago de negocio
Catálogo canónico de métodos de cobro: `CASH_USD`, `CASH_VES`, `PAGO_MOVIL`, `TRANSFER`, `ZELLE`, `USDT_BINANCE`, `CARD`, `OTHER`. Cada abono guarda `paymentMethod`, `currency` original y montos normalizados.

### S3: Clientes rápidos
Nombre + contacto. Campos opcionales: `taxId`, `email`, `phone`, `address`, `city`, `state`, `notes`. `creditLimitUSD` y `currentBalanceUSD` por cliente, aislado por organización.

### S4: Proveedores rápidos
Nombre + contacto obligatorio, ubicación opcional. `currentBalanceUSD` como cuenta por pagar.

### S5: Categorías y subcategorías generales
Jerarquía padre/hijo. Las categorías `isSystem: true` (semilla global, `organizationId = null`) son de **solo lectura** para tenants; únicamente `SUPERADMIN` puede crearlas, editarlas o borrarlas.

> "Categorias y subcategorias (generales, los usuarios normales (mis clientes) no las pueden manipular)"

### S6: Productos con estado y visibilidad pública
Estados `ACTIVE | INACTIVE | OUT_OF_STOCK | ON_SALE`. `isPublic` decide si aparece en el catálogo público. `isService` excluye el producto del control de stock. Todo cambio de stock genera un `StockMovement` inmutable (Kardex) con `previousStock` / `newStock`.

### S7: Ventas con devengo vs. cobro
La venta conserva su `issueDate` (enero) y su `paymentStatus` (`UNPAID | PARTIAL | PAID`). Cada `SalePayment` guarda su `paidAt` real (mayo) y queda atado a la venta de enero. Los reportes separan ventas emitidas por mes de cobros recibidos por mes.

### S8: Compras a proveedores a crédito
`Purchase` con `issueDate`, `dueDate`, `deliveryDate`. Al recibir (`RECEIVED`) genera entradas de stock. `PurchasePayment` con `paidAt` real y saldo por pagar al proveedor.

### S9: Pedidos web sin reserva de stock
El catálogo público se resuelve por `Organization.slug`. El pedido se crea `PENDING` aunque no haya stock.

> "No, el pedido puede ser para productos que aun no estan en stock"

Un pedido puede convertirse en `Sale` (1:1 vía `Order.saleId`).

### S10: Aislamiento multi-tenant
Toda lectura/escritura de datos de negocio pasa por `OrganizationScopeService` (`x-workspace-id` + membresía `ACTIVE`). Un tenant nunca ve datos de otra organización. Un `ADMIN`/`SUPERADMIN` conserva acceso global.

### S11: Logs de actividad para admin
Las operaciones de negocio emiten eventos que `ActivityListenerService` persiste en `UserActivityLog` (historial de usuario consultable por admin).

### S12: Numeración secuencial por tenant
`saleNumber` (`VTA-00001`), `orderNumber` (`PED-00001`) y `purchaseNumber` (`COM-00001`) son secuenciales y únicos por organización, generados de forma atómica (sin colisiones por concurrencia).

---

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T0 | — | inline | done | `b48e330` (reparación del build: 119 → 0 errores de typecheck) |
| T1 | S1, S2, S12 | inline | done | `7544d6a` |
| T2 | S3, S10 | inline | done | `d422044` + `d533cd6` |
| T3 | S4, S10 | inline | done | `fe6b53a` |
| T4 | S5, S10 | inline | done | `fe6b53a` |
| T5 | S6, S10 | inline | done | `f58df68` |
| T6 | S7 support | inline | done | `f4f5cfe` |
| T7 | S7, S12 | inline | done | `9640ef6` |
| T8 | S8, S12 | inline | done | `21c4027` |
| T9 | S9, S12 | inline | done | `768f96b` |
| T10 | S11 | inline | done | `15527fe` |
| T11 | arranque | inline | done | `d7415dd` (fixture `socius-demo`) |
| T12 | — | inline | done | `51a0b4c` + `2dbb865` (corrección de arranque e integridad) |

> Ruta: todo inline. La regla Writer no se disparó: cada unidad fue de
> 150-450 líneas autorizadas con su patrón ya establecido en la unidad
> anterior, así que delegar habría costado más contexto del que ahorraba.

### Verificación

- `npm run typecheck` → **0 errores** (baseline del repo: 67; estado heredado del purge: 119).
- `npm test` → **68/68 suites, 557/557 tests verdes**.
- **API por HTTP en Docker** (`docker compose -f docker-compose.dev.yml up -d backend`, puerto 3005), recorrido completo sobre la base real:

| Paso | Resultado observado |
| --- | --- |
| Login `superadmin@example.com` | `tokens.access_token` devuelto |
| `GET /rates/latest` | `rateBcv 889.2553` / `rateUsdt 1001.3333`, `persisted: true` |
| Cliente + proveedor + producto | creados y aislados a la organización del header |
| Ajuste de kardex | `IN 50 -> 60` |
| Venta `VTA-00001` | `20 USD / 17.785,11 VES / 17,76 USDT`, estado `PARTIAL` |
| Abono fechado en mayo | `paidAt` real separado del devengo |
| `GET /sales/report` | devengado `2026-10: 44 USD` vs cobrado `2026-05: 20 USD` + `2026-10: 11,24` |
| Stock + kardex | `50 -> 40`, fila `SALE` referida a `VTA-00001` |
| Arqueo de caja | esperado `105,62`, contado `145`, diferencia `39,38` |
| Pedido público (sin token) | `PED-00001 PENDING` por slug `socius-demo` |
| Conversión a venta | `VTA-00004` |
| Activity feed | 8 eventos `erp.*` (S11) |

### Bugs reales encontrados y corregidos en esta fase

1. **El contexto de workspace no llegaba al handler** (`WorkspaceContextInterceptor`): Nest suscribe el Observable *después* de cerrar el `run()`, así que todo endpoint con guard resolvía `organizationId = null` (403 en "abrir caja"). Los controllers viejos lo parcheaban leyendo el header a mano; corregido en la raíz con spec que quedaba en rojo.
2. **Arranque imposible**: los módulos nuevos usaban `SessionAuthGuard` sin importar `UserModule`/`PermitModule` ni proveer `JwtService`.
3. **Índices únicos parciales y CHECK desaparecidos**: el `init` regenerado no puede expresarlos en `schema.prisma`; sin ellos la base aceptaba entitlements/grant duplicados.
4. **`POST` con `Content-Type: application/json` y cuerpo vacío** → 400 de Fastify en las mutaciones sin cuerpo (`/convert`, `/cancel`).
5. **Redondeo de saldos**: `20 - 15.62` devolvía `4.380000000000001` en el balance del cliente/proveedor.

---

## Log

### L1 — Requerimiento original (usuario, 2026-10-29)

> y vamos a montar lo nuevo, vamos a comenzar por:
> - Moneda (Bolivar, usdt, dolar, bcv)
> - Metodos de pago (pago movil, usdt, y asi)
> - Clientes (algo rapido, nombre, contacto)
> - Proveedores (algo rapido, nombre, contacto, opcional ubicacion, y cosas asi)
> - Categorias y subcategorias (generales, los usuarios normales (mis clientes) no las pueden manipular)
> - Productos (los productos con sus estados, debe tener para mostrarlo publico, es decir, en el carrito,porque si tendremos un carrito)
> - Ventas (aca todo, cliente (opcional) detalle, almacenar la fecha, y las tazas del dia de bcv, usdt, y todo eso)
> - Compras (proveedores, fechas, tiempos y todo eso)
>
> Quiero el tema de las cantidades, estados.
>
> Que se pueda tener los pedidos, y asi mi cliente sabe que tiene pedidos y no pierde el tiempo.
>
> Ver los pagos correspondientes a los meses, por ejemplo, si se tienen ventas de enero, que terminan de pagar en mayo que eso siga respondiendo a ventas de enero
>
> Hazme preguntas, analiza todo y vamos a darle

### L2 — Respuestas de negocio (usuario, 2026-10-29)

> 1. La moneda principal debe ser configurable, asi como configurar si quiere ver los calculos y eso, de igual forma se almacenan esos datos en todas las monedas, el permiso lo que hace es para mostrarlas.
> 2. Si seria tipo dominio.com/shopname username o algo asi
> 3. No, el pedido puede ser para productos que aun no estan en stock y asi, solo para que mi cliente sepa las cosas que quiere sus clientes
> 4. Si, compras a credito, tanto de proveedores, como de caja, las ventas como tal.

### L3 — Alcance de logs y multi-tenant (usuario, 2026-10-29)

> si bro, dale con eso, y tambien vamos a tener el tema de los logs, y todo eso, sabes? para tener historial de usuario y asi, obviamente sera para el admin.
>
> monta eso que indicas, con esto que te digo, y montas los datos semilla para los permisos y todo eso, debe ser multi tenant, porque a futuro vamos a escalar

### L4 — Toma de control en OpenCode (usuario, 2026-10-29)

El usuario reporta que el agente anterior (Antigravity) no rinde y pide continuar el trabajo en este repositorio.

Estado verificado al retomar: 3 commits (`2ccb7d8`, `6350974`, `872cb32`), migración `20261029200954_init` aplicada, `socius_dev_db` saludable en 5477, `schema.prisma` con los 43 modelos ERP. Módulos NestJS de negocio ausentes.

### L6 — Toma de control y reparación del build (2026-10-29)

Al retomar, el backend **no compilaba**: el purge de nutrición borró
modelos de Prisma y dejó 119 errores de typecheck y 7 specs rotos.
Se reparó primero (T0) antes de seguir sumando módulos: scripts y
fixtures clínicos borrados, `usage` y `adoption-analytics` fuera,
dashboard/usuario/auth reescritos sobre el modelo ERP.

### L7 — Endpoints entregados (fase backend)

| Ruta | Qué hace |
| --- | --- |
| `GET/POST/PATCH/DELETE /api/clients` + `/:id/balance` | CRM rápido con límite de crédito y saldo |
| `GET/POST/PATCH/DELETE /api/suppliers` + `/:id/balance` | Proveedores con cuenta por pagar |
| `GET /api/categories` (pública), `/mine`, CRUD | Catálogo maestro de solo lectura para tenants |
| `GET/POST/PATCH/DELETE /api/products`, `/:id/stock`, `/:id/stock-movements` | Catálogo, estados, Kardex |
| `GET/POST/PATCH/DELETE /api/cash/registers`, `/shifts`, `/:id/close`, `/:id/movements` | Caja, turnos y arqueo |
| `POST/GET /api/sales`, `/:id/payments`, `/:id/cancel`, `GET /api/sales/report` | Ventas con devengo vs cobro |
| `POST/GET /api/purchases`, `/:id/receive`, `/:id/payments`, `/:id/cancel`, `GET /api/purchases/report` | Compras y cuentas por pagar |
| `POST /api/orders/public`, `GET /api/orders`, `/:id/status`, `/:id/convert` | Tienda pública y bandeja de pedidos |
| `GET /api/exchange/rates/latest`, `POST /api/exchange/rates`, `GET /api/exchange/rates/history` | Tasas BCV/USDT congeladas |
| `GET /api/payment-methods/options` | Métodos de pago de negocio |

### L5 — Decisiones de implementación tomadas

- **Tasas**: `rateBcv` = VES/USD, `rateUsdt` = VES/USDT. `totalUSDT = totalVES / rateUsdt`.
- **Numeración**: `Counter` con `tenantKey` (organizationId o `GLOBAL`) + `scope`, incremento atómico vía upsert nativo de Postgres. Evita la trampa de `@@unique` con `NULL`.
- **Métodos de pago de negocio**: constantes canónicas en `src/shared/constants/payment-methods.ts` + endpoint `GET /api/payment-methods/options`. No se toca la tabla `PaymentMethod` (esa es de la facturación de la plataforma).
- **Stock en venta directa**: se descuenta al confirmar; si queda ≤ 0 y no es servicio, el producto pasa a `OUT_OF_STOCK`. Los pedidos web NO reservan stock (S9).
- **Aislamiento**: `OrganizationScopeService` se instancia con el `PrismaService` del consumidor, igual que `ActivityController`.
