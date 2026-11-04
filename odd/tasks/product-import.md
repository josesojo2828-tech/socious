# Importación de productos por CSV

**Objetivo:** el cliente carga su catálogo desde un CSV: descarga la plantilla, previsualiza filas y errores, y crea solo las filas válidas (importación parcial) reutilizando el alta de producto existente.
**Rama:** `feat/product-import`.
**Estrategia de entrega:** `ask-on-risk` — pronóstico ~700 líneas (> 400): confirmar cadena de PRs antes del primer slice que supere el umbral. No push/PR sin orden explícita.
**Test runner:** `npx jest <path>` (serverapp) / `npx vitest run <path>` (webapp). Baselines: serverapp **86 suites / 767 tests**, webapp **53 archivos / 488 tests**; typecheck serverapp **0**, webapp **0**. **Nunca build.**

---

## Specs

> Decisiones cerradas con el usuario. Los fragmentos entre comillas son **verbatim**; el resto son criterios de aceptación del plan.

### S1: Endpoints y transporte

- `GET /api/products/import/template` → `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="plantilla-productos.csv"`. Requiere sesión (`SessionAuthGuard`), como el resto del catálogo.
- `POST /api/products/import/validate` → dry-run: no escribe nada. Devuelve `{ rows, errors, summary }`.
- `POST /api/products/import` → commit: **revalida en el servidor** y crea solo las filas válidas. Devuelve `{ created, skipped, errors }`.
- Transporte **JSON, no multipart**. Cuerpo: `{ content: string, filename?: string }`, donde `content` es el texto completo del archivo ya decodificado por el navegador.
- Límite de **2 MB** medido en bytes UTF-8 (`Buffer.byteLength(content)`). Se rechaza la petición completa con 400: `"El archivo supera el límite de 2 MB."`
- Límite duro de **500 filas de datos** (sin contar el encabezado). Se rechaza la petición completa con 400: `"El archivo supera el límite de 500 filas."`
- Contenido vacío o solo encabezado → 400: `"No se recibió contenido para importar."`
- Las rutas de importación se declaran en `ProductController` (mismo prefijo `api/products`) **antes** de `@Get(":id")`, junto a `raw-materials`, para no depender del orden de resolución de rutas.

### S2: Formato del archivo y codificación

- Delimitador `,` y comillas dobles según RFC 4180 (campos con coma, comilla o salto de línea van entre comillas; `""` escapa una comilla). La primera línea es el encabezado.
- La plantilla descargada se genera con **BOM UTF-8** (`\uFEFF`) para que Excel abra bien los acentos.
- Números decimales con punto: `12.50`. Valores vacíos en columnas opcionales usan el default del alta (0, `UND`, `false`).
- Codificación: intentar **UTF-8 estricto**; si falla, decodificar como **Windows-1252 (Latin-1)**; si también falla, rechazar el archivo con un error legible. La decodificación ocurre en el navegador con `TextDecoder(..., { fatal: true })`, porque el servidor recibe un string JSON y ya no tiene los bytes originales.
- La plantilla tiene exactamente estas columnas, en este orden: `sku,nombre,tipo,barcode,descripcion,costo_usd,venta_usd,stock_inicial,unidad,categoria,proveedor,publico`.

### S3: Reglas por fila

Cada fila se mapea a `CreateProductDto`:

