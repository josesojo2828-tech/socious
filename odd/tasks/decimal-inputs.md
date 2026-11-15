# Inputs numéricos con formato decimal

**Objetivo:** los inputs de dinero y cantidad del `webapp` muestran y editan un valor con formato fijo de 2 decimales, sin ceros a la izquierda (`01`), y respetando la unidad de medida: las cantidades en unidades (`COUNT`) son enteras.
**Rama:** `feat/decimal-inputs`.
**Estrategia de entrega:** `ask-on-risk` — pronóstico > 400 líneas; la cadena de PRs se decide cuando el usuario pida push/PR. Commits por work unit en la rama, sin push.
**Test runner:** `npx vitest run <path>` (webapp, `environment: "node"`, solo `*.spec.ts`). Baseline medido: typecheck **0**, **61 archivos / 588 tests**.

---

## Specs

> Los fragmentos entre comillas son **verbatim** del usuario. El resto son criterios de aceptación.

### S1: Formato fijo de 2 decimales

- Todo input de dinero y de cantidad muestra el valor con exactamente 2 decimales cuando no tiene foco: `0.00`, `1.00`, `25.50`, `1234.56`.
- El `placeholder` deja de ser la única señal de formato: el valor real está formateado.
- La precisión coincide con el esquema Prisma: `Decimal(14,2)` para dinero y `Decimal(12,2)` para `stock`/`minStock` (`prisma/schema.prisma:1025-1029`, `1444-1446`).

### S2: Dinero con máscara de centavos

- Decisión del usuario, verbatim: `"B: máscara de centavos, solo dinero"`.
- En campos de dinero los dígitos entran por la derecha: `1` → `0.01`, `12` → `0.12`, `123` → `1.23`, `2550` → `25.50`.
- Pegar `"12.50"` produce `12.50`; pegar `"1.234,56"` produce `1234.56` (se conservan solo dígitos).
- Borrar quita el último dígito: `0.01` → `0.00`.
- Nunca aparece `01`: el campo se renderiza desde un buffer de dígitos.

### S3: Cantidades con entrada decimal estándar

- En campos de cantidad el usuario tipea el valor normal: `1` → `1`, `1.5` → `1.5`, `12.34` → `12.34`.
- Cero a la izquierda se elimina al tipear: `01` → `1`, `00.5` → `0.5`. Request original verbatim: `"intentamos borrar un input que tiene un cero (0) y queda por ejemplo 01 y deberia ser 1"`.
- Se acepta coma o punto como separador decimal (`1,5` → `1.5`); máximo 2 decimales; sin negativos.
- Borrar todo deja el campo **vacío** (no reaparece un `0` que impida tipear).
- Al salir del campo se formatea a 2 decimales (`1` → `1.00`) o queda vacío cuando el campo admite vacío (`allowEmpty`).

### S4: Cantidades en unidades son enteras

- Recordatorio del usuario, verbatim: `"pero pendiente que hay cantidades que son unidades bro"`.
- Los decimales de una cantidad salen de `UnitOfMeasure.kind` (`prisma/schema.prisma:975`): `COUNT` → **0 decimales** (solo enteros), `WEIGHT`/`VOLUME` → **2 decimales**.
- Resolver puro `resolveUnitDecimals(abbreviation, units?)`: busca la abreviatura en el catálogo cargado; si no está, usa el mapa de unidades del sistema (`UND` → 0; `kg`, `g`, `lb`, `oz`, `L`, `mL` → 2); desconocida → 2 (permisiva, nunca bloquea una fracción legítima).
- En `decimals = 0` el separador decimal se ignora y solo se aceptan dígitos.

### S5: Reemplazo al enfocar

- Al enfocar un campo con valor `0`, `0.00` o vacío, el contenido queda seleccionado: tipear lo reemplaza. Request original verbatim: `"que yo pueda ir escribiendo y se vaya reemplazando los 0.00"`.

### S6: Contrato del componente

- Átomo `DecimalInput` en `src/shared/components/atoms/DecimalInput/`.
- Props: `value: string | number | null | undefined`, `onValueChange: (text: string) => void` (texto canónico: `"12.50"` o `""`), `mode?: "money" | "quantity"` (default `"quantity"`), `decimals?: number` (default 2), `allowEmpty?: boolean` (default `false`).
- Renderiza `type="text"` + `inputMode="decimal"` para controlar el texto completo; sin flechas de spinner.
- Reenvía `className`, `id`, `name`, `placeholder`, `required`, `disabled`, `readOnly`, `aria-*`, `onKeyDown`, `onFocus`, `onBlur` y `ref`.
- La lógica pura de sanitizado, formato y parseo vive en `src/shared/lib/decimal-input.ts` (testeable en node, sin DOM).

### S7: Sin cambios visuales no pedidos

- Cada input conserva exactamente las clases que hoy recibe; el átomo no impone estilos propios.
- No se tocan labels, textos, layout ni el envío a la API.

### S8: Fuera de alcance

- Inputs enteros de configuración: días de crédito (`SalesSettingsPanels`), días de trial (`admin/settings`), capacidad/orden de espacios, cédula de Pago Móvil, orden de tutorial, cupos de clínica, `DynamicForm` clínico.
- Porcentajes (`taxRate`, descuento de oferta).
- `sub-webapp` (no tiene inputs numéricos).

### S9: Verificación

- `npm run typecheck` sigue en **0**.
- Specs nuevos en verde y suite completa sin regresiones.
- Checklist manual por pantalla: tipear, borrar todo, blur, pegar `12.50`, unidad `UND` vs `kg`.

---

## Tasks

| ID | Specs | Ruta | Estado |
|---|---|---|---|
| T1 | `src/shared/lib/decimal-input.ts` + spec | inline | pendiente |
| T2 | `src/features/units/lib/unit-decimals.ts` + spec | inline | pendiente |
| T3 | Átomo `DecimalInput` | inline | pendiente |
| T4 | Migrar campos de dinero (máscara de centavos) | inline | pendiente |
| T5 | Migrar campos de cantidad (con `decimals` por unidad) | inline | pendiente |
| T6 | Verificación + doc | inline | pendiente |

---

## Log

### L1 — pedido original (verbatim)

> mano, sabes que quiero revisar algo aca.
>
> en los inputs bro,
>
> sabes que aja, tenemos los inputs, normal, nada del otro mundo, pero quiero que los inputs para cantidades, costos y todo eso tengan un formato establecido, con los decimales, que yo pueda ir escribiendo y se vaya reemplazando los 0.00 sabes?? puedes revisar eso? porque actualmente tenemos el peo de que intentamos borrar un input que tiene un cero (0) y queda por ejemplo 01 y deberia ser 1 y si es un input de cantidad o costo deberia ser 0.01 puedes ayudarme a hacer eso?? primero analiza, investiga y dame el veredicto de todo lo que vas a tocar y modificar.

### L2 — decisión de semántica (verbatim)

> B: máscara de centavos, solo dinero

### L3 — recordatorio de unidades (verbatim)

> pero pendiente que hay cantidades que son unidades bro

### L4 — diagnóstico

- 41 inputs `type="number"` en 22 archivos; no existe input numérico compartido.
- Dos causas del `01`: estado string sin normalizar (caja, POS, ventas, compras, presentaciones) y estado `number` que no permite vaciar el campo (ficha de producto, límite de crédito, costo de delivery).
- El `0.00` que se ve hoy es solo `placeholder` (Material, Service, caja).
- `vitest` corre en `node` y solo `*.spec.ts`: no hay DOM ni Testing Library, así que la lógica va a helpers puros.
