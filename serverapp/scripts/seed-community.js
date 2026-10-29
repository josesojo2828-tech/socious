const path = require('path');
const fs = require('fs');

// Cargar dotenv antes de instanciar Prisma
const dotenvPathServer = path.join(__dirname, '../serverapp/.env');
const dotenvPathRoot = path.join(__dirname, '../.env');

if (fs.existsSync(dotenvPathServer)) {
  require('dotenv').config({ path: dotenvPathServer });
}
if (fs.existsSync(dotenvPathRoot)) {
  require('dotenv').config({ path: dotenvPathRoot });
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://prod_db_user_aqui:super_secret_db_password_aqui@localhost:11003/nutrigest_cloud_prod?schema=public";
}

const { PrismaClient, MenuCategory } = require('@prisma/client');
const { S3Client, PutObjectCommand, CreateBucketCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

// Configuración de MinIO (autodetección Docker vs Host)
const isDocker = fs.existsSync('/.dockerenv');
const minioHost = process.env.MINIO_ENDPOINT || (isDocker ? 'minio' : 'localhost');
const minioPort = process.env.MINIO_PORT || (isDocker ? 9000 : 11004);
const minioUser = process.env.MINIO_ROOT_USER || 'prod_minio_user_aqui';
const minioPass = process.env.MINIO_ROOT_PASSWORD || 'super_secret_minio_password_aqui';
const minioBucket = process.env.MINIO_BUCKET || 'nutrigest-uploads';

const s3 = new S3Client({
  endpoint: `http://${minioHost}:${minioPort}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: minioUser,
    secretAccessKey: minioPass,
  },
  forcePathStyle: true,
});

// Colección curada de fotografía gastronómica profesional HD en Unsplash (Categorizadas)
const UNSPLASH_URLS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621996346565-e3d5d6281270?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80'
];

let imageBufferCache = [];

async function preloadImageBuffers() {
  console.log('⏳ Descargando pool de imágenes HD gastronómicas en memoria...');
  for (const url of UNSPLASH_URLS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        imageBufferCache.push(buf);
      }
    } catch (e) {}
  }
  console.log(`✅ ${imageBufferCache.length} imágenes HD cargadas en memoria para asignación instantánea.`);
}

function cleanTitle(rawTitle) {
  if (!rawTitle) return "Plan Nutricional Saludable";
  let cleaned = rawTitle
    .replace(/(?:Hipertensión|Diabetes|Plan)?\s*(?:Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\s*[-:\s]*/gi, '')
    .replace(/(?:Día|Dia)\s*\d+\s*[-:\s]*/gi, '')
    .replace(/Algun\s+dia\s*[-:\s]*/gi, '')
    .replace(/^[-:\s]+|[-:\s]+$/g, '')
    .trim();

  if (!cleaned || cleaned.length < 4) return "Plato Nutritivo Balanceado";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

async function ensureMinIOBucket() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: minioBucket })).catch(() => {});
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${minioBucket}/*`]
        }
      ]
    };
    await s3.send(new PutBucketPolicyCommand({ Bucket: minioBucket, Policy: JSON.stringify(policy) })).catch(() => {});
  } catch (err) {
    console.warn('Aviso MinIO Bucket:', err.message);
  }
}

async function uploadMenuImageToMinIO(menuId, seedIndex) {
  const buffer = imageBufferCache[seedIndex % imageBufferCache.length];
  const key = `menus/menu_${menuId}.jpg`;

  await s3.send(new PutObjectCommand({
    Bucket: minioBucket,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
  }));

  return `/nutrigest-uploads/${key}`;
}

