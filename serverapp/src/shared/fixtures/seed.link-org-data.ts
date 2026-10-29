/**
 * seed.link-org-data.ts
 *
 * Vincula pacientes, consultas y planes nutricionales a organizaciones
 * SOLO para miembros que YA existen en la organización.
 * NO agrega nuevos miembros - eso debe hacerse manualmente o through invites.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/shared/fixtures/seed.link-org-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(60));
  console.log("  🔗 VINCULAR DATOS A ORGANIZACIONES");
  console.log("=".repeat(60));

  // 1. Obtener todas las membresías de organización activas
  const orgMembers = await prisma.organizationMember.findMany({
    where: { status: "ACTIVE" },
    select: {
      organizationId: true,
      userId: true,
      role: true,
    },
  });

  console.log(`\n📋 Encontradas ${orgMembers.length} membresías de organización`);

  let patientsLinked = 0;
  let consultationsLinked = 0;
  let plansLinked = 0;

  // Solo procesar nutricionistas (no admins)
  const nutritionistMembers = orgMembers.filter(m => m.role === 'NUTRITIONIST');

  console.log(`\n👥 Nutricionistas a procesar: ${nutritionistMembers.length}`);

  for (const member of nutritionistMembers) {
    const { organizationId, userId } = member;

    // 2. Buscar el perfil de nutricionista del usuario
    const nutritionist = await prisma.nutritionist.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!nutritionist) {
      console.log(`   ⏭️  Usuario ${userId} no es nutricionista, saltando...`);
      continue;
    }

    // 3. Obtener pacientes del nutricionista
    const patientNutritionists = await prisma.patientNutritionist.findMany({
      where: {
        nutritionistId: nutritionist.id,
        isActive: true,
      },
      select: { patientId: true },
    });

    const patientIds = patientNutritionists.map((pn) => pn.patientId);

    if (patientIds.length === 0) {
      console.log(`   ⏭️  Nutricionista ${userId} no tiene pacientes, saltando...`);
      continue;
    }

    console.log(`\n👤 Procesando nutricionista ${userId} con ${patientIds.length} pacientes`);

    // 4. Actualizar pacientes con organizationId
    const updatePatients = await prisma.patient.updateMany({
      where: {
        id: { in: patientIds },
        organizationId: null, // Solo actualizar si no tiene organización
      },
      data: { organizationId },
    });

    patientsLinked += updatePatients.count;
    console.log(`   ✅ ${updatePatients.count} pacientes vinculados`);

    // 5. Actualizar consultas con organizationId
    const updateConsultations = await prisma.consultation.updateMany({
      where: {
        patientId: { in: patientIds },
        organizationId: null,
      },
      data: { organizationId },
    });

    consultationsLinked += updateConsultations.count;
    console.log(`   ✅ ${updateConsultations.count} consultas vinculadas`);

    // 6. Actualizar planes nutricionales con organizationId
    const updatePlans = await prisma.nutritionalPlan.updateMany({
      where: {
        patientId: { in: patientIds },
        organizationId: null,
      },
      data: { organizationId },
    });

    plansLinked += updatePlans.count;
    console.log(`   ✅ ${updatePlans.count} planes nutricionales vinculados`);
  }

  // Resumen
  console.log("\n" + "=".repeat(60));
  console.log("  📊 RESUMEN DE VINCULACIÓN");
  console.log("=".repeat(60));
  console.log(`  👥 Pacientes vinculados: ${patientsLinked}`);
  console.log(`  📋 Consultas vinculadas: ${consultationsLinked}`);
  console.log(`  🍽️  Planes vinculados: ${plansLinked}`);
  console.log("=".repeat(60));

  // Verificación
  const patientsWithOrg = await prisma.patient.count({
    where: { organizationId: { not: null } },
  });
  const consultationsWithOrg = await prisma.consultation.count({
    where: { organizationId: { not: null } },
  });

  console.log("\n📈 VERIFICACIÓN:");
  console.log(`   Pacientes con organización: ${patientsWithOrg}`);
  console.log(`   Consultas con organización: ${consultationsWithOrg}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en la vinculación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
