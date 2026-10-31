# ODD Task: Socius ERP — Identidad visual y landing administrativa

**Status:** IN PROGRESS
**Type:** Feature / Frontend (design system + landing + higiene de planes)
**Area:** `webapp` (+ seeds del backend para los planes)
**Branch:** `feat/socius-brand` (desde `feat/webapp-erp`, que está sin pushear a la espera de decisión del usuario)
**Delivery strategy:** `single-pr`
**Test runner:** `npm run typecheck` (baseline **0**) y `npm test` (**26 suites / 248 tests**) — nunca `npm run build`. El lint no es gate (303 errores legacy); las superficies nuevas deben quedar en **0**.

---

## Context & Motivation

La app funcionó durante años como Nutringest y la metamorfosis a Socius ERP dejó la identidad
vieja instalada en tres capas: el CSS de marca (colores morados + fuente Montserrat + tokens
`--ng-*`/agenda clínica), la landing (estructura de nutrición alimentada por un JSON local
hardcodeado con `pro`/`premium`/`clinica`), y los planes legacy que siguen apareciendo junto a
los tres planes nuevos (BÁSICO/AVANZADO/PREMIUM). El usuario quiere un producto **serio,
administrativo**, y prohíbe datos hardcodeados en las vistas.

## Specs

### S1: Los planes de Nutringest desaparecen de la vista
> "#1. los planes de nutringest y aca como que se estan mezclando"

**Aceptación:** ninguna pantalla muestra PRO/Clinica/Premium viejo (4.00/99.99/20.00):
- el sembrador del backend deja de re-crear PRO en cada boot (hoy lo hace
  `loadSubscriptionPlansFixtures`) y la lista pública de planes expone **solo** los tres
  planes socius (`selected: true`);
- la sección Planes de `/dashboard/configuracion` y cualquier grilla de precios filtran por
  `selected: true` (o por los ids `BASICO|AVANZADO|PREMIUM`);
- la base de desarrollo queda sin planes legacy sin suscripciones que los referencien.

### S2: Identidad visual nueva (colores)
> "#2. Debemos cambiar todo el tema de los colores para que no parez a nutringest"

**Aceptación:** el tema morado de Nutringest (`--color-primary: #5b21b6`, acento `#7c3aed`,
alias `--ng-*`) sale del CSS base; los tokens nuevos son una paleta administrativa y seria
(sin verdes de "éxito clínico" como identidad de marca) aplicada al tema claro y oscuro de
daisyUI y al `@theme` de Tailwind; ningún comentario ni alias con `ng`/`nutringest` sobrevive
en `globals.css`.

### S3: Tipografía, bordes y redondeo
> "#3. Cambiar typograficoas, bordes, redondeo y todo eso
> Todo debe ser serio, ya que es algo administrativo."

**Aceptación:** fuente base fuera de Montserrat (familia neutral, de interfaz);
escala de radio acotada y consistente (UI compacta, esquinas menos redondas que hoy);
los componentes nuevos y los reutilizados heredan los tokens (nada de radius sueltos
copiados a dedo en cada pantalla).

### S4: Landing con estructura nueva, sin datos hardcodeados
> "#4. cambiar toda la estructura de la landing"
> "no quiero datos que sean hardcodeados, debes estar muy atento a ello"

**Aceptación:** la página `/` deja de leer `/api/landing-data` (JSON local con
`includedInPro/Premium/Clinica`) — los planes vienen del backend (`GET /api/subscription`),
el contenido legal/institucional del CMS (`/api/cms`), y el resto es copy estático
del producto (eso no es "dato", es texto de marca). Se elimina el route
`src/app/api/landing-data/` y su fallback. Estructura nueva pensada para un producto
administrativo (sin lenguaje de nutrición clínica ni testimonios de pacientes).

### S5: Herramienta de diseño
> "Puedes utlizar stich para hacer esas vistas, pero sin divagar"

**Aceptación:** se usa Stitch (proyecto + design system + pantallas) para fijar el
dirección visual de la landing antes de implementarla; la implementación en Next.js es
la fuente de verdad del producto (Stitch no entrega datos ni código de producción).

### S6: Cierre
`npm run typecheck` 0, `npm test` ≥248 verdes, superficies nuevas con lint 0,
landing servida por `next dev` y verificada por HTTP, sin referencias a
`landing-data` ni a planes legacy en el código.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | — | inline | pending | rama `feat/socius-brand` |
| T2 | S1 | inline | done | `188c0a6` (fixture PRO fuera del boot, BASE_PLAN_GRANTS vaciado, planes legacy borrados) |
| T3 | S2, S3 | inline | done | paleta indigo/slate + Inter + radio compacto, tokens clínicos borrados |
| T4 | S5 | inline | done | proyecto creado (`projects/7362308867375265012`); **limitación de la API** ver L3 — dirección fijada en los tokens de T3 |
| T5 | S4 | inline | done | `1a396e9` (landing nueva + endpoint público de planes + borrado de landing-data) |
| T6 | S6 | inline | pending | cierre |

> Ruta: todo inline (cada unidad es una superficie acotada: seeds+filtros, tokens CSS,
> sesión de Stitch, landing). El lint sigue sin ser gate; las unidades nuevas se
> verifican con typecheck + tests + `next dev`.

## Log

### L1 — Petición (usuario, 2026-10-30)

