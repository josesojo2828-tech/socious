# Feedback Batch (10 findings)

Objective: close the user's ten-point feedback list. Branch: main. Runners:
webapp vitest, serverapp jest.

## Specs (verbatim)

S1: "Correo de cliente debe tener el * en el label"
S2: "En las configuraciones la inicial debe ser tambien opciones por check
(y tener, 10% y 0%)" — credit initial becomes check options (0%, 10%, 20%,
30%, 50%) storing a percent; the POS prefills the initial from it.
S3: "En metodo de pago debemos poder agregar si es binance, pago movil,
transferecia, efectivo (bolivares), efectivo (divisas) e igual habilitado por
checks, o sea que los puedan crear y que habilitra por checks" — the Pagos
tab lists the built-ins with enable checks (settings.payments.disabledCodes)
plus the existing custom CRUD.
S4: "Por defecto el usuario debe tener una subcursal. Puedes llamarla
subcursal principal o algo asi" — organizations are born with the default
branch NAMED "Subsucursal principal" and VISIBLE (existing orgs updated).
S5: "Al crear un proveedor debo poder agregar su ubicacion por un mapa. Y
desjarle un texto que sea como de referencia. (Al momento de crear)" — the
supplier create form gets the map picker + reference; the location is created
right after the supplier.
S6: "La moneda debe estar casada con el metodo de pago, asi al crear un
metodo se debe seleccionar una moneda, y asi nos ayuda a hacer los calculos y
no tener que seleccionar una moneda en el POS" — the POS drops the currency
select; the method carries the currency (customs already choose one).
S7: "en el mismo pos quiero poder al momento de hacer la venta si es un
pedido, si es una venta a credito y si es venta a credito ahi mismo
configurar la inicial, y las cuotas, claro esta, se colocan los valores por
defecto pero se le da la opcion de que puedan editar la inicial y el rango
de fecha entre cuotas" — POS modes: Contado | Crédito | Pedido (gated on the
ORDERS module per the plan matrix); credit panel gets an editable initial and
an editable interval with a due-date preview; pedido posts /api/orders with
the selected client's name/email and the workspace slug.
S8: "Tengo deshabilitado el check de caja y aun veo en el sidebar 'Caja y
turno', no lo deberia ver si esta ese check desactivado" — backend verified
correct ("Caja" when off); the settings save must refresh the auth sidebar so
the change is immediate.
S9: "Si ya una venta esta pagado, no nos debe salir para abonar." — hide the
add-payment UI when paymentStatus is PAID.
S10: "Hice una devolucion, pero en la venta aun me sale que no se devolvió."
— sales list and detail must show returned state (backend exposes returns /
returned totals; the drawer refetches after a return).

## Tasks

| ID | S# | Status | Commit |
| -- | -- | ------ | ------ |
| T1 | S1,S9 | pending | |
| T2 | S10 | pending | |
| T3 | S8 | pending | |
| T4 | S2,S3,S6 | pending | |
| T5 | S4,S5 | pending | |
| T6 | S7 | pending | |

## Log

L1: the ten numbered requests verbatim (S1–S10). Report per item: brief
description, complete or questions, how to verify.
