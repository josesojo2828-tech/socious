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

- **Delimitador autodetectado**: se cuenta la cantidad de `,` y de `;` fuera de comillas en la línea de encabezado. Gana el más frecuente; empate o ninguno → `,`. La plantilla descargada usa `,`.
- Comillas dobles según RFC 4180 (campos con delimitador, comilla o salto de línea van entre comillas; `""` escapa una comilla). La primera línea es el encabezado.
- Encabezados tolerantes: se recortan, se pasan a minúsculas y se ignoran acentos y el BOM (`\uFEFF`). `Descripción` y `descripcion` son la misma columna.
- La plantilla descargada se genera con **BOM UTF-8** (`\uFEFF`) para que Excel abra bien los acentos.
- **Separador decimal flexible** en `costo_usd`, `venta_usd` y `stock_inicial`. Normalización determinística, en este orden:
  1. Quitar espacios, espacios no separables (`\u00A0`), símbolo de moneda y `%`.
  2. Si el valor contiene `.` y `,` a la vez: el **último** en aparecer es el separador decimal; el otro es separador de miles y se elimina. `1.234,56` → `1234.56`; `1,234.56` → `1234.56`.
  3. Si aparece un solo tipo y **más de una vez**: todos son separadores de miles y se eliminan. `1.234.567` → `1234567`.
  4. Si aparece un solo tipo, **una vez**: `,` → separador decimal (`12,50` → `12.50`); `.` con 1 o 2 dígitos detrás → separador decimal (`12.5` → `12.5`); `.` con exactamente 3 dígitos detrás → **separador de miles** más un warning `"Fila N: el número X es ambiguo; se interpretó como X sin decimales. Editalo en la vista previa si no es correcto."` (`1.234` → `1234`); `.` con 4 o más dígitos detrás → separador decimal (`1.2345` → `1.2345`).
  5. Vacío → default de la columna. No numérico tras normalizar → error de fila.
- Valores vacíos en columnas opcionales usan el default del alta (0, `UND`, `false`).
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

- `POST /api/products/import/validate` no modifica la base: cero `Product`, cero `StockMovement`.
- `rows`: `[{ line, include, values, errors: string[], warnings: string[] }]`, donde `values` es la fila **normalizada y editable**: `{ sku, nombre, tipo, barcode, descripcion, costo_usd, venta_usd, stock_inicial, unidad, categoria, proveedor, publico }`.
- `include` arranca en `true` para las filas válidas y en `false` para las inválidas.
- `errors`: lista plana `[{ line, field, message }]` para pintar el detalle por línea.
- `summary`: `{ total, valid, invalid, warnings }`.
- Mensajes en español neutral y con la línea: por ejemplo `"Fila 4: el SKU es obligatorio."`, `"Fila 7: el tipo debe ser producto, servicio o material."`, `"Fila 9: el SKU \"ABC\" está repetido en el archivo."`, `"Fila 11: la categoría \"Bebidas\" no existe; se importará sin categoría."` (el último es warning, no error).

### S5: Revisión editable antes de la carga (webapp)

- Antes de confirmar, la vista previa es una **tabla editable**, no un reporte de solo lectura.
- **Inclusión por fila**: cada fila tiene un checkbox `include`. Solo las filas marcadas se envían al commit.
- **Edición en línea**: el usuario puede corregir cualquier campo de cualquier fila (`sku`, `nombre`, `tipo`, `barcode`, `descripcion`, `costo_usd`, `venta_usd`, `stock_inicial`, `unidad`, `categoria`, `proveedor`, `publico`) sin volver a subir el archivo.
- Al editar una fila, la validación de esa fila se recalcula **en el cliente** con la misma librería pura que usó el servidor para el preview; errores y warnings se actualizan al instante.
- Acciones masivas: **"Incluir todas las válidas"** y **"Excluir las inválidas"**.
- Contador vivo: `incluidas`, `válidas incluidas`, `con error incluidas`, `excluidas`. El botón de confirmar se deshabilita si no hay filas incluidas o si hay filas incluidas con error.
- Una fila con error puede quedar incluida mientras se corrige; el commit la omite y la reporta en `skipped`.

### S6: Commit (importación parcial)

- `POST /api/products/import` recibe `{ rows: ImportRowDto[] }` — las filas **editadas y filtradas** por el usuario, no el CSV original.
- La cantidad de filas enviadas no puede superar 500; se rechaza con 400 `"El archivo supera el límite de 500 filas."`.
- Vuelve a validar cada fila en el servidor; **nunca confía** en el preview del cliente ni en los flags de validez que traiga.
- Crea **solo las filas incluidas y válidas**. Las inválidas incluidas no abortan la operación: se cuentan en `skipped` y se reportan en `errors`.
- Respuesta: `{ created, skipped, excluded, errors: [{ line, field, message }] }`. `excluded` cuenta las filas no incluidas.
- Cada fila se crea llamando a `ProductService.create(scope, dto, tx)` — **no** `createMany` — para conservar la verificación de SKU, el `StockMovement` de existencia inicial (`STOCK_INICIAL`), la derivación de estado y `createdById`.
- Las filas se agrupan en lotes de **100** dentro de una transacción por lote (`maxWait` 5 s, `timeout` 30 s). Si un lote falla, ese lote se revierte y el resto de los lotes ya confirmados se mantienen; el error se reporta en `errors` con la línea afectada.
- `created + skipped + excluded` suman exactamente la cantidad de filas recibidas.

### S7: Reutilización del alta existente (ajuste mínimo necesario)

