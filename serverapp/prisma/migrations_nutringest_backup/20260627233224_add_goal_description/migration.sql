-- DropForeignKey
ALTER TABLE "public"."Feedback" DROP CONSTRAINT "Feedback_userId_fkey";

-- DropIndex
DROP INDEX "public"."User_username_key";

-- AlterTable
ALTER TABLE "Feedback" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "PriorityLead" ADD COLUMN     "featureRequest" TEXT,
ADD COLUMN     "priceRange" TEXT,
ADD COLUMN     "wantsNotifications" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Anthropometry_patientId_idx" ON "Anthropometry"("patientId");

-- CreateIndex
CREATE INDEX "DietPlan_patientId_idx" ON "DietPlan"("patientId");

-- CreateIndex
CREATE INDEX "Goal_patientId_idx" ON "Goal"("patientId");

-- CreateIndex
CREATE INDEX "LabResult_patientId_idx" ON "LabResult"("patientId");

-- CreateIndex
CREATE INDEX "NutritionalPlan_patientId_idx" ON "NutritionalPlan"("patientId");

-- CreateIndex
CREATE INDEX "ShoppingList_patientId_idx" ON "ShoppingList"("patientId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
