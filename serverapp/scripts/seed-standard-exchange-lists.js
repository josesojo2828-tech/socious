const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        "postgresql://prod_db_user_aqui:sXPYUG0eTfg7moEm@localhost:11002/nutringest_prod?schema=public",
    },
  },
});

const TARGET_EMAIL = "josesojo2828@gmail.com";
const EXPECTED_NUTRITIONIST_ID = "0246ad8e-4157-496b-9ea8-a2b592d0761a";

function formatServingLabel(food) {
  let u = (food.unity || "").trim();

  // Specific corrections for concise labels
  if (food.name === "Mandarina mediana" && u === "2") return "2 unidades";
  if (food.name === "Higos frescos" && u === "½") return "½ taza (2 unidades)";
  if (food.name === "Grapefruit" && u === "15") return "½ unidad (~150g)";
  if (food.name === "Ciruelas secas Pasitas" && u === "32") return "32 unidades (~30g)";
  if (food.name === "1 unid 50") return "1 unidad (50g)";

  if (u === "0" || u === "UNITY" || u === "") {
    if (food.category === "CARNES") {
      if (food.name.toLowerCase().includes("huevo")) return "1 unidad (50g)";
      if (food.name.toLowerCase().includes("queso")) return "30 g (1 rebanada)";
      return "30 g (1 porción)";
    }
    if (
      food.category === "FRUTAS" ||
      food.category === "FRUTAS SECAS" ||
      food.category === "JUGO FRUTAS"
    ) {
      return "1 unidad o porción (~100g)";
    }
    if (food.category === "GRASAS") {
      return "1 cdita (5 ml)";
    }
    return "1 porción";
  }

  if (u === "1 peq") return "1 unidad pequeña";
  if (u === "1 med") return "1 unidad mediana";
  if (u === "1 reb") return "1 rebanada";
  if (u === "1 und" || u === "1") return "1 unidad";
  if (u === "1/8") return "1/8 unidad (~30g)";
  if (u === "1 lonja") return "1 lonja (~30g)";

  return u;
}

const STANDARD_EXCHANGE_LISTS = [
  {
    name: "Lácteos & Derivados",
    description:
      "Equivalentes de lácteos y derivados: leches descremadas, enteras, yogures y kéfir (1 ración = 8g proteína, 12g carbohidratos, ~110 kcal).",
    baseKcal: 110,
    baseProtein: 8.0,
    baseCarbs: 12.0,
    baseFat: 4.0,
    categories: ["LECHE"],
  },
  {
    name: "Carnes & Proteínas",
    description:
      "Equivalentes de carnes, aves, pescados, mariscos, huevos y quesos (1 ración = 7g proteína, ~75 kcal).",
    baseKcal: 75,
    baseProtein: 7.0,
    baseCarbs: 0.0,
    baseFat: 5.0,
    categories: ["CARNES"],
  },
  {
    name: "Frutas Frescas",
    description:
      "Porciones de frutas frescas con su gramaje y equivalencias de carbohidratos simples (1 ración = 15g carbohidratos, ~60 kcal).",
    baseKcal: 60,
    baseProtein: 0.0,
    baseCarbs: 15.0,
    baseFat: 0.0,
    categories: ["FRUTAS", "FRUTAS SECAS", "JUGO FRUTAS"],
  },
  {
    name: "Cereales, Tubérculos & Legumbres",
    description:
      "Equivalentes de carbohidratos complejos: arroz, papa, avena, granos, panes y tubérculos (1 ración = 15g carbohidratos, 2.5g proteína, ~80 kcal).",
    baseKcal: 80,
    baseProtein: 2.5,
    baseCarbs: 15.0,
    baseFat: 0.5,
    categories: [
      "CEREALES",
      "TUBERCULOS",
      "PANES",
      "ALMIDONES, CEREALES Y PANES",
      "ALMIDONES,  CEREALES Y PANES",
    ],
    deduplicateByName: true,
  },
  {
    name: "Grasas Saludables & Aceites",
    description:
      "Equivalentes de lípidos saludables: aceite de oliva, aguacate, frutos secos y semillas (1 ración = 5g grasa, ~45 kcal).",
    baseKcal: 45,
    baseProtein: 0.0,
    baseCarbs: 0.0,
    baseFat: 5.0,
    categories: ["GRASAS"],
  },
];

