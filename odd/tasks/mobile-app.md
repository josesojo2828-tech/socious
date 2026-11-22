# App móvil (Flutter)

Objetivo: montar la app móvil de Socius ERP — login, clientes, proveedores, productos, categorías, configuración, dashboard, compras y punto de venta — consumiendo la API existente.
Branch: `feat/mobile-app` · Delivery: `work-unit-commits` (~400 líneas por unidad) · Tests: `flutter test` · `flutter analyze`.

## Specs

- **S1** — `"montar todo aca desde el login, registro de clientes proveedores, productos, categorias, configuraciones hasta el dashboard y compras y el punto de venta"`.
- **S2** — Auth con Bearer: `POST /api/auth/login` devuelve `{ tokens: { access_token, refresh_token }, user }`; refresh en `POST /api/auth/refresh` con el RT en el mismo header. Tokens en `flutter_secure_storage`, nunca en texto plano.
- **S3** — Workspace: `GET /api/organizations/my-workspaces`; cada request lleva `x-workspace-id`. La app recuerda el último workspace elegido.
- **S4** — Clientes y proveedores: listar, buscar, crear y editar (`/api/clients`, `/api/suppliers`).
- **S5** — Productos y categorías: listar, buscar por nombre/SKU/código de barras, crear y editar (`/api/products`, `/api/categories`), con stock y precio.
- **S6** — Configuración: leer y editar los ajustes del tenant (`/api/settings`) y los métodos de pago visibles.
- **S7** — Dashboard: resumen del día usando `/api/sales/report`, `/api/cash/daily` y `/api/dashboard/tabs` (navegación por rol).
- **S8** — Compras: listar, ver detalle y recibir mercancía (`/api/purchases`, `POST /:id/receive`).
- **S9** — Punto de venta: carrito, totales con tasas del día (`/api/exchange/rates/latest`) y registro de la venta (`POST /api/sales`). Sin pasarela de pago en línea: los cobros se registran con los métodos del negocio.
- **S10** — La app no muestra módulos que el rol no puede usar (`/api/dashboard/tabs`).

## Tasks

- T1 ✅ → S1, S2, S3 · inline · proyecto Flutter `mobile/` + core (config por `--dart-define`, `flutter_secure_storage`, Dio con refresh single-flight, tema) + router con guard.
- T2 ✅ → S2, S3 · inline · login (validación pura testeada), splash que valida la sesión guardada, selector de workspace en `Más`.
- T3 🟡 → S1, S10 · shell con 5 tabs; los tabs por rol (`/api/dashboard/tabs`) quedan pendientes.
- T4 ✅ → S7 · inline · dashboard con saludo, workspace activo y tasas reales (`/api/exchange/rates/latest`).
- T5 ✅ → S5 · listado, búsqueda por nombre/SKU/código, escáner de cámara, ficha, alta y edición de producto (con categoría e IVA) y alta de categorías.
- T6 ✅ → S4 · clientes: listado con saldo, búsqueda y alta.
- T7 ✅ → S4 · proveedores: listado, búsqueda y alta.
- T8 ✅ → S8 · compras: listado, detalle y recepción con actualización de stock.
- T9 ✅ → S9 · POS: carrito, tasas del día, un cobro con el método del negocio (USD/Bs/USDT) y registro en `POST /api/sales`.
- T10 ✅ → S6 · configuración: turnos de caja, monedas visibles, materia prima y servicios.
- T11 🟡 → verificación · `flutter analyze` sin issues y `flutter test` 17/17. Se repite al cerrar cada tarea.

## Log

- **L1** — `"bien bien, ahora vamos a crear aca el proyecto en flutter u porfa, analiza todo para ir montando la app movil, desde la app seran cosas puntuales nada de pago ni nada asi, pero si vamos a ir pensando en eso, porfa listame todo lo que tenemos para montar a la app movil en flutter"`
- **L2** — `"ok bro, haz una planning para montar todo aca desde el login, registro de clientes proveedores, productos, categorias, configuraciones hasta el dashboard y compras y el punto de venta broo."`
- **L3** — `"monta eso y vamos a darle!"` → autoriza crear el proyecto y empezar.
- Hallazgo: no existía ningún proyecto Flutter (`nutringest_mobile/` no está en disco; `ARCHITECTURE.md` estaba desactualizado). Se creó `mobile/` con Flutter 3.41.6 / Dart 3.11.4.
- Decisión: `Bearer` en ambos tokens (verificado en `at.strategy.ts` y `rt.strategy.ts`), `x-workspace-id` por header, sin cookies ni webview.
- Decisión: modelos inmutables con `fromJson` escrito a mano en vez de `freezed` — menos tooling, sin archivos generados. Si el volumen de modelos crece, se migra.
- Decisión: un solo route `/home` con `NavigationBar` interna; se pasa a rutas anidadas cuando haga falta deep link.
- Alcance: no hay pasarela de pago en la app. El POS registra la venta con los métodos del negocio (`CASH_USD`, `PAGO_MOVIL`, `CASHEA`, etc.).

- **L4** — `"monta eso y vamos a darle!"` → se montó la base: proyecto `mobile/` (Flutter 3.41.6), core HTTP con refresh, login, shell, dashboard y la primera rebanada de inventario (lista + búsqueda + escáner + ficha). Evidencia: `flutter analyze` sin issues, `flutter test` 17/17.
- Decisión: el escáner alimenta el mismo `q` del backend (que ya busca `barcode`), así no hace falta un endpoint nuevo.
- Decisión: el shell usa una `NavigationBar` con estado en vez de rutas anidadas; se migra cuando haya deep links.

- **L5** — `"sigue broo, monta todoo entra en modo loop no pares hasta que acabes"` → se completaron T5-T10: categorías, alta/edición de producto, clientes, proveedores, POS, compras con recepción y configuración. `flutter analyze` sin issues, `flutter test` 21/21.
- **L6** — `"asegurate de que todo este en main, y crea un archivo no se, constant para yo colocar ahi el dns o lo que sea, ip puerto algo."` → `api_host.dart` es el único archivo a editar (host, port, useHttps); `--dart-define=API_BASE_URL` sigue mandando en builds. Todo commiteado en `main`.
- Pendiente: tabs por rol (T3b) y edición de clientes/proveedores (hoy sólo alta).