| Columna | Campo | Regla |
| --- | --- | --- |
| `sku` | `sku` | Obligatorio, `^[A-Za-z0-9._-]+$`, ≤ 60. Único **dentro del archivo** y **dentro del tenant** (el alta reutiliza `assertSkuAvailable`). |
| `nombre` | `name` | Obligatorio, ≤ 200. |
| `tipo` | `isService` / `isRawMaterial` | Obligatorio, sin distinguir mayúsculas: `producto` → ambos `false`; `servicio` → `isService: true`; `material` → `isRawMaterial: true`. Otro valor → error de fila. |
| `barcode` | `barcode` | Opcional, ≤ 60. |
| `descripcion` | `description` | Opcional, ≤ 2000. |
| `costo_usd` | `costPriceUSD` | Opcional, numérico ≥ 0, default 0. |
| `venta_usd` | `salePriceUSD` | Opcional, numérico ≥ 0, default 0. |
| `stock_inicial` | `stock` | Opcional, numérico ≥ 0, default 0. El alta lo fuerza a 0 si `isService`. |
| `unidad` | `unit` | Opcional, ≤ 20, se normaliza a mayúsculas; vacío → `UND`. |
| `categoria` | `categoryId` | Resolución **por nombre**, sin distinguir mayúsculas, contra el catálogo del tenant ∪ catálogo del sistema (`organizationId null`). No encontrada → `null` + warning; la fila se importa. |
| `proveedor` | `supplierId` | Resolución **por nombre**, sin distinguir mayúsculas, solo proveedores del tenant. No encontrado → `null` + warning; la fila se importa. |
| `publico` | `isPublic` | `true/1/si/sí` → `true`; `false/0/no` o vacío → `false`; otro valor → error de fila. |

- Filas con al menos un campo inválido o un SKU duplicado dentro del archivo → **inválidas**: no se crean y se reportan con número de línea.
- Los SKU duplicados dentro del archivo se detectan en memoria antes de cualquier escritura; la primera aparición es válida y las siguientes inválidas.
- `status` no viene en el CSV: lo deriva `ProductService.create()` a partir del stock (`ACTIVE` / `OUT_OF_STOCK`) o `ACTIVE` si es servicio.

### S4: Resultado de la validación (dry-run)

- `GET/POST` de validación no modifican la base: cero `Product`, cero `StockMovement`.
- `rows`: `[{ line, sku, name, tipo, valid, errors: string[], warnings: string[] }]`. `line` es la línea real del archivo (encabezado = 1).
- `errors`: lista plana `[{ line, field, message }]` para pintar el detalle por línea.
- `summary`: `{ total, valid, invalid, warnings }`.
- Mensajes en español neutral y con la línea: por ejemplo `"Fila 4: el SKU es obligatorio."`, `"Fila 7: el tipo debe ser producto, servicio o material."`, `"Fila 9: el SKU \"ABC\" está repetido en el archivo."`, `"Fila 11: la categoría \"Bebidas\" no existe; se importará sin categoría."` (el último es warning, no error).

### S5: Commit (importación parcial)

- Vuelve a validar el contenido recibido; **nunca confía** en el preview del cliente.
- Crea **solo las filas válidas**. Las inválidas no abortan la operación: se cuentan en `skipped` y se reportan en `errors`.
- Respuesta: `{ created: number, skipped: number, errors: [{ line, field, message }] }`.
- Cada fila se crea llamando a `ProductService.create(scope, dto, tx)` — **no** `createMany` — para conservar la verificación de SKU, el `StockMovement` de existencia inicial (`STOCK_INICIAL`), la derivación de estado y `createdById`.
- Las filas se agrupan en lotes de **100** dentro de una transacción por lote (`maxWait` 5 s, `timeout` 30 s). Si un lote falla, ese lote se revierte y el resto de los lotes ya confirmados se mantienen; el error se reporta en `errors` con la línea afectada.
- `created`/`skipped` suman exactamente `total` del archivo (sin el encabezado).

### S6: Reutilización del alta existente (ajuste mínimo necesario)

- `ProductService.create()` pasa a aceptar un cliente de transacción opcional: `create(scope, data, tx?)`. Sin `tx` se comporta exactamente como hoy (`this.prisma.$transaction`); con `tx`, usa esa transacción y no abre una anidada.
- `assertSkuAvailable` se mantiene privada: la usan `create()` y `update()` como hoy. La unicidad intra-archivo es responsabilidad del validador de importación.
- El commit de importación resuelve categoría/proveedor → id en una sola lectura por importación (mapas por nombre normalizado), no una consulta por fila.

### S7: UI del catálogo (webapp)