async function seedStandardExchangeLists() {
  console.log("=================================================");
  console.log("🚀 POBLANDO LISTAS DE INTERCAMBIO ESTÁNDAR");
  console.log("=================================================");

  // 1. Buscar usuario y perfil de nutricionista
  console.log(`\n🔍 Buscando usuario: ${TARGET_EMAIL}...`);
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    include: { nutritionistProfile: true },
  });

  if (!user) {
    throw new Error(`Usuario con email ${TARGET_EMAIL} no encontrado.`);
  }

  let nutritionistId = user.nutritionistProfile?.id;
  if (!nutritionistId) {
    console.log("⚠️  Perfil de nutricionista no encontrado. Creando uno...");
    const profile = await prisma.nutritionist.create({
      data: { userId: user.id },
    });
    nutritionistId = profile.id;
  }

  console.log(`✅ Usuario encontrado: ID = ${user.id}`);
  console.log(`✅ Nutritionist ID: ${nutritionistId}`);
  if (nutritionistId === EXPECTED_NUTRITIONIST_ID) {
    console.log(`✅ Coincide con el ID esperado (${EXPECTED_NUTRITIONIST_ID})`);
  } else {
    console.log(`ℹ️  ID actual: ${nutritionistId} (Esperado: ${EXPECTED_NUTRITIONIST_ID})`);
  }

  let totalListsCreated = 0;
  let totalListsExisting = 0;
  let totalItemsCreated = 0;
  let totalItemsExisting = 0;

  const summary = [];

  for (const def of STANDARD_EXCHANGE_LISTS) {
    console.log(`\n-------------------------------------------------`);
    console.log(`📦 Procesando: ${def.name}`);

    // Buscar o crear ExchangeList
    let exchangeList = await prisma.exchangeList.findFirst({
      where: {
        nutritionistId,
        name: def.name,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });

    let wasListCreated = false;
    if (!exchangeList) {
      exchangeList = await prisma.exchangeList.create({
        data: {
          nutritionistId,
          createdById: user.id,
          name: def.name,
          description: def.description,
          baseKcal: def.baseKcal,
          baseProtein: def.baseProtein,
          baseCarbs: def.baseCarbs,
          baseFat: def.baseFat,
          isCommunity: false,
        },
        include: {
          items: true,
        },
      });
      wasListCreated = true;
      totalListsCreated++;
      console.log(`   ✨ Lista creada con ID: ${exchangeList.id}`);
    } else {
      totalListsExisting++;
      console.log(`   ℹ️  Lista existente con ID: ${exchangeList.id}`);
    }

    // Obtener alimentos de FoodExchangeList para esta categoría
    const foods = await prisma.foodExchangeList.findMany({
      where: {
        category: { in: def.categories },
      },
      orderBy: [{ sub: "asc" }, { name: "asc" }],
    });

    console.log(`   🥦 Alimentos encontrados en catálogo: ${foods.length}`);

    // Deduplicar por nombre normalizado si aplica
    const filteredFoods = [];
    const seenNames = new Set();
    for (const food of foods) {
      const normName = food.name.trim().toLowerCase();
      if (def.deduplicateByName) {
        if (seenNames.has(normName)) continue;
        seenNames.add(normName);
      }
      filteredFoods.push(food);
    }

    // Mapear items ya asociados a esta lista
    const existingFoodIds = new Set(
      exchangeList.items
        .map((i) => i.foodExchangeListId)
        .filter(Boolean)
    );

    let listItemsCreated = 0;
    let listItemsExisting = 0;

    for (const food of filteredFoods) {
      if (existingFoodIds.has(food.id)) {
        listItemsExisting++;
        totalItemsExisting++;
        continue;
      }

      const servingLabel = formatServingLabel(food);

      await prisma.exchangeListItem.create({
        data: {
          exchangeListId: exchangeList.id,
          foodExchangeListId: food.id,
          amount: 1,
          servingLabel,
        },
      });

      listItemsCreated++;
      totalItemsCreated++;
    }

    console.log(
      `   ➕ Items agregados: ${listItemsCreated} | Ya existentes: ${listItemsExisting} | Total en lista: ${
        listItemsCreated + listItemsExisting
      }`
    );

    summary.push({
      nombre: def.name,
      listId: exchangeList.id,
      creadaNueva: wasListCreated,
      itemsNuevos: listItemsCreated,
      itemsTotales: listItemsCreated + listItemsExisting,
      baseKcal: def.baseKcal,
      baseMacros: `P: ${def.baseProtein}g | C: ${def.baseCarbs}g | G: ${def.baseFat}g`,
    });
  }

  console.log("\n=================================================");
  console.log("📊 RESUMEN FINAL DE EJECUCIÓN");
  console.log("=================================================");
  console.log(`Listas creadas nuevas: ${totalListsCreated}`);
  console.log(`Listas que ya existían: ${totalListsExisting}`);
  console.log(`Items nuevos creados: ${totalItemsCreated}`);
  console.log(`Items que ya existían: ${totalItemsExisting}`);
  console.log(
    `Total items en las 5 listas: ${totalItemsCreated + totalItemsExisting}`
  );
  console.log("-------------------------------------------------");
  console.table(summary);
  console.log("=================================================\n");

  return {
    user: { id: user.id, email: user.email, nutritionistId },
    totalListsCreated,
    totalListsExisting,
    totalItemsCreated,
    totalItemsExisting,
    totalItems: totalItemsCreated + totalItemsExisting,
    summary,
  };
}

seedStandardExchangeLists()
  .catch((err) => {
    console.error("❌ Error poblando listas de intercambio:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
