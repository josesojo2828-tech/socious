# CRM Overhaul

Objective: required client email, a logic-only notifications tab (AVANZADO+),
and multiple map-picked locations per supplier. Branch: main. Runners: webapp
vitest, serverapp jest.

## Specs

### S1 — Client email is obligatory
User (verbatim): "el campo correo debe ser obligatorio"
Acceptance: CreateClientDto requires a valid email; the client form validates
and always sends it. Updates keep email optional so legacy rows stay editable
(they must be valid when present).

### S2 — Notifications tab (logic only)
User (verbatim): "debe existir una tab en configuraciones (en avanzado y
premium) para las notificaciones, que notificar, y todo eso, habilitado por
checks, vamos a dejarlo solo en logica por ahora ya que aun no tenemos el
tema del correo y nada de eso"
Acceptance: tenant settings section `notifications` with checks (lowStock,
creditDue, orderReceived, saleCreated); the settings tab shows only for plans
granting the NOTIFICATIONS module (seeded into AVANZADO and PREMIUM); no
sending exists — the checks are stored and surfaced.

### S3 — Supplier locations on the map
User (verbatim): "La ubicaciones de los proveedores pueden ser varias, y se
deben seleccionar en un mapa, que serian las ubicaciones de las tiendas, y de
ahi mismo que se pueda colocar una referencia, seria tipo, se marca el punto
en el mapa, se le agrega una descripcion que seria tipo: sede principal,
punto de entrega y asi"
Acceptance: SupplierLocation model (label, lat, lng, optional address);
list/create under /api/suppliers/:id/locations, update/delete on the
resource; the supplier screen gains an Ubicaciones card (existing suppliers)
with the NutriMapPicker (maplibre + OSM) and a label per point.

## Tasks

| ID | S# | Status | Commit |
| -- | -- | ------ | ------ |
| T1 | S1 | done | (this) |
| T2 | S2 | done | (this) |
| T3 | S3 | done | (this) |

## Log

L1 (user, verbatim): the three numbered requests quoted in S1–S3. Report
format per item: brief description, complete or questions, how to verify.
