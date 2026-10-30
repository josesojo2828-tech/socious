/**
 * System category catalog (S5).
 *
 * Importable: `seedCategories(prisma)` takes the caller's client so the boot
 * fixture (DataFixtureService) can run it inside the application's lifecycle.
 * The CLI entry point below keeps `npm run seed:categories` working.
 *
 * Idempotent: upsert keyed by slug; the repository always wins.
 */

import { PrismaClient } from "@prisma/client";

const STANDARD_CATEGORIES = [
  {
    name: "Alimentos y Bebidas",
    slug: "alimentos-y-bebidas",
    icon: "fork-knife",
    description: "Víveres, abarrotes, bebidas y alimentos en general",
    subCategories: [
      { name: "Víveres y Abarrotes", slug: "viveres-y-abarrotes" },
      { name: "Bebidas y Licores", slug: "bebidas-y-licores" },
      { name: "Lácteos y Huevos", slug: "lacteos-y-huevos" },
      { name: "Carnicería y Charcutería", slug: "carniceria-y-charcuteria" },
      { name: "Panadería y Dulces", slug: "panaderia-y-dulces" },
      { name: "Frutas y Verduras", slug: "frutas-y-verduras" },
    ],
  },
  {
    name: "Ropa y Moda",
    slug: "ropa-y-moda",
    icon: "t-shirt",
    description: "Prendas de vestir, calzado y accesorios",
    subCategories: [
      { name: "Damas", slug: "ropa-damas" },
      { name: "Caballeros", slug: "ropa-caballeros" },
      { name: "Niños y Bebés", slug: "ropa-ninos-y-bebes" },
      { name: "Calzado", slug: "calzado" },
      { name: "Accesorios y Bolsos", slug: "accesorios-y-bolsos" },
    ],
  },
  {
    name: "Tecnología y Electrónica",
    slug: "tecnologia-y-electronica",
    icon: "device-mobile",
    description: "Dispositivos, accesorios y equipos electrónicos",
    subCategories: [
      { name: "Celulares y Tablets", slug: "celulares-y-tablets" },
      { name: "Computación", slug: "computacion" },
      { name: "Audio y Video", slug: "audio-y-video" },
      { name: "Cables y Cargadores", slug: "cables-y-cargadores" },
    ],
  },
  {
    name: "Salud y Cuidado Personal",
    slug: "salud-y-cuidado-personal",
    icon: "heart",
    description: "Medicamentos de venta libre, higiene y cosméticos",
    subCategories: [
      { name: "Higiene Personal", slug: "higiene-personal" },
      { name: "Cosméticos y Belleza", slug: "cosmeticos-y-belleza" },
      { name: "Cuidado del Bebé", slug: "cuidado-del-bebe" },
    ],
  },
  {
    name: "Ferretería y Herramientas",
    slug: "ferreteria-y-herramientas",
    icon: "wrench",
    description: "Materiales, herramientas e insumos para el hogar y taller",
    subCategories: [
      { name: "Herramientas Manuales y Eléctricas", slug: "herramientas" },
      { name: "Electricidad e Iluminación", slug: "electricidad" },
      { name: "Plomería", slug: "plomeria" },
      { name: "Pinturas y Acabados", slug: "pinturas" },
    ],
  },
  {
    name: "Hogar y Limpieza",
    slug: "hogar-y-limpieza",
    icon: "house",
    description: "Productos para el hogar, cocina y limpieza",
    subCategories: [
      { name: "Productos de Limpieza", slug: "productos-de-limpieza" },
      { name: "Cocina y Menaje", slug: "cocina-y-menaje" },
      { name: "Decoración", slug: "decoracion" },
    ],
  },
  {
    name: "Servicios",
    slug: "servicios",
    icon: "handshake",
    description: "Mano de obra, asesorías, soporte técnico y entregas",
    subCategories: [
      { name: "Soporte Técnico / Reparación", slug: "soporte-reparacion" },
      { name: "Envíos y Fletes", slug: "envios-fletes" },
      { name: "Honorarios Profesionales", slug: "honorarios-profesionales" },
    ],
  },
];

export async function seedCategories(prisma: PrismaClient): Promise<void> {
  for (const cat of STANDARD_CATEGORIES) {
    // `slug` is indexed but not unique; the catalog creates every row with
    // id === slug, so the id is the natural upsert key.
    const parent = await prisma.category.upsert({
      where: { id: cat.slug },
      update: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        isSystem: true,
      },
      create: {
        id: cat.slug,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        parentId: null,
        isSystem: true,
      },
    });

    for (const sub of cat.subCategories) {
      await prisma.category.upsert({
        where: { id: sub.slug },
        update: {
          name: sub.name,
          slug: sub.slug,
          parentId: parent.id,
          isSystem: true,
        },
        create: {
          id: sub.slug,
          name: sub.name,
          slug: sub.slug,
          parentId: parent.id,
          isSystem: true,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedCategories(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
