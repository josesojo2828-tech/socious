import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: 'Cursos',
    description: 'Cursos de nutrición, dietética y áreas afines',
    icon: '📚',
    sortOrder: 1,
  },
  {
    name: 'Ebooks',
    description: 'Libros electrónicos sobre nutrición y salud',
    icon: '📖',
    sortOrder: 2,
  },
  {
    name: 'Plantillas',
    description: 'Plantillas para planes de alimentación, presupuestos y más',
    icon: '📋',
    sortOrder: 3,
  },
  {
    name: 'Webinars',
    description: 'Seminarios web y capacitaciones en línea',
    icon: '🎥',
    sortOrder: 4,
  },
  {
    name: 'Herramientas',
    description: 'Calculadoras, planillas y utilidades para nutricionistas',
    icon: '🧮',
    sortOrder: 5,
  },
  {
    name: 'Recursos',
    description: 'Guías, infografías y materiales de apoyo',
    icon: '📄',
    sortOrder: 6,
  },
];

async function main() {
  console.log('🌱 Seeding marketplace categories...');

  for (const category of defaultCategories) {
    const existing = await prisma.marketCategory.findFirst({
      where: { name: category.name },
    });

    if (!existing) {
      await prisma.marketCategory.create({
        data: category,
      });
      console.log(`  ✅ Created: ${category.name}`);
    } else {
      console.log(`  ⏭️  Already exists: ${category.name}`);
    }
  }

  console.log('✅ Marketplace categories seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
