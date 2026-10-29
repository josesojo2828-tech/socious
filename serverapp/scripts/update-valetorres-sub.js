const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://prod_db_user_aqui:sXPYUG0eTfg7moEm@localhost:11002/nutringest_prod?schema=public",
    },
  },
});

async function updateSubscription() {
  const userId = "cddd3560-f0a3-4253-9707-3c88ce537597";
  const userEmail = "valetorres@gmail.com";

  // Find user and existing active subscription
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { subscriptions: true },
  });

  if (!user) {
    throw new Error(`User with email ${userEmail} not found`);
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Update subscription record
  const updatedSubscription = await prisma.subscription.update({
    where: {
      id: user.subscriptions[0].id,
    },
    data: {
      planId: "PRO",
      status: "ACTIVE",
      startDate: startDate,
      endDate: endDate,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      plan: true,
    },
  });

  console.log("Subscription successfully updated in database:");
  console.log(JSON.stringify(updatedSubscription, null, 2));

  return updatedSubscription;
}

updateSubscription()
  .catch((err) => {
    console.error("Error updating subscription:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
