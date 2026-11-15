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

- [ ] **T1** · S1-S6 · inline · Registrar este documento en `odd/tasks/` · commit: _pending_
- [ ] **T2** · S4 · inline · Sidebar: backend (`getSidebarSections`), claves `common.sidebar.*` en `webapp/src/i18n/es/common.json` y pie del sidebar (`Sidebar.tsx`) · commit: _pending_
- [ ] **T3** · S1-S3 · inline · Primitivas compartidas: `DynamicForm` (default `Guardar Cambios`), `DeleteAlert` (`crud/AlertDelete.tsx`), `TableActions`, `ModalActions`, `DynamicTable` · commit: _pending_
- [ ] **T4** · S1-S3 · inline · Pantallas de catálogo y CRM: botones y títulos a verbo único + sustantivo en el título · commit: _pending_
- [ ] **T5** · S1-S3 · inline · Pantallas transaccionales: POS, ventas, compras, pedidos, rutas y caja (`Anular` se conserva; `Agregar` solo para líneas de documento) · commit: _pending_
- [ ] **T6** · S3 · inline · Títulos de página y de card en sentence case · commit: _pending_
- [ ] **T7** · S6 · inline · Verificación: `npm run typecheck` webapp/serverapp + suites (`npm test`, `npx jest`) y actualización de los specs de etiquetas visibles · commit: _pending_
- [ ] **T8** · S1-S6 · inline · Cierre: barrido de `Registrar`, `Añadir`, `Nuevo`/`Nueva` y `Guardar Cambios`, más log final · commit: _pending_

## Log

- **L1** (verbatim): "activo? sabes que me estan solicitando que los nombres sean mas faciles, o sea, estan muy tecnicos y asi, deben ser cosas que uno pueda leer e identificar ahi mismo"
- **L2** (verbatim): "o sea, en el sidebar, en las cards, en los botones y asi que sea solo "Crear" y no "Registrar nuevo cliente" sabes?"
- **L3** (verbatim): "dale a todo bro. vas haciendo commits."
