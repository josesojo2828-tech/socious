# Carnes y Procesados: Despiece, Rendimiento y Mermas

**Objetivo:** Permitir a las organizaciones tipo "Carnes y Procesados" (configuradas por admin de plataforma) registrar compras de piezas o animales en canal con costo editable en caliente, despiezarlas en cortes específicos, calcular automáticamente la merma e impactar inventario y costos.
**Rama:** `feat/meat-processing`.
**Estrategia de entrega:** `ask-on-risk` — commits convencionales por unidad de trabajo; nunca build; typecheck y test verdes antes de reclamar; no push/PR sin orden explícita.
**Test runner:** `npm test` / `npx jest <path>` (serverapp) y `npm test` / `npx vitest run <path>` (webapp). Typecheck serverapp en 0, webapp en 0.

---

## Specs

> Los fragmentos entre comillas son **verbatim** del usuario.

### S1: Tipo de empresa "Carnes y Procesados" administrado desde plataforma
- Pedido verbatim: `"considero que debemos agregar el tipo de empresa CARNES y PROCESADOS... ese tipo de empresa debe ser una configuracion que se aplique desde el lado admin."`
- Criterios de aceptación:
  - Flag en base de datos: `Organization.isMeatProcessing: boolean` (default `false`), protegido contra escritura directa del cliente (mismo patrón que `isWholesaler`).
  - Endpoint de plataforma: `PATCH /api/organization/:id/meat-processing` con rol `ADMIN` / `SUPERADMIN`. El cliente recibe 403.
  - Visible en `GET /api/settings` como `isMeatProcessing: boolean` para adaptar la UI del tenant.
  - Toggle en la webapp dentro de la vista de detalle de organización del administrador (`/dashboard/admin/organizations/[id]`).

### S2: Catálogo de Piezas / Animales con costo base y edición en caliente
- Pedido verbatim: `"y ahi se agrega la pieza (podemos hacer un crud de piezas o animales con su costo (claro el costo puede variar asi que se debe poder editar en caliente))"`
- Criterios de aceptación:
  - Entidad `MeatCarcass` con nombre (ej. "Cochino en canal", "Media res"), código opcional y costo base referencial por kg (`defaultCostUSD`).
  - CRUD completo por tenant para administrar las piezas habituales del negocio.
  - Al registrar una orden de despiece, el costo por kilo se precarga desde la pieza seleccionada pero es **editable en caliente** para reflejar el precio exacto de la compra actual.

### S3: Pantalla de Compra / Despiece de Carne
- Pedido verbatim: `"y ahi se crea una nueva pantalla que sea compra CARNE... y ese cochino lo picaron y salio tanto de x, tanto de y y tanto de z y ahi seria todo el procedimiento para trabajar con carnes"`
- Criterios de aceptación:
  - Nueva ruta `/dashboard/carnes` accesible solo si `isMeatProcessing` está activo en el tenant.
  - Formulario de despiece interactivo:
    - Entrada: selección de pieza matriz, peso bruto recibido (kg), costo por kg (en caliente), costo total calculado y proveedor opcional.
    - Salidas: selector de productos existentes con unidad de peso (chuleta, costilla, pernil, etc.) con sus kilogramos obtenidos.
    - Indicadores reactivos en vivo: peso total obtenido, peso de merma (`pesoEntrada - pesoCortes`) y porcentaje de merma.
  - Al confirmar:
    - Se genera el registro `MeatDeconstructionOrder` y sus líneas `MeatDeconstructionItem`.
    - Se incrementa el stock de cada corte en el inventario (`StockMovement` de entrada asociado a la orden de despiece).
    - Se prorratea y actualiza el costo unitario de los cortes obtenidos.

### S4: Control de Mermas y Órdenes de Desecho
- Pedido verbatim: `"con las mermas y la orden de desecho y todo??"`
- Criterios de aceptación:
  - Toda orden de despiece calcula y almacena la merma neta en kilogramos y el porcentaje de merma.
  - Permite tipificar si la merma es pérdida por deshidratación/corte o desecho físico (grasa/hueso no comercial).
  - Historial consultable de órdenes de despiece con detalle de rendimientos y actas de merma.

