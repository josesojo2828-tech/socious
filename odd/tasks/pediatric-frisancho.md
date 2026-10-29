# ODD Task: Pediatric Frisancho Anthropometric Standards

**Status:** COMPLETED  
**Type:** Feature / Clinical Engine  
**Area:** Pediatric Nutrition & Body Composition (`webapp` / `serverapp`)  
**Created:** 2026-10-16  

---

## Context & Motivation

A pediatric clinical user requested evaluating upper arm body composition in pediatric patients (ages 1–18 years) according to Frisancho anthropometric standards. In clinical pediatric nutrition, evaluating raw weight and height or BMI alone fails to differentiate between somatic protein reserves (skeletal muscle) and caloric reserves (subcutaneous adipose tissue).

By measuring:
1. **Mid-Upper Arm Circumference (MUAC / CB):** measured in centimeters (cm).
2. **Triceps Skinfold Thickness (TSF / PCT):** measured in millimeters (mm).

We can determine the cross-sectional composition of the upper arm:
- Total Arm Area (TAA / Área Total del Brazo)
- Arm Muscle Area (AMA / Área Muscular del Brazo)
- Bone-free Corrected Arm Muscle Area (cAMA / Heymsfield correction)
- Arm Fat Area (AFA / Área Grasa del Brazo)
- Arm Fat Index (AFI / % Grasa Braquial)

And benchmark these measurements against the A. Roberto Frisancho (1981, 1990) NHANES I & II reference distributions by age bracket and biological sex to establish nutritional classification for protein-calorie reserves.

---

## Specs

### S1: Body Composition Formulas

- **Total Arm Area (TAA, $cm^2$):**
  $$TAA = \frac{C^2}{4\pi}$$
  Where $C$ is MUAC in cm.

- **Uncorrected Arm Muscle Area (AMA, $cm^2$):**
  $$AMA = \frac{(C - \frac{\pi \times T}{10})^2}{4\pi}$$
  Where $C$ is MUAC in cm and $T$ is Triceps Skinfold in mm (divided by 10 to convert to cm).

- **Corrected Arm Muscle Area (cAMA, $cm^2$ - Heymsfield et al. 1982 bone-free correction):**
  - Male: $cAMA = AMA - 10$ ($cm^2$)
  - Female: $cAMA = AMA - 6.5$ ($cm^2$)
  *(If calculated $cAMA < 0$, clamped to 0).*

- **Arm Fat Area (AFA, $cm^2$):**
  $$AFA = TAA - AMA$$
  *(Direct algebraic equivalent to $\frac{C \times S}{2} - \frac{\pi \times S^2}{4}$).*

- **Arm Fat Index (AFI, %):**
  $$AFI = \frac{AFA}{TAA} \times 100$$

All formulas round outputs to 2 decimal places using standard engine precision (`round2`).

### S2: NHANES Reference Tables (Frisancho 1981, 1990)

Reference percentiles for males and females aged 1.0 to 18.0 years (stratified in standard annual brackets: 1.0–1.9, 2.0–2.9, ..., 17.0–17.9 / 18.0) covering:
- **TSF (Triceps Skinfold, mm)**
- **MUAC (Mid-Upper Arm Circumference, cm)**
- **AMA (Arm Muscle Area, $cm^2$)**
- **AFA (Arm Fat Area, $cm^2$)**

Percentile levels evaluated: `p5`, `p10`, `p15`, `p25`, `p50`, `p75`, `p85`, `p90`, `p95`.

#### Categorical Clinical Percentiles:
- **Muscle Reserve Classification (AMA / cAMA / MUAC):**
  - `< p5`: *Depleción severa de masa muscular* (Severe muscle wasting) - Severity: `CRITICAL`
  - `p5 – p15`: *Depleción moderada de masa muscular* (Below average muscle mass) - Severity: `WARNING`
  - `p15 – p85`: *Masa muscular promedio / adecuada* (Normal muscle reserve) - Severity: `NORMAL`
  - `p85 – p95`: *Masa muscular sobre el promedio* (Above average muscle mass) - Severity: `NORMAL`
  - `> p95`: *Masa muscular alta / Hipertrofia* (High muscle mass) - Severity: `INFO`

- **Fat Reserve Classification (TSF / AFA):**
  - `< p5`: *Depleción severa de reserva grasa* (Severe fat depletion) - Severity: `CRITICAL`
  - `p5 – p15`: *Reserva grasa baja / bajo el promedio* (Below average fat reserve) - Severity: `WARNING`
  - `p15 – p85`: *Reserva grasa promedio / adecuada* (Normal fat reserve) - Severity: `NORMAL`
  - `p85 – p95`: *Sobrepeso / Exceso moderado de grasa* (Above average / Overweight risk) - Severity: `WARNING`
  - `> p95`: *Obesidad / Exceso severo de grasa* (Obese fat excess) - Severity: `ALERT`

