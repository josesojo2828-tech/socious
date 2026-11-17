# Mayorista: configuracion por cliente y precio de mayoreo

**Objetivo:** un cliente marcado como mayorista (solo por el admin de plataforma) define minimo y precio de mayoreo en sus productos y materiales, y la venta aplica ese precio sola cuando la cantidad alcanza el minimo.
**Rama:** `feat/mayorista` (worktree `socium-erp-worktrees/mayorista`).
**Estrategia de entrega:** `ask-on-risk`; commits por unidad de trabajo, sin push/PR.
**Test runner:** `npx vitest run <path>` (webapp) y `npx jest <path>` (serverapp). Nunca build.

---

## Specs

> Los fragmentos entre comillas son **verbatim** del usuario.

### S1: El admin marca al cliente como mayorista

- Pedido verbatim: `"vamos a agregar una configuracion (que solo la pueda agregar el admin al usuario) y esa configuracion sea para "Mayorista""`.
- El flag vive en una columna real `Organization.isWholesaler` (default `false`), no en el JSON de settings que el cliente puede escribir.
- Solo un rol de plataforma (`ADMIN`/`SUPERADMIN`) puede cambiarlo, con un endpoint propio; el `OWNER`/`CLINIC_ADMIN` del cliente recibe 403.
- El admin lo enciende desde la ficha del usuario (pestana Configuracion) y desde la configuracion del cliente.

### S2: Campos de mayoreo en productos y materiales

- Pedido verbatim: `"ese mayorista debe activar unos campos al crear productos, materiales, que es: minimo mayoreo y costo por unidad de mayoreo"`.
- Con el cliente marcado mayorista, el formulario de producto y el alta de material muestran:
  - **Minimo mayoreo** (`Product.wholesaleMinQuantity`, nuevo).
  - **Costo por unidad de mayoreo** (`Product.wholesalePriceUSD`, ya existente).
- Al lado se muestra el total: `minimo × costo unitario` (`"ahi mismo mostart cuanto sera el costo de mayoreo por la cantidad minima"`).
- Sin el flag, esos campos no se muestran y no se envian.

### S3: Se aplica siempre en la venta

- Pedido verbatim: `"mejor que siempre se aplique."`.
- No hay check en el cobro: si el producto tiene minimo y precio de mayoreo cargados y la cantidad de la linea alcanza el minimo, la linea se cobra a mayorista.
- La resolucion es **del servidor**: el precio mayorista se calcula en `sale.service.resolveItems`, no se acepta del cliente.
- Por debajo del minimo, o sin datos de mayoreo, se mantiene el comportamiento actual (precio de venta de la presentacion o el que manda el cliente).
- El flag de la organizacion manda: con `isWholesaler = false` el precio mayorista se ignora aunque el producto lo tenga cargado.

### S4: Compatibilidad

- El campo `wholesalePriceUSD` ya existia y se editaba siempre; ahora queda dentro del bloque de mayoreo.
- Las ventas historicas y la importacion CSV no cambian de precio.
- La tienda publica y los pedidos online siguen con el precio de venta al detal (fuera de alcance).
- Migracion aditiva: `Organization.isWholesaler` con default y `Product.wholesaleMinQuantity` nullable.

### S5: Verificacion

- `typecheck` serverapp y webapp en 0.
- Specs nuevos: flag admin-only (admin si, cliente 403), `isWholesaler` en `GET /api/settings`, precio de mayoreo aplicado por cantidad y por flag, payload del formulario, total `minimo × unitario`.
- Manual: admin marca mayorista al cliente → el cliente carga minimo 12 y precio 5 en un producto → vende 12 y la linea sale a 5; vende 11 y sale al detal.

---

## Tasks

