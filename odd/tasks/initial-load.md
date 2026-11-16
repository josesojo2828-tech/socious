# ODD Task: Carga inicial de cuentas nuevas

**Objetivo:** que una cuenta nueva o de primer uso cargue su catálogo y sus cuentas por cobrar desde una página de arranque, importando una planilla o dando de alta a mano, sin duplicar documentos al reimportar. **Branch:** `feat/carga-inicial`
**Delivery strategy:** `ask-on-risk` (se pronostica superar las 400 líneas autoradas — confirmar la estrategia de cadena antes del primer slice de commits) · **Test runner:** `npm run typecheck` + `npx jest` (serverapp), `npm run typecheck` + `npm test` (webapp)

---

## Specs

> Requisitos acordados con el usuario. Los fragmentos entre comillas son verbatim de L1-L4.

### S1 — Página de carga inicial
Página independiente en `/dashboard/configuracion/init`, accesible desde Configuración, con tres pasos —productos, clientes y cuentas por cobrar— y un resumen final. Origen: "esto debe ser en una pagina independiente que este tipo en: /dashboard/configuracion/init".

### S2 — Cuenta nueva o primer uso
La carga inicial está pensada para cuentas nuevas o de primer uso, y admite importación por planilla o alta manual. Cubre "que en cuentas nuevas ... ya sea importando un excel o a mano".

### S3 — El import crea el catálogo y las cuentas por cobrar
El import de cuentas por cobrar crea clientes, productos y las cuentas por cobrar: si el cliente no existe se crea; si el producto no existe se crea; cada fila produce una venta histórica impaga. Origen: "ya que de ahi se deben crear clientes, productos, y fechas de pago (opcionales)".

### S4 — Vencimiento opcional
El vencimiento puede ser una fecha límite explícita o una cadencia (quincenal, mensual, cada N días) calculada desde la fecha de la venta. Sin vencimiento la cuenta queda abierta y nunca se reporta como vencida. Origen: "si la fecha es opcional es como si fuera libre ... sin limite" y "si se le puede colocar limite debe ser o por cuotas o una fecha limite".

### S5 — Idempotencia del import
Reimportar la misma planilla no duplica cuentas: los documentos ya importados se detectan en la previsualización y se omiten.

### S6 — Tres estados en el reporte de cuentas por cobrar
El reporte debe distinguir al día, vencida y abierta, calcular los tramos de mora sobre el saldo neto de abonos y no ocultar filas.

### S7 — Fuera de alcance
El límite de crédito por monto (`Client.creditLimitUSD`) no se aplica ni se valida; las cuotas por venta quedan para una segunda iteración.

## Notas

- Una cuenta por cobrar no es una entidad propia: es una `Sale` con `paymentStatus` `UNPAID` o `PARTIAL`; el monto adeudado es `Sale.totalUSD` menos la suma de `SalePayment.amountUSD`. No existe tabla de cuentas por cobrar ni de cuotas.
- `Client.currentBalanceUSD` se actualiza dentro de `SaleService.create`; por eso el import debe pasar por ese servicio y no escribir la venta directamente.
- El sidebar y la pantalla de Cobros son de solo lectura: `GET /api/sales/report`.
- Existe importación CSV de productos (validate/commit, 500 filas, 2 MB, parser RFC 4180 propio, con tests y fixtures en `odd/fixtures/import/`) y de ventas; ninguna soporta `.xlsx` y la de ventas no crea catálogo ni vencimientos.
- `computeCreditDueDate` ya acepta la fecha de origen, pero `SaleService.create` no la pasa: derivaba el vencimiento desde el momento de la creación.
- El endpoint de archivos acepta solo imágenes y PDF hasta 5 MB; no sirve para planillas.
- `saleNumber`, `Product.sku` y `Client.taxId` no tienen restricción única en la base; la unicidad se valida en el servicio por organización.
- Si no hay organización resuelta, las escrituras se guardan con `organizationId` nulo (contexto personal) y no aparecen en el negocio.
- `GET /api/organizations/:id/stats` devuelve `totalClients`, `totalProducts` y `totalSales`; no existe ningún indicador persistido de "carga inicial completada".

## Tasks