### S5: Ajuste Manual de Costos y Memoria de Última Compra
- Pedido verbatim: `"el carnicero puede ajustar manualmente, y el sistema debe recordar estos datos, asi si el carnicero vuelve a comprar ya sabe ha como fue la ultima compra y todo eso bro"`
- Criterios de aceptación:
  - En la tabla de cortes del despiece, el costo por kilo de cada corte puede ser ajustado manualmente por el carnicero.
  - Al seleccionar una pieza (ej. "Cochino en canal"), el sistema recuerda y precarga:
    - El costo por kilo de la última compra (`lastCostUSD`).
    - Los cortes obtenidos en el último despiece de esa pieza con sus últimos costos asignados y rendimientos típicos, sirviendo de plantilla sugerida para agilizar la carga.
    - Muestra en cabecera un badge informativo: *"Última compra: $X.XX/kg el DD/MM/YYYY"*.

---

## Tasks

| ID | Specs | Ruta | Estado |
|---|---|---|---|
| T1 | S1, S2, S4 — Schema Prisma: `Organization.isMeatProcessing`, `MeatCarcass`, `MeatDeconstructionOrder`, `MeatDeconstructionItem` + migración | inline | ✅ Completado (`20261124100000_meat_processing_module`) |
| T2 | S1 — Endpoint admin de plataforma para activar `isMeatProcessing` + exposición en `GET /api/settings` + tests | inline | ✅ Completado (`organization-meat-processing.controller.spec.ts`, `settings.controller.spec.ts`) |
| T3 | S2 — Módulo backend `MeatCarcass` (CRUD de piezas / animales) + tests unitarios | inline | ✅ Completado (`meat-carcass.service.spec.ts`, `meat-carcass.controller.spec.ts`) |
| T4 | S3, S4, S5 — Módulo backend `MeatDeconstruction` (transacción de despiece, prorrateo/ajuste de costos, memoria de última compra e inyección en kardex) + tests | inline | ✅ Completado (`meat-deconstruction.service.spec.ts`, `meat-deconstruction.controller.spec.ts`) |
| T5 | S1 — Admin Webapp: Toggle en gestión de organizaciones para habilitar "Carnes y Procesados" | inline | ✅ Completado (`SettingsSurface.tsx`, `organizations.service.ts`) |
| T6 | S1, S2 — Webapp: Navegación condicional en sidebar (`/dashboard/carnes`) y CRUD de Piezas / Animales en modal | inline | ✅ Completado (`Sidebar.tsx`, `dashboard.service.ts`, `CarcassModal.tsx`) |
| T7 | S3, S4, S5 — Webapp: Pantalla `/dashboard/carnes` (Recepción de canal, desglose de cortes, pesaje, cálculo de merma en vivo, ajuste manual de costos y confirmación) | inline | ✅ Completado (`carnes/page.tsx`) |
| T8 | S4 — Webapp: Historial de despieces y visualización de Acta de Rendimiento / Merma con impresión | inline | ✅ Completado (`DeconstructionDetailModal.tsx`) |
| T9 | S1-S5 — Verificación general: typecheck (0 errores en serverapp y webapp), suites de pruebas (Jest y Vitest) en verde | inline | ✅ Completado (0 errores typecheck, 32 tests Jest, 804 tests Vitest) |

---

## Log

- **L1:** `"broo, aca estamos activos para que trabaje tipo una carniceria? asi por pesos, carnes y todo eso? con las mermas y la orden de desecho y todo??"`
- **L2:** `"quiero ir por la parte de que por ejemplo, compraron un chocino en canal, y ese cochino lo picaron y salio tanto de x, tanto de y y tanto de z"`
- **L3:** `"si bro, considero que debemos agregar el tipo de empresa CARNES y PROCESADOS. y ahi se crea una nueva pantalla que sea compra CARNE y ahi se agrega la pieza (podemos hacer un crud de piezas o animales con su costo (claro el costo puede variar asi que se debe poder editar en caliente)) y ahi seria todo el procedimiento para trabajar con carnes ese tipo de empresa debe ser una configuracion que se aplique desde el lado admin."`
- **L4:** `"dale!"`
- **L5:** `"el carnicero puede ajustar manualmente, y el sistema debe recordar estos datos, asi si el carnicero vuelve a comprar ya sabe ha como fue la ultima compra y todo eso bro"`
