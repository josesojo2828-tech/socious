-- AlterTable: Add organizationId to 6 models for data isolation

-- Consultation
ALTER TABLE "Consultation" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Consultation_organizationId_idx" ON "Consultation"("organizationId");
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Menu
ALTER TABLE "Menu" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Menu_organizationId_idx" ON "Menu"("organizationId");
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ExchangeList
ALTER TABLE "ExchangeList" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "ExchangeList_organizationId_idx" ON "ExchangeList"("organizationId");
ALTER TABLE "ExchangeList" ADD CONSTRAINT "ExchangeList_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- NutritionalPlan
ALTER TABLE "NutritionalPlan" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "NutritionalPlan_organizationId_idx" ON "NutritionalPlan"("organizationId");
ALTER TABLE "NutritionalPlan" ADD CONSTRAINT "NutritionalPlan_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DietPlanTemplate
ALTER TABLE "DietPlanTemplate" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "DietPlanTemplate_organizationId_idx" ON "DietPlanTemplate"("organizationId");
ALTER TABLE "DietPlanTemplate" ADD CONSTRAINT "DietPlanTemplate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- InstitutionalCalculation
ALTER TABLE "InstitutionalCalculation" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "InstitutionalCalculation_organizationId_idx" ON "InstitutionalCalculation"("organizationId");
ALTER TABLE "InstitutionalCalculation" ADD CONSTRAINT "InstitutionalCalculation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
