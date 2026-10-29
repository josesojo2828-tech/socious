# ODD Task: Exchange Measures (medida práctica + gramos/cc)

**Status:** Planificado — ninguna tarea iniciada
**Type:** Feature / Data + UI
**Area:** `serverapp` (prisma, fixtures, food module) / `webapp` (exchange-list, add-food modal)
**Branch:** `feat/exchange-measures` (nacerá desde `main`)
**Delivery strategy:** `ask-on-risk` — forecast ~750 authored lines (> 400): confirmar cadena de PRs antes del primer slice que supere el umbral. No push/PR sin orden explícita.
**Test runner:** `npx jest <path>` y `npm test` (serverapp) / `npm test` (webapp) — test-first RED → GREEN en toda tarea de comportamiento. `npm run typecheck` contra baseline **67** (serverapp, `tsconfig.build.json`) y **0** (webapp). **Nunca build.**

---

## Specs

> Los fragments del usuario y de Winder Radio son **verbatim** (español, lenguaje del usuario).
> Los marcados **(AUDITORÍA)** son derivados del análisis de código de esta sesión y necesitan
> confirmación explícita del usuario antes de implementarse.

### S1: La lista de alimentos muestra todos los alimentos existentes

> "1. No sé muestran los alimentos en su totalidad de la lista"
> "Fíjate como hay cosas que no se reflejan pero en la lista que cargamos sí está"

Criterios de aceptación:

- Buscar `Kéfir` (con acento) devuelve el alimento `Kefir` (`seed.exchange-list.ts:92`). Hoy
  `where.OR = [{ name: { contains: q, mode: "insensitive" } }]`
  (`serverapp/src/modules/nutringest/food/service/food-exchange.service.ts:97-103`) plega
  mayúsculas pero **no acentos** en Postgres.
- El `<option>` de categorías del selector coincide con las categorías que realmente existen en la
  tabla. Hoy la lista está escrita a mano en `AddFoodModal.tsx:192-201` (`FRUTAS, CARNES, LECHE,
  GRASAS, CEREALES, HORTALIZAS Y VEGETALES, TUBERCULOS, AZUCARES`) y el seed tiene además
  `PANES` (5), `ALMIDONES, CEREALES Y PANES` (14), `FRUTAS SECAS` (3) y `JUGO FRUTAS` (1);
  `AZUCARES` tiene opción pero 0 alimentos. Filtrar `CEREALES` pierde hoy los 5 de `PANES`.
- El paginador informa el total real de alimentos (204) y la página actual. Hoy
  `AddFoodModal.tsx:79` pide `limit=15` y el footer de paginación solo se pinta si
  `results.length > 0`.

### S2: Cada alimento muestra su medida práctica y sus gramos/cc

> "2. No se reflejan las unidades de medidas y los gramos"
> "lo único que nos hace falta es que se mire bien la medida práctica y los gramos del alimento"

Criterios de aceptación:

- `FoodExchangeList` persiste la medida práctica (`unity`) **y** los gramos/cc por intercambio en
  columnas propias. Hoy `serverapp/prisma/schema.prisma:561-569` es
  `{ name, category, sub, unity, calories }`: **no existe columna de gramos**.
- `unity` no contiene valores basura. Medición actual sobre las 204 filas del seed:
  34 `""`, 19 `"0"`, 13 `"1"`, 3 `"UNITY"`. Ejemplo real: `Fresas` → `unity: "1 med"`
  (`seed.exchange-list.ts:441`), que es exactamente lo que se ve en la captura
  `Medida práctica: 1 med`.
- La fuente de verdad de la medida práctica y los gramos es `1.pdf`, confirmado por el usuario
  como **vigente** ("es la vigente").

### S3: La medida escalada con las raciones elegidas

> "Ahora, si flecha verde se modifica, cambiaría también lo que se muestra en flecha roja"
> "leche descremada 480 cc que serían esas dos raciones"

Criterios de aceptación:

- En `AddFoodModal`, cambiar el stepper de raciones (flecha verde) recalcula la medida práctica y
  los gramos/cc mostrados (flecha roja). 2 raciones de leche descremada → `480 cc`.
- Funciona con raciones fraccionarias (el stepper avanza en `0.5`, `AddFoodModal.tsx:114-116`).
- El helper de formateo es **uno solo** y se reutiliza en modal de alta, modal de edición y tabla.

### S4: El cuadro de la lista muestra medida práctica y cc por alimento

> "en algún lugar de este cuadro se deberían mostrar las medidas prácticas y los Cc en dado caso
> que los tenga según la cantidad de raciones seleccionadas"

Criterios de aceptación:

- `FoodTablesExchangeList.tsx` (la tabla de `/dashboard/exchange-list/[id]`, identificada por el
  placeholder `"Buscar alimento (ej: arroz, papa...)"` y el footer
  `"Mostrando {current} de {total} alimentos registrados"`) muestra una columna con la medida
  práctica y los gramos/cc **ya multiplicados por `item.amount`**.
- Cuando el alimento no tiene gramos cargados, la celda queda vacía o dice "—" — no inventa valor.
- `EditFoodModal` muestra y edita la medida con la misma lógica de escalado.

### S5: `calories` de `FoodExchangeList` contiene kcal reales **(AUDITORÍA — confirmar)**

> Derivado: "una implementacion que si nos funcione". El análisis encontró que el campo muestra
> valores de la columna gramos/cc del PDF como si fueran kcal.

Evidencia: `Leche descremada` → `caloria: "240"` (`seed.exchange-list.ts:14-20`), mientras la
tabla de intercambio dice que 1 intercambio de leche aporta **90–150 kcal** y `240` es
exactamente los 240 cc de la columna gramos del PDF. Histograma del seed: 48 ceros, 35 `"30"`,
8 `"240"`. Ese valor se pinta como kcal en `exchange-food/[id]/page.tsx:319` y en la app móvil
(`exchange_list_model.dart:227`).

Criterios de aceptación:

- `calories` se calcula desde la tabla de grupo por `sub` — la tabla UCV del PDF
  (`90 / 102 / 123 / 150` kcal para los 4 tipos de leche) **es** `EXCHANGE_MACROS_MAP`
  (`exchange-list.unique.type.ts:74-109`), ya verificado contra la imagen `2.jpeg`.
- Un test de consistencia recorre todas las filas del seed y afirma
  `calories === getExchangeMacros(sub).kcal`. Seed y mapa no pueden driftar.
- **Las macros NO migran a la base.** Winder verificó: "estuve probando diferentes grupos de
  alimentos cambiando la ración y los valores son los correctos". No se rompe lo que funciona.

### S6: Datos de producción seguros y migraciones al día **(verbatim del usuario)**

> "recuerda que hay datos en produccion, debemos tener cuidado, tener las migraciones al dia y
> todo eso"

Baseline verificado el 2026-10-24 **antes** de cualquier escritura:

```
npx prisma migrate status  →  77 migrations found / Database schema is up to date!
git status prisma/migrations/  →  limpio (0 sin commitear)
```

Ese estado es el contrato: debe seguir **verde** después de cada corte.

Criterios de aceptación:

- **Solo migraciones aditivas.** `grams Decimal?` nullable y columna/índice de normalización:
  nada que reconstruya tablas ni borre columnas. Prohibido `DROP` en esta feature.
- **Nunca editar ni borrar una migración ya aplicada.** Regla ya aprendida a costazo en este repo
  (`AGENTS.md` → *Known gotchas*): carpeta borrada + fila en `_prisma_migrations` = drift, y
  `migrate dev` exige reset que destruye datos. Escribir siempre carpeta **nueva**.
- **`prisma migrate deploy`** (no `migrate dev`) para cualquier base que no sea desechable.
  `migrate dev` en una base con datos puede ofrecer reset.
