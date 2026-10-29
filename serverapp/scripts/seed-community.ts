import * as path from 'path';
import fs from 'fs';

// Cargar dotenv PRIMERO antes de importar PrismaClient
const dotenvPathServer = path.join(__dirname, '../serverapp/.env');
const dotenvPathRoot = path.join(__dirname, '../.env');

if (fs.existsSync(dotenvPathServer)) {
  require('dotenv').config({ path: dotenvPathServer });
}
if (fs.existsSync(dotenvPathRoot)) {
  require('dotenv').config({ path: dotenvPathRoot });
}

import { PrismaClient, MenuCategory } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// CATÁLOGO DE ALIMENTOS BASE (Nutrientes base per 100g)
// ========================================
const BASE_FOODS = [
  { name: 'Pollo pechuga', calories: 165, proteins: 31, carbohydrates: 0, fats: 3.6, baseQuantity: 100 },
  { name: 'Arroz blanco', calories: 130, proteins: 2.7, carbohydrates: 28, fats: 0.3, baseQuantity: 100 },
  { name: 'Arroz integral', calories: 111, proteins: 2.6, carbohydrates: 23, fats: 0.9, baseQuantity: 100 },
  { name: 'Brócoli', calories: 34, proteins: 2.8, carbohydrates: 7, fats: 0.4, baseQuantity: 100 },
  { name: 'Huevo entero', calories: 155, proteins: 13, carbohydrates: 1.1, fats: 11, baseQuantity: 100 },
  { name: 'Papa', calories: 77, proteins: 2, carbohydrates: 17, fats: 0.1, baseQuantity: 100 },
  { name: 'Papas baby', calories: 77, proteins: 2, carbohydrates: 17, fats: 0.1, baseQuantity: 100 },
  { name: 'Atún en agua', calories: 116, proteins: 26, carbohydrates: 0, fats: 1, baseQuantity: 100 },
  { name: 'Salmón', calories: 208, proteins: 20, carbohydrates: 0, fats: 13, baseQuantity: 100 },
  { name: 'Salmón ahumado', calories: 217, proteins: 18, carbohydrates: 0, fats: 16, baseQuantity: 100 },
  { name: 'Camarones', calories: 99, proteins: 24, carbohydrates: 0.2, fats: 0.3, baseQuantity: 100 },
  { name: 'Carne de res magra', calories: 150, proteins: 26, carbohydrates: 0, fats: 5, baseQuantity: 100 },
  { name: 'Pechuga de pavo', calories: 135, proteins: 30, carbohydrates: 0, fats: 1.5, baseQuantity: 100 },
  { name: 'Pavo molido', calories: 133, proteins: 19, carbohydrates: 0, fats: 6, baseQuantity: 100 },
  { name: 'Pescado blanco', calories: 96, proteins: 20, carbohydrates: 0, fats: 1.7, baseQuantity: 100 },
  { name: 'Pan integral', calories: 250, proteins: 9, carbohydrates: 48, fats: 3.5, baseQuantity: 100 },
  { name: 'Bagel', calories: 250, proteins: 10, carbohydrates: 48, fats: 1.5, baseQuantity: 100 },
  { name: 'Avena', calories: 389, proteins: 16.9, carbohydrates: 66, fats: 6.9, baseQuantity: 100 },
  { name: 'Quinoa cocida', calories: 120, proteins: 4.4, carbohydrates: 21.3, fats: 1.9, baseQuantity: 100 },
  { name: 'Trigo sarraceno', calories: 150, proteins: 5, carbohydrates: 31, fats: 1, baseQuantity: 100 },
  { name: 'Pasta cocida', calories: 131, proteins: 5, carbohydrates: 25, fats: 1.1, baseQuantity: 100 },
  { name: 'Fideos', calories: 138, proteins: 4.5, carbohydrates: 27, fats: 1.2, baseQuantity: 100 },
  { name: 'Camote / Batata', calories: 86, proteins: 1.6, carbohydrates: 20, fats: 0.1, baseQuantity: 100 },
  { name: 'Lentejas cocidas', calories: 116, proteins: 9, carbohydrates: 20, fats: 0.4, baseQuantity: 100 },
  { name: 'Garbanzos', calories: 164, proteins: 8.9, carbohydrates: 27, fats: 2.6, baseQuantity: 100 },
  { name: 'Frijoles negros', calories: 132, proteins: 8.9, carbohydrates: 23.7, fats: 0.5, baseQuantity: 100 },
  { name: 'Maíz dulce', calories: 86, proteins: 3.2, carbohydrates: 19, fats: 1.2, baseQuantity: 100 },
  { name: 'Yogur griego', calories: 59, proteins: 10, carbohydrates: 3.6, fats: 0.4, baseQuantity: 100 },
  { name: 'Yogur natural', calories: 61, proteins: 3.5, carbohydrates: 4.7, fats: 3.3, baseQuantity: 100 },
  { name: 'Queso Feta', calories: 264, proteins: 14, carbohydrates: 4, fats: 21, baseQuantity: 100 },
  { name: 'Queso Mozzarella', calories: 280, proteins: 28, carbohydrates: 3.1, fats: 17, baseQuantity: 100 },
  { name: 'Queso cottage', calories: 98, proteins: 11, carbohydrates: 3.4, fats: 4.3, baseQuantity: 100 },
  { name: 'Queso crema', calories: 342, proteins: 6, carbohydrates: 4, fats: 34, baseQuantity: 100 },
  { name: 'Aguacate', calories: 160, proteins: 2, carbohydrates: 8.5, fats: 14.7, baseQuantity: 100 },
  { name: 'Mantequilla de maní', calories: 588, proteins: 25, carbohydrates: 20, fats: 50, baseQuantity: 100 },
  { name: 'Hummus', calories: 166, proteins: 8, carbohydrates: 14, fats: 10, baseQuantity: 100 },
  { name: 'Pesto', calories: 433, proteins: 5, carbohydrates: 6, fats: 44, baseQuantity: 100 },
  { name: 'Aceite de oliva', calories: 884, proteins: 0, carbohydrates: 0, fats: 100, baseQuantity: 100 },
  { name: 'Semillas de chía', calories: 486, proteins: 16.5, carbohydrates: 42, fats: 30.7, baseQuantity: 100 },
  { name: 'Nueces', calories: 654, proteins: 15, carbohydrates: 14, fats: 65, baseQuantity: 100 },
  { name: 'Almendras', calories: 579, proteins: 21, carbohydrates: 22, fats: 50, baseQuantity: 100 },
  { name: 'Frutos secos', calories: 600, proteins: 18, carbohydrates: 20, fats: 53, baseQuantity: 100 },
  { name: 'Granola', calories: 471, proteins: 10, carbohydrates: 64, fats: 20, baseQuantity: 100 },
  { name: 'Harina de almendras', calories: 583, proteins: 21, carbohydrates: 20, fats: 50, baseQuantity: 100 },
  { name: 'Leche entera', calories: 61, proteins: 3.2, carbohydrates: 4.8, fats: 3.3, baseQuantity: 100 },
  { name: 'Miel', calories: 304, proteins: 0.3, carbohydrates: 82, fats: 0, baseQuantity: 100 },
  { name: 'Cacao en polvo', calories: 228, proteins: 20, carbohydrates: 58, fats: 14, baseQuantity: 100 },
  { name: 'Cacao amargo', calories: 230, proteins: 20, carbohydrates: 57, fats: 14, baseQuantity: 100 },
  { name: 'Plátano', calories: 89, proteins: 1.1, carbohydrates: 23, fats: 0.3, baseQuantity: 100 },
  { name: 'Banano', calories: 89, proteins: 1.1, carbohydrates: 23, fats: 0.3, baseQuantity: 100 },
  { name: 'Durazno', calories: 39, proteins: 0.9, carbohydrates: 10, fats: 0.3, baseQuantity: 100 },
  { name: 'Fresa', calories: 32, proteins: 0.7, carbohydrates: 7.7, fats: 0.3, baseQuantity: 100 },
  { name: 'Fresas', calories: 32, proteins: 0.7, carbohydrates: 7.7, fats: 0.3, baseQuantity: 100 },
  { name: 'Frutos rojos', calories: 50, proteins: 1, carbohydrates: 12, fats: 0.4, baseQuantity: 100 },
  { name: 'Frutas variadas', calories: 50, proteins: 0.8, carbohydrates: 13, fats: 0.2, baseQuantity: 100 },
  { name: 'Mango', calories: 60, proteins: 0.8, carbohydrates: 15, fats: 0.4, baseQuantity: 100 },
  { name: 'Piña', calories: 50, proteins: 0.5, carbohydrates: 13, fats: 0.1, baseQuantity: 100 },
  { name: 'Naranja', calories: 47, proteins: 0.9, carbohydrates: 12, fats: 0.1, baseQuantity: 100 },
  { name: 'Papaya', calories: 43, proteins: 0.5, carbohydrates: 11, fats: 0.3, baseQuantity: 100 },
  { name: 'Manzana', calories: 52, proteins: 0.3, carbohydrates: 14, fats: 0.2, baseQuantity: 100 },
  { name: 'Arándanos', calories: 57, proteins: 0.7, carbohydrates: 14, fats: 0.3, baseQuantity: 100 },
  { name: 'Lechuga', calories: 15, proteins: 1.4, carbohydrates: 2.9, fats: 0.2, baseQuantity: 100 },
  { name: 'Espinaca', calories: 23, proteins: 2.9, carbohydrates: 3.6, fats: 0.4, baseQuantity: 100 },
  { name: 'Tomate', calories: 18, proteins: 0.9, carbohydrates: 3.9, fats: 0.2, baseQuantity: 100 },
  { name: 'Tomate cherry', calories: 18, proteins: 0.9, carbohydrates: 3.9, fats: 0.2, baseQuantity: 100 },
  { name: 'Pepino', calories: 15, proteins: 0.7, carbohydrates: 3.6, fats: 0.1, baseQuantity: 100 },
  { name: 'Zanahoria', calories: 41, proteins: 0.9, carbohydrates: 10, fats: 0.2, baseQuantity: 100 },
  { name: 'Verduras mixtas', calories: 40, proteins: 2, carbohydrates: 8, fats: 0.3, baseQuantity: 100 },
  { name: 'Ensalada mixta', calories: 20, proteins: 1.5, carbohydrates: 4, fats: 0.2, baseQuantity: 100 },
  { name: 'Sopa de verduras', calories: 36, proteins: 1.5, carbohydrates: 6, fats: 0.8, baseQuantity: 100 },
  { name: 'Espárragos', calories: 20, proteins: 2.2, carbohydrates: 3.9, fats: 0.1, baseQuantity: 100 },
  { name: 'Zucchini / Calabacín', calories: 17, proteins: 1.2, carbohydrates: 3.1, fats: 0.3, baseQuantity: 100 },
  { name: 'Pimiento rojo', calories: 26, proteins: 1, carbohydrates: 6, fats: 0.3, baseQuantity: 100 },
  { name: 'Semillas de linaza', calories: 534, proteins: 18, carbohydrates: 29, fats: 42, baseQuantity: 100 },
  { name: 'Canela', calories: 247, proteins: 4, carbohydrates: 80, fats: 1.2, baseQuantity: 100 },
  { name: 'Champiñones', calories: 22, proteins: 3.1, carbohydrates: 3.3, fats: 0.3, baseQuantity: 100 },
  { name: 'Tofu', calories: 76, proteins: 8, carbohydrates: 1.9, fats: 4.8, baseQuantity: 100 },
  { name: 'Coliflor', calories: 25, proteins: 1.9, carbohydrates: 5, fats: 0.3, baseQuantity: 100 },
  { name: 'Remolacha / Betarraga', calories: 43, proteins: 1.6, carbohydrates: 10, fats: 0.2, baseQuantity: 100 },
  { name: 'Coco rallado', calories: 660, proteins: 6.9, carbohydrates: 24, fats: 65, baseQuantity: 100 },
  { name: 'Ejotes / Judías verdes', calories: 31, proteins: 1.8, carbohydrates: 7, fats: 0.2, baseQuantity: 100 },
  { name: 'Limón', calories: 29, proteins: 1.1, carbohydrates: 9, fats: 0.3, baseQuantity: 100 },
  { name: 'Apio', calories: 16, proteins: 0.7, carbohydrates: 3, fats: 0.2, baseQuantity: 100 },
  { name: 'Semillas de calabaza', calories: 559, proteins: 30, carbohydrates: 10, fats: 49, baseQuantity: 100 }
];