> Ok, vamos con muchas mas cosas:
>
> \#1. los planes de nutringest y aca como que se estan mezclando
> \#2. Debemos cambiar todo el tema de los colores para que no parez a nutringest
> \#3. Cambiar typograficoas, bordes, redondeo y todo eso
> \#4. cambiar toda la estructura de la landing
>
> Todo debe ser serio, ya que es algo administrativo.
>
> -----
>
> Puedes utlizar stich para hacer esas vistas, pero sin divagar, no quiero datos que sean hardcodeados, debes estar muy atento a ello

### L2 — Hallazgos de la inspección previa (evidencia)

- `webapp/src/app/api/landing-data/route.ts` define `Plan` con `includedInPro/Premium/Clinica`
  y la landing (`src/app/page.tsx`) hace `fetch("/api/landing-data")` + fallback
  hardcodeado con `proPlan/premiumPlan/clinicaPlan` (líneas 42-44) ← el origen de la mezcla.
- `src/shared/service/datafixture.service.ts → loadSubscriptionPlansFixtures` vuelve a
  crear el plan **PRO (4.00)** en **cada boot**.
- `src/app/globals.css` (288 líneas): fuente **Montserrat** (`--font-montserrat`),
  `--color-primary: #5b21b6` ("Marca: Purpura Nutringest"), acento `#7c3aed`,
  alias `--ng-*`, tokens `--color-agenda-*` (clínico) y colores de estado clínicos.
- No hay `tailwind.config.*`: la config es Tailwind v4 + daisyUI vía `@import
  "tailwindcss"` y bloques `@theme` / `@plugin "daisyUI/theme"` en `globals.css`.
- El catálogo de planes en BD hoy: `PRO 4.00`, `Premium 20.00`, `Clinica 99.99`
  (legacy, `selected=false`) + `BASICO 9.99`, `AVANZADO 19.99`, `PREMIUM 34.99`.


### L3 — Limitación de Stitch (evidencia, 2026-10-30)

`stitch_create_project` crea proyectos de tipo `PROJECT_DESIGN`, pero
`stitch_apply_design_system` y `stitch_generate_screen_from_text` solo operan
sobre `TEXT_TO_UI_PRO` (probado con el ID exacto, con y sin prefijo `projects/`:
"Request contains an invalid argument" y "Requested entity was not found"). Sin
una forma de crear TEXT_TO_UI_PRO por API, el diseño se fijó directamente en los
tokens del producto (T3: Inter + indigo + radio compacto) y la landing se
implementó contra esos tokens. El proyecto de Stitch queda en la cuenta por si
querés generar mockups desde la UI (el usuario puede crear un proyecto de tipo
"generate from text" y pedirme que lo use).

### Verificación de cierre (2026-10-30)

| Check | Resultado |
| --- | --- |
| webapp `npm run typecheck` | **0** (se limpió `.next` obsoleto que referenciaba el route borrado) |
| webapp `npm test` | **26/26 suites · 248 tests** |
| Lint en superficies nuevas | 0 (un warning preexistente en `features/public/hooks/useDashboard.ts`, no tocado) |
| `GET /` bajo `next dev` | **200**, sin errores de compilación |
| `/login`, `/terms`, `/privacy` | **200** |
| `GET /api/subscription/public` (Docker) | devuelve los 3 planes reales: Básico 9.99, Avanzado 19.99, Premium 34.99 con sus features verbatim |
| Planes legacy en la BD | **0** (solo BASICO/AVANZADO/PREMIUM) |

**Ramas:** `feat/socius-brand` (esta fase, local) sobre `feat/webapp-erp` (también local);
`main` en `origin` sigue con la fase backend. Ninguna de las dos ramas de frontend está
pusheada: decisión del usuario.


### L4 — Extensión posterior al cierre: identidad post-login (usuario)

> modifica tambien la vista de login y registro
> y vamos a cambiar los colores bro, ya que ahi luego de haber iniciado sesion veo todo igual sabes, o sea, aun morados y asi, modifica eso.

Commits: `b774ec9` (login, registro, AuthHeader y AuthHeroSlider) y
`82187c3` (barrido de paleta en el UI autenticado).

- **Login/registro**: AuthHeader con wordmark de texto "Socius ERP" (los PNG
  de Nutringest salieron de las 5 páginas de auth de una), AuthHeroSlider
  reescrito como panel de marca en pizarra con borde índigo (sin foto de
  personas, sin gradientes morados), hexes de marca → tokens del tema,
  checkbox "recordarme" decorativo eliminado (nunca se enviaba), rutas muertas
  de post-login (campus/bienvenido, atajo PATIENT) fuera, flujo de cupón de
  campus completo fuera de registro (endpoint huérfano) y "de Nutringest" →
  "de Socius" en la aceptación legal. Los `any` de catch tipados.
- **Paleta post-login**: 144 tokens `purple-N` → `indigo-N` en 36 archivos;
  hexes reasignados (#0d0ea0/#5b21b6/#4c1d95/#7c3aed/#8b5cf6 → índigo; los 6
  stops del gradiente de cabecera/sidebar #2d0754…#3b0b6f → pizarra
  #0f172a/#1e293b/#334155; #10b981 → #059669 para igualar el success del
  tema); el sidebar renderiza la marca "S" de Socius en vez del PNG; el átomo
  `Logo` (0 importadores, solo assets de Nutringest) eliminado.
- Verificación: webapp typecheck 0 · 26/248 tests · **0 tokens purple y 0
  hexes de marca en el código** · `GET /` y `GET /login` y `GET /register`
  → 200 sin rastros de marca vieja en el HTML servido.

**Nota de recursos (preferencia del usuario):** no correr builds ni operaciones
pesadas en este entorno; la verificación fue tsc + vitest (~1.5s) + una única
petición HTTP al stack Docker que ya estaba corriendo.
