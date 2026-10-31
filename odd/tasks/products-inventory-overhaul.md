# Products & Inventory Overhaul

Objective: barcodes, units-of-measure CRUD, multi-currency price entry, the
product/presentation split with decomposition, and categories + units managed
in a tabbed Configuración. Branch: main (user authorized committing straight
to main). Test runner: webapp `npm test` (vitest), serverapp `npm test` (jest).

## Specs

### S1 — Barcode generation
User (verbatim): "podemos hacer algo para generar los codigos de barra? creo que
puedes instalar algo de npm, lo instalas de una dentro del contenedor tambien."
Acceptance: jsbarcode installed in webapp (host AND inside the socius_dev_frontend
container — it has an anonymous /app/node_modules volume); the product form can
generate a valid EAN-13 (12 digits + computed check digit) and render any
barcode as SVG; check-digit math lives in a pure lib with specs.

### S2 — Units of measure CRUD
User (verbatim): "las unidades de medida deben ser un crud, para que funcione
tanto para ventas en unidad, como para carnicerias y todo eso."
Acceptance: UnitOfMeasure model (tenant rows + system defaults UND/kg/g/lb/oz/L/mL),
migration, backend module (list/create/update/delete, tenant-scoped writes),
settings Inventario tab hosts the CRUD, the product form's unit field becomes a
select fed by the CRUD (Product.unit keeps storing the abbreviation string — no
Product schema change); fractional quantities already work for butcher sales
(SaleItem.quantity is Decimal(12,2)).

### S3 — Price entry with currency selection
User (verbatim): "el precio del producto debemos seleccionar la moneda, y ahi
mismo mostrar cuanto seria en cada moneda seleccionada. Mostrar un mensaje que
diga que lo recomendable es que el costo este a bcv."
Acceptance: the product form picks the input currency (USD/VES/USDT); amounts
are stored in USD (canonical) using the latest BCV/USDT rates; the form shows
the live equivalent in the other enabled currencies; visible hint: "Lo
recomendable es registrar el costo en USD usando la tasa BCV."

### S4 — Products vs inventory + presentations (AVANZADO+)
User (verbatim): "Quiero que los productos sean una cosa, pero los productos en
inventario otra, y tambien tener presentaciones entre los productos, las
presentaciones sera como el mismo producto pero cambiando detalles que si el
colores, medidas, y eso, ya que asi podemos manejar las cantidades independientes,
e incluso poder descomponer un producto de kilos por ejemplo, en un bolsitas de
gramos y cosas asi. Esto debe ser configurable para los planes Avanzado y
Premium."
Assumptions (stated, not hidden): Product keeps its stock column as the bulk /
almacén balance; a ProductPresentation is a named variant (label, color,
measures, own sku/barcode/unit/stock/minStock) with an independent quantity;
decomposition moves quantity from the product bulk stock into presentations
(POST /api/products/:id/decompose, negative-stock guard, kardex movements);
the PRESENTATIONS module key is added to AVANZADO and PREMIUM (Básico keeps the
single-stock behavior); POS/sales pick a presentation when the product has them.

### S5 — Categories in a tabbed Configuración
User (verbatim): "Como las categorias son netamente visuales, vamos a tenerlas
en las configuraciones y que habilite cuales el quiera utilizar, en
configuraciones hacemos una tab que sea tipo para Inventario, General, y cosas
asi."
Acceptance: the settings screen gains tabs (General | Inventario); Inventario
hosts Unidades de medida (S2) and Categorías with an active toggle per
category (Category.isActive migration, default true); the /dashboard/categorias
sidebar entry is removed (management lives in settings); existing category API
keeps working.

## Tasks

| ID  | S#        | Route      | Status | Commit |
| --- | --------- | ---------- | ------ | ------ |
| T1  | S5+S2     | inline     | done | a96e08f |
| T2  | S2        | inline     | done | a96e08f |
| T3  | S5        | inline     | done | a96e08f |
| T4  | S1        | inline     | done | 25f5457 |
| T5  | S3        | inline     | done | 624b71c |
| T6  | S4        | inline     | done | (this commit) |

## Log

L1 (user, verbatim): the five numbered requests quoted in S1–S5 above, ending
with the requested report format: per item, a brief description, complete or
questions, and how to verify.

L2: all six tasks closed in one session on main. POS sale-lines do not yet
pick a presentation (stock still decrements the product bulk); that wiring
is the honest remainder of S4 and was reported to the user as pending.
