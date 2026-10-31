# Sales, POS & Cash Overhaul

Objective: creatable payment methods, multi-currency POS totals, credit
sales with configurable terms, always-open cash without shifts, configurable
return reasons, and presentation-aware POS selling. Branch: main. Runners:
webapp vitest, serverapp jest.

## Specs

### S1 — Payment methods CRUD (settings "Pagos" tab)
User (verbatim): "Los metodos de pago el usuario debe poder crearlos, para
esto creemos una tab en configuraciones que sea para los pagos"
Acceptance: tenant-scoped TenantPaymentMethod model; the POS options endpoint
returns built-ins plus the tenant's active customs; sale/purchase payment
validation accepts built-in codes and the tenant's own codes; the settings
Pagos tab lists (built-ins read-only) and CRUDs the tenant's methods
(name, code, currency, active).

### S2 — POS multi-currency totals
User (verbatim): "En el punto de venta mostrar cuanto seria el monto en cada
moneda configurada"
Acceptance: the POS payment panel shows the current total converted into
every currency the tenant enabled (currencies visibility) using today's
rates, live as the cart changes.

### S3 — Credit sales
User (verbatim): "Tener de una vez aca para la venta el tema de venta a
credito, que seleccione pagar ahora, o credito, al pulsar credito que se
abra una modal, o algo rapido y seleccione cuanto se pagara ahora, y en
configuraciones vamos a tener una tab para las ventas a credito ahi se
confgiura una inicial (opcional) y los dias de cobro, es decir, cada 15 dias,
una vez al mes, cada x dia y asi, volviendo a la modal para el tema del
credito que se pueda seleccionar o tambien dejar libre, es decir, seria tipo
por abonos."
Assumptions: cadence values QUINCENAL / MONTHLY / EVERY_N_DAYS / FREE; the
due date is computed backend-side and stored on Sale.dueDate (column exists)
plus a new creditTerms JSON column; the initial payment is a normal sale
payment created atomically with the sale; settings tab "Ventas a crédito"
holds the default initial amount (optional) and default cadence.

### S4 — Cash always open without shifts
User (verbatim): "si tenemos el tema de la caja y turnos deshabilitado que no
se muestre el tema de la caja en el sidebar, o si mejor que se muestre y ahi
se muestre el detalle como si fuera turno pero sin turno, o sea, es que si el
turno esta deshabilitado seria que el turno siempre esta abierto, comprendes?"
Acceptance: the sidebar keeps the Caja entry titled "Caja" when
shiftControl=false; the caja screen shows the always-open register (already
implemented — verified) and the sales UI never blocks on an open shift.

### S5 — Configurable return reasons
User (verbatim): "el tema de las devoluciones, se debe colocar algo tipo
porque se devuelve, y cosas asi, y ahi agrega una opcion que sea tipo 'solo
se lo estaba probando' o algo asi, estas opciones se deben poder configurar
(igual por checks) en las configuraciones en la tab de devoluciones (crearla
si no existe)"
Acceptance: tenant settings section `returns.reasons` (defaults include
"Solo lo estaba probando"); the settings "Devoluciones" tab toggles them and
adds customs; the return flow on Ventas shows the enabled reasons as a
select; SaleReturn.reason already stores the chosen label.

### S6 — Presentation-aware POS selling (continuation of products S4)
Acceptance: sale items carry presentationId (migration); the POS product
picker offers the active presentations of a product; selling a presentation
decrements its stock instead of the product bulk; the sale line records the
presentation.

## Tasks

| ID | S# | Status | Commit |
| -- | -- | ------ | ------ |
| T1 | S4 | pending | |
| T2 | S5 | pending | |
| T3 | S2 | pending | |
| T4 | S1 | pending | |
| T5 | S3 | pending | |
| T6 | S6 | pending | |

## Log

L1 (user, verbatim): the five numbered requests quoted in S1–S5 plus the
prior promise "dale a eso que tienes del POS" (presentation-aware selling).
Report format requested per item: brief description, complete or questions,
how to verify.
