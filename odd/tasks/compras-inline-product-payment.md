# Compras: producto inline, UI de nueva compra y pago al crear

**Objetivo:** crear productos desde nueva compra (enlazados al proveedor), reorganizar la UI de `/dashboard/compras/nuevo` y registrar el estado de pago (pagada / inicial / crédito con fecha) en la misma creación.
**Rama:** `feat/compras-inline-product-payment` (desde `main`).
**Estrategia de entrega:** `ask-on-risk` — pronóstico ~550 líneas autorizadas (> 400): confirmar cadena de PRs antes del primer slice que supere el umbral. No push/PR sin orden explícita.
**Test runner:** `npx vitest run <path>` y `npm test` (webapp). Typecheck webapp baseline **0**. Nunca build.

---

## Specs

> Los fragments del usuario son **verbatim** (español).

### S1: Crear productos desde las compras, enlazados al proveedor

> "Poder crear productos desde las compras, y se pueden enlazar a un proveedor tambien"

Criterios de aceptación:

- Desde `/dashboard/compras/nuevo`, con proveedor elegido, un botón **Crear producto** abre un modal de alta mínima (SKU *, Nombre *, Costo USD prellenado desde la línea libre si existe, Unidad opcional).
- Al guardar, `POST /api/products` recibe `supplierId` = `form.supplierId` (el proveedor de la factura). Sin proveedor en la factura el botón no ofrece enlace (se puede crear sin `supplierId`, pero el flujo guía elegir proveedor primero).
- Si el alta parte de una línea libre con nombre/costo, al crear se **convierte esa línea** en línea de catálogo (`productId` + `productName` + `unitCostUSD` del producto creado); no se duplica la línea.
- SKU duplicado muestra el mensaje del backend (400) en un toast y el modal permanece abierto.
- Éxito: toast, modal cerrado, línea enlazada, catálogo recargado para que el producto aparezca en la lista.
- El modal usa el patrón `useModalStore.openModal` ya instalado en el layout.

### S2: UI de nueva compra más amigable y administrativa

> "Mejorar la UI de compras, para que sea mas amigable y administrativa, solo reorganizar unas cosas quitar otras y asi"

Alcance elegido por el usuario: **solo `/dashboard/compras/nuevo`**.

Criterios de aceptación:

- Secciones reordenadas en un flujo administrativo: **1 Proveedor → 2 Artículos → 3 Pago → 4 Datos de la factura (fechas/notas/adjunto) → 5 Resumen**.
- Se **quita** el párrafo largo de ayuda de "Solo productos de este proveedor" (se deja una línea corta o el tooltip/title); el checkbox permanece.
- Se **quita** la etiqueta redundante de "paso N" cuando el título de sección ya es suficiente; se usa un indicador numérico compacto al lado del título.
- La fecha "Pagar antes de" **no** vive en Fechas: pasa a la sección Pago cuando el modo es crédito (en los demás modos no se muestra).
- El resumen conserva artículos · unidades · subtotal · total · equivalencias (sin quitar datos reales).
- Sin cambios de comportamiento de borradores, factura adjunta ni catálogo filtrado.

### S3: Estado de pago en la creación (pagada / inicial / crédito con fecha)

> "En compras ahi mismo en nueva compra seleccionar si le pago, o si se dio una inicial, poder marcar cuotas plazos y cosas asi"
> Decisión del usuario: **"Estado + inicial + fecha"** — Pagada, Con inicial (monto + método) o A crédito (fecha de pago). Sin plan de cuotas; los pagos restantes se registran en la ficha. El backend ya lo soporta con `payments[]` + `dueDate`.

Criterios de aceptación:

