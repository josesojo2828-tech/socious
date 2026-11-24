const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos de comida rápida / fast food de prueba...");

  const userEmail = "comida.demo@socius.com";
  const rawPassword = "Password123!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Crear o actualizar usuario
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      password: passwordHash,
      firstName: "Carlos",
      lastName: "Burger",
      permitId: "USER",
    },
    create: {
      email: userEmail,
      password: passwordHash,
      firstName: "Carlos",
      lastName: "Burger",
      permitId: "USER",
    },
  });
  console.log("✔ Usuario creado/actualizado:", user.email);

  // 2. Crear o actualizar organización
  const orgSlug = "burger-grill-express";
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Burger & Grill Express",
        slug: orgSlug,
        taxId: "J-415982034",
        phone: "+58 412 555-8833",
        address: "Calle del Hambre, Local 7, Sector Las Mercedes",
        isMeatProcessing: false,
        isWholesaler: false,
        status: "ACTIVE",
        defaultCurrency: "USD",
      },
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: "Burger & Grill Express",
        isMeatProcessing: false,
        isWholesaler: false,
        status: "ACTIVE",
      },
    });
  }
  console.log("✔ Organización lista:", org.name);

  // 3. Membresía del usuario
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {
      role: "OWNER",
      status: "ACTIVE",
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });
  console.log("✔ Membresía de OWNER asociada");

  // 4. Suscripción activa a plan PREMIUM
  await prisma.subscription.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {
      plan: { connect: { id: "PREMIUM" } },
      status: "ACTIVE",
    },
    create: {
      user: { connect: { id: user.id } },
      organization: { connect: { id: org.id } },
      plan: { connect: { id: "PREMIUM" } },
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 año
    },
  });
  console.log("✔ Suscripción PREMIUM activa asignada");

  // 5. Proveedor de insumos
  let supplier = await prisma.supplier.findFirst({
    where: { organizationId: org.id, name: "Distribuidora Pan & Carnes Express C.A." },
  });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: "Distribuidora Pan & Carnes Express C.A.",
        taxId: "J-318491022",
        phone: "+58 212 555-7711",
        contactName: "Alejandro Mendoza",
        address: "Av. Fuerzas Armadas, Sector Panaderías y Frigoríficos",
      },
    });
  }
  console.log("✔ Proveedor registrado:", supplier.name);

  // 6. Categorías
  const categoriesDef = [
    { name: "Hamburguesas", slug: "hamburguesas", description: "Hamburguesas artesanales a la plancha" },
    { name: "Perros Calientes", slug: "perros-calientes", description: "Perros calientes clásicos y especiales" },
    { name: "Acompañantes y Bebidas", slug: "acompanantes-y-bebidas", description: "Papas fritas, refrescos y raciones" },
    { name: "Combos del Chef", slug: "combos-del-chef", description: "Combos con hamburguesas, papas y bebidas" },
    { name: "Insumos y Materias Primas", slug: "insumos-materias-primas", description: "Materias primas para control de escandallos" },
  ];

  const catMap = {};
  for (const c of categoriesDef) {
    let cat = await prisma.category.findFirst({
      where: { organizationId: org.id, name: c.name },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          organizationId: org.id,
          name: c.name,
          slug: `${c.slug}-${org.id.slice(0, 6)}`,
          description: c.description,
          isSystem: false,
          isActive: true,
        },
      });
    }
    catMap[c.name] = cat.id;
  }
  console.log("✔ 5 Categorías creadas");

  // 7. Insumos / Materias Primas (isRawMaterial: true)
  const rawMaterials = [
    {
      sku: "INS-PAN-HAM",
      name: "Pan de Hamburguesa con Ajonjolí",
      costPriceUSD: 0.40,
      salePriceUSD: 0.80,
      stock: 150.0,
      unit: "UND",
      categoryName: "Insumos y Materias Primas",
      isRawMaterial: true,
    },
    {
      sku: "INS-CARNE-150",
      name: "Carne Molida Artesanal para Burger 150g",
      costPriceUSD: 1.20,
      salePriceUSD: 2.00,
      stock: 200.0,
      unit: "UND",
      categoryName: "Insumos y Materias Primas",
      isRawMaterial: true,
    },
    {
      sku: "INS-PAN-PERRO",
      name: "Pan de Perro Caliente Grande",
      costPriceUSD: 0.30,
      salePriceUSD: 0.60,
      stock: 120.0,
      unit: "UND",
      categoryName: "Insumos y Materias Primas",
      isRawMaterial: true,
    },
    {
      sku: "INS-SALCH-VIENA",
      name: "Salchicha Frankfurt Tipo Viena",
      costPriceUSD: 0.50,
      salePriceUSD: 1.00,
      stock: 150.0,
      unit: "UND",
      categoryName: "Insumos y Materias Primas",
      isRawMaterial: true,
    },
    {
      sku: "INS-QUESO-CHEDDAR",
      name: "Queso Cheddar Rebanado (kg)",
      costPriceUSD: 6.00,
      salePriceUSD: 9.00,
      stock: 15.0,
      unit: "kg",
      categoryName: "Insumos y Materias Primas",
      isRawMaterial: true,
    },
    {
      sku: "INS-TOCINETA",
      name: "Tocineta Ahumada Picada (kg)",
      costPriceUSD: 5.50,
      salePriceUSD: 8.50,
      stock: 12.0,
      unit: "kg",
      categoryName: "Insumos y Materias Primas",
      isRawMaterial: true,
    },
    {
      sku: "INS-PAPAS-CONG",
      name: "Papas Congeladas para Freír (kg)",
      costPriceUSD: 2.00,
      salePriceUSD: 3.50,
      stock: 40.0,
      unit: "kg",
      categoryName: "Insumos y Materias Primas",
      isRawMaterial: true,
    },
  ];

  const prodBySku = {};
  for (const item of rawMaterials) {
    let p = await prisma.product.findFirst({
      where: { organizationId: org.id, sku: item.sku },
    });
    if (!p) {
      p = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: item.sku,
          name: item.name,
          costPriceUSD: item.costPriceUSD,
          salePriceUSD: item.salePriceUSD,
          stock: item.stock,
          unit: item.unit,
          categoryId: catMap[item.categoryName],
          isRawMaterial: true,
          status: "ACTIVE",
        },
      });
    } else {
      p = await prisma.product.update({
        where: { id: p.id },
        data: {
          name: item.name,
          costPriceUSD: item.costPriceUSD,
          salePriceUSD: item.salePriceUSD,
          stock: item.stock,
          unit: item.unit,
          categoryId: catMap[item.categoryName],
          isRawMaterial: true,
        },
      });
    }
    prodBySku[item.sku] = p;
  }
  console.log("✔ 7 Insumos base registrados (panes, carnes, salchichas, quesos, tocineta, papas)");

  // 8. Platos Terminados y Bebidas (Menú del POS con recetas descontables)
  const menuItems = [
    {
      sku: "BEB-COCA",
      name: "Coca-Cola Original 355ml",
      costPriceUSD: 0.70,
      salePriceUSD: 1.50,
      stock: 100.0,
      unit: "UND",
      categoryName: "Acompañantes y Bebidas",
      imageUrl: "/img/comida/refresco-coca.jpg",
      isRawMaterial: true, // también sirve de insumo para combos
      isComposite: false,
      recipe: [],
    },
    {
      sku: "PAPAS-FRITAS",
      name: "Ración de Papas Fritas Crujientes",
      costPriceUSD: 0.60,
      salePriceUSD: 2.50,
      stock: 50.0,
      unit: "UND",
      categoryName: "Acompañantes y Bebidas",
      imageUrl: "/img/comida/papas-fritas.jpg",
      isRawMaterial: true,
      isComposite: true,
      recipe: [
        { sku: "INS-PAPAS-CONG", qty: 0.25 }, // 250g de papas
      ],
    },
    {
      sku: "PERRO-SENCILLO",
      name: "Perro Caliente Tradicional",
      costPriceUSD: 0.80,
      salePriceUSD: 1.80,
      stock: 90.0,
      unit: "UND",
      categoryName: "Perros Calientes",
      imageUrl: "/img/comida/perro-caliente.jpg",
      isComposite: true,
      recipe: [
        { sku: "INS-PAN-PERRO", qty: 1.0 },
        { sku: "INS-SALCH-VIENA", qty: 1.0 },
      ],
    },
    {
      sku: "PERRO-ESPECIAL",
      name: "Perro Caliente Especial Cheddar & Bacon",
      costPriceUSD: 1.30,
      salePriceUSD: 2.80,
      stock: 70.0,
      unit: "UND",
      categoryName: "Perros Calientes",
      imageUrl: "/img/comida/perro-caliente.jpg",
      isComposite: true,
      recipe: [
        { sku: "INS-PAN-PERRO", qty: 1.0 },
        { sku: "INS-SALCH-VIENA", qty: 1.0 },
        { sku: "INS-QUESO-CHEDDAR", qty: 0.03 },
        { sku: "INS-TOCINETA", qty: 0.03 },
      ],
    },
    {
      sku: "HAM-CLASICA",
      name: "Hamburguesa Clásica con Queso Cheddar",
      costPriceUSD: 1.80,
      salePriceUSD: 4.50,
      stock: 80.0,
      unit: "UND",
      categoryName: "Hamburguesas",
      imageUrl: "/img/comida/burger-clasica.jpg",
      isComposite: true,
      recipe: [
        { sku: "INS-PAN-HAM", qty: 1.0 },
        { sku: "INS-CARNE-150", qty: 1.0 },
        { sku: "INS-QUESO-CHEDDAR", qty: 0.03 },
      ],
    },
    {
      sku: "HAM-DOBLE-BACON",
      name: "Hamburguesa Doble Carne, Cheddar & Bacon",
      costPriceUSD: 3.30,
      salePriceUSD: 7.50,
      stock: 60.0,
      unit: "UND",
      categoryName: "Hamburguesas",
      imageUrl: "/img/comida/burger-doble.jpg",
      isComposite: true,
      recipe: [
        { sku: "INS-PAN-HAM", qty: 1.0 },
        { sku: "INS-CARNE-150", qty: 2.0 },
        { sku: "INS-QUESO-CHEDDAR", qty: 0.06 },
        { sku: "INS-TOCINETA", qty: 0.04 },
      ],
    },
  ];

  for (const item of menuItems) {
    let p = await prisma.product.findFirst({
      where: { organizationId: org.id, sku: item.sku },
    });
    if (!p) {
      p = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: item.sku,
          name: item.name,
          costPriceUSD: item.costPriceUSD,
          salePriceUSD: item.salePriceUSD,
          stock: item.stock,
          unit: item.unit,
          imageUrl: item.imageUrl,
          categoryId: catMap[item.categoryName],
          isRawMaterial: Boolean(item.isRawMaterial),
          isComposite: Boolean(item.isComposite),
          status: "ACTIVE",
        },
      });
    } else {
      p = await prisma.product.update({
        where: { id: p.id },
        data: {
          name: item.name,
          costPriceUSD: item.costPriceUSD,
          salePriceUSD: item.salePriceUSD,
          stock: item.stock,
          unit: item.unit,
          imageUrl: item.imageUrl,
          categoryId: catMap[item.categoryName],
          isRawMaterial: Boolean(item.isRawMaterial),
          isComposite: Boolean(item.isComposite),
        },
      });
    }
    prodBySku[item.sku] = p;

    // Guardar receta si aplica
    for (const ing of item.recipe) {
      const rawProd = prodBySku[ing.sku];
      if (rawProd) {
        await prisma.productComponent.upsert({
          where: {
            productId_componentId: {
              productId: p.id,
              componentId: rawProd.id,
            },
          },
          update: { quantity: ing.qty },
          create: {
            productId: p.id,
            componentId: rawProd.id,
            quantity: ing.qty,
          },
        });
      }
    }
  }
  console.log("✔ 6 Platos terminados con sus recetas y escandallos vinculados");

  // 9. Combos Promocionales
  const combos = [
    {
      sku: "COMBO-BURGER-PRO",
      name: "Combo Burger Clásica + Papas + Coca-Cola",
      costPriceUSD: 3.10,
      salePriceUSD: 7.50,
      stock: 40.0,
      unit: "UND",
      categoryName: "Combos del Chef",
      imageUrl: "/img/comida/combo-burger.jpg",
      isComposite: true,
      recipe: [
        { sku: "INS-PAN-HAM", qty: 1.0 },
        { sku: "INS-CARNE-150", qty: 1.0 },
        { sku: "INS-QUESO-CHEDDAR", qty: 0.03 },
        { sku: "INS-PAPAS-CONG", qty: 0.25 },
        { sku: "BEB-COCA", qty: 1.0 },
      ],
    },
    {
      sku: "COMBO-DOBLE-XTREME",
      name: "Combo Burger Doble Bacon + Papas + Coca-Cola",
      costPriceUSD: 4.60,
      salePriceUSD: 10.50,
      stock: 30.0,
      unit: "UND",
      categoryName: "Combos del Chef",
      imageUrl: "/img/comida/combo-burger.jpg",
      isComposite: true,
      recipe: [
        { sku: "INS-PAN-HAM", qty: 1.0 },
        { sku: "INS-CARNE-150", qty: 2.0 },
        { sku: "INS-QUESO-CHEDDAR", qty: 0.06 },
        { sku: "INS-TOCINETA", qty: 0.04 },
        { sku: "INS-PAPAS-CONG", qty: 0.35 },
        { sku: "BEB-COCA", qty: 1.0 },
      ],
    },
    {
      sku: "COMBO-DUO-PERROS",
      name: "Combo Dúo: 2 Perros Especiales + 2 Coca-Colas",
      costPriceUSD: 3.80,
      salePriceUSD: 7.50,
      stock: 35.0,
      unit: "UND",
      categoryName: "Combos del Chef",
      imageUrl: "/img/comida/perro-caliente.jpg",
      isComposite: true,
      recipe: [
        { sku: "INS-PAN-PERRO", qty: 2.0 },
        { sku: "INS-SALCH-VIENA", qty: 2.0 },
        { sku: "INS-QUESO-CHEDDAR", qty: 0.06 },
        { sku: "INS-TOCINETA", qty: 0.06 },
        { sku: "BEB-COCA", qty: 2.0 },
      ],
    },
  ];

  for (const combo of combos) {
    let p = await prisma.product.findFirst({
      where: { organizationId: org.id, sku: combo.sku },
    });
    if (!p) {
      p = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: combo.sku,
          name: combo.name,
          costPriceUSD: combo.costPriceUSD,
          salePriceUSD: combo.salePriceUSD,
          stock: combo.stock,
          unit: combo.unit,
          imageUrl: combo.imageUrl,
          categoryId: catMap[combo.categoryName],
          isComposite: true,
          status: "ACTIVE",
        },
      });
    } else {
      p = await prisma.product.update({
        where: { id: p.id },
        data: {
          name: combo.name,
          costPriceUSD: combo.costPriceUSD,
          salePriceUSD: combo.salePriceUSD,
          stock: combo.stock,
          unit: combo.unit,
          imageUrl: combo.imageUrl,
          categoryId: catMap[combo.categoryName],
          isComposite: true,
        },
      });
    }

    for (const ing of combo.recipe) {
      const rawProd = prodBySku[ing.sku];
      if (rawProd) {
        await prisma.productComponent.upsert({
          where: {
            productId_componentId: {
              productId: p.id,
              componentId: rawProd.id,
            },
          },
          update: { quantity: ing.qty },
          create: {
            productId: p.id,
            componentId: rawProd.id,
            quantity: ing.qty,
          },
        });
      }
    }
  }
  console.log("✔ 3 Combos estrella con escandallos completos vinculados");

  console.log("\n==========================================");
  console.log("🎉 SEED DE COMIDA RÁPIDA COMPLETADO");
  console.log("==========================================");
  console.log("Usuario: comida.demo@socius.com");
  console.log("Contraseña: Password123!");
  console.log("Organización:", org.name);
  console.log("Slug:", org.slug);
  console.log("==========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