- [x] **T1** · S4/S6 · inline · Fix de vencimiento: `SaleService.create` pasa la fecha de origen a `computeCreditDueDate` (hoy deriva desde la creación) + test · commit: `9cf4a2e`
- [x] **T2** · S6 · inline · Fix de aging en `GET /api/sales/report`: tres estados, mora sobre saldo neto de abonos y sin ocultar filas + tests · commit: `e61a402`
- [x] **T3** · S1-S7 · inline · Registrar este documento en `odd/tasks/` · commit: `948d45f`
- [x] **T4** · S1 · inline · Ruta `/dashboard/configuracion/init` y entrada desde Configuración · commit: `3378c9a`
- [x] **T5** · S1/S2 · inline · Guard de workspace: exigir organización resuelta antes de escribir, para no caer en el contexto personal · commit: `3378c9a`
- [x] **T6** · S1/S2 · inline · Detección de cuenta nueva a partir de `stats`, para mostrar la carga inicial solo en el primer uso · commit: `3378c9a`
- [x] **T7** · S2/S5 · inline · Paso 1: import de productos reutilizando el CSV existente (validate/commit/plantilla) · commit: `2a84461`
- [x] **T8** · S3/S5 · inline · Backend: módulo `initial-load` con `validate`, `commit` y `template`; el commit crea la venta histórica impaga vía `SaleService.create` · commit: `fe95e2f`
- [x] **T9** · S3 · inline · Creación automática de clientes faltantes, con la unicidad por organización validada en el servicio · commit: `fe95e2f`
- [x] **T10** · S3 · inline · Creación automática de productos faltantes, con la unicidad por organización validada en el servicio · commit: `fe95e2f`
- [x] **T11** · S4 · inline · Vencimiento opcional: fecha límite, cadencia desde la fecha de venta, o abierta sin vencimiento · commit: `fe95e2f`
- [x] **T12** · S5 · inline · Idempotencia: detectar documentos ya importados en la previsualización y omitirlos · commit: `fe95e2f`
- [x] **T13** · S2 · inline · UI del paso 2: descarga de plantilla y carga del archivo · commit: `936d5ab`
- [x] **T14** · S2 · inline · UI del paso 2: mapeo de columnas de la planilla al formato del import · commit: `936d5ab`
- [x] **T15** · S2 · inline · Alta manual de cuentas por cobrar en el mismo paso · commit: `8f577b2` + `1b3b814`
- [x] **T16** · S1 · inline · Resumen final: creados, omitidos y errores, con cierre del flujo · commit: `6ddbc51`
- [x] **T17** · S2 · inline · Parseo de `.xlsx` en el cliente (el endpoint de archivos no acepta planillas) · commit: `0627387`
- [x] **T18** · S1-S6 · delegado (writer) · Tests: RED→GREEN por regla, PRESERVE del reporte y de los imports existentes, y flujo completo · commit: `049d70f`
- [x] **T19** · S1-S6 · inline · Verificación: `npm run typecheck` + suites (serverapp/webapp) y actualización de help/docs tocados · commit: `4baecd0`
- [x] **T21** · S6 · inline · Aging de cuentas por pagar: replica los tres estados y el saldo neto de abonos en `purchase.service.getReport` · commit: `d8b73af`
- [x] **T22** · S3 · inline · `CreateSaleDto.saleNumber` opcional, para que el import asigne el número del documento histórico en la misma transacción · commit: `8f7168d`
- [ ] **T20** · S7 · decisión usuario · Iteración 2: cuotas por venta, fuera de esta entrega · commit: `_pendiente (iteración 2)_`

## Log

- **L1** (verbatim): "tu vas a trabajar en: que en cuentas nuevas, o puedan hacerlo por primera vez (ya sea importando un excel o a mano) que se puedan camgar los productos, y cuentas por cobrar."
- **L2** (verbatim): "Metele mucha mente a eso de importar cuentas por cobrar, ya que de ahi se deben crear clientes, productos, y fechas de pago (opcionales) esto debe ser en una pagina independiente que este tipo en: /dashboard/configuracion/init y ahi cargue todo el tema inicial de su comercio."
- **L3** (verbatim): "o sea, si la fecha es opcional es como si fuera libre, sabes? sin limite, o que se le pueda colocar limite?"
- **L4** (verbatim): "si o sea, si se le puede colocar limite debe ser o por cuotas o una fecha limite, monta la lista de tareas aca en opencode para ver como vas a proceder"
- **L5**: Documento registrado en `feat/carga-inicial`. Se fijan como primeros fixes el vencimiento derivado desde la creación y el aging del reporte, porque ambos condicionan el resultado del import. Sin commits todavía.
- **L6**: Cierre de la entrega. Todas las tareas se implementaron y se integraron a `main` mediante fast-forward, y el resultado se publicó en `origin/main`. Verificación final sobre el árbol ya integrado: en `webapp`, `npm run typecheck` sin errores y 70 archivos / 752 tests; en `serverapp`, `npm run typecheck` sin errores y 293 tests en los módulos `initial-load`, `sale`, `purchase` y `product`. Decisiones cerradas: una sola fecha de vencimiento opcional, sin tabla de cuotas en esta entrega; las cuentas sin vencimiento se tratan como abiertas y nunca como vencidas; la idempotencia se resuelve por el número de `venta` o por la clave `ONB-`; los productos se crean sin stock; el precio unitario siempre se declara de forma explícita. Deuda conocida que queda fuera de la entrega: `SaleInstallment` (cuotas), la ausencia de un selector de espacio de trabajo en la UI, `getClinicStats` devolviendo ceros cuando falla, y la falta de aplicación de `creditLimitUSD`. También se registran como tareas T21 y T22 el espejo del aging en cuentas por pagar y el `saleNumber` opcional, que no tenían fila propia.
