# Productos compuestos (BOM) y toggle de materia prima

**Objetivo:** un producto puede declarar componentes (materias primas) que se descuentan del inventario al venderlo; toggle en Configuración para habilitar el modo "trabajar con materia prima".
**Rama:** `feat/composite-products`.
**Estrategia de entrega:** `ask-on-risk` — pronóstico ~550 líneas (> 400): confirmar cadena de PRs antes del primer slice que supere el umbral. No push/PR sin orden explícita.
**Test runner:** `npx jest <path>` (serverapp) / `npx vitest run <path>` (webapp). Typecheck webapp baseline **0**, serverapp **0**. **Nunca build.**

---

## Specs

> Fragments del usuario en **verbatim** (español).

### S1: Componentes de producto (BOM)

> "crear un tipo de producto compuesto, o algo asi, que descuente cosas de inventario, imaginate una papeleria, aja la impresion imaginate en 2$ pero eso descuenta 1hoja de papel"

Criterios de aceptación:

- Nuevo modelo `ProductComponent { productId, componentId, quantity Decimal(12,2), @@unique([productId, componentId]) }`. La "materia prima" **es** un Producto normal (compra, kardex, proveedor ya existen).
- `POST/PATCH /api/products` acepta `components: [{ componentId, quantity }]` opcional. En update con el campo presente **reemplaza** la lista completa; ausente no toca.
- Validaciones de alta: componentId existe en el mismo tenant, no es el propio producto, quantity > 0, sin duplicados. Error 400 con mensaje claro.
- `GET /api/products/:id` incluye los componentes con resumen del insumo (name, sku, stock).
- El Kardex del insumo queda honesto: al vender el compuesto se registra `StockMovement(type: SALE)` por componente.

### S2: Toggle "Trabajar con materia prima"

> "esto de materia prima tambien debe estar en configuraciones si trabajar por materia prima o algo asi"

Criterios de aceptación:

- `TenantSettings.inventory.useRawMaterials: boolean` (default `false`), patrón completo de `purchases.onlySupplierProducts`: constantes + normalize + strict write + merge + DTO + tipo webapp + `applySettingsPatch`.
- Tab **Inventario** de Configuración: toggle "Trabajar con materia prima" con hint. Optimistic write con rollback (patrón existente).
- **Off (default):** la sección de componentes no se muestra en el form de producto; las ventas se comportan exactamente como hoy (cero regresión).
- **On:** la sección "Componentes / Materia prima" aparece en alta y edición de producto.

### S3: Venta descuenta componentes (con bloqueo)

> Decisión del usuario: **bloquear** la venta si falta insumo (no stock negativo) — coherente con decompose/límites que rechazan.

Criterios de aceptación:

- En `SaleService.applyStock` (misma transacción que la venta): por cada componente del producto vendido, verificar `stock ≥ cantidadVenta × quantityComponente`. Si no alcanza → `BadRequestException` con mensaje tipo `Stock insuficiente de "Hoja A4": necesitás 2 y hay 1.` y la venta entera se revierte.
- Al alcanzar: decrementar el stock del componente y crear `StockMovement(type: SALE)` con reference = saleNumber y notes que mencionen el producto compuesto.
- El stock propio del producto compuesto sigue la regla actual (`isService` lo salta; si tiene stock propio también baja).
- **Anulación** (`SaleService.cancel`): devuelve los componentes con `StockMovement(type: RETURN)`.
- **Devolución** (`SaleReturnService.restoreStock`): idem, devuelve componentes.
- Ventas de presentaciones (variante): los componentes viven a nivel producto — se aplican también cuando el ítem tiene `presentationId` (el padre es el compuesto). *Impl simple: aplicar componentes del `productId` del ítem, independiente de presentationId.*

### S4: UI del form de producto

Criterios de aceptación:

- `ProductForm` gana `components: { componentId: string; quantity: string }[]` (strings en el form, números en el payload) + `EMPTY` con `[]`.
- `toForm` puebla desde `product.components`; `buildProductPayload` los envía como `{ componentId, quantity: number }`.
- Sección "Componentes (materia prima)" en `ProductFormPanel`: filas con buscador/select de productos + cantidad + botón quitar; botón "Agregar componente". Solo visible cuando el tenant tiene `useRawMaterials`.
- Validación de form: quantity > 0; no elegir el propio producto como componente (imposible por UI: el select excluye el actual en edición).

### S5: Fuera de alcance (v1)

- Recetas/rendimiento/merma (Restaurante) — esto es la base, no el feature final.
- Producción intermedia, reglas de mezcla (papel + tinta), descuentos de componente en POS con render de "insumos consumidos".
- Kit con stock propio descontado en vez de componentes (el compuesto puede tener stock propio; se descuenta también — eso es correcto y simple).

---

## Tasks

| ID | S# | Route | Estado | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1 | inline | hecho | e276024 |
| T2 | S3 | inline | hecho | e276024 |
| T3 | S2 | inline | hecho | 650a3de |
| T4 | S4 | inline | hecho | (slice T4) |

- **T1** — Schema `ProductComponent` + migración + DTOs de producto con `components` + create/update/getOne en `product.service` + specs.
- **T2** — `applyStock` con verificación/bloqueo + movimientos de componente; `cancel` y `sale-return.restoreStock` devuelven componentes + specs.
- **T3** — `TenantSettings.inventory.useRawMaterials` end-to-end (server constants/normalize/DTO + webapp types/patch) + toggle en Configuración tab Inventario + specs.
- **T4** — UI `ProductFormPanel` sección componentes (gateada por el toggle) + `product-form.ts` (toForm/buildPayload) + specs.

## Log

- **L1** (verbatim): "es por ejemplo, para este mismo de comercio, pero que se habilite una opcion en configuraciones, es crear un tipo de producto compuesto, o algo asi, que descuente cosas de inventario, imaginate una papeleria, aja la impresion imaginate en 2$ pero eso descuenta 1hoja de papel, como recomiendas abordar eso?? podemos tener productos de tipo materia prima, o un modulo que sea de materia prima y asi, y al crear productos que se creen y se seleccione una materia prima, esto de materia prima tambien debe estar en configuraciones si trabajar por materia prima o algo asi"
- **L2** (decisión): "dale, implementa eso" — recomendación aceptada: modelo BOM `ProductComponent`, toggle `inventory.useRawMaterials`, **bloqueo** de venta si falta insumo.

- **L3** (evidencia): T1–T4 implementados en `feat/composite-products`; migración `20261103203042_composite_product_components` aplicada; serverapp typecheck 0 (product 31, sale 42, bom 6, tenant-settings 19 tests); webapp typecheck 0, suite 53 archivos / 487 tests. Configuración → Inventario muestra el toggle "Trabajar con materia prima"; el form de producto gatea la sección de componentes por ese flag.