- **El seeder jamás borra y re-crea** `FoodExchangeList`: `ExchangeListItem` tiene FK a
  `foodExchangeListId` y borrar destruye las asignaciones ya guardadas de los nutricionistas.
  Solo upsert in-place (T5).
- **Backup antes de correr el seeder** sobre cualquier base que no sea desechable. El fixture
  reescrito (T4) cambia `unity`, `grams` y `calories` de 204 filas: es una **mutación de datos**,
  no una migración de esquema — Prisma no la versiona ni la revierte.
- **Verificación antes y después**: `npx prisma migrate status` limpio antes de arrancar y
  después de cada migración; si aparece drift, se detiene la feature y se reconcilia antes de
  seguir.
- El servicio `unaccent` de T3 requiere privilegios de extensión en Postgres. Se **verifica
  primero** en la base local; si no está disponible, T3 cae a un diseño alternativo (columna
  normalizada en app) en vez de dejar la migración a medias en producción.

### Fuera de alcance (decisión registrada en Log L4)

> "Y yo creo que la reserva que tendríamos por allí sería solo de menús, los intercambios si se
> asignarían desde la ficha porque como eso sí ya es muy personalizado no se puede hacer como que
> unas listas de intercambio y tenerlas por allí"

No se construye en esta feature: enlazar la distribución de la calculadora
(`MealSummaryCards`, que muestra **grupos** y no alimentos) con las listas de intercambio
asignadas. Ver T13 pendiente.

---

## Tasks

| ID | S# | Tarea | Ruta | Estado | Commit |
| --- | --- | --- | --- | --- | --- |
| T1 | S6 | Crear rama `feat/exchange-measures` desde `main` + **registrar baseline**: `npx prisma migrate status` limpio (77 migraciones) y backup de la base | inline | ✅ hecho (baseline 77 verde) | — |
| T2 | S2, S6 | Migración **aditiva**: columna `grams Decimal?` en `FoodExchangeList`. Carpeta nueva, nunca editar una aplicada. Verificar `migrate status` verde antes y después | inline | ✅ | `b63bf71` |
| T3 | S1, S6 | **Diseño cambiado en L8**: columna `searchText` (name+category+sub plegados) + helper `normalizeSearchText` compartido entre escritura y query. Sin `unaccent`, sin extensión, sin índice (187 filas). Backfill SQL espejo en la migración | inline | ✅ `20261024210445_add_search_text_to_food_exchange_list` | — |
| T4 | S2, S5 | **Alcance corregido en L10**: no fue una transcripción 1:1. Completar `grams` y `caloria` en `seed.exchange-list.ts` conservando todos los `name` intactos, más una pasada de convergencia en el seeder para que las 187 filas ya existentes reciban los valores. Artefacto + seed ejecutado contra la base local | inline (reason: fuente de verdad — precisión > paralelismo) | ✅ | — |
| T5 | S1, S6 | **Acotado en L10**: la convergencia (`createMany` + `updateMany` por `name`) ya vive en T4. Queda **solo** el test de consistencia `fixture únicos === filas en base` (guard de L7). Regla dura: **sin `deleteMany`** (FK `ExchangeListItem`). **Ruta cambiada a inline** al acotarse: es un solo test sobre conjunto, sin mutación | inline (acotado) | ✅ | — |
| T6 | S1 | Selector de categorías derivado del `distinct` real de la tabla + footer de paginación con total real | inline (toca el mismo `AddFoodModal.tsx` que T8, sin superficie disjoint) | ✅ | `6d81bd9` |
| T7 | S3 | Helper puro `formatServing(unity, grams, raciones)` con test RED→GREEN. Contrato y reglas de `unity` sucio fijados en L13. **Ruta cambiada a inline**: T6-T9 comparten archivos (`FoodTablesExchangeList`, `AddFoodModal`), no hay superficies disjoint que justifiquen writers paralelos | inline (acotado) | ✅ | — |
| T8 | S3 | `AddFoodModal`: medida práctica y gramos escalados por el stepper + `servingLabel` guardado ya escalado (hoy guarda `"1 taza"` aunque sean 3 raciones, `AddFoodModal.tsx:127`) | inline | ✅ | `cf1a62f` |
| T9 | S4 | `FoodTablesExchangeList`: columna **Medida** con valor escalado por `item.amount` | inline | ✅ | `cf1a62f` |
| T10 | S3, S4 | `EditFoodModal`: muestra y edita la medida con la misma lógica de escalado | inline | ✅ | `cf1a62f` |
| T11 | S1-S6 | Seam final: typecheck (baseline 67 / 0), suites serverapp y webapp, **`npx prisma migrate status` verde (77 base → 79 tras T2 y T3, 0 drift)**, smoke manual de búsqueda + alta de alimento + tabla | inline | ⏳ automatizado verde; **smoke manual en navegador pendiente** (requiere sesión; ver L15) | — |
| T12 | — | **PENDIENTE DECISIÓN** — ¿la medida práctica se muestra también en `MealSummaryCards`? Requiere enlazar distribución ↔ listas asignadas (alcance nuevo) | — | bloqueado | — |
| T13 | S1 | **Resuelto en L16: no había decisión.** Plegar `food-metrics.service.ts:135` con `searchText` — era la única implementación posible, no una opción entre dos. Hereda `searchText` completo (name+category+sub), que es lo mismo que ya hace la lista | inline | ✅ | `7c28f15` |
| T14 | S6 | **Limpieza y reconstrucción de datos** — alcance corregido en L17 (los "31 nombres que no son alimentos" eran filas de res y pollo partidas por la extracción, no basura) y ejecutado en dos tandas: L17 (5 twins exactos, 187 → 182) y L18 (**reconstrucción de CARNES desde el `1.pdf`** — 11 renombres con `unity`/`grams` desde el PDF + 4 fusiones, 182 → 178). **Pendiente:** 3 filas de queso sin destino en el PDF (`Con 5 g de grasa o menos`, `bajo en grasa`, `rallado con 3 g de grasa o menos`) + 2 fragmentos de carne (`pollo (blanco c/piel…)`, `asada, picada, pierna`) + 45 filas fuera de CARNES con `unity` rota (34 vacía en HORTALIZAS, 6 placeholder en FRUTAS) | inline | ⏳ parcial (ver L17, L18) | — |
| T15 | S2 | **Prerrequisito descubierto en L12**: `grams` existe en la base pero **nunca llega al cliente**. `FoodExchangeList` (`schema.types.ts:461`) no lo declara y `format()` del repositorio proyecta campo a campo sin él. Poner `grams` en el tipo, en `format()` y en los tipos del webapp. Sin esto T7-T10 no tienen dato que mostrar | inline | ✅ | — |

**Rutas y disparadores (evidencia de por qué se delega):** T5 (serverapp/fixtures) y T6-T10
(webapp/exchange-list) son **dos unidades independientes con superficies de edición disjuntas**
(`serverapp/src/shared/fixtures` + tests vs `webapp/src/features/nutringest/exchange-list`), cada
una de varios minutos de trabajo y >100 líneas. Se lanzan **en paralelo** y al final corre **una
sola seam check** (T11). `AddFoodModal` tiene **un solo dueño**: T6 y T8 van juntos en Unit B,
nunca en dos writers distintos.

---

## Log

### L1 — 2026-10-24 — Petición original (verbatim)

> "Vamos a trabajar en algo. es una conversacion de Whatsapp aca te voy pasando todo […]
> Puedes analizar eso a detalle y ver como lo podemos abordar??"

La conversación de WhatsApp de Winder Radio (2026-10-19) y sus 14 imágenes + `1.pdf` están en
`/home/jsojo/Escritorio/NUTRINGEST/intercambios`. Los fragmentos que generan requisitos están
citados verbatim en `## Specs`.

