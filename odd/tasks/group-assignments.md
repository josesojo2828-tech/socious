# Asignación por grupo de alimentos intercambiables

**Objetivo:** El nutricionista selecciona múltiples hortalizas o frutas de una vez y asigna UNA sola cantidad. El cálculo es por el total, no por alimento individual, porque todos los alimentos del grupo tienen el mismo perfil nutricional por intercambio.

**Rama:** `feat/group-assignments`

**Estrategia de entrega:** trabajo incremental en la rama, commits por unidad de comportamiento, seam al final.

**Test runner:** `cd serverapp && npm test` · `cd webapp && npm test`

---

## Specs

> Los fragments del usuario son verbatim (español, lenguaje del usuario).

### S1: Selección múltiple de hortalizas y frutas

> "yo como nutricionista selecciono, ejemplo, yo quiero seleccionar acelga, ají, esto, lo otro, pa pa pa pa pa"

> "allí podemos hacer es como una especie lista desplegable o de selector en el cual me aparezcan todas las hortalizas y vegetales que yo tengo"

Criterios de aceptación:

- Al seleccionar categoría HORTALIZAS Y VEGETALES o FRUTAS en `AddFoodModal`, el selector de alimentos cambia de selección simple a **multi-selección** (checkboxes).
- El nutricionista puede marcar 1 o más alimentos del grupo.
- Para las demás categorías (CARNES, GRASAS, LECHE, etc.) el selector sigue siendo de selección simple, sin cambios.

### S2: Una sola cantidad para el grupo

> "y abajo yo coloco cuánto yo quiero dar, si quiero dar media taza, si quiero dar una taza"

> "lo que me lo altera es la unidad de medida. Ejemplo, si yo coloco una taza, dos tazas, tres tazas, eso realmente es lo que me va a cambiar el cálculo"

Criterios de aceptación:

- Debajo de la multi-selección hay UN stepper de raciones (½, 1, 1½, 2, …).
- El stepper escala la medida igual que en selección simple (formatServing).
- Al guardar, se crea **UN solo `ExchangeListItem`**, no uno por alimento seleccionado.

### S3: Cálculo por total, no por alimento

> "realmente no te va a variar si yo meto este toda una taza de acelga o meto una taza con todos los alimentos o meto una taza con dos alimentos; o sea, no te va a cambiar los gramos, los carbohidratos y las proteínas, las calorías"

> "por cada cuestión que yo escoja, obviamente se me van a hacer cálculos y no debería de ser así"

Criterios de aceptación:

- Los macros del grupo se calculan **una sola vez** basándose en la cantidad total (1 intercambio HORTALIZAS = 25 kcal, 1 intercambio FRUTAS = 60 kcal).
- El `amount` del `ExchangeListItem` es el número de intercambios del grupo, no la suma de individuales.
- El `ExchangeListItem` apunta a cualquier alimento del grupo (`foodExchangeListId`), ya que todos tienen el mismo perfil nutricional.

### S4: El grupo se guarda con descripción

> "yo le explico al paciente que «mira, te estoy dando media taza, pero es es cocida»"

Criterios de aceptación:

- `ExchangeListItem` tiene un campo `groupLabel` (nullable) que guarda la descripción del grupo, ej: `"Acelga, Ají, Tomate"`.
- `groupLabel` es `null` para los items individuales (compatibilidad hacia atrás).
- La migración es **aditiva** (solo la columna nueva), sin `DROP`.

### S5: La tabla muestra el grupo

Criterios de aceptación:

- `FoodTablesExchangeList` muestra `groupLabel` cuando existe, y `foodExchangeList.name` cuando es `null`.
- `EditFoodModal` permite editar la cantidad del grupo y el `groupLabel`.

### S6: Datos de producción seguros

> "recuerda que hay datos en produccion, debemos tener cuidado, tener las migraciones al dia y todo eso"

Criterios de aceptación:

- Solo migraciones aditivas (`groupLabel` nullable).
- `prisma migrate status` verde antes y después.
- El seeder no se modifica (no afecta `FoodExchangeList`).

---

## Tasks

| ID | S# | Tarea | Ruta | Estado | Commit |
| --- | --- | --- | --- | --- | --- |
| T1 | S4, S6 | Migración aditiva: columna `groupLabel String?` en `ExchangeListItem`. Verificar `migrate status` verde | inline | ✅ | `671dfd9` |
| T2 | S4 | Backend: `groupLabel` en DTO de creación/actualización de items, en el servicio y en los tipos del webapp | inline | ✅ | `5f9bcfa` |
| T3 | S1 | `AddFoodModal`: multi-select (checkboxes) para HORTALIZAS Y VEGETALES y FRUTAS, selección simple para el resto | inline | ✅ | `aeb0b07` |
| T4 | S2, S3 | `AddFoodModal`: stepper de raciones del grupo + envío de UN `ExchangeListItem` con `groupLabel` | inline | ✅ | `aeb0b07` |
| T5 | S5 | `FoodTablesExchangeList`: mostrar `groupLabel` si existe, `foodExchangeList.name` si no | inline | ✅ | `7e91052` |
| T6 | S5 | `EditFoodModal`: editar cantidad del grupo y `groupLabel` | inline | ✅ | `40a5c6d` |
| T7 | S1-S6 | Seam: typecheck (baseline 67/0), suites serverapp y webapp, `prisma migrate status` verde | inline | ✅ | — |

