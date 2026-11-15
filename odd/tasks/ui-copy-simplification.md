# ODD Task: Simplificación de copy UI

**Objetivo:** simplificar el copy visible en español de todo el ERP (sidebar, cards, botones, títulos) para que se lea e identifique de inmediato, sin perder el término completo donde aporta contexto. **Branch:** `feat/simplificar-copy-ui`
**Delivery strategy:** `ask-on-risk` (supera con holgura las 400 líneas autoradas — confirmar estrategia de cadena antes del primer slice de commits) · **Test runner:** `npm run typecheck` + `npm test` (webapp), `npm run typecheck` + `npx jest` (serverapp)

---

## Specs

> Requisitos acordados con el usuario. Los fragmentos entre comillas son verbatim del usuario (L1-L3).

### S1 — Un verbo por intención
`Crear` para alta, `Guardar` para edición, `Eliminar` para borrado. `Anular` se conserva para documentos contables (venta/compra). `Agregar` solo para añadir a una colección existente (líneas de un documento, ubicaciones, métodos de pago). Prohibidos como texto de botón: `Registrar`, `Añadir`, `Nuevo`/`Nueva`.

### S2 — El contexto va en el título, no en el botón
El botón es solo el verbo (`Crear`); la pantalla o el título del formulario lleva el sustantivo (`Nuevo cliente`).

### S3 — Sentence case en todo el copy de UI
`Guardar cambios`, nunca `Guardar Cambios`.

### S4 — Sidebar: sustantivo de una o dos palabras
Sin `de la`, `por`, `y`, `(POS)`, `/` ni `&`. La etiqueta corta vive en el menú; el término completo se conserva en el título de la página.

### S5 — Fuera de alcance
No se migra el copy existente al sistema i18n (`webapp/src/i18n/`), no se renombra ninguna clave interna (`key`, slug, enum) y no se cambia ningún identificador de lógica. Solo texto visible.

### S6 — Tests de etiquetas visibles
Los tests que fijan etiquetas visibles (`webapp/src/**/lib/*.spec.ts`, `serverapp/src/modules/dashboard/dashboard.service.spec.ts`) se actualizan en el mismo commit que la etiqueta.

## Notas

- Las etiquetas del sidebar se generan en el backend (`serverapp/src/modules/dashboard/dashboard.service.ts`, `getSidebarSections`) y se calculan por request — no se persisten en base de datos, por lo que renombrar no requiere migración.
- Parte de las etiquetas del sidebar son claves i18n (`common.sidebar.*`) resueltas desde `webapp/src/i18n/es/common.json`; el resto son cadenas crudas en el servicio.
- El pie del sidebar (`Cerrar sesión`) se resuelve por i18n (`common.auth.logout`), no por el servicio.
- No existen tests de render (`getByText` = 0, sin jsdom): renombrar copy en JSX no rompe tests de UI.

## Tasks

- [x] **T1** · S1-S6 · inline · Registrar este documento en `odd/tasks/` · commit: `71e7226`
- [x] **T2** · S4 · inline · Sidebar: backend (`getSidebarSections`), claves `common.sidebar.*` en `webapp/src/i18n/es/common.json` y pie del sidebar (`Sidebar.tsx`) · commit: `2beef6b`
- [x] **T3** · S1-S3 · inline · Primitivas compartidas: `DynamicForm` (default `Guardar Cambios`), `AlertDelete` (`crud/AlertDelete.tsx`), `TableActions` y `DynamicTable` · commit: `ff67949`
- [x] **T4** · S1-S3 · inline · Pantallas de catálogo y CRM: botones y títulos a verbo único + sustantivo en el título · commit: `0c01542`
- [x] **T5** · S1-S3 · inline · Pantallas transaccionales: POS, ventas, compras, pedidos, rutas y caja (`Anular` se conserva; `Agregar` solo para líneas de documento) · commit: `a2d4811`
- [x] **T6** · S3 · inline · Títulos con paréntesis técnicos: se retira el término entre paréntesis cuando no aporta · commit: `67e8f39`
- [x] **T7** · S3 · inline · Títulos de página y de card en sentence case · commit: `d50d4b6`
- [x] **T8** · S6 · inline · Verificación: `npm run typecheck` webapp/serverapp + suites (`npx vitest run`, `npx jest`) y actualización de los specs de etiquetas visibles · commit: — (ver L4)

## Log

- **L1** (verbatim): "activo? sabes que me estan solicitando que los nombres sean mas faciles, o sea, estan muy tecnicos y asi, deben ser cosas que uno pueda leer e identificar ahi mismo"
- **L2** (verbatim): "o sea, en el sidebar, en las cards, en los botones y asi que sea solo "Crear" y no "Registrar nuevo cliente" sabes?"
- **L3** (verbatim): "dale a todo bro. vas haciendo commits."
- **L4** — Verificación en `feat/simplificar-copy-ui`:
  - `webapp`: `npm run typecheck` sin errores; `npx vitest run` 60 archivos / 585 tests en verde.
  - `serverapp`: `npm run typecheck` sin errores; `npx jest src/modules/dashboard` 2 suites / 28 tests en verde.
  - Las etiquetas de estado/enum y las claves i18n no se renombraron; no se migró copy al sistema i18n.
  - El working tree contenía cambios de otro workstream (rebrand Stockira/Socious a Socius y un filtro de planes publicados), que se dejaron intactos y fuera de estos commits.
