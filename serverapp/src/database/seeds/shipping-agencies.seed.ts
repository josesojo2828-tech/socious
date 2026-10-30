/**
 * Shipping agency catalog seed (S4).
 *
 * The platform owns this catalog — merchants only switch agencies on and off
 * from their settings (`shipping.enabledAgencies`), they never edit the rows.
 *
 * Idempotent: keyed by `key`, re-running never duplicates or clobbers a name
 * the platform has renamed on purpose? (it does overwrite `name` — the catalog
 * is platform-owned, so the repository wins on every run).
 *
 * Usage:
 *   npm run seed:agencies
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHIPPING_AGENCIES = [
  { key: "ZOOM", name: "Zoom Envíos" },
  { key: "MRW", name: "MRW" },
];

async function main(): Promise<void> {
  let created = 0;

  for (const agency of SHIPPING_AGENCIES) {
    await prisma.shippingAgency.upsert({
      where: { key: agency.key },
      create: { key: agency.key, name: agency.name },
      update: { name: agency.name },
    });
    created += 1;
  }

  const total = await prisma.shippingAgency.count();
  console.log(
    `✅ Shipping agencies: ${created} procesadas, ${total} en total.`,
  );
}

main()
  .catch((error) => {
    console.error("❌ Error sembrando agencias de envío:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