### L2 — 2026-10-24 — Recomendación de trabajo aceptada (verbatim)

> "lo que se quiere es una implementacion que si nos funcione, como recomiendas trabajarlo?"

Se acordó trabajar en 4 cortes: (1) búsqueda y filtros sin migración, (2) fuente de verdad +
migración de datos, (3) UI con escalado, (4) cuadro final. El orden no es negociable: sin
búsqueda funcional no se puede verificar el resto, y sin la columna `grams` la UI no tiene qué
mostrar.

### L3 — 2026-10-24 — Fuente de verdad confirmada (verbatim)

> "es la vigente, puedes montar una lista de tareas de lo que vamos a implementar??"

`1.pdf` es la lista vigente. Desbloquea T4.

### L4 — 2026-10-24 — Hallazgo que cambió el plan

**Problema:** `seed:exchange` no es idempotente para updates. Usa
`prisma.foodExchangeList.createMany({ data, skipDuplicates: true })`
(`seed.exchange-list.ts:1339-1347`) y `FoodExchangeList.name` es `@unique`. Re-correr el seed con
el fixture corregido **no actualiza ninguna fila existente**: las 204 filas se skipean. Cualquier
plan que dijera "arreglar el seed y correr `npm run seed:exchange`" habría fallado en silencio.

**Decisión:** T5 convierte el seeder a upsert in-place. Las filas se **actualizan**, nunca se
borran y re-crean: `ExchangeListItem` tiene FK a `foodExchangeListId` y borrar rompería las
asignaciones ya guardadas de los nutricionistas.

### L5 — 2026-10-24 — Datos de medición del seed (baseline de T4)

> **Corregido en L7**: la cifra inicial de "204" era un desborde de conteo. Verificado con
> grep estructurado: **202 entradas, 187 nombres únicos**. La suma de categorías de abajo ya
> daba 202.

- 202 entradas de fixture. Categorías: `FRUTAS` 39, `CARNES` 37, `HORTALIZAS Y VEGETALES` 34,
  `CEREALES` 26, `GRASAS` 19, `ALMIDONES, CEREALES Y PANES` 14, `LECHE` 12, `TUBERCULOS` 7,
  `PANES` 5, `ALMIDONES,  CEREALES Y PANES` 5 (doble espacio), `FRUTAS SECAS` 3, `JUGO FRUTAS` 1.
- `unity` sucio: 34 `""`, 19 `"0"`, 13 `"1"`, 3 `"UNITY"`.
- `caloria` sin normalizar: 48 `0`, 35 `"30"`, 13 `"0"`, 9 `"120"`, 8 `"240"`.
- Riesgo de T4: `ALMIDONES,  CEREALES Y PANES` con doble espacio es una categoría distinta para
  el filtro `contains` — normalizar al transcribir.
- Hay **tabuladores literales dentro de strings** (ej. línea 356, `"Tortilla harina de maíz
  (13 cm diámetro)\t"`) — rompe cualquier parser de JSON sobre el fixture.


### L6 — 2026-10-24 — Restricción de producción (verbatim del usuario)

> "recuerda que hay datos en produccion, debemos tener cuidado, tener las migraciones al dia y
> todo eso"

Se incorporó como **S6** con criterios de aceptación verificables y como guardas explícitas en
T1, T2, T3, T5 y T11.

**Baseline verificado antes de cualquier escritura** (evidencia, no supuesto):

```
$ npx prisma migrate status
77 migrations found in prisma/migrations
Database schema is up to date!

$ git status --short prisma/migrations/   →  (vacío)

$ docker ps
nutrigest_prod_db   Up 2 hours (healthy)   ← localhost:11002, PostgreSQL "nutringest_prod"
nutrigest_prod_backend / _frontend / _redis / _minio / _nginx
```

Nota: los contenedores se llaman `nutrigest_prod_*` pero según `AGENTS.md` corren
`docker-compose.dev.yml` con hot-reload apuntando al checkout local. La base **real** de
producción vive en el VPS y se alcanza con `prisma migrate deploy`, nunca con `migrate dev`.

**Consecuencia para el plan**: T4 (fixture) es un artefacto en disco que no toca ninguna base.
La mutación de datos recién ocurre en T5, y ahí es donde van backup + upsert in-place.

### L7 — 2026-10-24 — 15 alimentos existen en el fixture y nunca llegaron a la base

Verificado durante T2, al contrastar la fila recién creada contra el fixture:

```
fixture: 202 entradas  →  187 nombres únicos
base:    187 filas (con_grams = 0 tras la migración)
dif:      15 nombres duplicados, descartados por createMany({ skipDuplicates: true })
```

**Es la causa material detrás de S1**: el nutricionista no ve "todos los alimentos" no solo
por la paginación de 15 — **15 filas del fixture jamás existieron en la base**, y ninguna
búsqueda, filtro ni índice puede encontrarlas.

Desglose de los 15 duplicados:

- **12 son duplicados exactos** (mismo `category`/`sub`/`unity`, solo cambia el tipo de
  `caloria`: número vs string). Descartarlos es correcto:
  `Arepa`, `Arroz cocido`, `Avena hojuelas`, `Cereal azucarado`, `Cereales cocidos`,
  `Cereales integrales`, `Cotufas (sin grasa)`, `Germen de trigo`, `Granola baja en grasa`,
  `Harina de maíz`, `Muesli`, `Pasta cocida`.
- **3 son filas distintas que comparten nombre** — decisión de T4, no se resuelven solas:

  | Nombre | Fila A | Fila B | Problema |
  | --- | --- | --- | --- |
  | `Yogurt simple descremado` | LECHE MUY BAJA EN GRASA, `caloria=0` | LECHE BAJA EN GRASA, `caloria=180` | subcategoría y kcal distintas: son dos entradas legítimas |
  | `Habas` | HORTALIZAS Y VEGETALES, `sub=""`, `unity=""`, `caloria=0` | ALMIDONES/CEREALES y PANES → LEGUMINOSAS, `unity="½ taza"`, `caloria=120` | la A es una fila vacía defectuosa |
  | `Tortilla de maíz (13 cm diámetro)` | `category=PANES`, `sub=ALMIDONES, CEREALES Y PANES` | `category=ALMIDONES,  CEREALES Y PANES`, `sub=PANES` | categoría y sub intercambiadas (y una con doble espacio) |

Implicación directa para el plan:

- **T4** deja de ser "reescribir los valores": ahora es **transcribir 1:1 desde `1.pdf` y
  deduplicar intencionalmente**. Si el PDF trae dos filas homónimas legítimas, la única salida
  sin romper `name @unique` es desambiguar el nombre. **Borrar `name @unique` queda fuera de
  alcance**: es un contrato que consumen `ExchangeListItem`, la búsqueda y el upsert de T5.
- **T5** suma un guard: el test de consistencia debe assertear que
  `filas del fixture === filas únicas === filas en base` para que este desfase nunca vuelva
  a pasar en silencio.

### L8 — 2026-10-24 — T3: el diseño cambió de `unaccent` a una columna plegada

**Spike (evidencia antes de diseñar):**

```
SELECT ...  →  pg_version 15.19
                unaccent_disponible  true
                unaccent_instalado   false
                es_superuser          true
```

`unaccent` **estaba disponible y con permisos**, pero se descartó igual. Motivo técnico:
`unaccent` solo dobla el lado almacenado. Prisma genera `ILIKE '%q%'` desde
`mode: "insensitive"`, así que la consulta tendría que aplicar `unaccent` también — y
`findMany` no permite expresar una función SQL en el predicado. Para usarlo haría falta
o bien raw SQL en el repositorio (pérdida del tipado y de la paginación) o bien una
índice funcional que igual no serviría para `ILIKE` sin `pg_trgm`.