| ID | Specs | Ruta | Estado |
|---|---|---|---|
| T1 | S1, S2, S4 — schema: `Organization.isWholesaler`, `Product.wholesaleMinQuantity` + migracion | inline | ✅ `8e03886` |
| T2 | S1 — endpoint de plataforma para el flag + 403 al cliente | inline | ✅ `8e03886` |
| T3 | S1 — `isWholesaler` en `GET /api/settings` | inline | ✅ `8e03886` |
| T4 | S2 — DTO/servicio de producto aceptan `wholesaleMinQuantity` | inline | ✅ `8e03886` |
| T5 | S3 — precio mayorista resuelto en la venta | inline | ✅ `8e03886` |
| T6 | S1 — tarjeta admin-only en la configuracion del cliente | inline | ✅ (webapp) |
| T7 | S2 — campos y total en vivo en el formulario de producto y en materiales | inline | ✅ (webapp) |
| T8 | S3 — el POS cobra el precio mayorista al llegar al minimo | inline | ✅ (webapp) |
| T9 | S5 — tests y documentacion | inline | ✅ (ver evidencia) |

---

## Verificacion

- `serverapp`: `npm run typecheck` en 0; suite completa **120 suites / 1102 tests**.
- `webapp`: `npm run typecheck` en 0; suite completa **72 archivos / 792 tests**.
- Specs nuevos: `organization-wholesaler.controller.spec.ts` (la ruta exige `AdminGuard` y delega; DTO rechaza no-booleanos), `settings.controller.spec.ts` (flag mayorista del cliente), `product.service.spec.ts` (persiste minimo y precio), `sale.service.spec.ts` (aplica en el minimo, no debajo, ignora con el flag apagado), `pos-form.spec.ts` (recalcula al cambiar cantidad, presentacion manda, flag apagado ignora), `product-form.spec.ts` (total y payload).

## Gotchas de esta entrega

- **La base local tiene migraciones de `feat/restaurant-recipes`** (`20261117*`) que no estan en `main`. `prisma migrate dev` pide un reset que borraria los datos: la migracion se escribio a mano, se aplico con `db execute` y se marco con `migrate resolve --applied`.
- **`node_modules` enlazado entre worktrees rompe Prisma**: el cliente generado depende del schema. Un `prisma generate` desde otra rama piso el cliente compartido y dejo `main` sin `ProductLot`. En este worktree se instalaron dependencias reales (`npm install`) y se regenero desde `main` para reparar el checkout principal.
---

## Log

### L1 (pedido original, verbatim)

> mano, vamos a trabajar en algo en un worktree, vamos a  agregar una configuracion (que solo la pueda agregar el admin al usuario) y esa configuracion sea para "Mayorista" ese mayorista debe activar unos campos al crear productos, materiales, que es: minimo mayoreo y costo por unidad de mayoreo (ahi mismo mostart cuanto sera el costo de mayoreo por la cantidad minima)

### L2 (aclaracion, verbatim)

> si aplica si tiene eso de mayorista activo, y tiene las cantidades que definen el mayoreo, PERO, debe tener un check para aplicarlo o no aplicarlo

### L3 (decision final, verbatim)

> mejor que siempre se aplique.

### Decisiones

- L3 reemplaza el check de L2: no hay interruptor en el cobro. Con datos de mayoreo y cantidad suficiente, el precio mayorista se aplica siempre.
- El flag es una columna de `Organization` y no `settings.inventory`, porque el JSON lo escribe el cliente (`assertCanEditOrganization` incluye OWNER/ADMIN/CLINIC_ADMIN) y el requisito es que solo el admin lo toque.
- Hoy `Product.wholesalePriceUSD` existe pero no se usa en ninguna venta: esta entrega lo conecta.

### Mapa previo

- `Product.wholesalePriceUSD` en `schema.prisma:1039`, escrito por `product.service.ts:289`/`:372`, sin consumo en ventas.
- No existe concepto de cantidad minima (`grep minQuantity|mayoreo` → 0).
- El backend confia en `SaleItemInputDto.unitPriceUSD` (`sale.service.ts:793`); el precio solo se sobreescribe cuando la presentacion tiene precio propio (`:831-835`).
- Materiales: `MaterialFormModal.tsx:127-134` manda `sku`, `name`, `costPriceUSD`, `stock`, `unit`, `isRawMaterial`.
- No hay booleano per-cliente escribible solo por plataforma; `AdminGuard` existe pero no esta enganchado a ninguna ruta.