---

## Log

### L1 — 2026-10-25 — Solicitud del usuario

Petición original del usuario (verbatim):

> "Fíjate, hermano, que en cuanto a las ensaladas tenemos los grupos de alimentos, ¿verdad? Acelgas y esto, lo otro. Pero realmente no te va a variar si yo meto este toda una taza de acelga o meto una taza una taza con todos los alimentos o meto una taza con dos alimentos; o sea, no te va a cambiar este los gramos, los carbohidratos y las proteínas, las calorías, todo eso, no te va Lo que te lo cambia es si es crudo o si es cocido, es lo único."

> "Entonces, como indiferentemente lo que yo escoja de allí no me lo va a cambiar, no me lo va a alterar, este lo que me lo altera es la unidad de medida. Ejemplo, si yo coloco una taza, dos tazas, tres tazas, eso realmente es lo que me va a cambiar el cálculo."

> "Entonces, allí podemos hacer es como una especie lista desplegable o de selector en el cual me aparezcan todas las hortalizas y vegetales que yo tengo, yo como nutricionista selecciono, ejemplo, yo quiero seleccionar acelga, ají, esto, lo otro, pa pa pa pa pa, y abajo yo coloco cuánto yo quiero dar, si quiero dar media taza, si quiero dar una taza, si quiero dar, así como ya lo tenemos, ¿ves?"

> "y en base a eso se me hagan los cálculos, pero no como lo tenemos este, que sabes que lo tenemos que yo escojo acelga media taza, esto una taza, esto lo otro, y entonces por cada cuestión que yo escoja, obviamente se me van a hacer cálculos y no debería de ser así."

Alcance confirmado por el usuario: **solo HORTALIZAS y FRUTAS** ("solo ensaladas bro, por ahora solo hortalizas, ensaladas y frutas (ya que existe la ensalada de frutas)").

### L2 — 2026-10-26 — T1-T7: entrega completa

Seam final verificado:

| Check | Resultado |
| --- | --- |
| `serverapp` `npx tsc --noEmit -p tsconfig.build.json` | **67** = baseline |
| `serverapp` `npm test` | **97 suites / 794 tests, 0 fallos** |
| `webapp` `npx tsc --noEmit` | **0** = baseline |
| `webapp` `npm test` | **33 archivos / 425 tests, 0 fallos** |
| `npx prisma migrate status` | **80 migraciones, "Database schema is up to date!"** |

**Commits:**

| Commit | Qué |
| --- | --- |
| `671dfd9` | Migración aditiva: `groupLabel String?` en `ExchangeListItem` |
| `5f9bcfa` | Backend: `groupLabel` en DTO, service, controller, tipos serverapp+webapp |
| `aeb0b07` | Frontend: multi-select para HORTALIZAS/FRUTAS + stepper del grupo + UN item con `groupLabel` |
| `7e91052` | Frontend: `FoodTablesExchangeList` muestra `groupLabel` |
| `40a5c6d` | Frontend: `EditFoodModal` soporta `groupLabel` editable |

**Cómo funciona en la práctica:**

1. El nutricionista abre "Agregar alimento" en una lista de intercambio.
2. Selecciona categoría **HORTALIZAS Y VEGETALES** o **FRUTAS**.
3. El selector cambia a checkboxes — puede marcar varios alimentos.
4. Aparece un botón "Continuar con N alimentos".
5. En el paso 2, ve los alimentos como chips, ajusta raciones con el stepper, y guarda.
6. Se crea **UN solo `ExchangeListItem`** con `groupLabel` = "Acelga, Ají, Tomate".
7. La tabla muestra el `groupLabel` en lugar del nombre del alimento individual.
8. El `EditFoodModal` permite editar la cantidad y el nombre del grupo.

### L3 — 2026-10-26 — T8-T13: estado de cocción (crudo/cocido)

Solicitud de Winder: *"Recuerda que varía media taza si es cocida y 1 taza si es cruda"*. Confirmado que para HORTALIZAS: ½ taza cocida = 1 taza cruda = 1 intercambio = 25 kcal.

Se agregó `cookingState String?` a `ExchangeListItem` (migración aditiva, 81 migraciones). El toggle aparece solo cuando la categoría es HORTALIZAS Y VEGETALES en modo grupo:

- **Crudo (1 taza)** → la medida mostrada usa `1 taza` como unidad base
- **Cocido (½ taza)** → usa `½ taza`
- Sin estado → usa la unidad del alimento (comportamiento previo)

**Commits:** `4b18df7` (T8-T13 completo).

**Seam:** serverapp tsc 67, 97/794, migrate 81 up to date · webapp tsc 0, 33/425.
