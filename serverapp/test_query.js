const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://prod_db_user_aqui:sXPYUG0eTfg7moEm@localhost:11002/nutringest_prod?schema=public",
    },
  },
});

async function run() {
  const superadmin = await prisma.user.findUnique({
    where: { email: "superadmin@example.com" },
    include: { permits: true },
  });

  console.log("Superadmin user from DB:\n", JSON.stringify(superadmin, null, 2));

  const totalCount = await prisma.user.count();
  console.log("Total user count in DB:", totalCount);

  // 1. Where clause when isGlobalRole = true and query = {}
  const where1 = { AND: [] };
  const count1 = await prisma.user.count({ where: where1 });
  console.log("Count with where: { AND: [] } =>", count1);

  // 2. What if query contains permitId: "SUPERADMIN"?
  const where2 = { AND: [{ permitId: "SUPERADMIN" }] };
  const count2 = await prisma.user.count({ where: where2 });
  console.log("Count with permitId: SUPERADMIN =>", count2);

  const usersByPermit = await prisma.user.groupBy({
    by: ['permitId'],
    _count: { id: true },
  });
  console.log("Users grouped by permitId:", usersByPermit);

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