function mapCategory(category: string): MenuCategory {
  switch (category) {
    case 'desayuno':
      return MenuCategory.BREAKFAST;
    case 'almuerzo':
      return MenuCategory.LUNCH;
    case 'cena':
      return MenuCategory.DINNER;
    case 'snack':
      return MenuCategory.SNACK;
    default:
      return MenuCategory.OTHER;
  }
}

async function main() {
  const jsonPathGen = path.join(__dirname, 'seed-data', 'menus-extracted.json');
  const jsonPathPatho = path.join(__dirname, 'seed-data', 'menus-pathology-extracted.json');

  let menusExtracted: any[] = [];

  if (fs.existsSync(jsonPathGen)) {
    const rawGen = fs.readFileSync(jsonPathGen, 'utf8');
    menusExtracted = menusExtracted.concat(JSON.parse(rawGen));
  }

  if (fs.existsSync(jsonPathPatho)) {
    const rawPatho = fs.readFileSync(jsonPathPatho, 'utf8');
    menusExtracted = menusExtracted.concat(JSON.parse(rawPatho));
  }

  console.log(`🌱 Iniciando Seed de Comunidad Nutringest (${menusExtracted.length} menús en total)...`);

  // 1. Buscar Usuario y Nutricionista
  const targetEmail = 'josesojo@gmail.com';
  const user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    throw new Error(`Usuario con email ${targetEmail} no existe en la base de datos.`);
  }

  const nutritionist = await prisma.nutritionist.findUnique({ where: { userId: user.id } });
  if (!nutritionist) {
    throw new Error(`Nutricionista asociado al usuario ${user.id} no existe.`);
  }

  console.log(`👤 Nutricionista encontrado: ID ${nutritionist.id} (User: ${user.email})`);

  // Limpiar menús previos del nutricionista para evitar duplicados
  const deleted = await prisma.menu.deleteMany({ where: { nutritionistId: nutritionist.id } });
  console.log(`🧹 Eliminados ${deleted.count} menús anteriores de la comunidad.`);

  // 2. Upsert Alimentos Base
  const foodMap = new Map<string, { id: string; calories: number; proteins: number; carbs: number; fats: number }>();
  for (const food of BASE_FOODS) {
    const existing = await prisma.foodItem.upsert({
      where: { name: food.name },
      update: {
        calories: food.calories,
        proteins: food.proteins,
        carbohydrates: food.carbohydrates,
        fats: food.fats,
        baseQuantity: food.baseQuantity
      },
      create: {
        name: food.name,
        calories: food.calories,
        proteins: food.proteins,
        carbohydrates: food.carbohydrates,
        fats: food.fats,
        baseQuantity: food.baseQuantity
      },
    });

    foodMap.set(food.name, {
      id: existing.id,
      calories: Number(existing.calories),
      proteins: Number(existing.proteins),
      carbs: Number(existing.carbohydrates),
      fats: Number(existing.fats)
    });
  }

  console.log(`🥑 Catálogo base de ${foodMap.size} alimentos sincronizado.`);

  // 3. Limpiar menús antiguos
  console.log('🧹 Limpiando menús anteriores...');
  await prisma.communityMetadata.deleteMany({ where: { entityType: 'menu' } });
  await prisma.menuItem.deleteMany({});
  await prisma.menu.deleteMany({});

  // 4. Crear Menús en la Comunidad con fotos de IA
  for (const menuData of menusExtracted) {
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    const itemsToCreate: Array<{
      foodId: string;
      quantity: number;
      unit?: string;
      portionLabel?: string;
    }> = [];

    for (const f of menuData.foods) {
      const foodInfo = foodMap.get(f.name);
      if (!foodInfo) {
        console.warn(`⚠️ Alimento no mapeado: ${f.name}`);
        continue;
      }

      const qty = f.quantity || 100;
      const ratio = qty / 100;

      totalKcal += foodInfo.calories * ratio;
      totalProtein += foodInfo.proteins * ratio;
      totalCarbs += foodInfo.carbs * ratio;
      totalFats += foodInfo.fats * ratio;

      itemsToCreate.push({
        foodId: foodInfo.id,
        quantity: qty,
        unit: f.unit || 'g',
        portionLabel: `${qty}${f.unit === 'ml' ? 'ml' : 'g'}`
      });
    }

    const cleanPrompt = `gourmet professional food photography of ${menuData.name.trim()}, delicious healthy meal on a clean plate, studio lighting, top-down culinary shot, 4k resolution`;
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=800&height=600&nologo=true`;

    const createdMenu = await prisma.menu.create({
      data: {
        name: menuData.name,
        description: menuData.description,
        category: mapCategory(menuData.category),
        nutritionistId: nutritionist.id,
        isCommunity: true,
        totalKcal: Number(totalKcal.toFixed(1)),
        totalProtein: Number(totalProtein.toFixed(1)),
        totalCarbs: Number(totalCarbs.toFixed(1)),
        totalFats: Number(totalFats.toFixed(1)),
        tags: Array.isArray(menuData.tags) ? menuData.tags.join(', ') : menuData.tags,
        imageUrl: aiImageUrl,
        items: {
          create: itemsToCreate
        }
      }
    });

    await prisma.communityMetadata.upsert({
      where: {
        entityType_entityId: {
          entityType: 'menu',
          entityId: createdMenu.id,
        }
      },
      update: {
        tags: menuData.tags || [],
        authorId: user.id
      },
      create: {
        entityType: 'menu',
        entityId: createdMenu.id,
        authorId: user.id,
        tags: menuData.tags || []
      }
    });

    console.log(`✅ Menú creado (${createdMenu.category}): "${createdMenu.name}" [${createdMenu.totalKcal} kcal]`);
  }

  console.log('🎉 ¡Seed de la comunidad completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
