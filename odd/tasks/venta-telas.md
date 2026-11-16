# Venta de telas por metro (rollos y partidas)

**Objetivo:** vender tela por metro, con rollos/partidas opcionales por producto, sirviendo igual a una tienda pequeña (metros totales) y a una grande (varios rollos con ancho y metros propios).
**Rama:** `feat/venta-telas`.
**Estrategia de entrega:** `ask-on-risk`; commits por unidad de trabajo, sin push/PR.
**Test runner:** `npx vitest run <path>` (webapp) y `npx jest <path>` (serverapp). Nunca build.

---

## Specs

> Los fragmentos entre comillas son **verbatim** del usuario.

### S1: Diagnóstico previo

- Pedido verbatim: `"mano, este programa esta activo para trabajar con telas???"` y `"si bro, eso, para vender telas, y para los que fabrican ropa"`.
- El diagnóstico entregado (categorías, presentaciones con talla/color/stock, `quantity` decimal en backend) es la base del alcance.

### S2: Venta por metro

- Pedido verbatim: `"vamos a implementar que se puedan vender telas y cosas aso"`.
- `UnitKind` suma `LENGTH`; el catálogo de sistema suma `m` (Metro) y `cm` (Centímetro) con `kind = LENGTH`.
- Una venta puede cobrar cantidades fraccionarias (`1.5 m`) sin tocar el límite actual `@Min(0.0001)`.
- El POS acepta cantidad editable con decimales **según la unidad de la línea**: `COUNT` → entero; `WEIGHT`, `VOLUME`, `LENGTH` → 2 decimales.
- Carrito, recibo y kardex muestran la cantidad con su unidad (`1.5 m`).

### S3: Rollos/partidas para el negocio grande

- Pedido verbatim: `"podemos abarcar todo bro, que dices? tanto para peques como para grandes"`.
- Nuevo modelo `ProductLot` (rollo/partida): `code`, `widthCm`, `initialQuantity`, `remainingQuantity`, `unitCostUSD`, `receivedAt`, `active`.
- Un lote pertenece a un producto y, opcionalmente, a una presentación.
- `Product.tracksLots` (default `false`) decide el comportamiento. En `false` nada cambia: el stock vive en el producto/presentación como hoy.
- En `true`, `Product.stock` (o el stock de la presentación) es la **suma** de los `remainingQuantity` de sus lotes activos; toda entrada y salida pasa por lotes.

### S4: Consumo FIFO y lote explícito

- La venta acepta `lotId` opcional por línea.
- Sin `lotId` y con `tracksLots = true`: el servidor consume por FIFO (más antiguo primero) y registra un movimiento por lote tocado.
- Con `lotId`: consume solo de ese lote; si no alcanza, responde 400 y no mueve nada.
- `StockMovement.lotId` y `SaleItem.lotId` (nullable) dejan la trazabilidad.

### S5: Compatibilidad (pequeños)

- Un producto sin `tracksLots` conserva exactamente el comportamiento actual: el POS no muestra selector de rollo, y el stock se mueve como hoy.
- Migración **aditiva**: ninguna columna se renombra ni se borra; los productos existentes quedan en `tracksLots = false`.
- Las unidades `m`/`cm` son del sistema (solo lectura); cada cuenta puede añadir las propias.

### S6: Verificación

- `typecheck` serverapp y webapp en 0.
- Specs nuevos: servicio de lotes (FIFO, lote insuficiente, invariante de suma), venta fraccionaria, `resolveUnitDecimals` con `LENGTH`.
- Manual: crear tela con unidad `m`, vender `1.5` con y sin `tracksLots`, ver la unidad en el carrito.

---

## Tasks