const BASE_FOODS = [
  { name: 'Pollo pechuga', calories: 165, proteins: 31, carbohydrates: 0, fats: 3.6, baseQuantity: 100 },
  { name: 'Arroz blanco', calories: 130, proteins: 2.7, carbohydrates: 28, fats: 0.3, baseQuantity: 100 },
  { name: 'Arroz integral', calories: 111, proteins: 2.6, carbohydrates: 23, fats: 0.9, baseQuantity: 100 },
  { name: 'Brócoli', calories: 34, proteins: 2.8, carbohydrates: 7, fats: 0.4, baseQuantity: 100 },
  { name: 'Huevo entero', calories: 155, proteins: 13, carbohydrates: 1.1, fats: 11, baseQuantity: 100 },
  { name: 'Papa', calories: 77, proteins: 2, carbohydrates: 17, fats: 0.1, baseQuantity: 100 },
  { name: 'Atún en agua', calories: 116, proteins: 26, carbohydrates: 0, fats: 1, baseQuantity: 100 },
  { name: 'Salmón', calories: 208, proteins: 20, carbohydrates: 0, fats: 13, baseQuantity: 100 },
  { name: 'Camarones', calories: 99, proteins: 24, carbohydrates: 0.2, fats: 0.3, baseQuantity: 100 },
  { name: 'Carne de res magra', calories: 150, proteins: 26, carbohydrates: 0, fats: 5, baseQuantity: 100 },
  { name: 'Pechuga de pavo', calories: 135, proteins: 30, carbohydrates: 0, fats: 1.5, baseQuantity: 100 },
  { name: 'Pescado blanco', calories: 96, proteins: 20, carbohydrates: 0, fats: 1.7, baseQuantity: 100 },
  { name: 'Pan integral', calories: 250, proteins: 9, carbohydrates: 48, fats: 3.5, baseQuantity: 100 },
  { name: 'Avena', calories: 389, proteins: 16.9, carbohydrates: 66, fats: 6.9, baseQuantity: 100 },
  { name: 'Quinoa cocida', calories: 120, proteins: 4.4, carbohydrates: 21.3, fats: 1.9, baseQuantity: 100 },
  { name: 'Espinaca', calories: 23, proteins: 2.9, carbohydrates: 3.6, fats: 0.4, baseQuantity: 100 },
  { name: 'Lechuga', calories: 15, proteins: 1.4, carbohydrates: 2.9, fats: 0.2, baseQuantity: 100 },
  { name: 'Tomate', calories: 18, proteins: 0.9, carbohydrates: 3.9, fats: 0.2, baseQuantity: 100 },
  { name: 'Pepino', calories: 15, proteins: 0.7, carbohydrates: 3.6, fats: 0.1, baseQuantity: 100 },
  { name: 'Zanahoria', calories: 41, proteins: 0.9, carbohydrates: 9.6, fats: 0.2, baseQuantity: 100 },
  { name: 'Aguacate', calories: 160, proteins: 2, carbohydrates: 8.5, fats: 14.7, baseQuantity: 100 },
  { name: 'Lentejas cocidas', calories: 116, proteins: 9, carbohydrates: 20, fats: 0.4, baseQuantity: 100 },
  { name: 'Garbanzos', calories: 164, proteins: 8.9, carbohydrates: 27, fats: 2.6, baseQuantity: 100 },
  { name: 'Frijoles negros', calories: 132, proteins: 8.9, carbohydrates: 23.7, fats: 0.5, baseQuantity: 100 },
  { name: 'Yogur natural', calories: 61, proteins: 3.5, carbohydrates: 4.7, fats: 3.3, baseQuantity: 100 },
  { name: 'Leche entera', calories: 61, proteins: 3.2, carbohydrates: 4.8, fats: 3.3, baseQuantity: 100 },
  { name: 'Manzana', calories: 52, proteins: 0.3, carbohydrates: 13.8, fats: 0.2, baseQuantity: 100 },
  { name: 'Plátano', calories: 89, proteins: 1.1, carbohydrates: 22.8, fats: 0.3, baseQuantity: 100 },
  { name: 'Fresas', calories: 32, proteins: 0.7, carbohydrates: 7.7, fats: 0.3, baseQuantity: 100 },
  { name: 'Arándanos', calories: 57, proteins: 0.7, carbohydrates: 14.5, fats: 0.3, baseQuantity: 100 },
  { name: 'Nueces', calories: 654, proteins: 15.2, carbohydrates: 13.7, fats: 65.2, baseQuantity: 100 },
  { name: 'Almendras', calories: 579, proteins: 21.2, carbohydrates: 21.6, fats: 49.9, baseQuantity: 100 },
  { name: 'Semillas de chía', calories: 486, proteins: 16.5, carbohydrates: 42.1, fats: 30.7, baseQuantity: 100 },
  { name: 'Aceite de oliva', calories: 884, proteins: 0, carbohydrates: 0, fats: 100, baseQuantity: 100 }
];

function mapCategory(cat) {
  if (!cat) return MenuCategory.ALMUERZO;
  const c = cat.toString().toUpperCase();
  if (c.includes('DESAYUNO')) return MenuCategory.DESAYUNO;
  if (c.includes('CENA')) return MenuCategory.CENA;
  if (c.includes('SNACK') || c.includes('MERIENDA')) return MenuCategory.SNACK;
  return MenuCategory.ALMUERZO;
}

