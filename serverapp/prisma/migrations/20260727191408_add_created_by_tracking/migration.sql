-- AlterTable
ALTER TABLE "Anamnesis" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "Anthropometry" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "AssignedExchangeList" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "AssignedMenu" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "AssignedSupplement" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "DietPlanTemplate" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "ExchangeList" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "LabResult" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "NutritionalPlan" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "ShoppingList" ADD COLUMN     "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX "Anamnesis_created_by_id_idx" ON "Anamnesis"("created_by_id");

-- CreateIndex
CREATE INDEX "Anthropometry_created_by_id_idx" ON "Anthropometry"("created_by_id");

-- CreateIndex
CREATE INDEX "AssignedExchangeList_created_by_id_idx" ON "AssignedExchangeList"("created_by_id");

-- CreateIndex
CREATE INDEX "AssignedMenu_created_by_id_idx" ON "AssignedMenu"("created_by_id");

-- CreateIndex
CREATE INDEX "AssignedSupplement_created_by_id_idx" ON "AssignedSupplement"("created_by_id");

-- CreateIndex
CREATE INDEX "Consultation_created_by_id_idx" ON "Consultation"("created_by_id");

-- CreateIndex
CREATE INDEX "DietPlanTemplate_created_by_id_idx" ON "DietPlanTemplate"("created_by_id");

-- CreateIndex
CREATE INDEX "ExchangeList_created_by_id_idx" ON "ExchangeList"("created_by_id");

-- CreateIndex
CREATE INDEX "Goal_created_by_id_idx" ON "Goal"("created_by_id");

-- CreateIndex
CREATE INDEX "LabResult_created_by_id_idx" ON "LabResult"("created_by_id");

-- CreateIndex
CREATE INDEX "Menu_created_by_id_idx" ON "Menu"("created_by_id");

-- CreateIndex
CREATE INDEX "NutritionalPlan_created_by_id_idx" ON "NutritionalPlan"("created_by_id");

-- CreateIndex
CREATE INDEX "Patient_created_by_id_idx" ON "Patient"("created_by_id");

-- CreateIndex
CREATE INDEX "ShoppingList_created_by_id_idx" ON "ShoppingList"("created_by_id");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeList" ADD CONSTRAINT "ExchangeList_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanTemplate" ADD CONSTRAINT "DietPlanTemplate_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anthropometry" ADD CONSTRAINT "Anthropometry_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionalPlan" ADD CONSTRAINT "NutritionalPlan_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedMenu" ADD CONSTRAINT "AssignedMenu_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedExchangeList" ADD CONSTRAINT "AssignedExchangeList_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedSupplement" ADD CONSTRAINT "AssignedSupplement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