- Botón **"Importar"** junto a **"Nuevo producto"** en `/dashboard/productos` (misma familia visual `CTA_BRASS`, sin reemplazar el alta existente).
- Abre `ProductImportModal` con el patrón `useModalStore` + `ModalRoot` (igual que `MaterialFormModal`), `size: "lg"`.
- Pasos del modal: (1) descargar plantilla; (2) elegir archivo `.csv`; (3) vista previa en tabla con errores y warnings por línea; (4) confirmar importación; (5) toast resumen (`creados`, `omitidos`) y recarga de la lista.
- La lógica de parseo, decodificación y armado del payload vive en una librería pura `webapp/src/features/products/lib/product-import.ts` (mismo patrón que `product-list.ts`), con sus specs; el componente solo orquesta estado y llamadas.
- La vista previa del cliente es informativa: el resultado final es el del servidor.

### S8: Fuera de alcance (v1)

- XLSX u otros formatos; importación de BOM/componentes, imágenes, variantes/presentaciones.
- Trabajos en segundo plano, colas o importaciones de más de 500 filas.
- Actualización de productos existentes (el import solo crea; un SKU ya existente en el tenant es fila inválida).
- Edición de la plantilla por el cliente, mapeo de columnas configurable.

---

## Tasks

| ID | S# | Route | Estado | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S2, S6 | inline | pendiente | `feat(productos): plantilla CSV y parser de importación` |
| T2 | S3, S4 | inline | pendiente | `feat(productos): validación previa de importación CSV` |
| T3 | S5, S6 | inline | pendiente | `feat(productos): importación parcial de productos por CSV` |
| T4 | S2, S7 | delegado | pendiente | `feat(productos): librería pura de importación CSV` |
| T5 | S7 | delegado | pendiente | `feat(productos): modal de importación en el catálogo` |

- **T1** — `ProductImportService` + parser CSV puro (RFC 4180, BOM) + DTOs `ImportProductsDto` / `ImportValidateResult` + `GET /api/products/import/template` en `ProductController` antes de `:id` + `create(scope, dto, tx?)` en `ProductService` + specs.
- **T2** — Validador por fila (campos, `tipo`, números, SKU intra-archivo, resolución de categoría/proveedor por nombre) + `POST /import/validate` + límites 2 MB / 500 filas + specs (dry-run no escribe).
- **T3** — `POST /import` con revalidación, lotes de 100 y transacción por lote reutilizando `create()` + specs de importación parcial, kardex y SKU duplicado.
- **T4** — `product-import.ts` puro (decode UTF-8→Windows-1252, parse, preview, payload) + `product-import.spec.ts`.
- **T5** — `ProductImportModal` (descarga, selección, preview, confirmación, resumen) + botón "Importar" en la página de productos + endpoints en `products.endpoints.ts` + specs.

## Log

- **L1** (verbatim): "Bien, ahora, sabes que necesitamos hacer algo para que el cliente pueda importar sus productos, que recomiendas hacer?"
- **L2** (verbatim): "dale, arma el odd"
- **L3** (verbatim): "dale, arma el odoo y el plan de implementacion"
- **L4** (decisiones cerradas con el usuario): formato CSV únicamente (sin XLSX); UTF-8 con fallback a Latin-1/Windows-1252; plantilla con BOM UTF-8; transporte JSON `{ content, filename? }` con límite de 2 MB; endpoints `GET /import/template`, `POST /import/validate`, `POST /import`; columnas `sku,nombre,tipo,barcode,descripcion,costo_usd,venta_usd,stock_inicial,unidad,categoria,proveedor,publico`; `tipo` ∈ `producto | servicio | material`; categoría/proveedor por nombre (no encontrados → null + warning); `sku` obligatorio y único en archivo y tenant; commit reutiliza `ProductService.create()` por fila dentro de una transacción por lote (nunca `createMany`); límite de 500 filas; importación parcial; fuera de alcance XLSX, BOM/componentes, imágenes, jobs en segundo plano; UI con botón "Importar" y modal por `useModalStore`, parseo/validación en una librería pura.
