-- AlterTable
ALTER TABLE "Anamnesis" ADD COLUMN     "alcoholFrequency" TEXT,
ADD COLUMN     "eatingHabits" JSONB,
ADD COLUMN     "exerciseFrequency" TEXT,
ADD COLUMN     "foodFrequency" JSONB,
ADD COLUMN     "gastrointestinalDisorders" JSONB,
ADD COLUMN     "gynecoObstetric" JSONB,
ADD COLUMN     "nutritionalDiagnosis" TEXT,
ADD COLUMN     "preferredFoods" TEXT[],
ADD COLUMN     "previousDiets" TEXT,
ADD COLUMN     "recall24h" JSONB,
ADD COLUMN     "smokingFrequency" TEXT,
ADD COLUMN     "supplements" TEXT,
ADD COLUMN     "weightLossMeds" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "address" TEXT,
ADD COLUMN     "maritalStatus" TEXT;