**Diseño elegido: `searchText TEXT` + un único normalizador en TypeScript.**

| | Decisión |
| --- | --- |
| Columna | `searchText = normalize(name + ' ' + category + ' ' + sub)` |
| Normalizador | `src/shared/helpers/search-text.util.ts` — NFD + strip de diacríticos + lowercase + colapso de espacios |
| Garantía | escritura y query pasan por la **misma** función → imposible que diverjan |
| Extensión / trigger / índice | **ninguno** — 187 filas, un seq scan es gratis y no hay lógica oculta en la base |
| Backfill | SQL espejo en la propia migración (`translate` + `regexp_replace`), para la ventana entre migrar y resembrar |
| Query | `where.searchText = { contains: normalizeSearchText(q) }` — colapsa el `OR` anterior sobre name/category/sub |

**Evidencia de cierre de T3:**

- `prisma migrate status` → **79 migraciones, verde** (78 → 79, cero drift).
- Backfill → `total 187, pobladas 187`.
- Verificación directa sobre la base: `"Corazón de alcachofa"` →
  `searchText = "corazon de alcachofa hortalizas y vegetales"`.
- Test RED→GREEN: `search-text.util.spec.ts` (8 tests) y
  `food-exchange.service.spec.ts` (6 tests) — 14 verdes.
- `npx tsc --noEmit -p tsconfig.build.json` → **67** (= baseline, sin regresión).
- `npm test` → **93 suites / 783 tests, 0 fallos**.

**Gap de integridad detectado y cerrado en el mismo task**: el seeder escribía filas sin
`searchText`. Cualquier base sembrada desde cero habría quedado con la búsqueda rota
silenciosamente. `seed.exchange-list.ts` ahora deriva la columna desde **los valores que
realmente persiste** (`category || "GENERAL"`, `sub.toString()`), no desde el fixture crudo,
para que coincida exactamente con lo que escribió el backfill SQL.

### L9 — 2026-10-24 — Segunda ruta de búsqueda que quedó sin plegar (pendiente de decisión)

`src/modules/nutringest/food/service/food-metrics.service.ts:135` arma su propio
`FoodExchangeListWhereInput` con `OR [name, category]` sobre el mismo `searchQuery`. Tiene
**el mismo bug de acentos** que T3 acaba de arreglar en la lista de alimentos.

**No se tocó.** Está en otra pantalla (dashboard de métricas), nadie la reportó, y el criterio
de ODD es que un hallazgo no autoriza ampliar alcance. Registrado como **T13 pendiente de
decisión**: si se arregla, hay que decidir si hereda el `OR` completo o solo `name`+`category`
(heredar `searchText` incluiría `sub`, que hoy el dashboard **no** busca — sería cambiar un
comportamiento que nadie pidió).

### L10 — 2026-10-24 — T4: la premisa "transcribir 1:1" era falsa

T4 estaba escrito como *"transcribir `1.pdf` 1:1, 202 entradas"*. Al extraer el PDF de
forma estructurada (`pdfplumber`, celdas fusionadas resueltas agrupando `foods` y `grams`
posición a posición) el dato real no coincide con esa descripción:

| | |
| --- | --- |
| Filas extraídas del PDF | 197 |
| Filas en el fixture | 202 → **187 únicos** (confirma L7) |
| Match exacto de nombre | **65 (32%)** |
| Variación de nombre (el alimento sí existe en el PDF) | 106 |
| **No es un alimento** (encabezado, frase, medida pegada al nombre) | **31** |

Ejemplos que **sí están en producción** y tienen hijos en `ExchangeListItem`:

- `"la mayoría de las carnes de res entran en esta categoría"` → `unity="0"`
- `"Con 5 g de grasa o menos"` → `unity="UNITY"`
- `"1 unid 50"`, `"asada, picada, pierna"`, `"Manzana seca Albaricoque seco Dátiles"`

**Decisión del usuario (verbatim):** *"Complete grams, keep all names"* — completar
`grams`/`unity`/`caloria` sobre las filas emparejables **sin renombrar nada**, y dejar la
limpieza para una tarea aparte. El motivo es estructural: el seed es
`createMany({ skipDuplicates: true })` con `name @unique` y **nunca borra**, así que
renombrar no rompe la FK sino que **deja la fila basura vieja viva con los items del
usuario colgando**. Renombrar exige una migración que re-apunte los **182** hijos de
`ExchangeListItem` → eso es S6, no T4. Nace así **T14**.

**Otras dos verdades del dato descubiertas aquí:**

1. **La Lista 2 (hortalizas) no tiene columna de gramos en el PDF** → 34 filas quedan en
   `null` legítimamente, no es un hueco que cerrar.
2. **`unity` del fixture discrepa de la medida del PDF en 32 filas** (y en 8 es ruido
   puro, `unity="0"`). Se dejó `unity` intacto: el `medida` del PDF **no es confiable** en
   celdas fusionadas (pdfplumber devuelve varias medidas unidas sin decir a cuál pertenece
   cada alimento), mientras que `grams` sí va posición a posición. Mismatch de `unity`
   → **T14**.

**Lo que se hizo en T4:**

- `grams: number | null` en las 202 entradas — **115 con valor, 87 en `null`** (34 sin
  fuente + 31 basura + 11 sin correspondencia + varios `-` del PDF).
- `caloria` recalculada con `EXCHANGE_MACROS_MAP` de **serverapp** para las 202.
- El seeder ya no solo inserta: `createMany({ skipDuplicates })` **salta** las filas
  existentes, así que una base ya sembrada jamás habría recibido `grams`. Ahora corre
  `createMany` + un `updateMany` por `name` dentro de un `$transaction`. `name` **nunca**
  se reescribe. Se deduplica por nombre manteniendo la primera aparición, que es la misma
  que `skipDuplicates` deja en la base.
- `list` exportada + `if (require.main === module)` para que el test pueda importar los
  datos sin disparar una escritura (sin ese guard, importar el fixture **corre el seed** —
  se comprobó en el RED).
- `EXCHANGE_MACROS_MAP` y `resolveExchangeMacros` movidos de `private` del servicio a
  nivel de módulo y exportados, para que el test compare el fixture contra **la misma**
  lógica que calcula los totales.

**Trampa que costó un ciclo:** el mapa del **webapp** tiene `AZUCARES`/`AZUCAR CON GRASA`
y el de **serverapp no**. El primer pase usó el del webapp y escribió `caloria=40` en dos
filas de `CARNES` donde el resolvedor real devuelve `55` (sub `"Res"` es substring de
`"AZUCARES"`). El test lo agarró: 2 fallos → recalculado con el mapa del serverapp → 3/3.

**Evidencia de cierre de T4:**

- Test RED→GREEN: `seed.exchange-list.spec.ts` — **RED 3/3 fallando en base** (sin
  `grams`, `caloria` divergente, import que dispara el seed) → **GREEN 3/3**.
- `npx tsc --noEmit -p tsconfig.build.json` → **67** (= baseline, sin regresión).
- `npm test` → **94 suites / 786 tests, 0 fallos** (93/783 + 1 suite nueva).
- Seed ejecutado con `npm run seed:exchange` contra la base local: **187 filas, 102 con
  `grams`**.
- **S5 verificado en la base**: `Leche descremada` `calories` **240 → 90** y
  `grams=240`; `lomo, bistec (magra)` `calories` **40 → 55**.
- Resto sin `grams` por categoría: HORTALIZAS 34 (sin fuente), CARNES 28 (basura),
  FRUTAS 5, ALMIDONES 8, GRASAS 7, PANES 2, CEREALES 1.

**Pendiente antes del commit:** la estrategia de cadena de PRs (`ask-on-risk`, forecast
~750 líneas > 400) todavía no está confirmada con el usuario.

