# Productos compuestos (BOM) y materia prima

**Objetivo:** producto compuesto que descuenta insumos del inventario al vender (papelería: "Impresión" consume hojas), con toggle en Configuración para habilitar el modo materia prima.
**Rama:** `feat/composite-products`.
**Estrategia de entrega:** `ask-on-risk` — pronóstico ~550 líneas (> 400): confirmar cadena de PRs antes del primer slice que supere el umbral. No push/PR sin orden explícita.
**Test runner:** `npx jest <path>` (serverapp) / `npx vitest run <path>` (webapp). Typecheck webapp baseline **0**, serverapp **0**. **Nunca build.**

---

## Specs

> Fragments del usuario en **verbatim** (español).

### S1: Componentes de producto (BOM)

> "crear un tipo de producto compuesto, o algo asi, que descuente cosas de inventario, imaginate una papeleria, aja la impresion imaginate en 2$ pero eso descuenta 1hoja de papel"
> "podemos tener productos de tipo materia prima, o un modulo que sea de materia prima y asi, y al crear productos que se creen y se seleccione una materia prima"

Criterios de aceptación:

- Nuevo modelo `ProductComponent`:
  - `productId` (el compuesto), `componentId` (la materia prima), `quantity Decimal(12,2)` (fraccional de entrada, base para recetas futuras).
  - `@@unique([productId, componentId])`; relations a Product (ambos lados).
- La materia prima **es un Product normal** (compra, kardex, proveedor ya existentes). No hay entidad paralela "MateriaPrima".
- `Product` gana `isComposite Boolean @default(false)` para filtrar/buscar; un producto con componentes pero sin flag se trata igual en runtime (el flag es para UI/listados).
- Alta/edición de componentes vía `POST/PATCH /api/products` con campo opcional `components: [{ componentId, quantity }]`:
  - Create: crea los rows si vienen.
  - Update: si el campo viene presente, **reemplaza** la lista (deleteMany + create); si no viene, no toca.
  - Validaciones: componentId existe en el mismo tenant, ≠ producto padre, quantity > 0, sin duplicados.
- `GET /api/products/:id` incluye `components` con nombre/sku/stock del insumo.

### S2: Toggle en Configuración → Inventario

> "esto de materia prima tambien debe estar en configuraciones si trabajar por materia prima o algo asi"

Criterios de aceptación:

- `TenantSettings.inventory.useRawMaterials: boolean` (default `false`), patrón completo de `purchases.onlySupplierProducts`: constantes + normalize + strict write + merge + DTO + tipo webapp + `applySettingsPatch`.
- Tab **Inventario** de Configuración: toggle "Trabajar con materia prima" con hint corto. Optimistic write con rollback (patrón existente).
- **Off (default):** la sección de componentes no aparece en el form de producto; las ventas se comportan exactamente como hoy (cero regresión).
- **On:** la sección "Componentes / Materia prima" aparece en alta y edición de producto.

### S3: Venta descuenta componentes (bloqueo)

> Decisión: **bloquear** la venta si falta insumo (recomendación aceptada con "dale, implementa eso").

Criterios de aceptación:

- En `SaleService.applyStock` (misma transacción que la venta), por cada componente del producto vendido:
  - Verificar `component.stock ≥ item.quantity × component.quantity`; si no, `BadRequestException` (`Stock insuficiente de "Hoja A4": necesitás 2, hay 1.`) → la venta entera se revierte.
  - Decrementar stock y crear `StockMovement(type: SALE)` por componente (reference = saleNumber).
- El stock propio del compuesto sigue la regla actual (`isService` lo salta).
- **Anulación** (`SaleService.cancel`): devuelve componentes con `StockMovement(type: RETURN)`.
- **Devolución** (`SaleReturnService.restoreStock`): idem.
- Ítems con `presentationId`: los componentes se aplican a nivel del `productId` del ítem (v1 simple).

### S4: UI del form de producto

Criterios de aceptación:

- `ProductForm` gana `components: { componentId: string; quantity: string }[]` + `EMPTY = []`; `toForm` los puebla; `buildProductPayload` los serializa a números.
- Sección "Componentes / Materia prima" en `ProductFormPanel`: filas producto (select/buscador) + cantidad + quitar; botón agregar. Excluye el propio producto en edición.
- Visible solo cuando `settings.inventory.useRawMaterials` está activo.

### S5: Fuera de alcance (v1)

- Recetas/rendimiento/merma (Restaurante) — esto es la base, no el feature completo.
- Producción intermedia, mezclas multi-insumo con reglas de combo, costo teórico de receta.

---

## Tasks

| ID | S# | Route | Estado | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1 | inline | pendiente | — |
| T2 | S3 | inline | pendiente | — |
| T3 | S2 | inline | pendiente | — |
| T4 | S4 | inline | pendiente | — |

- **T1** — Schema `ProductComponent` + `isComposite` + migración; product create/update/getOne con `components` + DTO + specs.
- **T2** — `applyStock` descuenta componentes con bloqueo; `cancel` y `sale-return.restoreStock` los devuelven + specs.
- **T3** — `TenantSettings.inventory.useRawMaterials` end-to-end (constants, normalize, DTO, merge, webapp types, applySettingsPatch) + toggle en Configuración + specs.
- **T4** — UI `ProductFormPanel` sección componentes (gateada por el toggle) + `product-form.ts` + specs.

## Log

- **L1** (verbatim): "es por ejemplo, para este mismo de comercio, pero que se habilite una opcion en configuraciones, es crear un tipo de producto compuesto, o algo asi, que descuente cosas de inventario, imaginate una papeleria, aja la impresion imaginate en 2$ pero eso descuenta 1hoja de papel, como recomiendas abordar eso?? podemos tener productos de tipo materia prima, o un modulo que sea de materia prima y asi, y al crear productos que se creen y se seleccione una materia prima, esto de materia prima tambien debe estar en configuraciones si trabajar por materia prima o algo asi"
- **L2** (decisión): "dale, implementa eso" — modelo BOM `ProductComponent`, toggle `inventory.useRawMaterials`, **bloqueo** de venta si falta insumo (no stock negativo). Base futura de recetas/mermas del Restaurante.
