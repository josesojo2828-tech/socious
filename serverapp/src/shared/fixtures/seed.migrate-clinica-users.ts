/**
 * seed.migrate-clinica-users.ts
 *
 * Migra usuarios existentes con plan CLINICA que no tienen organización.
 * Crea automáticamente una organización para ellos y les asigna el rol CLINIC_ADMIN.
 *
 * Idempotente: Solo procesa usuarios que tengan suscripción CLINICA sin organización.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/shared/fixtures/seed.migrate-clinica-users.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(60));
  console.log("  🔄 MIGRACIÓN: Usuarios CLINICA → Admin de Clínica");
  console.log("=".repeat(60));

  // 1. Buscar usuarios con suscripción CLINICA que no tengan organización
  const clinicaSubscriptions = await prisma.subscription.findMany({
    where: {
      planId: "Clinica",
      organizationId: null, // Solo los que no tienen organización
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  console.log(`\n📋 Encontrados ${clinicaSubscriptions.length} usuarios con plan CLINICA sin organización`);

  if (clinicaSubscriptions.length === 0) {
    console.log("✅ No hay usuarios para migrar");
    return;
  }

  let migrated = 0;
  let errors = 0;

  for (const sub of clinicaSubscriptions) {
    const user = sub.user;
    console.log(`\n👤 Procesando: ${user.firstName} ${user.lastName} (${user.email})`);

    try {
      // 2. Verificar si el usuario ya es miembro de alguna organización
      const existingMember = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
      });

      if (existingMember) {
        console.log(`   ⚠️ Ya es miembro de una organización (${existingMember.organizationId}), saltando...`);
        continue;
      }

      // 3. Crear la organización
      const orgName = user.firstName
        ? `Clínica de ${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : `Clínica ${user.email?.split("@")[0] || "Nueva"}`;

      const organization = await prisma.organization.create({
        data: {
          name: orgName,
          maxSeats: 5,
          status: "ACTIVE",
          members: {
            create: {
              userId: user.id,
              role: "CLINIC_ADMIN",
              status: "ACTIVE",
              colorHex: "#7c3aed",
            },
          },
        },
      });

      console.log(`   ✅ Organización creada: "${orgName}" (${organization.id})`);

      // 4. Vincular la suscripción a la organización
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { organizationId: organization.id },
      });

      console.log(`   ✅ Suscripción vinculada a la organización`);
      migrated++;

    } catch (error) {
      console.error(`   ❌ Error procesando ${user.email}:`, error);
      errors++;
    }
  }

  // Resumen
  console.log("\n" + "=".repeat(60));
  console.log("  📊 RESUMEN DE MIGRACIÓN");
  console.log("=".repeat(60));
  console.log(`  ✅ Migrados: ${migrated}`);
  console.log(`  ❌ Errores:  ${errors}`);
  console.log(`  ⏭️  Saltados: ${clinicaSubscriptions.length - migrated - errors}`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("❌ Error en la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