- `ProductService.create()` pasa a aceptar un cliente de transacción opcional: `create(scope, data, tx?)`. Sin `tx` se comporta exactamente como hoy (`this.prisma.$transaction`); con `tx`, usa esa transacción y no abre una anidada.
- `assertSkuAvailable` se mantiene privada: la usan `create()` y `update()` como hoy. La unicidad intra-archivo es responsabilidad del validador de importación.
- El commit resuelve categoría/proveedor → id en una sola lectura por importación (mapas por nombre normalizado), no una consulta por fila.

### S8: UI del catálogo (webapp)

- Botón **"Importar"** junto a **"Nuevo producto"** en `/dashboard/productos` (misma familia visual `CTA_BRASS`, sin reemplazar el alta existente).
- Abre `ProductImportModal` con el patrón `useModalStore` + `ModalRoot` (igual que `MaterialFormModal`), `size: "lg"`.
- Pasos del modal: (1) descargar plantilla; (2) elegir archivo `.csv`; (3) vista previa **editable** según S5; (4) confirmar importación; (5) toast resumen (`creados`, `omitidos`, `excluidos`) y recarga de la lista.
- La tabla de preview permite editar celda por celda y alternar `include`, con los contadores y acciones masivas de S5.
- La lógica de parseo, decodificación, normalización numérica, validación por fila y armado del payload vive en una librería pura `webapp/src/features/products/lib/product-import.ts` (mismo patrón que `product-list.ts`), con sus specs; el componente solo orquesta estado y llamadas.
- La vista previa del cliente es informativa: el resultado final es el del servidor.

### S9: Fuera de alcance (v1)

- XLSX u otros formatos; importación de BOM/componentes, imágenes, variantes/presentaciones.
- Trabajos en segundo plano, colas o importaciones de más de 500 filas.
- Actualización de productos existentes (el import solo crea; un SKU ya existente en el tenant es fila inválida).
- Edición de la plantilla por el cliente, mapeo de columnas configurable.
- Edición masiva por mapeo configurable de columnas (la edición es celda por celda).
- Reordenar o eliminar filas por completo desde la preview (se excluyen con el checkbox).

---

## Tasks

| ID | S# | Route | Estado | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S2, S7 | inline | pendiente | `feat(productos): plantilla CSV y parser de importación` |
| T2 | S3, S4 | inline | pendiente | `feat(productos): validación previa de importación CSV` |
| T3 | S5, S6, S7 | inline | pendiente | `feat(productos): importación parcial de productos por CSV` |
| T4 | S2, S5, S8 | delegado | pendiente | `feat(productos): librería pura de importación CSV` |
| T5 | S5, S8 | delegado | pendiente | `feat(productos): modal de importación en el catálogo` |

- **T1** — `ProductImportService` + parser CSV puro (delimitador autodetectado, RFC 4180, BOM, normalización numérica con separador decimal flexible) + DTOs `ImportProductsDto` / `ImportRowDto` / `ImportValidateResult` + `GET /api/products/import/template` en `ProductController` antes de `:id` + `create(scope, dto, tx?)` en `ProductService` + specs.
- **T2** — Validador por fila (campos, `tipo`, números, SKU intra-archivo, resolución de categoría/proveedor por nombre) + `POST /import/validate` + límites 2 MB / 500 filas + `include` inicial + specs (dry-run no escribe).
- **T3** — `POST /import` con `{ rows }` editadas, revalidación server-side, lotes de 100 y transacción por lote reutilizando `create()` + `excluded` + specs de importación parcial, kardex y SKU duplicado.
- **T4** — `product-import.ts` puro (decode UTF-8→Windows-1252, delimitador autodetectado, parse, normalización numérica, validación por fila, preview editable y payload) + `product-import.spec.ts`.
- **T5** — `ProductImportModal` (descarga, selección, tabla editable con `include`, contadores, acciones masivas, confirmación, resumen) + botón "Importar" en la página de productos + endpoints en `products.endpoints.ts` + specs.

## Log

- **L1** (verbatim): "Bien, ahora, sabes que necesitamos hacer algo para que el cliente pueda importar sus productos, que recomiendas hacer?"
- **L2** (verbatim): "dale, arma el odd"
- **L3** (verbatim): "dale, arma el odoo y el plan de implementacion"
- **L4** (decisiones cerradas con el usuario): formato CSV únicamente (sin XLSX); UTF-8 con fallback a Latin-1/Windows-1252; plantilla con BOM UTF-8; transporte JSON `{ content, filename? }` con límite de 2 MB; endpoints `GET /import/template`, `POST /import/validate`, `POST /import`; columnas `sku,nombre,tipo,barcode,descripcion,costo_usd,venta_usd,stock_inicial,unidad,categoria,proveedor,publico`; `tipo` ∈ `producto | servicio | material`; categoría/proveedor por nombre (no encontrados → null + warning); `sku` obligatorio y único en archivo y tenant; commit reutiliza `ProductService.create()` por fila dentro de una transacción por lote (nunca `createMany`); límite de 500 filas; importación parcial; fuera de alcance XLSX, BOM/componentes, imágenes, jobs en segundo plano; UI con botón "Importar" y modal por `useModalStore`, parseo/validación en una librería pura.
- **L5** (verbatim): "si actualiza, para que separe los decimales, y tambien implementa que sea que se carguen luego se pueda ahi mismo (antes de hacer la carga como tal) que ahi mismo pueda marcar que si van pal baile o no, editarlos y todo de ahi mismo."