### L11 — 2026-10-24 — T5: el guard que L7 reclamaba

L7 encontró 15 alimentos que existían en el fixture y **nunca llegaron a la base**, y
nadie se enteró porque el seeder devolvía éxito igual. T5 lo cierra con
`seed.exchange-list.db.integration.spec.ts`: compara el **conjunto completo** de nombres
únicos del fixture contra las filas de `FoodExchangeList`, en ambos sentidos (no mira una
fila puntual, así que también atrapa filas huérfanas que el fixture ya no conoce).

Sigue la convención `*.db.integration.spec.ts` del repo: corre solo si hay
`DATABASE_URL`, sin mutar nada (no necesita la transacción-rollback de los otros). Requiere
el seed aplicado — `npm run seed:exchange`.

**Evidencia de cierre de T5:** 2/2 verdes · `npx tsc --noEmit -p tsconfig.build.json` →
**67** (= baseline) · `npm test` → **95 suites / 788 tests, 0 fallos** (94/786 + 1 suite).

### L12 — 2026-10-24 — T15: el dato existía pero nunca llegaba al cliente

Antes de arrancar T6-T10 se comprobó si el webapp **recibe** `grams`, y la respuesta fue
no. Dos cadenas distintas, dos comportamientos distintos:

1. **`/api/exchange-food` (modal de búsqueda → T7/T8)** — `ExchangeListRepository.format()`
   (`food-exchange.repository.ts:32`) proyecta el registro **campo a campo**
   (`id, name, category, sub, unity, calories, ...`) y `grams` no estaba. El tipo
   `FoodExchangeList` (`schema.types.ts:461`) tampoco lo declaraba, así que TypeScript ni
   siquiera se quejaba: el campo no existía en el contrato. **El valor se perdía entre la
   base y el cliente en silencio.**
2. **Detalle de la lista (tabla y modal de edición → T9/T10)** — esos componentes trabajan
   con `ExchangeItem.foodExchangeList`, y el backend usa `include: { foodExchangeList: true }`
   en todos lados. Prisma devuelve **todos** los escalares, así que ahí `grams` **ya viajaba**;
   lo único que faltaba era declararlo en la interfaz del webapp.

Evidencia del RED, que es además la prueba del problema:

```
Expected path: "grams"
Received value: {"name": "lomo, bistec (magra)", "unity": "0", "calories": 55, ...}
```

**Por qué no se vio antes**: `T2` agregó la columna y `T4` la pobló, y ambas verificaciones
miraron la **base** (`SELECT` directo con Prisma). El hueco estaba un eslabón más arriba, en
la proyección del repositorio, y ningún test cubría ese tramo.

**Evidencia de cierre de T15:** test RED 2/2 → **GREEN 2/2**
(`food-exchange.repository.db.integration.spec.ts`, fijado a dos filas deterministas del
fixture: `Leche descremada` = 240, `lomo, bistec (magra)` = `null`) ·
`npx tsc --noEmit -p tsconfig.build.json` → **67** · `npm test` serverapp →
**96 suites / 790 tests, 0 fallos** · `webapp` → `npx tsc --noEmit` **0**,
`npm test` **32 archivos / 415 tests, 0 fallos**.

### L13 — 2026-10-24 — T7: qué muestra la medida escalada

**Decisión del usuario (verbatim de la pregunta):** *"Ambas partes escaladas"* — al subir a 2
raciones sobre `leche descremada` (`unity: "1 taza"`, `grams: 240`) se muestra
`2 taza · 480 cc`. `grams` ya se sabía que tenía que ser 480; la duda era la unidad y qué
hacer con el texto de `unity`.

Reglas que salen de esa respuesta, todas fijadas en `format-serving.spec.ts`:

| Regla | Motivo |
| --- | --- |
| A **1 ración** `unity` se devuelve **tal cual la fuente** | evitar reformatear `"½ taza"` a `"0.5 taza"` en la vista por defecto |
| Se escala el **número inicial** de `unity` cuando es parseable (entero, decimal, `1/2`, glifo `½`) | es lo único del texto que representa una cantidad |
| `unity` placeholder (`""`, `"0"`, `"UNITY"`) se **descarta**, no se renderiza | 18 filas tienen `grams` y un `unity` basura; mostrar `"0 · 160 g"` no aporta |
| Unidad: `cc` si `unity` nombra un recipiente de volumen (`taza`, `vaso`, `tazón`, `cc`, `ml`), si no `g` | la fuente es la columna "gramos/cc" sin desambiguar por fila. **Supuesto**, no dato del PDF: `1 taza` de leche = 240 cc, pero `1 cda` de grasa se declara en gramos |
| Sin `grams` en la fuente → **no se inventa ninguno** (S4) | el resto del `unity` se muestra igual |

**Dato técnico que condiciona el contrato:** Prisma serializa `Decimal` como **string**.
Verificado, no supuesto:

```
typeof row.grams            → "object"
JSON.stringify({grams:...})  → {"grams":"240"}
```

Así que el detalle de la lista manda `grams: "240"` mientras que `/api/exchange-food` (que
pasa por `format()`) manda `grams: 240`. `formatServing` acepta **ambos** y el tipo de
`ExchangeItem.foodExchangeList` lo declara `number | string | null` en lugar de mentir con
`number`.

**Evidencia de cierre de T7:** test RED (módulo inexistente) → **GREEN 10/10** · **sonda de
mutación** — desactivar el escalado de `grams` falla **6 de 10** tests, restaurado vuelve a
10/10, así que el test no es vacío · `webapp` `npx tsc --noEmit` → **0**,
`npm test` → **33 archivos / 425 tests, 0 fallos** · `serverapp` → **67** y **96 suites /
790 tests, 0 fallos**.

### L14 — 2026-10-24 — T6, T8, T9, T10: la medida entra a la interfaz

**Rutas (T6, T8, T9, T10):** la tabla decía `delegated (Unit B)`, pero al ejecutar resultaron
**inline**. T6 y T8 tocan el mismo `AddFoodModal.tsx`; T6 y T9 comparten
`FoodTablesExchangeList.tsx`. Sin superficies disjoint no hay parallelismo posible, así que la
regla de escritura manda el trabajo al padre. Corregido en la tabla de tareas.

**T6 — el selector estaba escrito a mano y se había desincronizado.** Las `<option>` de
`AddFoodModal.tsx` nombraban 9 valores; la tabla tiene **12**:

```
ALMIDONES,  CEREALES Y PANES (4)    ALMIDONES, CEREALES Y PANES (13)
CARNES (37)                         CEREALES (14)
FRUTAS (39)                         FRUTAS SECAS (3)
GRASAS (19)                         HORTALIZAS Y VEGETALES (34)
JUGO FRUTAS (1)                     LECHE (11)
PANES (5)                           TUBERCULOS (7)
```

- **21 alimentos eran inalcanzables por el filtro** (`FRUTAS SECAS` 3, `JUGO FRUTAS` 1,
  `ALMIDONES…` 13 + 4). El usuario creía estar filtrando y simplemente no veía nada.
- **`AZUCARES` estaba en el `<option>` con 0 alimentos** detrás: elegirlo daba lista vacía que
  parecía "no hay resultados" y no "esta categoría no existe".
- La resolución pasa a `repository.findDistinctCategories()` (`distinct: ["category"]`,
  ordenado) expuesta como `categories` en la respuesta de `pagination`, junto a `list` y
  `total`. Una query `distinct` sobre 187 filas.
- Etiquetas: se conserva la traducción de las 8 categorías que ya la tenían
  (`CATEGORY_LABEL_KEYS`); cualquier categoría nueva se muestra **con su valor tal cual**, que
  es como hoy rotula `Azúcares` y como los datos ya vienen en español.