- Nueva sección **Pago** en `/dashboard/compras/nuevo` con tres modos (píldoras o radios): `Pendiente` (default, comportamiento actual), `Pagada`, `Con inicial`, `A crédito`.
  - **Pendiente:** sin `payments`, `dueDate` opcional solo si se elige crédito… no: en Pendiente no se pide fecha de crédito; se mantiene `dueDate` vacío salvo que el usuario la escriba en Datos de la factura (compatibilidad). *Decisión de implementación:* en Pendiente el campo de fecha de crédito queda oculto (S2) y `dueDate` se envía vacío; si había fecha en el borrador se preserva al reanudar.
  - **Pagada:** método de pago (select de `PURCHASE_PAYMENT_METHODS`); el payload lleva `payments: [{ amountOriginal, currency, paymentMethod }]` con monto = total de la factura convertido a la moneda del método (USD directo; VES = total × rateBcv; USDT = (total × rateBcv) / rateUsdt). Sin rates no se puede marcar Pagada en moneda no-USD: se deshabilita el modo y se explica con un texto corto.
  - **Con inicial:** monto inicial (> 0) + método; `payments` con ese monto; `dueDate` opcional (resto del crédito).
  - **A crédito:** `dueDate` **obligatoria** ≥ `issueDate`; sin `payments`.
- Validación en `validatePurchaseForm` (mensajes en español, mismo tono que los existentes):
  - Pagada sin método → error.
  - Inicial con monto vacío/cero/no numérico → error.
  - Inicial con monto ≥ total → error ("El inicial no puede cubrir el total: usá Pagada.").
  - Crédito sin fecha → error; crédito con fecha < emisión → error (ya existe el mensaje de fecha).
- `buildCreatePayload` incluye `payments` solo cuando corresponde; **nunca** envía `payments: []`.
- El modo de pago y sus campos viajan en el **borrador** (local + server) con defaults para borradores viejos (`paymentMode: "PENDING"`).
- Tras crear con Pagada/Inicial, la ficha de la compra muestra `paymentStatus` PAID/PARTIAL (lo deriva el backend con `derivePaymentStatus`) — verificación manual en la ficha.
- Tests RED→GREEN en `purchase-form.spec.ts` para validación y payload; tests de mapeo de borrador si se toca `purchase-draft.spec.ts`.

---

## Tasks

| ID | S# | Route | Estado | Commit |
| --- | --- | --- | --- | --- |
| T1 | S3 | inline | hecho | (slice compras) |
| T2 | S3 | inline | hecho | (slice compras) |
| T3 | S1 | inline | hecho | (slice compras) |
| T4 | S2 | inline | hecho | (slice compras) |

- **T1** — Lógica pura de pago en `purchase-form.ts`: tipo `PaymentMode`, campos en `PurchaseForm`, `validatePurchaseForm`, `buildCreatePayload` con `payments` y conversión de total a la moneda del método. Specs en rojo → verdes. ✅
- **T2** — Borrador: `PurchaseDraft`/`draftToPayload`/`serverDraftFromResponse` con `paymentMode` + campos de pago (defaults seguros). UI de la sección Pago en `nuevo/page.tsx` cableada a T1. ✅
- **T3** — Modal de creación de producto desde nueva compra (SKU, nombre, costo, unidad, `supplierId`), conversión de línea libre → catálogo, recarga de catálogo. ✅
- **T4** — Reordenar secciones de `nuevo/page.tsx`, quitar ayuda larga del filtro de proveedor, mover fecha de crédito a Pago, indicador numérico compacto. ✅

Verificación al cierre: typecheck webapp **0**; suite **50 archivos / 447 tests, 0 fallos**.

## Log

- **L1** (verbatim): "en: http://localhost:8088/dashboard … COMPRAS 1. Poder crear productos desde las compras, y se pueden enlazar a un proveedor tambien 2. Mejorar la UI de compras, para que sea mas amigable y administrativa, solo reorganizar unas cosas quitar otras y asi 3. En compras ahi mismo en nueva compra seleccionar si le pago, o si se dio una inicial, poder marcar cuotas plazos y cosas asi."
- **L2** (decisión): alcance de pagos = "Estado + inicial + fecha (Recomendado)" — Pagada / Con inicial / A crédito con fecha; sin plan de cuotas.
- **L3** (decisión): UI a tocar = "Nueva compra" (no la lista ni la ficha).
- **L4** (evidencia): T1–T4 implementados en la rama `feat/compras-inline-product-payment`; RED→GREEN en `purchase-form.spec.ts` (30) y `purchase-draft.spec.ts` (16); typecheck 0; suite 447.
