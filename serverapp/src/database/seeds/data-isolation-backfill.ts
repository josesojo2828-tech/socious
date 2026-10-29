/**
 * Data Isolation Backfill Script
 *
 * Backfills organizationId on 6 models:
 * - Consultation → from patient.organizationId
 * - NutritionalPlan → from patient.organizationId
 * - Menu → from nutritionist's most recent OrganizationMember (status=ACTIVE)
 * - ExchangeList → from nutritionist's most recent OrganizationMember (status=ACTIVE)
 * - DietPlanTemplate → from nutritionist's most recent OrganizationMember (status=ACTIVE)
 * - InstitutionalCalculation → from nutritionist's most recent OrganizationMember (status=ACTIVE)
 *
 * Records with no clear origin retain organizationId: null (personal workspace).
 *
 * Usage:
 *   npx ts-node src/database/seeds/data-isolation-backfill.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillConsultation() {
  console.log('Backfilling Consultation.organizationId from Patient...');

  const result = await prisma.$executeRaw`
    UPDATE "Consultation" c
    SET "organizationId" = p."organizationId"
    FROM "Patient" p
    WHERE c."patientId" = p.id
      AND p."organizationId" IS NOT NULL
      AND c."organizationId" IS NULL
  `;

  console.log(`  → Updated ${result} Consultation records`);
  return result;
}

async function backfillNutritionalPlan() {
  console.log('Backfilling NutritionalPlan.organizationId from Patient...');

  const result = await prisma.$executeRaw`
    UPDATE "NutritionalPlan" np
    SET "organizationId" = p."organizationId"
    FROM "Patient" p
    WHERE np."patientId" = p.id
      AND p."organizationId" IS NOT NULL
      AND np."organizationId" IS NULL
  `;

  console.log(`  → Updated ${result} NutritionalPlan records`);
  return result;
}

async function backfillFromNutritionistOrgMember(
  tableName: string,
  columnName: string,
) {
  console.log(`Backfilling ${tableName}.organizationId from nutritionist's OrganizationMember...`);

  // Menu.nutritionistId -> Nutritionist.id -> Nutritionist.userId -> OrganizationMember.userId
  const sql = `
    UPDATE "${tableName}" t
    SET "organizationId" = om."organizationId"
    FROM "Nutritionist" n
    INNER JOIN "OrganizationMember" om ON om."userId" = n."userId"
    WHERE t."${columnName}" = n."id"
      AND om."status" = 'ACTIVE'
      AND om."assignedAt" = (
        SELECT MAX(om2."assignedAt")
        FROM "Nutritionist" n2
        INNER JOIN "OrganizationMember" om2 ON om2."userId" = n2."userId"
        WHERE n2."id" = t."${columnName}"
          AND om2."status" = 'ACTIVE'
      )
      AND t."organizationId" IS NULL
  `;

  const result = await prisma.$executeRawUnsafe(sql);

  console.log(`  → Updated ${result} ${tableName} records`);
  return result;
}

async function main() {
  console.log('=== Data Isolation Backfill ===\n');

  try {
    // Phase 1: Models derived from Patient
    const consultationCount = await backfillConsultation();
    const nutritionalPlanCount = await backfillNutritionalPlan();

    // Phase 2: Models derived from nutritionist's OrganizationMember
    const menuCount = await backfillFromNutritionistOrgMember('Menu', 'nutritionistId');
    const exchangeListCount = await backfillFromNutritionistOrgMember('ExchangeList', 'nutritionistId');
    const dietPlanTemplateCount = await backfillFromNutritionistOrgMember('DietPlanTemplate', 'nutritionistId');
    const institutionalCalcCount = await backfillFromNutritionistOrgMember('InstitutionalCalculation', 'nutritionistId');

    console.log('\n=== Summary ===');
    console.log(`Consultation:              ${consultationCount} records updated`);
    console.log(`NutritionalPlan:           ${nutritionalPlanCount} records updated`);
    console.log(`Menu:                      ${menuCount} records updated`);
    console.log(`ExchangeList:              ${exchangeListCount} records updated`);
    console.log(`DietPlanTemplate:          ${dietPlanTemplateCount} records updated`);
    console.log(`InstitutionalCalculation:  ${institutionalCalcCount} records updated`);
    console.log('\nDone. Records with no clear origin remain null (personal workspace).');
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