**Hallazgo de datos (va a T14, no se toca acá):** existen dos grafías distintas de
`ALMIDONES, CEREALES Y PANES` — una con **dos espacios** y otra con uno — que hoy cuentan como
categorías separadas. El selector las muestra ambas porque ambas existen; unificarlas es
limpieza de datos con migración y backup, eso es T14.

**T6 — el paginador solo aparecía con más de una página.** La condición era
`results.length > 0 && totalPages > 1`, así que al filtrar a menos de 15 resultados (p. ej.
`JUGO FRUTAS`, 1 alimento) desaparecía el total: no había forma de saber cuántos alimentos
había. Ahora el footer se pinta **siempre que haya resultados** y los botones
`Anterior`/`Siguiente` quedan dentro de `{totalPages > 1 && …}`.

**T8 / T9 / T10 — el helper entra a las tres superficies.** Un solo `formatServing(item.….
unity, item….grams, raciones)` en cada render, con la unidad y los gramos del alimento.

- `AddFoodModal`: `measure` memo + `Medida práctica: {measure.label}`; `servingLabel` se guarda
  ya escalado, así el cuadro no arranca con la etiqueta de 1 ración.
- `FoodTablesExchangeList`: `<th>Medida</th>` después de `Raciones` y `<td>` con
  `{measure.label || '—'}` (los alimentos sin medida visible quedan con guion).
- `EditFoodModal`: acá hay una **decisión de producto** que no estaba en el spec. El modal ya
  tenía un campo editable `Medida / Equivalencia` con texto libre guardado. Dos comportamientos
  en conflicto: si el stepper recalcula la etiqueta pisa lo que el nutricionista escribió a mano;
  si no recalcula, cambiar de 1 a 3 raciones deja `1 taza` al lado de `3 raciones`. Se resuelve
  con `labelEdited`: en `mount` **no** se recalcula (la etiqueta guardada puede ser personalizada
  — `amountRef` arranca igual a `raciones`, así que el efecto sale temprano), al cambiar las
  raciones **sí** se recalcula salvo que ya se haya editado a mano, y escribir en el input marca
  `labelEdited`. Es el mismo criterio de "no pisar lo que el usuario escribió" que usa la regla
  de placeholder de `formatServing`.

**GAP DE VERIFICACIÓN (honesto):** `webapp` corre con `vitest environment: "node"` y **no tiene
`jsdom` ni `@testing-library/react`**, así que **ningún componente tiene test** — tampoco los
preexistentes. Lo que sí está cubierto: el helper con 10 tests (T7) y el backend con 2 tests de
unidad + 1 de integración contra la base real. Agregar infraestructura de tests de DOM sería
sumar una dependencia de desarrollo, y eso es una decisión del usuario, no mía.

**Evidencia de cierre de T6, T8, T9, T10:**
- RED observado: el primer run de `serverapp` **falló con**
  `TypeError: this.repository.findDistinctCategories is not a function` en el spec preexistente
  — la prueba de que el servicio realmente empezó a pedir el método nuevo. Reparado el mock del
  harness.
- `serverapp` `npx jest` → **96 suites / 791 tests, 0 fallos** (baseline 96/790 + 1 test nuevo
  de T6). `npx tsc --noEmit -p tsconfig.build.json` → **67** (= baseline, sin regresión).
- `serverapp` spec nuevo `food-exchange.service.spec.ts` → `categories` se expone en la
  respuesta.
- Integración real `food-exchange.repository.db.integration.spec.ts` → **3/3**, incluyendo
  "lista exactamente las categorías de la tabla", comparada contra un fold independiente de
  todas las filas (no contra el mismo `distinct` que ejecuta el método, que sería circular), más
  `toContain("FRUTAS SECAS")`, `toContain("JUGO FRUTAS")` y
  `not.toContain("AZUCARES")`.
- `webapp` `npx tsc --noEmit` → **0**, `npm test` → **33 archivos / 425 tests, 0 fallos**.
- **RDD** (`gentle-ai review assess --base-ref main --committed-only`) tras ambos commits →
  `risk: medium`, `review_due: false`, `review_due_reason: "under_budget"` → **no se abre
  review**, queda pendiente en la rebanada.
- **Commits:** `cf1a62f` (T8 + T9 + T10) y `6d81bd9` (T6). Los dos tocan `AddFoodModal.tsx`, así
  que se separaron por hunks contra la misma base para que cada commit contenga un solo
  comportamiento: primero se llevó a HEAD solo la parte T8, se verificó (0 / 425-425), se
  commiteó, y después se restauró la versión completa con T6 (verificado que el diff residual
  contra `cf1a62f` contiene **0** líneas de T8 y 14 de T6).

### L15 — 2026-10-24 — T11: seam automatizado verde, smoke manual pendiente

**Verificado (todo sobre `1599b0b`, árbol limpio):**

| Check | Resultado |
| --- | --- |
| `npx prisma migrate status` | **79 migraciones, "Database schema is up to date!"** — 77 base + T2 + T3, **0 drift** |
| `serverapp` `npx tsc --noEmit -p tsconfig.build.json` | **67** = baseline, sin regresión |
| `serverapp` `npx jest` | **96 suites / 792 tests, 0 fallos** (baseline 790 + 2 tests nuevos de T6) |
| `webapp` `npx tsc --noEmit` | **0** = baseline |
| `webapp` `npm test` | **33 archivos / 425 tests, 0 fallos** |
| RDD `review assess --base-ref main --committed-only` | `risk: medium`, `review_due: false`, `under_budget` → no abre review |

**El smoke manual NO se hizo y por qué.** `GET /api/exchange-food` responde **401** — el
servidor de dev está arriba y rutea bien, pero toda la ruta de datos exige sesión. Busqué
credenciales de desarrollo en `.env` y en los seeds: **no existe ninguna** (solo `SMTP_PASS`,
vacío). Ir a cazar un token es exactamente lo que no hago, así que esto queda para vos.

Lo que **sí** cubre cada check, para que sepas qué confiar:

- El contrato de datos está cubierto **de punta a punta sin HTTP**: `findDistinctCategories()`
  contra la base real (integración, comparado contra un fold independiente de las 187 filas) +
  la exposición como `categories` en la respuesta (unidad) + `formatServing` con 10 tests.
- Lo que **no** está cubierto por ningún test es **cómo se ve**: `webapp` corre con
  `vitest environment: "node"` y sin `jsdom` ni `@testing-library/react`, así que **ningún
  componente tiene test**. Las tres superficies (opciones del `<select>`, columna Medida,
  footer del paginador) las verificó `tsc` y nada más.

**Smoke manual que falta (5 minutos, en el navegador):**

1. Abrir la lista de intercambios → el selector de categorías debe listar **12** categorías y
   **no** debe aparecer `AZUCARES`.
2. Elegir `FRUTAS SECAS` o `JUGO FRUTAS` → antes devolvía lista vacía, ahora debe filtrar.
3. Filtrar a una categoría con <15 alimentos → el footer debe seguir mostrando
   "Página 1 de 1 (N alimentos)".
4. Al cargar un alimento con gramos (p. ej. `leche descremada`), subir a 2 raciones →
   `2 taza · 480 cc`.
5. En la tabla, verificar la columna **Medida** escalada y el guion `—` donde no hay medida.
6. Editar un alimento, cambiar las raciones sin tocar el texto → la etiqueta se recalcula;
   escribir a mano y luego cambiar las raciones → **no** se pisa lo escrito.

### L16 — 2026-10-24 — T13: la "decisión" no era una decisión

La fila de T13 decía *"decidir si hereda `searchText` completo o solo `name`+`category`"*.
Era un falso dilema: **solo una de las dos opciones funciona**, y lo verifiqué contra la base
en vez de argumentarlo.

