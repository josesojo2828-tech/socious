import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const maleAvatars = [
  '/images/avatars/male_1.png',
  '/images/avatars/male_2.png',
  '/images/avatars/male_3.png',
  '/images/avatars/male_4.png',
];
const femaleAvatars = [
  '/images/avatars/female_1.png',
  '/images/avatars/female_2.png',
  '/images/avatars/female_3.png',
  '/images/avatars/female_4.png',
  '/images/avatars/female_5.png',
  '/images/avatars/female_6.png',
  '/images/avatars/female_7.png',
];
const otherAvatars = [
  '/images/avatars/other_1.png',
  '/images/avatars/other_2.png',
  '/images/avatars/other_3.png',
  '/images/avatars/other_4.png',
];

const allAvatars = [...maleAvatars, ...femaleAvatars, ...otherAvatars];

async function main() {
  console.log("Iniciando migración de avatars para usuarios existentes...");
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { avatarUrl: null },
        { avatarUrl: "" }
      ]
    }
  });

  console.log(`Se encontraron ${users.length} usuarios sin avatar.`);

  for (const user of users) {
    const randomIndex = Math.floor(Math.random() * allAvatars.length);
    const selectedAvatar = allAvatars[randomIndex];

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: selectedAvatar }
    });

    console.log(`Usuario ${user.username || user.email} actualizado con avatar: ${selectedAvatar}`);
  }

  console.log("Migración completada exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error al ejecutar la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
