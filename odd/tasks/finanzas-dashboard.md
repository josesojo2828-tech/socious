# Dashboard financiero con filtros y diferencial cambiario

**Objetivo:** pantalla `/dashboard/finanzas` que muestre ganancia/pérdida del período (Ventas − Compras), flujo cobrado/pagado, saldos por cobrar/pagar y el diferencial entre las tasas (BCV, USDT, paralelo) con filtros de fecha.
**Rama:** `feat/finanzas-dashboard` (desde `feat/compras-inline-product-payment` o `main` según estado).
**Estrategia de entrega:** `ask-on-risk` — pronóstico ~450 líneas autorizadas. No push/PR sin orden explícita.
**Test runner:** `npx vitest run <path>` y `npm test` (webapp). Typecheck webapp baseline **0**. Nunca build.

---

## Specs

> Los fragments del usuario son **verbatim** (español).

### S1: Ganancia/pérdida del período con filtros de fecha

> "Dashboard financiero para ver cuanto se gana cuanto se pierde, y todos esos datos referentes"
> Decisión del usuario: **"Ventas − Compras del período (Recomendado)"**

Criterios de aceptación:

- Nueva ruta `/dashboard/finanzas` (cliente, workspace de organización).
- Filtros de fecha con presets: **Hoy · 7 días · 30 días · Este mes · Personalizado** (inputs `from`/`to`).
- KPIs del período (USD):
  - **Ventas** = `issued.totalUSD` de `GET /api/sales/report?from&to`
  - **Compras** = `issued.totalUSD` de `GET /api/purchases/report?from&to`
  - **Resultado** = Ventas − Compras (positivo = ganancia, negativo = pérdida); se resalta el signo con color.
  - **Cobrado** = suma de `collectionsByMonth[].totalUSD` del reporte de ventas (pagos con `paidAt` en el rango).
  - **Pagado** = suma de `paymentsByMonth[].totalUSD` del reporte de compras.
- Saldos actuales (no dependen del filtro): **Por cobrar** = suma del `aging` de ventas; **Por pagar** = suma del `aging` de compras.
- Ambos reports se piden en paralelo; fallo de uno no rompe el otro (card con error local).
- Helper puro `buildFinancialSummary(salesReport, purchasesReport)` con tests RED→GREEN.

### S2: Diferencial cambiario por las distintas tasas

> "debemos incluir tambien el tema de el diferencial cambiaron por las distintas tazas"

Criterios de aceptación:

- Sección **Tasas y diferencial** que consume `GET /api/exchange/rates/history?limit=200` (y opcionalmente `rates/latest`).
- Fila de **snapshot**: BCV, USDT, Paralelo (si `rateParallel` no es null) — valor en Bs y fecha.
- **Diferencial USDT − BCV**: abs (`rateUsdt − rateBcv`) y % (`(rateUsdt − rateBcv) / rateBcv × 100`), redondeado a 2 decimales.
- **Diferencial Paralelo − BCV** cuando exista `rateParallel`; si no, card oculta o "—".
- **Gráfico multi-línea** (componente `MultyLineChart` existente) con las series BCV y USDT (y Paralelo si hay) de los puntos del historial **dentro del rango de fecha filtrado**; sin puntos en el rango → mensaje vacío.
- Helper puro `buildRateDifferentials(rows)` + `filterRatesByRange(rows, from, to)` con tests.

### S3: Accesibilidad desde el sidebar

Criterios de aceptación:

- Entrada **Finanzas** en el sidebar del workspace de organización (`getSidebarSections`), sección propia o junto a CRM, icono `wallet`, link `/dashboard/finanzas`.
- No aparece para roles globales de plataforma (misma rama que el CRM del negocio).

---

## Tasks

| ID | S# | Route | Estado | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S2 | inline | hecho | (slice finanzas) |
| T2 | S1 | inline | hecho | (slice finanzas) |
| T3 | S2 | inline | hecho | (slice finanzas) |
| T4 | S3 | inline | hecho | (slice finanzas) |

- **T1** — Helpers puros `financial-summary.ts`, `rate-differentials.ts`, `period-range.ts` + specs. ✅
- **T2** — Página `/dashboard/finanzas`: presets de fecha, KPIs Ventas/Compras/Resultado/Cobrado/Pagado/Flujo, saldos de aging. ✅
- **T3** — Sección tasas: snapshot BCV/USDT/Paralelo, diferenciales abs/%, MultiLineChart filtrado por rango. ✅
- **T4** — Entrada **Finanzas** (icono wallet) en el sidebar CRM de `dashboard.service.ts` + spec. ✅

Verificación al cierre: webapp typecheck **0** · suite **53 archivos / 470 tests, 0 fallos** · serverapp typecheck **0** · `dashboard.service.spec` **16/16**.

## Log

- **L1** (verbatim): "Bien, sabes que ahora necesitamos, con filtros. Dashboard financiero para ver cuanto se gana cuanto se pierde, y todos esos datos referentes, debemos incluir tambien el tema de el diferencial cambiaron por las distintas tazas."
- **L2** (decisión): cálculo principal = "Ventas − Compras del período (Recomendado)" — sin margen por unidad (no hay costo histórico en SaleItem).
- **L3** (evidencia): T1–T4 en rama `feat/finanzas-dashboard`; RED→GREEN en 3 specs (23 tests finanzas); sidebar CRM test actualizado; typecheck webapp/serverapp en 0.
- **L4** (feedback del usuario): "no quiero abrumar al comerciante diciendole que cuanto va perdiendo… mas de tener metricas… colocar la taza de apertura, y la de cierre de ese dia, y ahi mismo colocar, los clientes que deben de este rango, y las cuentas por pagar que faltan de ese rango."
- **L5** (ajuste): tono neutro ("Métricas del período", "Resultado" sin verde/rojo alarmante); cards Apertura/Cierre BCV y USDT del rango; tablas "Clientes que deben" y "Por pagar en este rango" filtradas por `issueDate` en el rango (el backend no filtra `openItems` por fecha); cartera total queda como contexto al pie. Tests: 32 en `features/finanzas`.
