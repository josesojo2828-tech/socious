-- AlterTable (S2 legal-compliance: expiración y revocación de enlaces compartidos)
ALTER TABLE "NutritionalPlan" ADD COLUMN     "shareTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "shareTokenRevokedAt" TIMESTAMP(3);

-- CreateTable (S2 legal-compliance: registro de accesos a enlaces compartidos)
CREATE TABLE "shared_link_access" (
    "id" TEXT NOT NULL,
    "nutritional_plan_id" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_link_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_link_access_nutritional_plan_id_idx" ON "shared_link_access"("nutritional_plan_id");

-- AddForeignKey
ALTER TABLE "shared_link_access" ADD CONSTRAINT "shared_link_access_nutritional_plan_id_fkey" FOREIGN KEY ("nutritional_plan_id") REFERENCES "NutritionalPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
