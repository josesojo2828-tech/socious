# CRUD Maison Makeover

Objective: migrate CRUD screens to the Maison Lévrier style with a
single-page pattern (table list, optional summary strip, dedicated form
route, dedicated detail "ficha" route with delete), emphasis on the
producto/cliente/proveedor fichas, and a separate purchase-create screen
with drafts. Branch: main — the PARENT reviews and commits each unit.
Runner: `cd webapp && npm run typecheck`, `npm test` (vitest, node env).

Style system: `webapp/src/shared/lib/maison-style.ts` (read-only for
workers). Reference screens: `dashboard/caja/page.tsx` and
`dashboard/pos/page.tsx` (glass panels, eyebrow headers, brass CTAs,
mono tabular numbers).

## Specs

### S1 — Patrón CRUD (pantallas migradas)
User (verbatim): "mejora la UI, y que sea la tabla, una opcion para ver una
parte de resumen (en caso de ser necesario), y el formulario de crear editar,
y la ficha sea una unica pagina, y la opcion de eliminar"
Acceptance: list = Maison-styled table; optional summary strip only when the
entity has meaningful aggregates; create and edit live on their own route
forms; the detail (ficha) is its own route page and carries the delete
action with confirmation.

### S2 — Ficha de producto con presentaciones
User (verbatim): "en la ficha de producto debemos poder crear las
presentaciones, que es el mismo producto pero variando unas cosas, al darle
a crear presentacion dentro de la ficha de producto que el formulario tenga
ya todos los campos llenos con los datos del producto actual, ya que solo
cambiaran unas cosas, debemos agregar el campo aca de color."
Acceptance: the product detail route hosts presentations (existing
PresentationsCard, still gated on the PRESENTATIONS plan module); "Nueva
presentación" opens the form PREFILLED from the product (name, unit, sku/
barcode conventions derived from the product; color field present and
editable); saving posts the existing endpoints unchanged.

### S3 — Fichas con énfasis
User (verbatim): "Debemos hacer enfasis especificamente en las fichas de:
productos, cliente, proveedores"
Acceptance: the three entities get detail routes per S1 with their key data
(cliente: saldo/límite de crédito; proveedor: balance + ubicaciones
existentes; producto: stock, precios, presentaciones).

### S4 — Compra en otra pantalla con borrador
User (verbatim): "El formulario para crear compra debe ser en otra pantalla,
debe poder guardarse como borrador (almacenarse para continuar despues) y
marcar productos proveedores y todo eso, que sea super intuitivo y facil de
usar"
Assumption (stated, not hidden): drafts persist in localStorage — station-
local like most POS tickets; backend-synced drafts are a future upgrade.
Acceptance: `/dashboard/compras/nuevo` dedicated intuitive screen (supplier,
dates, item lines with catalog pick, totals); draft save / restore / discard
with a pure lib + specs; the existing list keeps its detail drawer with
receive/pay/cancel (moving that drawer to a route is S5, not this round).

### S5 — Resto de vistas (follow-up)
Recorded for later: ventas, pedidos, inventario, configuración, cuentas por
cobrar/pagar, rutas — same Maison treatment.

## Tasks

| ID | S# | Route | Status | Commit |
| -- | -- | ----- | ------ | ------ |
| T1 | S1,S2,S3 | delegated (productos) | pending | |
| T2 | S1,S3 | delegated (clientes) | pending | |
| T3 | S1,S3 | delegated (proveedores) | pending | |
| T4 | S1,S4 | delegated (compras) | pending | |

## Log

L1 (user, verbatim): the block opening "necesitamos migrar todas las
vistas, para este nuevo estilo… mejorar los cruds… tabla… resumen…
formulario de crear editar y ficha en una única pagina… eliminar" plus the
fichas emphasis (productos/cliente/proveedores), the pre-filled presentation
form with color, and the purchase screen with drafts.