El filtro original era:

```ts
OR: [
  { name:     { contains: searchQuery, mode: "insensitive" } },
  { category: { contains: searchQuery, mode: "insensitive" } },
]
```

`contains` compara contra el valor **guardado**, y Prisma no puede plegar ese lado. Contra la
base real:

```
fila "Corazón de alcachofa", query tipeada "corazon" (sin acento)
OR sobre name/category : 0    ← el usuario no ve nada
searchText             : 1    ← correcto
```

Plegar **solo la consulta** tampoco lo arregla: `contains: "corazon"` sigue sin estar dentro de
`"Corazón"`. Por eso `searchText` existe — es la única columna que responde a una consulta
plegada, y su propio doc comment dice que **ambos lados** tienen que pasar por
`normalizeSearchText`.

**Verificación previa a tocar código:**

| Comprobación | Resultado |
| --- | --- |
| `searchText IS NULL` | **0 de 187 filas** → nadie queda fuera de búsqueda |
| ¿existía el spec de `FoodMetricsService`? | **No** — se creó (`food-metrics.service.spec.ts`) |
| Restricción técnica | plegar `name`/`category` individualmente es **imposible** con Prisma `contains` |

**RED → GREEN:** test nuevo falla con `searchText: undefined` (el `OR` viejo todavía está) →
fix → **GREEN 2/2**.

**Chequeo diferencial** (8 consultas contra la base, viejo vs. nuevo):

```
leche     viejo= 12 nuevo= 12 perdidos=0
corazon   viejo=  0 nuevo=  1 perdidos=0 ganados=1
brocoli   viejo=  0 nuevo=  1 perdidos=0 ganados=1
grasa     viejo= 25 nuevo= 40 perdidos=0 ganados=15
MUY BAJA  viejo=  0 nuevo=  5 perdidos=0 ganados=5
AZUCARES  viejo=  0 nuevo=  0 perdidos=0
taza      viejo=  0 nuevo=  0 perdidos=0
yogur     viejo=  1 nuevo=  1 perdidos=0
```

**0 resultados perdidos, 22 ganados.** Los 15 de `grasa` y los 5 de `MUY BAJA` vienen de `sub`
— que es esperado, porque la lista de intercambios sobre **esta misma tabla** ya buscaba en
`sub` desde T3. Dos búsquedas sobre la misma tabla que se comportan distinto sería el bug.

**Evidencia de cierre de T13:** commit `7c28f15` · `serverapp` `npx tsc --noEmit -p
tsconfig.build.json` → **67** (= baseline) · `npx jest` → **97 suites / 794 tests, 0 fallos**
(baseline 96/790 + 2 de T6 + 2 de T13).

### L17 — 2026-10-24 — T14: el "basura" era la parte sana del catálogo

Pregunta del usuario: *"Que recomiendas?"*, entre T14 y T12. T12 sigue bloqueado de fijo
(`FOOD_GROUPS_CATALOG` son 9 grupos hardcodeados en `PatientTab.tsx:72`, sin `unity` ni
`grams`), así que recomendé T14. **Mi primer número estaba mal**: dije que había que re-apuntar
"182 hijos". Ese 182 es el total de `ExchangeListItem` en todo el sistema, no el que toca la
limpieza. El número real es **31**, y L10 quedó corregida.

Elegido "re-apuntar al alimento correcto", arme el mapeo y ahí apareció el problema de verdad.
Filtré las filas basura de los candidatos (sin eso el matcher se emparejaba a sí mismo:
`lomo (magra)` → `lomo, bistec (magra)`, **ambos** basura) y quedó **1 de 28 con coincidencia
fuerte**. Investigando por qué:

**CARNES tiene 16 filas "reales" y 21 "basura", y las 21 tienen hijos. Todas.**

| Las 16 "reales" de CARNES | Las 21 "basura" de CARNES |
| --- | --- |
| Pescado: Salmón, Sardinas, Atún, Ostras | **pollo, gallina o pavo** · **pollo (blanco/oscuro), pavo, pato o ganso** |
| Lácteos mal clasificados: requesón, Mozzarella, Ricotta, Feta, Leche de soya | **jamón de pierna, pechuga de pollo o pavo** |
| Soya: Tempeh, Tofu | **lomo (magra)** · **lomo, bistec (magra)** · **lomo, picado** |
| Embutidos: Bologna, Salami, Tocineta, Salchicha | **magra, asada** · **costilla asada, picada** · **asada, picada, pierna** |
| Ambigua: "chuleta" (`unity="0"`) | faisán/venado/búfalo · ganso/conejo · arenque · mariscos |

**No hay ni pollo ni res como fila sana.** Borrar la "basura" habría borrado el catálogo de
carne. Me retracté de la recomendación con la evidencia arriba.

**Qué pasó realmente:** la extracción del PDF partió las celdas de la tabla en filas separadas
(encabezado y valores cayeron como filas independientes) y el clasificador de T4 las marcó
`method='basura'` porque venían con `unity="0"` y `grams=null`. Son datos reales, mal cortados.
Por eso los junk se emparejan entre sí (`Con 5 g de grasa o menos` ↔ `rallado con 3 g de grasa
o menos`, `Margarina: …` ↔ `Mayonesa: …`): son el encabezado y la continuación de la misma
entrada.

**Decisión del usuario:** *"Mínimo seguro primero"* — borrar solo lo que es puro texto, dejar
las 26 filas de carne mangled intactas.

**Ejecutado (5 filas, 2 hijos):**

| Basura borrada | Destino (twin exacto) | Hijos |
| --- | --- | --- |
| `Tortilla harina de maíz (13  cm diámetro)\t` | `Tortilla harina de maíz (13 cm diámetro)` | 1 |
| `Pan bajo en calorías (ligero) ` | `Pan bajo en calorías (ligero)` | 0 |
| `Pan blanco o integral ` | `Pan blanco o integral` | 0 |
| `Pan de hamburguesa o perro caliente ` | `Pan de hamburguesa o perro caliente` | 0 |
| `cualquier tipo` | `fresco o congelado, lenguado, bacalao, arenque, trucha, atún` | 1 |

Orden FK correcto: **re-apuntar hijos → borrar fila → borrar del fixture**. Los 4 primeros
tenían twin exacto tras normalizar whitespace/tab, así que no hubo juicio de por medio.
`cualquier tipo` fue el único de los 6 captions con confianza alta: su destino es la fila que
le sigue en la lista "Carnes & Proteínas".

**NO tocado (5 captions, destino indeterminado)** — todos con 1 hijo en "Carnes & Proteínas".

> ⚠️ **Esta tabla quedó corregida en L18.** Se escribió sin tener el `1.pdf`, y tres de sus
> afirmaciones eran falsas: `la mayoría de las carnes de res…` sí es `Res` en el PDF, `1 unid 50`
> sí es `Huevos: Entero (gallina)`, y `Con 5 g de grasa o menos` **es** el encabezado de
> sección `Quesos (con 5 g de grasa):`. `rallado con 3 g de grasa o menos` y `bajo en grasa`
> **no aparecen en el PDF**.

| Caption | Hijo | Por qué no se tocó |
| --- | --- | --- |
| `la mayoría de las carnes de res entran en esta categoría` | 30 g | candidato `lomo, bistec (magra)` es solo media confianza |
| `1 unid 50` | 1 unidad (50g) | sin contexto alguno |
| `Con 5 g de grasa o menos` | 30 g | es encabezado de queso: `Feta` o `Mozzarella` |
| `rallado con 3 g de grasa o menos` | 2 cdas | candidato `4,5% grasa requesón parmesano` es baja |
| `bajo en grasa` | 1/4 taza | `requesón` y `Ricotta` los dos miden 1/4 taza |

