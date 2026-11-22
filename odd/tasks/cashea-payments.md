# Cashea como medio de pago

Objetivo: marcar una venta como Cashea con su inicial, sus cuotas y las fechas en que caen, sin ensuciar la cartera del cliente.
Branch: `main` (sin commit todavía) · Delivery: `ask-on-risk` · Tests: `serverapp` jest · `webapp` vitest.

## Specs

- **S1** — Marcar si una venta fue con Cashea. La marca vive en la venta (plan Cashea congelado: `casheaFinancedUSD` no nulo).
- **S2** — Registrar el monto inicial: `"marcar cuanto fue de inicial"`.
- **S3** — Registrar cuánto es cada cuota y cuántas son: `"de cuanto son las cuotas"`.
- **S4** — Registrar cuándo deberían caer: `"y cuando deberian caer"`. Cashea cobra cada 14 días; el calendario se deriva de la primera fecha (`casheaFirstDueDate` + 14 × n).
- **S5** — Lo financiado por Cashea NO es deuda del cliente (decisión A aprobada con `"dale bro!"`): no entra al saldo del cliente, ni al crédito disponible, ni al aging de cuentas por cobrar. Una liquidación `CASHEA` nunca toca el saldo del cliente.
- **S6** — `GET /api/sales/:id/cashea` expone el plan, el calendario derivado y lo ya liquidado por Cashea.
- **S7** — El POS captura el plan y muestra el calendario antes de registrar la venta; el detalle de la venta lo muestra después.

## Tasks

- T1 → S1-S4, S5 · inline · `Sale` + migración `20261122120000_cashea_plan_on_sale` (5 columnas nullable + índice).
- T2 → S1-S4 · inline · util puro `sale/util/cashea-plan.ts` + spec (10 tests).
- T3 → S1-S4, S5 · inline · `sale.create` valida y congela el plan; `sale.addPayment` y `client.getBalance` separan cliente de Cashea; `getReport` excluye Cashea del aging.
- T4 → S6 · inline · `SaleController GET :id/cashea`.
- T5 → S7 · inline · `features/sales/lib/cashea.ts` + spec (10 tests), `buildPosPayload`, POS y detalle de venta.
- T6 → verificación · `serverapp` jest 121 suites / 1136 tests (11 fallos ambientales de DB en `entitlement.db.integration.spec.ts`, credenciales `socius_user` inválidas) · `webapp` vitest 73 suites / 804 tests · typecheck 0 errores en ambas apps.
- T7 → corrección (bloqueantes del verificador) · `CASHEA` ya no toca el saldo del cliente en ventas no-Cashea (creación y abono), y anular una venta Cashea ya no convierte lo financiado en deuda del cliente. Recheck independiente: B1 y B2 CONFIRMED.
- T8 → paridad de tolerancia · el backend tolera el redondeo por cuota (`count × 0.005`), así el POS no acepta un plan que el backend rechace (cuotas 24..36).

## Log

- **L1** — `"aja bro, eso, quiero es marcar si una venta fue con cashea, marcar cuanto fue de inicial, y de cuanto son las cuotas, y cuando deberian caer"`
- **L2** — `"que recomiendas tu?"` → recomendación A (lo financiado es cuenta por cobrar a Cashea, no deuda del cliente), con evidencia: `client.service.ts:165-181` recalcula la deuda como ventas − pagos, y `:190` descuenta crédito disponible.
- **L3** — `"dale bro!"` → autoriza implementar A.
- Decisión: sin tabla de cuotas; el calendario se deriva (14 días fijos de Cashea). Los arribos de cuotas se registran como abonos con método `CASHEA`, lo que mantiene la caja honesta sin inventar cobros futuros.
- Decisión: las ventas Cashea se excluyen del reporte de cuentas por cobrar (`openItemsWhere.casheaFinancedUSD = null`) porque el deudor es Cashea.
- Verificación independiente: la primera pasada encontró 2 bloqueantes reales (un abono `CASHEA` bajaba el saldo del cliente en ventas normales; anular una venta Cashea cargaba lo financiado al cliente). Ambos corregidos con tests de regresión y confirmados en una segunda pasada.
- Advisory conocido: si la inicial de una venta Cashea quedara impaga, ese saldo no aparece en el aging de cuentas por cobrar (sólo alcanzable por API: el POS siempre cobra la inicial).
- Pendiente: aplicar `prisma migrate deploy` cuando la base local esté disponible (hoy falla la autenticación de `socius_user`); no se hizo commit ni push.
