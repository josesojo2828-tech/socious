# Tipos de producto (presentaciones con costo)

**Objetivo:** el CRUD de variantes dentro de la ficha del producto se muestra como "Tipos" y suma un costo propio que, vacío, hereda el costo del producto.
**Rama:** `feat/producto-form-ajustes`.
**Estrategia de entrega:** `ask-on-risk`; sin push/PR sin orden explícita.
**Test runner:** `npx vitest run <path>` (webapp) y `npx jest <path>` (serverapp). Nunca build.

---

## Specs

> Los fragmentos entre comillas son **verbatim** del usuario.

### S1: Reutilizar Presentaciones

- Pedido verbatim: `"Otra cosa que quiero es implementar Types en los productos, quiero que sea un crud pequeno dentro de la ficha de productos"`.
- Decisión del usuario, verbatim: `"crees que podamos utilizar las presentaciones??"` → **sí**: se reutiliza `ProductPresentation`.
- No se crea una entidad nueva, ni una tabla, ni endpoints nuevos. La API sigue en `/api/products/:id/presentations`.
- La copia visible en la ficha del producto pasa de "Presentaciones" a **"Tipos"** (título, botones, tabla, avisos, confirmación y textos del modal). Los nombres internos (`presentation*`, módulo `PRESENTATIONS`) no cambian.

### S2: Campos del tipo

- El CRUD conserva lo que ya tiene: nombre, color, medidas, SKU, código de barras, unidad, stock, stock mínimo, precio de venta propio e imágenes por variante.
- Suma **costo propio**: `ProductPresentation.costPriceUSD` (`Decimal(14,2)`, nullable).
- Vacío ⇒ **hereda el costo del producto original**. La UI muestra el costo efectivo con la marca `(hereda)`.
- `measures` sigue siendo texto libre: sirve para “M”, “XL” o “10×10 cm”.

### S3: Persistencia y API

- Migración aditiva: `ALTER TABLE "ProductPresentation" ADD COLUMN "costPriceUSD" DECIMAL(14,2);` (sin default, sin backfill: los tipos existentes heredan).
- `CreatePresentationDto` y `UpdatePresentationDto` aceptan `costPriceUSD` numérico ≥ 0 o `null`.
- En update, `null` limpia el costo propio y vuelve a heredar.
- Un valor no numérico o negativo se rechaza en el formulario con error visible (no se ignora en silencio).

### S4: Alcance

- El gating por plan se mantiene: la tarjeta se muestra con el módulo `PRESENTATIONS` (Avanzado/Premium).
- El costo del tipo es informativo: las ventas siguen usando el precio de venta; no se recalcula ningún reporte en este cambio.
- Sin cambios visuales fuera de la tarjeta y el modal de tipos.

### S5: Verificación

- `npm run typecheck` webapp en **0**; specs nuevos y suites completas en verde.
- Serverapp: suite de presentaciones en verde; typecheck en 0.
- Manual: crear un tipo con y sin costo, editar para limpiar el costo, ver la columna en la tabla.

---

## Tasks

| ID | Specs | Ruta | Estado |
|---|---|---|---|
| T1 | Schema + migración aditiva | inline | ✅ |
| T2 | DTO y servicio con `costPriceUSD` | inline | ✅ |
| T3 | Tipo de webapp + helper de etiqueta de costo | inline | ✅ |
| T4 | Formulario y tabla con costo + copia "Tipos" | inline | ✅ |
| T5 | Verificación + docs | inline | ✅ webapp 64/635 · serverapp producto 6/113 |

---

## Log

### L1 — pedido (verbatim)

> Otra cosa que quiero es implementar Types en los productos, quiero que sea un crud pequeno dentro de la ficha de productos, quiero que tenga:
>
> medida
> color
> imagen
> costo (por defecto el del porducto original)
>
> y cositas asi, es para por ejemplo una camisa, poder subir una camisa roja, verde, negra, cada uno de eso son tipos.

### L2 — decisión (verbatim)

> crees que podamos utilizar las presentaciones??

### L3 — diagnóstico

- Ya existe `ProductPresentation` con nombre, `color`, `measures`, SKU, barcode, unidad, stock, minStock, precio propio e imágenes por variante (`presentation.service.ts`).
- Tiene stock independiente, se vende desde el POS (`SaleItem.presentationId`) y se descompone stock a granel.
- Falta el costo; el `PresentationsCard` se oculta si el plan no incluye `PRESENTATIONS` (Avanzado/Premium).

### L4 — implementación (evidencia)

- Migración aditiva `20261115230000_presentation_cost`: `ADD COLUMN "costPriceUSD" DECIMAL(14,2)`. Sin backfill: los tipos existentes heredan.
- DTOs `CreatePresentationDto`/`UpdatePresentationDto`: `costPriceUSD?: number | null` (`@IsOptional` acepta null para volver a heredar).
- Servicio: crea con `?? null` y en el patch un `null` explícito limpia el costo.
- Webapp: `costPriceUSD` en `ProductPresentation`; `presentationCostLabel` (helper puro con specs) muestra el costo propio o el del producto con `(hereda)`.
- Formulario: campo "Costo (USD)" con `DecimalInput` en modo dinero y placeholder de herencia; un valor inválido muestra error, no se ignora.
- Tabla: nueva columna "Costo"; copy de la ficha y del modal renombrada a "Tipos" (título, botones, avisos, confirmación, descomposición).
- Verificación: webapp typecheck 0 y 64 archivos / 635 tests; serverapp typecheck 0 y suites de producto 6 / 113.
- Pendiente manual: aplicar la migración en la base local y probar alta/edición/limpieza de costo en la ficha.
