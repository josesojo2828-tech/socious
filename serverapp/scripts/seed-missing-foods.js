const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MISSING_FOODS = [
  { name: 'Aceite de oliva',       calories: 884, proteins: 0,   carbs: 0,   fats: 100 },
  { name: 'Almendras',             calories: 579, proteins: 21,  carbs: 22,  fats: 50 },
  { name: 'Arándanos',             calories: 57,  proteins: 0.7, carbs: 14,  fats: 0.3 },
  { name: 'Atún en agua',          calories: 116, proteins: 26,  carbs: 0,   fats: 1 },
  { name: 'Avena',                 calories: 389, proteins: 16.9, carbs: 66, fats: 6.9 },
  { name: 'Cacao en polvo',        calories: 228, proteins: 20,  carbs: 58,  fats: 14 },
  { name: 'Camote / Batata',       calories: 86,  proteins: 1.6, carbs: 20,  fats: 0.1 },
  { name: 'Canela',                calories: 261, proteins: 4,   carbs: 80,  fats: 1.4 },
  { name: 'Carne de res magra',    calories: 150, proteins: 26,  carbs: 0,   fats: 5 },
  { name: 'Champiñones',           calories: 22,  proteins: 3.1, carbs: 3.3, fats: 0.3 },
  { name: 'Coco rallado',          calories: 354, proteins: 3.3, carbs: 44,  fats: 33 },
  { name: 'Durazno',               calories: 39,  proteins: 0.9, carbs: 10,  fats: 0.3 },
  { name: 'Ejotes / Judías verdes',calories: 31,  proteins: 1.8, carbs: 7,   fats: 0.1 },
  { name: 'Ensalada mixta',        calories: 17,  proteins: 1,   carbs: 3,   fats: 0.2 },
  { name: 'Espárragos',            calories: 20,  proteins: 2.2, carbs: 4,   fats: 0.1 },
  { name: 'Fideos',                calories: 138, proteins: 4.5, carbs: 27,  fats: 1.2 },
  { name: 'Fresas',                calories: 32,  proteins: 0.7, carbs: 7.7, fats: 0.3 },
  { name: 'Frijoles negros',       calories: 132, proteins: 8.9, carbs: 23.7,fats: 0.5 },
  { name: 'Frutas variadas',       calories: 50,  proteins: 0.8, carbs: 13,  fats: 0.2 },
  { name: 'Frutos rojos',          calories: 50,  proteins: 1,   carbs: 12,  fats: 0.4 },
  { name: 'Granola',               calories: 471, proteins: 10,  carbs: 64,  fats: 20 },
  { name: 'Harina de almendras',   calories: 583, proteins: 21,  carbs: 20,  fats: 50 },
  { name: 'Huevo entero',          calories: 155, proteins: 13,  carbs: 1.1, fats: 11 },
  { name: 'Hummus',                calories: 166, proteins: 8,   carbs: 14,  fats: 10 },
  { name: 'Leche entera',          calories: 61,  proteins: 3.2, carbs: 4.8, fats: 3.3 },
  { name: 'Mango',                 calories: 60,  proteins: 0.8, carbs: 15,  fats: 0.4 },
  { name: 'Mantequilla de maní',   calories: 588, proteins: 25,  carbs: 20,  fats: 50 },
  { name: 'Manzana',               calories: 52,  proteins: 0.3, carbs: 14,  fats: 0.2 },
  { name: 'Maíz dulce',            calories: 86,  proteins: 3.2, carbs: 19,  fats: 1.2 },
  { name: 'Miel',                  calories: 304, proteins: 0.3, carbs: 82,  fats: 0 },
  { name: 'Naranja',               calories: 47,  proteins: 0.9, carbs: 12,  fats: 0.1 },
  { name: 'Nueces',                calories: 654, proteins: 15,  carbs: 14,  fats: 65 },
  { name: 'Pan integral',          calories: 250, proteins: 9,   carbs: 48,  fats: 3.5 },
  { name: 'Papas baby',            calories: 77,  proteins: 2,   carbs: 17,  fats: 0.1 },
  { name: 'Papaya',                calories: 43,  proteins: 0.5, carbs: 11,  fats: 0.1 },
  { name: 'Pasta cocida',          calories: 131, proteins: 5,   carbs: 25,  fats: 1.1 },
  { name: 'Pavo molido',           calories: 133, proteins: 19,  carbs: 0,   fats: 6 },
  { name: 'Pechuga de pavo',       calories: 135, proteins: 30,  carbs: 0,   fats: 1.5 },
  { name: 'Pescado blanco',        calories: 96,  proteins: 20,  carbs: 0,   fats: 1.7 },
  { name: 'Pimiento rojo',         calories: 31,  proteins: 1,   carbs: 6,   fats: 0.3 },
  { name: 'Plátano',               calories: 89,  proteins: 1.1, carbs: 23,  fats: 0.3 },
  { name: 'Pollo pechuga',         calories: 165, proteins: 31,  carbs: 0,   fats: 3.6 },
  { name: 'Queso Feta',            calories: 264, proteins: 14,  carbs: 4,   fats: 21 },
  { name: 'Queso Mozzarella',      calories: 280, proteins: 28,  carbs: 3.1, fats: 17 },
  { name: 'Queso cottage',         calories: 98,  proteins: 11,  carbs: 3.4, fats: 4.3 },
  { name: 'Queso crema',           calories: 342, proteins: 6,   carbs: 4,   fats: 34 },
  { name: 'Quinoa cocida',         calories: 120, proteins: 4.4, carbs: 21.3,fats: 1.9 },
  { name: 'Remolacha / Betarraga', calories: 43,  proteins: 1.6, carbs: 10,  fats: 0.2 },
  { name: 'Salmón',                calories: 208, proteins: 20,  carbs: 0,   fats: 13 },
  { name: 'Salmón ahumado',        calories: 217, proteins: 18,  carbs: 0,   fats: 16 },
  { name: 'Semillas de calabaza',  calories: 559, proteins: 30,  carbs: 10,  fats: 49 },
  { name: 'Semillas de chía',      calories: 486, proteins: 16.5, carbs: 42, fats: 30.7 },
  { name: 'Semillas de linaza',    calories: 534, proteins: 18,  carbs: 29,  fats: 42 },
  { name: 'Tofu',                  calories: 76,  proteins: 8,   carbs: 1.9, fats: 4.8 },
  { name: 'Tomate',                calories: 18,  proteins: 0.9, carbs: 3.9, fats: 0.2 },
  { name: 'Tomate cherry',         calories: 18,  proteins: 0.9, carbs: 3.9, fats: 0.2 },
  { name: 'Verduras mixtas',       calories: 30,  proteins: 1.5, carbs: 5,   fats: 0.3 },
  { name: 'Yogur griego',          calories: 59,  proteins: 10,  carbs: 3.6, fats: 0.4 },
  { name: 'Yogur natural',         calories: 61,  proteins: 3.5, carbs: 4.7, fats: 3.3 },
  { name: 'Zucchini / Calabacín',  calories: 17,  proteins: 1.2, carbs: 3.1, fats: 0.3 },
];

async function main() {
  console.log(`Insertando ${MISSING_FOODS.length} alimentos faltantes...`);
  let count = 0;
  for (const f of MISSING_FOODS) {
    await prisma.foodItem.upsert({
      where: { name: f.name },
      update: {
        calories: f.calories, proteins: f.proteins,
        carbohydrates: f.carbs, fats: f.fats,
        baseQuantity: 100, isActive: true,
      },
      create: {
        name: f.name,
        calories: f.calories, proteins: f.proteins,
        carbohydrates: f.carbs, fats: f.fats,
        baseQuantity: 100, isActive: true,
      },
    });
    count++;
  }
  console.log(`✅ ${count} alimentos insertados/actualizados.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
