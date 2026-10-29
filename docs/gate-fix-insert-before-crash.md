# Gate de observación — `fix-insert-before-crash` (decisión H2)

**Spec refs:** `OBS-R1` (el gate decide H2), `OBS-R2` (el criterio de eliminación del
crash es contingente al veredicto). **Estado del veredicto: `SKIPPED` (ver detalle
abajo).**

Este change instrumenta el sitio del crash (`insertBefore` en
`/dashboard/patients/[id]/historia-pediatrica`) y exige **exactamente un veredicto
loggeado ANTES de atribuir la eliminación del crash al fix**. El gate no puede fallar
en silencio: si los repros nunca crashean, eso también es un resultado que se registra.

## Instrumentación temporal (revertir después del gate)

- `webapp/src/app/error.tsx` — evidencia del crash site: `name`, `message`, `digest`,
  `componentStack` (si viene adjunto), `target` (`document.activeElement`), diálogos
  abiertos, `href`.
- `webapp/src/shared/components/organisms/Modal/Modal.tsx` — ModalRoot dev logging:
  mount/unmount, `dialogRef`, `dialog.open` antes/después de cada effect `[isOpen]`,
  y monkey-patch (dev-only, pass-through) de `HTMLDialogElement.prototype.showModal`
  / `close` con stack de llamada.
- Tag de grep: `[observe:fix-insert-before-crash]`. Todo es `NODE_ENV !== "production"`
  y está marcado con `// TODO(observe): temporary instrumentation for
  fix-insert-before-crash gate — revert after gate decision`.

## Procedimiento (MANUAL)

1. Deploy/dev con la instrumentación viva. Abrir la consola de Chrome (Android +
   Windows) y filtrar por `[observe:fix-insert-before-crash]`.
2. **Repro A:** abrir un modal → Escape (cerrar) → navegar a
   `/dashboard/patients/[id]/historia-pediatrica`.
3. **Repro B:** cerrar por backdrop → reabrir el mismo modal → navegar a
   `/dashboard/patients/[id]/historia-pediatrica`.
4. Repetir hasta cubrir ambos repros (o hasta demostrar que no crashean).

## Criterio de evidencia (firma H2)

CONFIRM requiere que el crash reproduzca **con** firma de unmount-ordering:

- `close()` **nunca** aparece en los logs del path de state-close (el patch de
  prototype no registra `close() called` en el cierre por `closeModal()`), y
- desync del backdrop observado (reapertura falla / `InvalidStateError`), y
- la alerta `insertBefore` aparece con el stack del route.

## Veredicto — SE REGISTRA UNA SOLA VEZ

```
VERDICT: SKIPPED
```

**Reason:** el usuario optó por shippear este cambio como fix de bug latente **sin
ejecutar el gate manual Repro A/B en el browser**. La instrumentación temporal
(`error.tsx` + `Modal.tsx`) fue revertida antes del commit; la verificación se traslada
a la observación post-deploy.

**Atribución de la eliminación del crash:** se decidirá observando las alertas de
Telegram post-deploy (alertas `insertBefore` en la ruta pediátrica, comparando con/sin
el commit SHA nuevo). Hasta entonces, la eliminación del crash queda **NO ATRIBUIDA**
a este change.

**Escalación REFUTE (si las alertas continúan post-fix):** aplica el path REFUTE — el
fix aterriza como fix de bug latente, la eliminación del crash se reporta **NO
ATRIBUIDA** a este change (OBS-R2 "Post-fix after REFUTE"), la hipótesis framework
(React 19.2 / Next 16.3) queda abierta, y se abre un NEW change con minimal-repro
(página app-router fresca, sin shell).
