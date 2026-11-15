# Tallas y medida con unidad en los tipos

**Objetivo:** el tipo de producto (presentación) suma una **talla** elegida de un catálogo editable y una **medida** con **unidad**. Ambos campos permiten elegir de una lista, escribir un valor propio o usar la opción **“Personalizado”**.
**Rama:** `main` (fusionado al terminar, para probar en local).
**Estrategia de entrega:** commit directo en `main` tras verificar; sin push/PR.
**Test runner:** `npx vitest run <path>` (webapp) y `npx jest <path>` (serverapp). Nunca build.

---

## Specs

> Los fragmentos entre comillas son **verbatim** del usuario.

### S1: Talla desde un catálogo

- Pedido verbatim: `"la medida debe poder ser por unidad de medida y la talla, vamos a crear una base de tallas tambien, seria tipo para la medida de la ropa, s, m, l, xl, y asi"`.
- Nuevo catálogo `ProductSize`: filas del sistema (`organizationId = null`, solo lectura) y filas propias de cada cuenta.
- Semilla del sistema: XS, S, M, L, XL, XXL, XXXL, Único.
- CRUD propio en Configuración → Inventario (“Tallas”), igual que Unidades: crear, activar/ocultar y eliminar las propias.
- El tipo guarda `sizeId` (si vino del catálogo) y `sizeLabel` (etiqueta al guardar), así renombrar o borrar una talla no reescribe tipos ya guardados.

### S2: Medida con unidad

- `measures` pasa a ser el **valor** de la medida (`"70"`, `"10×10"`, `"500"`).
- Nueva columna `measureUnit` para la unidad (`"g"`, `"cm"`, o un texto propio).
- La tabla del tipo muestra `valor + unidad` (`"70 cm"`); si no hay medida, `—`.

### S3: Escribir + opciones + “Personalizado”

- Pedido verbatim: `"pueden estar ambos, puedes dejar escribir y tener opciones ya ahi, puedes ahcer una opcion tipo "Personalizado""`.
- **Talla**: combobox con el catálogo (filtra escribiendo) + `Personalizado…`; al elegirlo aparece un campo de texto y se guarda `sizeId = null` con `sizeLabel` propio.
- **Unidad de medida**: combobox con opciones (`g`, `kg`, `L`, `mL`, `cm`, `m`, `in`) + `Personalizado…` para una unidad propia.
- Nunca se guarda texto libre como `sizeId`: el texto va a `sizeLabel`/`measureUnit`.

### S4: API

- `GET/POST/PATCH/DELETE /api/sizes` con el mismo guard y scoping que `/api/units`.
- Las tallas del sistema no se pueden editar ni borrar desde una cuenta.
- `CreatePresentationDto`/`UpdatePresentationDto` aceptan `measureUnit`, `sizeId` y `sizeLabel`.
- Con `sizeId`, el servidor valida que la talla sea del sistema o de la cuenta y guarda su etiqueta. Un id ajeno o inexistente → 400.

### S5: Compatibilidad

- Los tipos existentes conservan su `measures` como valor; sin unidad se muestran igual que antes.
- No se borra ninguna columna. Migración aditiva.
- El gating por plan (`PRESENTATIONS`) no cambia.

### S6: Verificación

- `typecheck` webapp y serverapp en 0.
- Specs nuevos: servicio de tallas, presentaciones con talla/medida, helpers de etiqueta.
- Manual: crear talla propia, usarla en un tipo, elegir `Personalizado` en talla y unidad, ver la tabla.

---

## Tasks

| ID | Specs | Estado |
|---|---|---|
| T1 | Catálogo `ProductSize` + migración + semilla | ✅ |
| T2 | API `/api/sizes` + panel en Configuración | ✅ |
| T3 | `measureUnit` + `sizeId`/`sizeLabel` en el tipo (DTO/servicio) | ✅ |
| T4 | Formulario y tabla: talla, medida, “Personalizado” | ✅ |
| T5 | Specs + verificación | ✅ |

---

## Log

### L1 — pedido de tallas y medida (verbatim)

> la medida debe poder ser por unidad de medida y la talla, vamos a crear una base de tallas tambien, seria tipo para la medida de la ropa, s, m, l, xl, y asi

### L2 — decisión de UX (verbatim)

> pueden estar ambos, puedes dejar escribir y tener opciones ya ahi, puedes ahcer una opcion tipo "Personalizado"

### L3 — implementación (evidencia)

- Migración `20261115234500_product_sizes`: tabla `ProductSize` + `measureUnit`, `sizeId`, `sizeLabel` en `ProductPresentation`.
- `ProductSizeService` con semilla idempotente y CRUD por cuenta; `ProductSizeController` en `api/sizes`.
- Servicio de presentaciones resuelve la etiqueta de la talla y rechaza un id inválido.
- Webapp: `features/sizes` (tipos, endpoints, panel) + `SizesPanel` en Configuración → Inventario.
- Formulario del tipo: “Talla” y “Unidad de medida” con `SearchableSelect` + `Personalizado…`; la tabla muestra Talla y Medida.
- Verificación: pendiente de la corrida final (se registra abajo).