**Pista relevante para cuando haya el PDF:** los 6 hijos están en una lista donde *todos* los
items son `amount=1` y cada `servingLabel` calza exacto con el `unity` de su alimento. Eso es
generación mecánica, no curaduría humana — sugiere que esos hijos son artefactos del mismo bug
de splitting, no datos del usuario.

**Backup previo** (antes de cualquier mutación): `/tmp/opencode/t14/backup/` con
`FoodExchangeList.json` (187), `ExchangeListItem.json` (182) y `seed.exchange-list.ts`.

**Verificación:**

| Check | Resultado |
| --- | --- |
| Guard fixture ↔ base (`seed.exchange-list.db.integration.spec.ts`) | **2/2** |
| Filas / hijos | 187 → **182** · 2 hijos re-apuntados · **0 huérfanos** |
| Fixture | 202 → **197** entradas · 187 → **182** únicos (= base) |
| `npx tsc --noEmit -p tsconfig.build.json` | **67** (= baseline) |
| `npm test` | **97 suites / 794 tests, 0 fallos** |
| `searchText IS NULL` | **0 de 182** (comentario de `food-metrics.service.spec.ts` actualizado 187 → 182) |

### L18 — 2026-10-25 — T14 (tanda 2): reconstrucción de CARNES desde el PDF

El usuario confirmó `1.pdf` ("la vigente") y autorizó: *"ok, avanza con eso entonces"*.

**Fuente:** `docs` → `/home/jsojo/Escritorio/NUTRINGEST/intercambios/1.pdf`, "LISTAS DE
INTERCAMBIOS DE ALIMENTOS 2003" (UCV, Fac. Medicina, rev. feb 2018). La verdad de CARNES es la
**LISTA Nº 5, página 9**, extraída con `pdftotext -layout -f 9 -l 9`.

**Descubrimiento previo a tocar nada:** las 26 filas "mangled" **ya estaban en el seed original**
(backup de T4) — no las generó T4. Son residuo de una extracción anterior que partió las celdas
mergeadas de la tabla en filas sueltas, con `unity="0"` y `grams=null`, y el clasificador de T4
las marcó `method='basura'` por ese síntoma, no por falta de contenido.

**Restricción de medida descubierta al medir el catálogo:** en las 125 filas sanas la `unity`
llega a **11 caracteres máximo** (`1 trozo peq`, `2 rebanadas`, `5 rebanadas`), promedio 5.4. La
celda mergeada del PDF dice *"1 trozo pequeño o 2 cucharadas (molido, mechado o desmenuzado sin
aliños)"* (66 chars) — meterla entera rompe la columna "Medida" que T9 agregó. Se usa la medida
práctica corta ya presente en el catálogo (`1 trozo peq`) y la precisión la carga `grams = 30`.

**Ejecutado — 11 renombres (DB + fixture, `unity`/`grams` desde el PDF):**

| Nombre viejo | Nombre nuevo | unity | grams |
| --- | --- | --- | --- |
| `1 unid 50` | `Huevos: Entero (gallina)` | `1 unidad` | 50 |
| `la mayoría de las carnes de res entran en esta categoría` | `Res: la mayoría de las carnes de res entran en esta categoría` | `1 trozo peq` | 30 |
| `pollo, gallina o pavo (carne blanca sin piel)` | `Aves de corral: pollo, gallina o pavo (carne blanca s/piel)` | `1 trozo peq` | 30 |
| `pollo (oscura c/piel)pavo picado, pollo picado)` | `Aves de corral: pollo, gallina o pavo (carne oscura c/ piel)` | `1 trozo peq` | 30 |
| `almejas, cangrejo, langosta, camarón` | `Mariscos y/o moluscos: almejas, langosta, camarón` | `1 trozo peq` | 30 |
| `jamón de pierna, pechuga de pollo o pavo` | `Jamón de pierna o pechuga de pavo o pollo` | `1 lonja` | 30 |
| `fresco o congelado, lenguado, bacalao, arenque, trucha, atún` | `Pescados: fresco o congelado, lenguado, bacalao, atún` | `1 trozo peq` | 30 |
| `faisán (sin piel), venado, búfalo` | `Animales de caza: faisán (sin piel), venado, búfalo, ganso (sin piel), conejo` | `1 trozo peq` | 30 |
| `lomo (magra)` | `Cerdo: lomo` | `1 trozo peq` | 30 |
| `costilla asada, picada` | `Cordero (costilla)` | `1 trozo peq` | 30 |
| `magra, asada` | `Ternera (chuleta)` | `1 trozo peq` | 30 |

**Ejecutado — 4 fusiones (re-apuntar hijo → borrar fila → borrar del fixture):**

| Borrada | Destino | Hijos |
| --- | --- | --- |
| `ganso (sin piel), conejo` | `Animales de caza: …ganso (sin piel), conejo` | 1 |
| `lomo, picado` | `Cerdo: lomo` | 1 |
| `lomo, bistec (magra)` | `Res: la mayoría de las carnes…` | 1 |
| `arenque` | `Pescados: fresco o congelado, lenguado, bacalao, atún` | 1 |

Orden FK de siempre: **renombres primero** (los destinos de fusión se crean ahí) y después
**re-apuntar hijos → borrar fila → borrar del fixture**. Validado con dry run antes de mutar.

**NO tocado, con motivo concreto:**

| Fila | Motivo |
| --- | --- |
| `Con 5 g de grasa o menos` · `bajo en grasa` · `rallado con 3 g de grasa o menos` | las 3 son artefacto de sección; el hijo apunta a un queso (`30 g`, `1/4 taza`, `2 cdas`) y el PDF no dice **cuál**. Requiere decisión del usuario. |
| `pollo (blanco c/piel, oscuro s/piel), pavo, pato o ganso` | **no existe en el PDF** (mezcla blanca y oscura). Sin destino. |
| `asada, picada, pierna` | fragmento sin contrapartida clara en el PDF. |
| 34 filas HORTALIZAS con `unity=""` + 6 de FRUTAS con placeholder | fuera de CARNES; son el resto del inventario de `unity` rota. |

**Inventario de `unity` rota en todo el catálogo (187 filas antes de esta tanda):**

| Estado | Filas | Categoría |
| --- | --- | --- |
| `ok` | 125 | — |
| `""` (vacía) | 34 | HORTALIZAS Y VEGETALES |
| `0` / `UNITY` (placeholder) | 28 | CARNES (22), FRUTAS (6) |

Y **65 filas con `grams = null`** en la base tras esta tanda (34 hortalizas, 12 carnes,
7 grasas, resto frutas/panes/cereales).

**Cambio en un test:** `food-exchange.repository.db.integration.spec.ts` fijaba
`lomo, bistec (magra)` para proyectar `grams = null`. Esa fila fue fusionada en L18, así que el
pin se movió a **`Sardinas (enlatadas)`** (alimento real, `grams = null`, fuera de la lista de
pendientes). El comentario del test documenta el motivo del cambio.

**Backup:** `/tmp/opencode/t14/backup2/` con `FoodExchangeList.json` (182),
`ExchangeListItem.json` (182) y `seed.exchange-list.before.ts` (197 entradas).

**Verificación:**

| Check | Resultado |
| --- | --- |
| Guard fixture ↔ base (`seed.exchange-list.db.integration.spec.ts`) | **2/2** |
| Filas / hijos | 182 → **178** · 4 hijos re-apuntados · **0 huérfanos** |
| Fixture | 197 → **193** entradas · 182 → **178** únicos (= base) |
| `npx tsc --noEmit -p tsconfig.build.json` | **67** (= baseline) |
| `npm test` | **97 suites / 794 tests, 0 fallos** |
| Referencias a los 4 nombres borrados | **0** en source (`dist/` e `coverage/` ignorados) |
