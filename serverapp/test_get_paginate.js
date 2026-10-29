const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://prod_db_user_aqui:sXPYUG0eTfg7moEm@localhost:11002/nutringest_prod?schema=public",
    },
  },
});

// Mock UserRepository
class MockUserRepository {
  async findMany({ where, skip, take, orderBy }) {
    console.log("findMany WHERE clause:", JSON.stringify(where, null, 2));
    return await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
    });
  }
  async count({ where }) {
    console.log("count WHERE clause:", JSON.stringify(where, null, 2));
    return await prisma.user.count({ where });
  }
  permitRepository = { SUPERADMIN: "SUPERADMIN" };
}

async function run() {
  const superadminUser = await prisma.user.findUnique({
    where: { email: "superadmin@example.com" },
    include: { permits: true },
  });

  console.log("superadminUser.permits:", superadminUser.permits);

  const query = { page: 1, limit: 10 };
  const sessionUser = superadminUser;

  // Simulate getPaginate logic in user.service.ts
  const {
    q,
    status,
    permitId,
    permitName,
    emailVerified,
    isDemo,
    createdAt_gte,
    createdAt_lte,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const where = [];

  const isGlobalRole =
    sessionUser?.permits?.name === "SUPERADMIN" ||
    sessionUser?.permits?.name === "ADMIN";

  console.log("isGlobalRole:", isGlobalRole);

  if (status === "DELETED") {
    where.push({ deletedAt: { not: null } });
  } else if (!isGlobalRole) {
    where.push({ deletedAt: null });
  }

  if (!isGlobalRole) {
    where.push({ permits: { id: { not: "SUPERADMIN" } } });
  }

  if (isDemo !== undefined && isDemo !== null) {
    where.push({ isDemo: isDemo === true || isDemo === "true" });
  } else if (!isGlobalRole) {
    where.push({ isDemo: false });
  }

  if (q) {
    where.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (status && status !== "DELETED") where.push({ status: status });
  if (permitId) where.push({ permitId: permitId });

  if (permitName && permitName.length > 0) {
    where.push({ permits: { name: { in: permitName } } });
  }

  const skip = (page - 1) * limit;
  const whereClause = { AND: where };

  const repo = new MockUserRepository();
  const list = await repo.findMany({ where: whereClause, skip, take: limit, orderBy: { [sortBy]: sortOrder } });
  const total = await repo.count({ where: whereClause });

  console.log("Total returned:", total);
  console.log("List count:", list.length);
  console.log("List usernames:", list.map(u => u.username));

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
