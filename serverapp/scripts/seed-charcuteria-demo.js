const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos de charcutería de prueba...");

  const userEmail = "charcuteria.demo@socius.com";
  const rawPassword = "Password123!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Crear o actualizar usuario
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      password: passwordHash,
      firstName: "Luigi",
      lastName: "Charcutero",
      permitId: "USER",
    },
    create: {
      email: userEmail,
      password: passwordHash,
      firstName: "Luigi",
      lastName: "Charcutero",
      permitId: "USER",
    },
  });
  console.log("✔ Usuario creado/actualizado:", user.email);

  // 2. Crear o actualizar organización
  const orgSlug = "don-luigi-delicatessen";
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Charcutería & Delicatessen Don Luigi",
        slug: orgSlug,
        taxId: "J-412983015",
        phone: "+58 414 555-0322",
        address: "Av. Las Delicias, C.C. Gourmet Plaza, Local 4",
        isMeatProcessing: true,
        isWholesaler: true,
        status: "ACTIVE",
        defaultCurrency: "USD",
      },
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: "Charcutería & Delicatessen Don Luigi",
        isMeatProcessing: true,
        isWholesaler: true,
        status: "ACTIVE",
      },
    });
  }
  console.log("✔ Organización lista:", org.name, "(isMeatProcessing: true)");

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

  // 5. Proveedor
  let supplier = await prisma.supplier.findFirst({
    where: { organizationId: org.id, name: "Distribuidora de Embutidos & Lácteos Los Andes C.A." },
  });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: "Distribuidora de Embutidos & Lácteos Los Andes C.A.",
        taxId: "J-319482011",
        phone: "+58 212 555-9011",
        contactName: "Sr. Vincenzo Moretti",
        address: "Zona Industrial La Trinidad, Galpón 5",
      },
    });
  }
  console.log("✔ Proveedor de charcutería registrado:", supplier.name);

  // 6. Piezas / Hormas Matrices (MeatCarcass)
  const carcassQueso = await prisma.meatCarcass.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "Horma de Queso Paisa 10kg",
      },
    },
    update: {
      defaultCostUSD: 3.50,
      lastCostUSD: 3.50,
      lastProcessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // ayer
    },
    create: {
      organizationId: org.id,
      name: "Horma de Queso Paisa 10kg",
      code: "HORMA-QUE-01",
      defaultCostUSD: 3.50,
      lastCostUSD: 3.50,
      lastProcessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    },
  });

  await prisma.meatCarcass.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "Barra Jamón Pierna 3.5kg",
      },
    },
    update: {
      defaultCostUSD: 5.00,
      lastCostUSD: 5.00,
    },
    create: {
      organizationId: org.id,
      name: "Barra Jamón Pierna 3.5kg",
      code: "BARRA-JAM-01",
      defaultCostUSD: 5.00,
      lastCostUSD: 5.00,
    },
  });
  console.log("✔ 2 Piezas/Hormas matrices registradas (Horma Queso, Barra Jamón)");

  // 7. Categorías
  const categoriesDef = [
    { name: "Embutidos y Jamones", slug: "embutidos-y-jamones", description: "Jamones cocidos, curados, salchichas y tocinetas" },
    { name: "Quesos y Lácteos", slug: "quesos-y-lacteos", description: "Quesos blancos criollos, madurados y fundidos" },
    { name: "Delicateses y Panadería", slug: "delicateses-y-panaderia", description: "Aceitunas, encurtidos, panes y galletas" },
    { name: "Combos y Tablas Gourmet", slug: "combos-y-tablas-gourmet", description: "Combos preparados, tablas mixtas y pasapalos" },
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
  console.log("✔ 4 Categorías creadas");

  // 8. Productos por Peso (kg / balanza)
  const weightProducts = [
    {
      sku: "CHAR-JAM-01",
      name: "Jamón de Pierna Superior Plumrose",
      costPriceUSD: 5.20,
      salePriceUSD: 8.50,
      stock: 45.0,
      unit: "kg",
      categoryName: "Embutidos y Jamones",
      imageUrl: "/img/charcuteria/jamon-pierna.jpg",
      isRawMaterial: true,
    },
    {
      sku: "CHAR-QUE-01",
      name: "Queso Blanco Paisa Pasteurizado",
      costPriceUSD: 3.80,
      salePriceUSD: 6.20,
      stock: 60.0,
      unit: "kg",
      categoryName: "Quesos y Lácteos",
      imageUrl: "/img/charcuteria/queso-blanco.jpg",
      isRawMaterial: true,
    },
    {
      sku: "CHAR-QUE-02",
      name: "Queso Amarillo Gouda Torondoy",
      costPriceUSD: 6.10,
      salePriceUSD: 9.80,
      stock: 35.0,
      unit: "kg",
      categoryName: "Quesos y Lácteos",
      imageUrl: "/img/charcuteria/queso-amarillo.jpg",
      isRawMaterial: true,
    },
    {
      sku: "CHAR-TOC-01",
      name: "Tocineta Ahumada Rebanada",
      costPriceUSD: 4.50,
      salePriceUSD: 7.20,
      stock: 25.0,
      unit: "kg",
      categoryName: "Embutidos y Jamones",
      imageUrl: "/img/charcuteria/tocineta.jpg",
      isRawMaterial: true,
    },
    {
      sku: "CHAR-SAL-01",
      name: "Salchichón / Salami Italiano Milano",
      costPriceUSD: 7.50,
      salePriceUSD: 12.00,
      stock: 20.0,
      unit: "kg",
      categoryName: "Embutidos y Jamones",
      imageUrl: "/img/charcuteria/salami.jpg",
      isRawMaterial: true,
    },
    {
      sku: "CHAR-MOR-01",
      name: "Mortadela Especial Tapara",
      costPriceUSD: 2.40,
      salePriceUSD: 4.20,
      stock: 50.0,
      unit: "kg",
      categoryName: "Embutidos y Jamones",
      imageUrl: "/img/charcuteria/mortadela.jpg",
      isRawMaterial: true,
    },
  ];

  // 9. Productos por Unidad (UND)
  const unitProducts = [
    {
      sku: "CHAR-SALCH-01",
      name: "Salchichas Tipo Viena (Paquete 12 unids)",
      costPriceUSD: 1.80,
      salePriceUSD: 2.90,
      stock: 80.0,
      unit: "UND",
      categoryName: "Embutidos y Jamones",
      imageUrl: "/img/charcuteria/salchichas.jpg",
      isRawMaterial: true,
    },
    {
      sku: "CHAR-ACEIT-01",
      name: "Frasco Aceitunas Rellenas con Pimentón (300g)",
      costPriceUSD: 1.90,
      salePriceUSD: 3.20,
      stock: 40.0,
      unit: "UND",
      categoryName: "Delicateses y Panadería",
      imageUrl: "/img/charcuteria/aceitunas.jpg",
      isRawMaterial: true,
    },
    {
      sku: "CHAR-PAN-01",
      name: "Pan Campesino Horneado Gallego",
      costPriceUSD: 0.80,
      salePriceUSD: 1.50,
      stock: 60.0,
      unit: "UND",
      categoryName: "Delicateses y Panadería",
      imageUrl: "/img/charcuteria/pan-campesino.jpg",
      isRawMaterial: true,
    },
  ];

  const allBaseProducts = [...weightProducts, ...unitProducts];
  const prodBySku = {};

  for (const item of allBaseProducts) {
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
          isRawMaterial: item.isRawMaterial,
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
          isRawMaterial: item.isRawMaterial,
        },
      });
    }
    prodBySku[item.sku] = p;
  }
  console.log("✔ 9 Productos base creados (6 por kg en balanza, 3 por unidades)");

  // 10. Combos y Tablas (Productos Compuestos / isComposite: true)
  const combosDef = [
    {
      sku: "COMBO-DESAYUNO",
      name: "Combo Desayuno Criollo Charcutero",
      costPriceUSD: 5.80,
      salePriceUSD: 9.90,
      stock: 30.0,
      unit: "UND",
      categoryName: "Combos y Tablas Gourmet",
      imageUrl: "/img/charcuteria/jamon-pierna.jpg",
      components: [
        { sku: "CHAR-JAM-01", qty: 0.50 }, // 500g de jamón
        { sku: "CHAR-QUE-01", qty: 0.50 }, // 500g de queso blanco
        { sku: "CHAR-PAN-01", qty: 2.00 }, // 2 panes campesinos
      ],
    },
    {
      sku: "COMBO-TABLA-GOURMET",
      name: "Tabla Mixta Gourmet / Picada Charcutera",
      costPriceUSD: 9.80,
      salePriceUSD: 18.50,
      stock: 20.0,
      unit: "UND",
      categoryName: "Combos y Tablas Gourmet",
      imageUrl: "/img/charcuteria/tabla-charcutera.jpg",
      components: [
        { sku: "CHAR-JAM-01", qty: 0.25 }, // 250g jamón
        { sku: "CHAR-QUE-02", qty: 0.25 }, // 250g queso amarillo gouda
        { sku: "CHAR-SAL-01", qty: 0.20 }, // 200g salami italiano
        { sku: "CHAR-ACEIT-01", qty: 1.00 }, // 1 frasco de aceitunas
        { sku: "CHAR-PAN-01", qty: 1.00 }, // 1 pan campesino
      ],
    },
    {
      sku: "COMBO-PARRILLERO",
      name: "Combo Tocineta & Salchichas Parrillero",
      costPriceUSD: 5.80,
      salePriceUSD: 10.50,
      stock: 25.0,
      unit: "UND",
      categoryName: "Combos y Tablas Gourmet",
      imageUrl: "/img/charcuteria/tocineta.jpg",
      components: [
        { sku: "CHAR-TOC-01", qty: 0.50 }, // 500g tocineta
        { sku: "CHAR-SALCH-01", qty: 2.00 }, // 2 paquetes salchichas viena
      ],
    },
  ];

  for (const combo of combosDef) {
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

    // Vincular componentes del combo (ProductComponent BOM)
    for (const comp of combo.components) {
      const rawProd = prodBySku[comp.sku];
      if (rawProd) {
        await prisma.productComponent.upsert({
          where: {
            productId_componentId: {
              productId: p.id,
              componentId: rawProd.id,
            },
          },
          update: {
            quantity: comp.qty,
          },
          create: {
            productId: p.id,
            componentId: rawProd.id,
            quantity: comp.qty,
          },
        });
      }
    }
  }
  console.log("✔ 3 Combos compuestos creados con su receta/componentes descontables");

  // 11. Orden histórica de fraccionamiento/despiece de prueba
  const existingOrder = await prisma.meatDeconstructionOrder.findFirst({
    where: { organizationId: org.id, orderNumber: "DSP-2026-CH01" },
  });

  if (!existingOrder) {
    await prisma.meatDeconstructionOrder.create({
      data: {
        orderNumber: "DSP-2026-CH01",
        organizationId: org.id,
        carcassId: carcassQueso.id,
        supplierId: supplier.id,
        incomingWeightKg: 20.00,
        unitCostUSD: 3.50,
        totalCostUSD: 70.00,
        yieldWeightKg: 19.40,
        wasteWeightKg: 0.60,
        wastePercentage: 3.00,
        notes: "Fraccionamiento de 2 hormas de queso paisa en cuñas y rebanado, merma por corteza",
        processedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        items: {
          create: [
            {
              productId: prodBySku["CHAR-QUE-01"].id,
              quantityKg: 19.40,
              unitCostUSD: 3.60,
              totalCostUSD: 69.84,
              isByProduct: false,
            },
          ],
        },
      },
    });
    console.log("✔ Orden histórica de fraccionamiento registrada (DSP-2026-CH01)");
  }

  console.log("\n==========================================");
  console.log("🎉 SEED DE CHARCUTERÍA COMPLETADO");
  console.log("==========================================");
  console.log("Usuario: charcuteria.demo@socius.com");
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
