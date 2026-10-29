/**
 * seed.mark-demo-users.ts
 *
 * Marca usuarios existentes como demo basándose en:
 * 1. Emails que contienen 'example', 'demo', 'test', 'nutringest'
 * 2. Usuarios de seeds conocidos (emails de ejemplo)
 * 3. Usuarios con contraseñas de demo (hash conocido)
 *
 * Idempotente: Solo actualiza usuarios que no tengan isDemo=true ya.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/shared/fixtures/seed.mark-demo-users.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Patrones de email que indican usuario demo
const DEMO_EMAIL_PATTERNS = [
  "example.com",
  "example.org",
  "example.net",
  "demo.",
  "test.",
  "nutringest.com",
  "@nutringest",
];

// Emails específicos de seeds conocidos
const KNOWN_DEMO_EMAILS = [
  "josesojo2828@gmail.com", // Usuario principal (NO marcar como demo)
  "test@example.com",
  "demo@example.com",
  "nutricionista@example.com",
  "paciente@example.com",
];

async function main() {
  console.log("=".repeat(60));
  console.log("  🏷️  MARCAR USUARIOS DEMO");
  console.log("=".repeat(60));

  // 1. Buscar usuarios con emails de demo
  const demoEmailUsers = await prisma.user.findMany({
    where: {
      isDemo: false, // Solo los que no son demo aún
      email: {
        contains: "@",
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  console.log(`\n📋 Analizando ${demoEmailUsers.length} usuarios...`);

  let marked = 0;
  let skipped = 0;

  for (const user of demoEmailUsers) {
    if (!user.email) continue;

    const emailLower = user.email.toLowerCase();
    const isDemoEmail = DEMO_EMAIL_PATTERNS.some((pattern) =>
      emailLower.includes(pattern)
    );

    // No marcar al usuario principal
    const isMainUser = emailLower === "josesojo2828@gmail.com";

    if (isDemoEmail && !isMainUser) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { isDemo: true },
        });
        console.log(`   ✅ Demo: ${user.firstName} ${user.lastName} (${user.email})`);
        marked++;
      } catch (error) {
        console.error(`   ❌ Error actualizando ${user.email}:`, error);
      }
    } else {
      skipped++;
    }
  }

  // 2. Verificar si hay usuarios con datos de seeds conocidos
  const seedUsers = await prisma.user.findMany({
    where: {
      isDemo: false,
      OR: [
        { firstName: { contains: "Test" } },
        { firstName: { contains: "Demo" } },
        { lastName: { contains: "Test" } },
        { lastName: { contains: "Demo" } },
        { username: { contains: "test" } },
        { username: { contains: "demo" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  console.log(`\n📋 Encontrados ${seedUsers.length} usuarios con nombres de demo`);

  for (const user of seedUsers) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { isDemo: true },
      });
      console.log(`   ✅ Demo: ${user.firstName} ${user.lastName} (${user.email})`);
      marked++;
    } catch (error) {
      console.error(`   ❌ Error actualizando ${user.email}:`, error);
    }
  }

  // Resumen
  console.log("\n" + "=".repeat(60));
  console.log("  📊 RESUMEN");
  console.log("=".repeat(60));
  console.log(`  ✅ Marcados como demo: ${marked}`);
  console.log(`  ⏭️  Saltados (ya demo o usuario real): ${skipped}`);
  console.log("=".repeat(60));

  // Estadísticas finales
  const totalUsers = await prisma.user.count();
  const demoUsers = await prisma.user.count({ where: { isDemo: true } });
  const realUsers = totalUsers - demoUsers;

  console.log(`\n📈 ESTADÍSTICAS:`);
  console.log(`   Total usuarios: ${totalUsers}`);
  console.log(`   Demo: ${demoUsers}`);
  console.log(`   Reales: ${realUsers}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
