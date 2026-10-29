-- AlterTable: reemplazar entrenamiento por horas/sesiones con la variante Método 2 (minutos/días/sesiones por día)
ALTER TABLE "InstitutionalCalculation" ADD COLUMN     "trainingMinutesPerSession" DOUBLE PRECISION,
ADD COLUMN     "trainingDaysPerWeek" INTEGER,
ADD COLUMN     "trainingSessionsPerDay" INTEGER;

-- Preservar datos existentes: horas -> minutos (×60), sesiones por semana -> días por semana, 1 sesión por día
UPDATE "InstitutionalCalculation"
SET "trainingMinutesPerSession" = "trainingHours" * 60,
    "trainingDaysPerWeek" = "trainingSessions",
    "trainingSessionsPerDay" = 1
WHERE "trainingHours" IS NOT NULL AND "trainingSessions" IS NOT NULL;

-- Drop columnas viejas
ALTER TABLE "InstitutionalCalculation" DROP COLUMN     "trainingHours",
DROP COLUMN     "trainingSessions";