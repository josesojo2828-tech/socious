# Sub-webapp — Nutringest Sub (suscripciones y pagos)

**Objetivo:** Extraer toda la lógica de wallet/subscription/payments de nutringest.com a una web separada (`sub.nutringest.com`) con login (sin registro), para no romper lo operativo.

**Rama:** `feat/sub-webapp`

**Estrategia de entrega:** incremental, commits por unidad de comportamiento.

**Test runner:** `cd sub-webapp && npm test` · `cd sub-webapp && npm run typecheck`

---

## Specs

> Los fragments del usuario son verbatim.

### S1: Login sin registro

> "sea igual el login (SIN REGISTRO) para ahi tener toda la parte de la subscripcion y reporte de pago"

Criterios de aceptación:

- Página de login con email + contraseña.
- **No hay** link ni ruta de registro.
- Usa los mismos endpoints de auth que nutringest.com (`/api/auth/login`).
- Sesión compartida (mismo backend, mismo cookie/token).

### S2: Dashboard con estado de suscripción

> "ver cuantos dias faltan para vencer la subscripcion... si faltan 5 o menos verlo amarillo, y si faltan 1 verlo rojo"

Criterios de aceptación:

- Tarjeta de estado: nombre del plan, badge de estado, fecha de renovación, días restantes.
- Colores: >5 días normal, ≤5 días amarillo, ≤1 día rojo.
- Métricas: balance wallet, último pago, método de pago.
- Tabla de pagos recientes.

### S3: Selección de planes

- Tres planes (Básico, Profesional, Clínica) con precio, features y CTA.
- El plan actual se muestra como "Plan Actual".
- Botón para cambiar de plan.

### S4: Billetera

- Saldo disponible con botón de recarga.
- Historial de transacciones (o estado vacío).
- Método de pago vinculado.

### S5: Compatibilidad con backend existente

- Usa la MISMA API NestJS (`serverapp`) — sin duplicar lógica.
- Endpoints: auth, subscription, wallet, transactions.
- Sin cambios en serverapp salvo lo mínimo para exponer datos.

### S6: Producción segura

- No romper nutringest.com (ya se quitó wallet/subscription del dashboard).
- Login compartido con el mismo backend.

---

## Tasks

| ID | S# | Tarea | Ruta | Estado | Commit |
| --- | --- | --- | --- | --- | --- |
| T1 | S5 | Scaffold Next.js app en `sub-webapp/` con Tailwind + estructura base | inline | ⏳ | — |
| T2 | S1 | Página de login (sin registro) + auth store + middleware de sesión | inline | ⏳ | — |
| T3 | S2 | Dashboard: estado de suscripción con colores por días restantes + métricas + pagos recientes | inline | ⏳ | — |
| T4 | S3 | Página de planes: 3 tiers con features y CTA | inline | ⏳ | — |
| T5 | S4 | Página de billetera: saldo + historial + método de pago | inline | ⏳ | — |
| T6 | S1-S5 | Layout: sidebar con navegación (Dashboard, Mi Plan, Pagos, Billetera) + topbar | inline | ⏳ | — |
| T7 | S5 | Seam: typecheck, tests, build | inline | ⏳ | — |

---

## Log

### L1 — 2026-10-27 — Solicitud del usuario

> "vamos a hacer otra web que sea tipo: pagos.nutringest.com o sub.nutringest.com asi sacamos toda esa logica de aca, para no romper lo operativo, y hacelo en otra instancia, que aja, sea igual el login (SIN REGISTRO) para ahi tener toda la parte de la subscripcion y reporte de pago"

> "el backend sera el mismo, pero el usuario sesionado no puede ver eso de wallet, ni mi subscripcion, ni nada de eso. y el admin ahi puede ver (desde nutringest.com) los pagos reportados y todo eso"

> "del /dashboard y el /perfil debemos quitar la subscripcion, y los enlaces a http://localhost:11000/dashboard/wallet"

> "Al crear cuenta aun deberia poder ir a /dashboard/subscripcion que es donde el usuario normal selecciona su plan"

Vistas de diseño generadas en Stitch (project `4428100316493088303`):
1. Login (mobile) ✅
2. Dashboard (desktop) ✅
3. Planes (desktop) ✅
4. Billetera (desktop) ✅
5. Historial de Pagos — pendiente (timeout)