### S3: TDD Unit Test Suite

- Suite: `webapp/src/features/nutringest/patient/lib/__tests__/frisancho.engine.test.ts`
- Coverage:
  1. Exact mathematical calculations for TAA, AMA, cAMA (male -10, female -6.5), AFA, AFI.
  2. Edge cases: invalid or negative measurements, zero values, unsupported gender (`OTHER`), age out of pediatric bounds (< 1 year or > 18 years).
  3. Table lookups across milestone ages (e.g., 1.5y, 5y boy, 10y girl, 16y adolescent).
  4. Clinical diagnosis generation and severity mapping.

### S4: Prisma Migration for PediatricHistory

- Backend persistence in `PediatricHistory` model (`serverapp/prisma/schema.prisma`):
  - `midUpperArmCircumferenceCm`
  - `tricepsSkinfoldMm`
  - `totalArmAreaCm2`
  - `armMuscleAreaCm2`
  - `correctedArmMuscleAreaCm2`
  - `armFatAreaCm2`
  - `armFatIndexPercent`
  - `frisanchoMuscleClassification`
  - `frisanchoFatClassification`

### S5: UI & PDF Integration

- Integration into pediatric anamnesis form (`webapp/src/features/nutringest/patient/components/PediatricForm`).
- Diagnostic summary card with color-coded badges and clinical alerts.
- Inclusion in the generated pediatric nutritional PDF report.

---

## Tasks

- [x] **T1: Document setup** — Initialize ODD task document with full clinical specs and reference criteria.
- [x] **T2: TDD Red: frisancho.engine.test.ts** — Author unit test suite covering equations, lookups, and edge cases, verifying test fails.
- [x] **T3: TDD Green: frisancho.engine.ts** — Implement calculation engine, lookup tables, and clinical interpretation, achieving 100% test pass rate.
- [x] **T4: Prisma schema & service update** — Database schema migration and NestJS service DTO mapping.
- [x] **T5: UI & PDF integration** — Form fields, live calculation, diagnostic display card, and PDF document generation.

---

## Log

- **2026-10-16 19:32 UTC:** Work unit initiated. ODD task document created. Test runner identified as Vitest in `webapp`. Exact Frisancho (1981, 1990) and Heymsfield (1982) formulas compiled.
- **2026-10-16 19:33 UTC:** TDD Step 1 (RED): Authored `webapp/src/features/nutringest/patient/lib/__tests__/frisancho.engine.test.ts` covering 35 test cases. Executed `vitest` and confirmed failure with code 1 (module not found).
- **2026-10-16 19:36 UTC:** TDD Step 2 (GREEN): Implemented `webapp/src/features/nutringest/patient/lib/frisancho.engine.ts` with complete types, equations, full 1-18y male/female NHANES percentile tables for TSF, MUAC, AMA, AFA, and clinical categorizations. Executed `vitest` and verified 100% pass rate (35/35 passing in 12ms).
- **2026-10-16 19:42 UTC:** Task T4 (Backend & Persistence): Added `headCircumferenceCm`, `midUpperArmCircumferenceCm`, `tricepsSkinfoldMm`, `subscapularSkinfoldMm`, `totalArmAreaCm2`, `armMuscleAreaCm2`, `correctedArmMuscleAreaCm2`, `armFatAreaCm2`, `armFatIndexPercent`, `frisanchoMuscleClassification`, and `frisanchoFatClassification` to `serverapp/prisma/schema.prisma`. Generated Prisma Client and authored migration `20261016_add_pediatric_frisancho_fields`. Updated DTO, service (`create`, `update`), and repository `format` methods. Added and passed unit tests in `pediatric-history.dto.spec.ts`.
- **2026-10-16 19:48 UTC:** Task T5 (UI & PDF Integration): Added input fields for `tricepsSkinfoldMm` and `subscapularSkinfoldMm` in `PediatricHistoryForm.tsx`. Integrated `calculateFrisanchoComposition` and added the "Composición Corporal Pediátrica (Frisancho)" card displaying cAMA (Heymsfield), AFA, AFI, percentile ranks, and clinical classification badges in `PediatricDiagnosticSummaryCard.tsx` (with fallback messaging for missing inputs and infants < 1 year). Updated `MeasurementsDocument.tsx` with dedicated Frisancho evaluation section in generated PDFs. Verified 0 TypeScript errors and 100% test pass rate in Vitest.