| ID | Specs | Ruta | Estado |
|---|---|---|---|
| T1 | S2, S3, S4, S5 — schema: `LENGTH`, `Product.tracksLots`, `ProductLot`, `lotId` en `StockMovement`/`SaleItem` + migración aditiva | inline | ✅ `9aefbde` |
| T2 | S2 — unidades de sistema `m`/`cm` + `resolveUnitDecimals` con `LENGTH` | inline | ✅ `9aefbde` |
| T3 | S3, S4 — servicio de lotes: listar/entrar/ajustar, consumo FIFO, invariante de stock | inline | ✅ `a465934` |
| T4 | S2 — POS: cantidad editable por unidad + unidad visible en carrito | inline | ✅ `208f0bf` |
| T5 | S3 — formulario de producto: interruptor `tracksLots` + tarjeta de rollos (cargar/ajustar/eliminar) | inline | ✅ `feead2f` |
| T6 | S2, S4 — kardex con el rollo de cada movimiento | inline | ✅ `d328351` |
| T7 | S6 — tests y documentación | inline | ✅ (ver evidencia) |

---

## Verificación

- `serverapp`: `npm run typecheck` en 0; suite completa **112 suites / 1070 tests** en verde.
- `webapp`: `npm run typecheck` en 0; suite completa **71 archivos / 774 tests** en verde.
- Specs nuevos: `product-lot/lot-stock.spec.ts` (10 casos: FIFO, lote explícito, insuficiente, apertura, presentación), `product-lot/product-lot.service.spec.ts` (6 casos: tenant, apertura, ajuste, desactivar con metros, listado), `sale.service.spec.ts` (venta de 1.5 m con y sin rollos), `pos-form.spec.ts` (cantidad por unidad), `unit-decimals.spec.ts` (`LENGTH`).
- Migración aplicada en la base local: `20261116215154_product_lots_and_length_units` (solo `ADD VALUE`, `ADD COLUMN` con default y `CREATE TABLE`).

## Limitaciones conocidas (siguiente entrega)

- **La línea de venta no guarda la unidad**: el detalle muestra `1.5 × Tela lino` sin `m`. Resolverlo pide denormalizar la unidad en `SaleItem` (migración aditiva) o resolverla por join.
- **El POS no deja elegir el rollo**: consume FIFO. El selector por línea (campo `lotId`, ya aceptado por la API) es la siguiente entrega.
- **Presentaciones**: el backend soporta rollos por presentación, pero el formulario de presentaciones no expone la carga de rollos.
- **Talleres de confección**: órdenes de producción, mano de obra y BOM multinivel siguen fuera de alcance; el BOM actual solo descuenta insumos al vender.


---

## Log

### L1 (pedido original, verbatim)

> mano, este programa esta activo para trabajar con telas???

### L2 (verbatim)

> si bro, eso, para vender telas, y para los que fabrican ropa

### L3 (verbatim)

> ok bro, entonces vamos a implementar, o sea, analiza y vamos a implementar que se puedan vender telas y cosas aso

### L4 (verbatim)

> podemos abarcar todo bro, que dices? tanto para peques como para grandes

### Análisis (2026-11-16)

- Backend ya acepta cantidad fraccionaria: `@Min(0.0001)` en `serverapp/src/modules/sale/dto/sale.dto.ts:41`.
- Stock y kardex usan `Decimal(12,2)` con `round2` (`serverapp/src/modules/sale/sale.service.ts:911`).
- `resolveUnitDecimals` ya distingue `COUNT` de `WEIGHT`/`VOLUME` (`webapp/src/features/units/lib/unit-decimals.ts`), pero desconoce `LENGTH`.
- El POS trunca a entero en `addToCart`/`changeQuantity` (`webapp/src/features/sales/lib/pos-form.ts:78,114`) y solo ofrece ±1.
- Hueco de datos: `UnitKind` sin `LENGTH` (`prisma/schema.prisma:972`), sin modelo de lote/partida, y `StockMovement` sin `lotId`.

### Decisiones

- Un solo modelo sirve a ambos tamaños: `Product.tracksLots = false` (default) mantiene el comportamiento actual; `true` activa lotes con FIFO. Se descarta un modo separado por plan.
- Fuera de alcance en esta entrega: órdenes de producción para talleres de confección (el BOM existente cubre el consumo de insumos al vender). Queda como feature aparte.

### Estado

- Rama `feat/venta-telas` creada. Documento creado antes del primer cambio de código.
- `prisma migrate status` no pudo correr: la base local (`localhost:5477`) no estaba levantada.
