import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrando CampusRequest existentes a universidad UNERG...");

  const unerg = await prisma.university.findUnique({
    where: { shortName: "UNERG" },
  });

  if (!unerg) {
    console.error("ERROR: Universidad UNERG no encontrada. Ejecutá seed:university primero.");
    process.exit(1);
  }

  const result = await prisma.campusRequest.updateMany({
    where: { universityId: null },
    data: { universityId: unerg.id },
  });

  console.log(`Registros actualizados: ${result.count} CampusRequest(s) asignados a UNERG.`);
  console.log("Migración completada exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error ejecutando la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
