import { PrismaClient, PriceUnit } from "@prisma/client";
import { PlazasScraperStrategy } from "./plazas-scraper.strategy";

const prisma = new PrismaClient();
const scraper = new PlazasScraperStrategy();

async function syncAllPrices() {
  const limit = parseInt(process.argv[2] || "50", 10);

  console.log(`\n=== Sincronización Masiva de Precios (Plaza's) ===`);
  console.log(`Buscando los ${limit} alimentos más desactualizados...\n`);

  // Solo alimentos con ALGÚN uso (menú genérico o costo institucional):
  // evita escribir precios en alimentos huérfanos (fix del "batch destructivo").
  const foods = await prisma.foodItem.findMany({
    where: {
      isActive: true,
      OR: [{ menuItems: { some: {} } }, { menuItemCosts: { some: {} } }],
    },
    take: limit,
    orderBy: { lastPriceSync: "asc" },
    select: { id: true, name: true, lastPriceSync: true },
  });

  console.log(`Encontrados: ${foods.length} alimentos\n`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    const progress = `[${i + 1}/${foods.length}]`;

    process.stdout.write(`${progress} ${food.name.padEnd(45)} `);

    try {
      const result = await scraper.scrapeFoodPrice(food.name);

      if (!result.success) {
        console.log(`❌ ${result.error}`);
        fail++;
        continue;
      }

      // Guardar en histórico
      await prisma.foodPriceHistory.create({
        data: {
          foodId: food.id,
          price: result.price,
          unit: result.unit,
          source: "PLAZAS",
        },
      });

      // Actualizar precio actual del alimento
      await prisma.foodItem.update({
        where: { id: food.id },
        data: {
          currentPrice: result.price,
          priceUnit: result.unit,
          lastPriceSync: new Date(),
        },
      });

      console.log(`✅ $${result.price} / ${result.unit}`);
      ok++;
    } catch (err: any) {
      console.log(`❌ ${err.message?.substring(0, 60)}`);
      fail++;
    }

    // Delay de 2s para no ser baneado
    if (i < foods.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`✅ Exitosos: ${ok}`);
  console.log(`❌ Fallidos: ${fail}`);
  console.log(`📊 Total:    ${foods.length}\n`);

  await prisma.$disconnect();
}

syncAllPrices().catch((err) => {
  console.error("Error fatal:", err);
  prisma.$disconnect();
  process.exit(1);
});
