# Configuración del cliente desde la ficha de usuario

**Objetivo:** el admin de plataforma administra toda la configuración de un cliente desde la pestaña nueva "Configuración" de la ficha del usuario, y el cliente deja de ver las secciones que la plataforma no quiere que maneje.
**Rama:** `feat/config-admin-cliente` (worktree `socium-erp-worktrees/config-admin-cliente`).
**Estrategia de entrega:** `ask-on-risk`; commits por unidad de trabajo, sin push/PR.
**Test runner:** `npx vitest run <path>` (webapp) y `npx jest <path>` (serverapp). Nunca build.

---

## Specs

> Los fragmentos entre comillas son **verbatim** del usuario.

### S1: El admin configura al cliente desde la ficha

- Pedido verbatim: `"quiero que el admin tenga acceso a literal la pagina de configuracion por cliente, pero claro, desde la ficha de usuario."` y `"en esa ficha esten todas las configuraciones para que el admin entre y pueda modificarlas dede la fichade usuario."`.
- La ficha `/dashboard/users/[id]` suma la pestaña **Configuración**, visible solo para roles de plataforma (`permits.name` = `ADMIN` o `SUPERADMIN`).
- La pestaña muestra **todas** las secciones de configuración (las mismas de `/dashboard/configuracion`) y las edita contra la organización del usuario abierto.
- Si el usuario pertenece a más de una organización activa, la pestaña pide cuál antes de mostrar nada.
- El resto del dashboard del admin no cambia de contexto: no hay suplantación ni cambio de workspace.

### S2: El cliente deja de ver secciones

- Pedido verbatim: `"para que el cliente no tenga que manejar tantas cosas y asi limitamos eso."`.
- En `/dashboard/configuracion`, un usuario sin rol de plataforma **no ve**:
  - General: `Caja`, `Tipos de entrega`, `Rutas de entrega`, `Planes`.
  - Inventario: `Materia prima`, `Servicios`.
  - Las pestañas `Devoluciones`, `Notificaciones` y `Tienda`.
- El admin las ve todas, en su propia configuración y en la del cliente (S1).
- El cliente conserva: `Monedas visibles`, `Agencias de envío`, `Delivery`, `Sucursales`, `Unidades`, `Tallas`, `Categorías`, `Pagos`, `Ventas a crédito`.

### S3: El gate es por rol de plataforma

- No se usa `useWorkspaceRole.isGlobalAdmin`: ese helper también devuelve `true` para `CLINIC_ADMIN`/`CLINIC_MANAGER` (dueño del cliente), y el cliente debe quedar limitado.
- El predicado es `permits.name === "ADMIN" | "SUPERADMIN"` (o `permitId` equivalente), igual que el resto de las pantallas de plataforma.
- El backend sigue siendo la autoridad: `PATCH /api/settings` exige rol global o membresía ACTIVE con rol de administración (`organization-write-access.ts`).

### S4: Datos del pago en texto libre

- Pedido verbatim: `"la pestana de pagos debe poder agregar los datos del pago, todo un text area donde permita escribir."`.
- La pestaña `Pagos` suma un textarea persistido en la configuración del tenant (`settings.payments.instructions`), con guardado explícito y el mismo feedback de error que el resto de la pantalla.
- Sin migración: el campo vive en el JSON `Organization.settings`, con default vacío para las cuentas que no lo tienen.

### S5: Compatibilidad

- El cálculo de `planModules` de `GET /api/settings` deja de depender de los entitlements de quien llama: se resuelve para la organización resuelta. Sin esto, el admin no vería `Tienda`, `Rutas` ni `Notificaciones` al mirar a un cliente.
- La ficha del usuario suma su organización activa sin romper el payload actual.
- Los specs existentes de `settings`, `organization-scope`, `organization-write-access` y `dashboard` siguen verdes.

### S6: Verificación

- `typecheck` serverapp y webapp en 0.
- Specs nuevos/actualizados: ficha del usuario con organizaciones, `planModules` de una organización ajena, DTO/default de `payments.instructions`, helper de visibilidad por rol.
- Manual: admin abre ficha → Configuración → cambia una opción → se refleja en el cliente; cliente entra a Configuración y no ve las secciones de S2.

---

## Tasks

| ID | Specs | Ruta | Estado |
|---|---|---|---|
| T1 | S5 — la ficha del usuario expone sus organizaciones activas | inline | pendiente |
| T2 | S5 — `GET /api/settings` resuelve `planModules` para la organización pedida | inline | pendiente |
| T3 | S4 — `settings.payments.instructions` (default + normalización + DTO + espejo webapp) | inline | pendiente |
| T4 | S1 — proveedor de alcance + pestaña `Configuración` en la ficha | inline | pendiente |
| T5 | S2, S3 — visibilidad por rol de plataforma en `/dashboard/configuracion` | inline | pendiente |
| T6 | S4 — textarea de datos del pago en la pestaña `Pagos` | inline | pendiente |
| T7 | S6 — tests y documentación | inline | pendiente |

---

## Log

### L1 (pedido original, verbatim)

> ahora quiero que hagas algo, quiero que el admin tenga acceso a literal la pagina de configuracion por cliente, pero claro, desde la ficha de usuario.
>
> para que el cliente no tenga que manejar tantas cosas y asi limitamos eso.
>
> Vamos a quitar de la vista de cliente:
> General:
> - caja
> - Rutas de entrega
> - planes
>
> Inventario:
> - Materia prima
> - Servicio
>
> la pestana de pagos debe poder agregar los datos del pago, todo un text area donde permita escribir.
>
> Devoluciones (ocultar del cliente)
>
> Notificaciones (ocultar del cliente)
>
> Tienda (Ocultar del cliente)
>
> Todo lo que te pase ahi el cliente no debe verlo, pero el admin si. Trabaja en un workthree

### L2 (aclaración, verbatim)

> o sea, sabes que hay una ficha de usuario, que en esa ficha esten todas las configuraciones para que el admin entre y pueda modificarlas dede la fichade usuario.

### Decisiones

- Se descarta el modo "viendo como cliente" (suplantación de workspace): el admin no cambia de contexto, la configuración se abre dentro de la ficha y se ejecuta con `X-Workspace-Id` de la organización del usuario abierto.
- En L1 aparecen `Tipos de entrega` (primer bloque) y `Rutas de entrega` (bloques siguientes): son dos tarjetas distintas y se ocultan **las dos**. `Agencias de envío` y `Delivery` se mantienen visibles para el cliente.
