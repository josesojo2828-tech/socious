# Roadmap — cierre de seguridad y legal (2026-10-20)

Plan maestro. **Un documento por feature**; este archivo es el índice y el orden, no un duplicado.

## Fases

| Fase | Feature | Doc | Riesgo | Depende de |
| --- | --- | --- | --- | --- |
| 0 | Decisiones del usuario | este doc §Decisiones | — | — |
| 1 | Cierre de seguridad local (T25, fixtures, tokens) | `security-hardening-followups.md` | item 2 | — |
| 2 | Invitación por correo al paciente | `patient-onboarding.md` | item 1, 2 | Fase 1 |
| 3 | Paciente pediátrico con representante | `patient-onboarding.md` | item 1, 6 | Fase 2 |
| 4 | Legal Fase 3 y 4 (T15-T20, T23, T24) | `legal-compliance.md` | item 3 | Fase 0 (decisiones) |
| 5 | `entitlements-rollout` (inventario de 415 rutas) | Engram `sdd/entitlements-rollout/*` | item 3 | Fase 0 (2 preguntas) |
| 6 | Publicación en producción | `security-hardening-followups.md` | item 5 | Fases 1-3 |

## Decisiones que bloquean (no son técnicas)

1. **Datos de la empresa** para los documentos legales (T21): razón social, RIF, dirección, correo, fecha de vigencia.
2. **`entitlements-rollout`**: ¿el IDOR de `agenda/history` se corrige en ese change o aparte? ¿`ATTENDANCE_CONTROL` va en `permits.list` de algún rol?
3. **Caracterización de datos clínicos**: ¿Nutringest es responsable o encargado del profesional? Cambia los contratos (T19).
4. **Acceso a producción** para rotar/invitar las 32 cuentas con contraseña temporal y publicar migraciones + documentos legales.
5. **Historial de git**: el hash de la contraseña temporal conocida sigue en `12b0d33` y `e1e915b`. Reescribir el historial rompe clones y PRs abiertos — decisión del usuario.

## Regla de orden

La Fase 2 (invitación) **elimina de raíz** el problema de la contraseña temporal: en vez de rotar 32 contraseñas a mano, el paciente define la suya mediante un enlace de un solo uso. Por eso la Fase 6 es "publicar" y no "rotar".