async function main() {
  const jsonPathGen = path.join(__dirname, 'seed-data', 'menus-extracted.json');
  const jsonPathPatho = path.join(__dirname, 'seed-data', 'menus-pathology-extracted.json');
  const jsonPathTotalidad = path.join(__dirname, 'seed-data', 'totalidad-menus.json');

  let menusExtracted = [];

  if (fs.existsSync(jsonPathGen)) {
    const rawGen = fs.readFileSync(jsonPathGen, 'utf8');
    menusExtracted = menusExtracted.concat(JSON.parse(rawGen));
  }

  if (fs.existsSync(jsonPathPatho)) {
    const rawPatho = fs.readFileSync(jsonPathPatho, 'utf8');
    menusExtracted = menusExtracted.concat(JSON.parse(rawPatho));
  }

  if (fs.existsSync(jsonPathTotalidad)) {
    const rawTot = fs.readFileSync(jsonPathTotalidad, 'utf8');
    menusExtracted = menusExtracted.concat(JSON.parse(rawTot));
  }

  // Filtrar duplicados por nombre limpio y validar longitud
  const seenTitles = new Set();
  menusExtracted = menusExtracted.filter(m => {
    const title = cleanTitle(m.name);
    if (!title || title.length < 5 || seenTitles.has(title)) return false;
    seenTitles.add(title);
    return true;
  });

  console.log(`🌱 Iniciando Seed de Alimentos + Fotografías HD Locales en MinIO (${menusExtracted.length} menús)...`);

  await preloadImageBuffers();
  await ensureMinIOBucket();

  const targetEmail = 'josesojo@gmail.com';
  const user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    throw new Error(`Usuario con email ${targetEmail} no existe en la base de datos.`);
  }

  const nutritionist = await prisma.nutritionist.findUnique({ where: { userId: user.id } });
  if (!nutritionist) {
    throw new Error(`Perfil de Nutricionista no encontrado para el usuario ${targetEmail}.`);
  }

  console.log(`👤 Nutricionista encontrado: ID ${nutritionist.id} (${targetEmail})`);

  console.log('🧹 Limpiando menús anteriores...');
  if (prisma.communityMetadata) {
    await prisma.communityMetadata.deleteMany({ where: { entityType: 'menu' } }).catch(() => {});
  }
  await prisma.menuItem.deleteMany({});
  await prisma.menu.deleteMany({});

  const foodMap = new Map();
  for (const food of BASE_FOODS) {
    const created = await prisma.foodItem.upsert({
      where: { name: food.name },
      update: {
        calories: food.calories,
        proteins: food.proteins,
        carbohydrates: food.carbohydrates,
        fats: food.fats,
        baseQuantity: food.baseQuantity,
      },
      create: {
        name: food.name,
        calories: food.calories,
        proteins: food.proteins,
        carbohydrates: food.carbohydrates,
        fats: food.fats,
        baseQuantity: food.baseQuantity,
      },
    });
    foodMap.set(food.name, created);
  }

  console.log(`🥑 Catálogo base de ${foodMap.size} alimentos sincronizado.`);

  let createdCount = 0;
  for (const menuData of menusExtracted) {
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    const itemsToCreate = [];

    for (const f of menuData.foods || []) {
      const foodInfo = foodMap.get(f.name);
      if (!foodInfo) continue;

      const qty = f.quantity || 100;
      const ratio = qty / 100;

      totalKcal += foodInfo.calories * ratio;
      totalProtein += foodInfo.proteins * ratio;
      totalCarbs += foodInfo.carbohydrates * ratio;
      totalFats += foodInfo.fats * ratio;

      itemsToCreate.push({
        foodId: foodInfo.id,
        quantity: qty,
        unit: f.unit || 'g',
        portionLabel: `${qty}${f.unit === 'ml' ? 'ml' : 'g'}`
      });
    }

    const sanitizedTitle = cleanTitle(menuData.name);

    const createdMenu = await prisma.menu.create({
      data: {
        name: sanitizedTitle,
        description: menuData.description || 'Receta saludable balanceada.',
        category: mapCategory(menuData.category),
        nutritionistId: nutritionist.id,
        isCommunity: true,
        totalKcal: Number(totalKcal.toFixed(1)),
        totalProtein: Number(totalProtein.toFixed(1)),
        totalCarbs: Number(totalCarbs.toFixed(1)),
        totalFats: Number(totalFats.toFixed(1)),
        tags: Array.isArray(menuData.tags) ? menuData.tags.join(', ') : (menuData.tags || 'saludable'),
        items: {
          create: itemsToCreate
        }
      }
    });

    const localImageUrl = await uploadMenuImageToMinIO(createdMenu.id, createdCount);

    await prisma.menu.update({
      where: { id: createdMenu.id },
      data: { imageUrl: localImageUrl }
    });

    if (prisma.communityMetadata) {
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
      }).catch(() => {});
    }

    createdCount++;
    if (createdCount % 250 === 0 || createdCount === menusExtracted.length) {
      console.log(`📸 ${createdCount}/${menusExtracted.length} menús cargados e imágnes sincronizadas...`);
    }
  }

  console.log(`🎉 ¡Finalizado con éxito! ${createdCount} alimentos y menús procesados con imágenes JPG HD en MinIO.`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
