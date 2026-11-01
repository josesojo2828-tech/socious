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

### S6 — Color del producto (#1)
User (verbatim): "Vamos a agregar un campo para el color, sera el color de
el producto, en el POS se debe mostrar un circulito con ese color"
Acceptance: `Product.color` (migration), form field, POS product card shows
a dot with that color.

### S7 — Variantes como copia (#2)
User (verbatim): "Vamos a agregar variantes en productos, se deben crear en
la ficha, que seria como una copia de este producto, es decir, seria,
producto casi igual, por ejemplo, distintos colores y cosas asi"
Acceptance: the product ficha offers "Crear variante" → the new-product
form prefilled as a copy (name/category/prices/unit/tax/color…) for the
merchant to tweak and save as a new product. Interpretation stated: variant
= copied PRODUCT (distinct from presentations/stock variants).

### S8 — Imágenes con límites por plan (#3)
User (verbatim): "Vamos a hacer la funcionalidad de cargar imagenes, plan
basico 1 imagen por producto y una por variante, plan premium 3 imagenes por
producto y 1 por variante" + clarified table: "Escalonado: 1/3/5 y variantes
1/2/3" → per PRODUCT: Básico 1 · Avanzado 3 · Premium 5; per VARIANT
(presentation): Básico 1 · Avanzado 2 · Premium 3.
Acceptance: real multipart upload (POST /api/file/upload → MinIO, public
prefixes product_/offer_), ProductImage + PresentationImage tables, image
slots in the product ficha and presentations card respecting the limits,
`imageLimits` exposed by GET /api/settings (server-computed from the org
subscription — modules cannot tell Avanzado from Premium).

### S9 — Módulo Ofertas (#4, plans clarified)
User (verbatim): "Vamos a crear las ofertas, debe ser un modulo nuevo
(practicamente) debe tener una fecha limite y productos, al crear se debe
agregar el nombre, slogan, imagenes tipo banner o algo asi, y la fecha de
vencimiento, y los productos que apliquen."
Clarified: plans = AVANZADO + PREMIUM.
Acceptance: Offer model (name, slogan, bannerKey, expiresAt, active) +
product links; OFFERS module seeded into Avanzado/Premium; CRUD screens
/list, /nueva, /editar (banner upload); sidebar entry; entitlement check
on write. Storefront display = follow-up (S11).

### S10 — Visibilidad en tienda desde la lista + validación de plan (#5/#6)
User (verbatim): "En la misma tabla de productos (la lista) debemos poder
con checks habilitar si esta visible en la tienda, pero claro con
permisos, ya que los planes basico no tienen eso" / "Validar los planes
tambien debe aplicar en las nuevas funcionalidades, por ejemplo para crear
producto pide que se marque si esta publico en la tienda, pero en el plan
basico no se debe ver, valida eso"
Acceptance: products table gains an isPublic toggle hidden without the
CATALOG_ONLINE module; backend rejects isPublic=true without it; all new
features (images, offers) validate their plan server-side.

### S11 — Consumo de ofertas en la tienda (follow-up)

### S14 — Compras: flujo guiado con datos reales (round 4)
User (verbatim): "#1. Seleccionar proveedor. #2. Agregar una configuracion
para validar si se mostrar unicamente lo productos de un proveedor, o
mostrar todos. #3. Mostrar los productos de ese proveedor o todos segun la
configuracion. #4. Debemos utilizar todos los datos de los productos,
precios y todo eso, no colocar el precio manual. #5. Poder cargar una foto
o un PDF de la factura que de el proveedor (opcional). #6. Hacer los
calculos y todo detallado. #7. Ahi mismo mostrar cuanto seria en cada
moneda configurada."
Acceptance: the nuevo screen leads with the supplier; tenant setting
`purchases.onlySupplierProducts` (default false = show all, stated) toggled
in-context filters the catalog to that supplier's products; picking a
product fills name + cost from the product record (cost readonly for
catalog lines; free-text lines keep manual cost as the escape hatch);
optional invoice attachment (image or PDF, private — served through an
authenticated endpoint, never the public asset allowlist); detailed totals
summary; per-currency equivalents using today's rates and the currency
visibility settings.

### S12 — Ficha de compra como ruta
Acceptance: `/dashboard/compras/[id]` own page with receive/pay/cancel;
list rows navigate there; the drawer is removed.

### S13 — Borradores de compra en el backend
User (verbatim): "Borradores de compra en el backend — hoy son por
estación (localStorage); sincronizarlos con la cuenta para cambiar de
equipo."
Acceptance: PurchaseDraft (one per org+user, Json payload) + CRUD-free
save/load/clear endpoints on /api/purchases/drafts; the nuevo screen
syncs server-first with localStorage as offline fallback; specs cover the
pure payload/merge logic.

### S5 — Resto de vistas (follow-up)
Recorded for later: ventas, pedidos, inventario, configuración, cuentas por
cobrar/pagar, rutas — same Maison treatment.

## Tasks

| ID | S# | Route | Status | Commit |
| -- | -- | ----- | ------ | ------ |
| T1 | S1,S2,S3 | delegated (productos) | pending | |
| T2 | S1,S3 | delegated (clientes) | pending | |
| T3 | S1,S3 | delegated (proveedores) | pending | |
| T4 | S1,S4 | delegated (compras) | done | 4a7484b |
| T5 | S6-S8,S10 | backend foundation (parent) | done | b727918 |
| T6 | S6-S8,S10 | delegated (producto/POS UI) | done | (this) |
| T7 | S9 | delegated (ofertas UI) | done | (this) |

## Log

L1 (user, verbatim): the block opening "necesitamos migrar todas las
vistas, para este nuevo estilo… mejorar los cruds… tabla… resumen…
formulario de crear editar y ficha en una única pagina… eliminar" plus the
fichas emphasis (productos/cliente/proveedores), the pre-filled presentation
form with color, and the purchase screen with drafts.

L2: S6–S10 closed (backend b727918 + two frontend units). Upload gotcha:
apiClient defaults to JSON Content-Type — multipart needs the explicit
header. Variant prefill resets isPublic (create would bypass the plan gate).
S11 storefront offer display and S5 screen restyles remain open.
