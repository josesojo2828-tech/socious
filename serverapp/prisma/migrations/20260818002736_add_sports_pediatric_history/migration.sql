-- CreateTable
CREATE TABLE "SportsHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "background" JSONB,
    "goals" JSONB,
    "competitionLevel" TEXT,
    "trainingMinutesPerSession" DOUBLE PRECISION,
    "trainingDaysPerWeek" INTEGER,
    "trainingSessionsPerDay" INTEGER,
    "ffmKg" DOUBLE PRECISION,
    "cunninghamRmr" DOUBLE PRECISION,
    "metsExpenditure" DOUBLE PRECISION,
    "assessment" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "SportsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsHistoryDiscipline" (
    "id" TEXT NOT NULL,
    "sportsHistoryId" TEXT NOT NULL,
    "sportDisciplineId" TEXT NOT NULL,

    CONSTRAINT "SportsHistoryDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PediatricHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "weightKg" DECIMAL(65,30),
    "heightCm" DECIMAL(65,30),
    "sittingHeightCm" DECIMAL(65,30),
    "activityFactor" DOUBLE PRECISION,
    "growthCost" DOUBLE PRECISION,
    "schofieldTmb" DOUBLE PRECISION,
    "harrisBenedictWoman" DOUBLE PRECISION,
    "rct" DOUBLE PRECISION,
    "mirwaldPhv" DOUBLE PRECISION,
    "growthClassification" TEXT,
    "growthChartType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "PediatricHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfantFormulaHistory" (
    "id" TEXT NOT NULL,
    "pediatricHistoryId" TEXT NOT NULL,
    "capacityMl" DECIMAL(65,30),
    "dailyVolumeMl" DECIMAL(65,30),
    "densityKcalPerMl" DECIMAL(65,30),
    "feedingFrequency" INTEGER,
    "formulaType" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "InfantFormulaHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SportsHistory_patientId_idx" ON "SportsHistory"("patientId");

-- CreateIndex
CREATE INDEX "SportsHistory_created_by_id_idx" ON "SportsHistory"("created_by_id");

-- CreateIndex
CREATE INDEX "SportsHistoryDiscipline_sportDisciplineId_idx" ON "SportsHistoryDiscipline"("sportDisciplineId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsHistoryDiscipline_sportsHistoryId_sportDisciplineId_key" ON "SportsHistoryDiscipline"("sportsHistoryId", "sportDisciplineId");

-- CreateIndex
CREATE INDEX "PediatricHistory_patientId_idx" ON "PediatricHistory"("patientId");

-- CreateIndex
CREATE INDEX "PediatricHistory_created_by_id_idx" ON "PediatricHistory"("created_by_id");

-- CreateIndex
CREATE INDEX "InfantFormulaHistory_pediatricHistoryId_idx" ON "InfantFormulaHistory"("pediatricHistoryId");

-- CreateIndex
CREATE INDEX "InfantFormulaHistory_created_by_id_idx" ON "InfantFormulaHistory"("created_by_id");

-- AddForeignKey
ALTER TABLE "SportsHistory" ADD CONSTRAINT "SportsHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsHistory" ADD CONSTRAINT "SportsHistory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsHistoryDiscipline" ADD CONSTRAINT "SportsHistoryDiscipline_sportsHistoryId_fkey" FOREIGN KEY ("sportsHistoryId") REFERENCES "SportsHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsHistoryDiscipline" ADD CONSTRAINT "SportsHistoryDiscipline_sportDisciplineId_fkey" FOREIGN KEY ("sportDisciplineId") REFERENCES "SportDiscipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PediatricHistory" ADD CONSTRAINT "PediatricHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PediatricHistory" ADD CONSTRAINT "PediatricHistory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfantFormulaHistory" ADD CONSTRAINT "InfantFormulaHistory_pediatricHistoryId_fkey" FOREIGN KEY ("pediatricHistoryId") REFERENCES "PediatricHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfantFormulaHistory" ADD CONSTRAINT "InfantFormulaHistory_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
