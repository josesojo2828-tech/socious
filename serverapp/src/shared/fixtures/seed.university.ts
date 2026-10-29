import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando universidad UNERG...");

  const unerg = await prisma.university.upsert({
    where: { shortName: "UNERG" },
    create: {
      name: "Universidad Nacional Experimental Rómulo Gallegos",
      shortName: "UNERG",
      isActive: true,
    },
    update: {},
  });

  console.log(`Universidad creada/actualizada: ${unerg.name} (${unerg.shortName}) — ID: ${unerg.id}`);
  console.log("Seeding completado exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error ejecutando el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
