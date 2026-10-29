-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "wasteFactor" DECIMAL(10,2) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "InstitutionalCalculation" ADD COLUMN     "metsExpenditure" DOUBLE PRECISION,
ADD COLUMN     "sportDisciplineId" TEXT,
ADD COLUMN     "trainingHours" DOUBLE PRECISION,
ADD COLUMN     "trainingSessions" INTEGER;

-- CreateTable
CREATE TABLE "SportDiscipline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "metValue" DECIMAL(5,2) NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportDiscipline_name_key" ON "SportDiscipline"("name");

-- AddForeignKey
ALTER TABLE "InstitutionalCalculation" ADD CONSTRAINT "InstitutionalCalculation_sportDisciplineId_fkey" FOREIGN KEY ("sportDisciplineId") REFERENCES "SportDiscipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
