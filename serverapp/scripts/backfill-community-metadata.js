const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, 'seed-data', 'all-menus-ready.json');

async function main() {
  console.log('📋 Leyendo menús de la BD...');
  const dbMenus = await prisma.menu.findMany({
    where: { isCommunity: true, deletedAt: null },
    select: { id: true, name: true, tags: true },
  });
  console.log(`   ${dbMenus.length} menús encontrados en DB`);

  // Cargar JSON para obtener los tags originales como array
  if (!fs.existsSync(DATA_PATH)) {
    console.log('   ⚠️ No se encuentra JSON, usando tags desde Menu.tags');
  }
  const jsonMenus = fs.existsSync(DATA_PATH)
    ? JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    : [];

  const jsonMap = new Map(jsonMenus.map(m => [m.name, m]));

  // Buscar el autor (primer user que sea nutritionist)
  const author = await prisma.user.findFirst({
    where: { nutritionistProfile: { isNot: null } },
    orderBy: { createdAt: 'asc' },
  });
  if (!author) {
    console.error('❌ No se encontró ningún usuario nutritionist');
    process.exit(1);
  }
  console.log(`   👤 Usando autor: ${author.email}`);

  let created = 0, skipped = 0;
  for (const menu of dbMenus) {
    const existing = await prisma.communityMetadata.findUnique({
      where: { entityType_entityId: { entityType: 'menu', entityId: menu.id } },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Obtener tags desde JSON o desde Menu.tags
    let tags = [];
    const match = jsonMap.get(menu.name);
    if (match && Array.isArray(match.tags)) {
      tags = match.tags;
    } else if (menu.tags) {
      tags = menu.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    await prisma.communityMetadata.create({
      data: {
        entityType: 'menu',
        entityId: menu.id,
        authorId: author.id,
        tags,
        publishedAt: new Date(),
      },
    });
    created++;
  }

  console.log(`\n✅ ${created} CommunityMetadata creados, ${skipped} ya existían`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
