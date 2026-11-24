const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos de carnicería de prueba...");

  const userEmail = "carniceria.demo@socius.com";
  const rawPassword = "Password123!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Crear o actualizar usuario
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      password: passwordHash,
      firstName: "Carlos",
      lastName: "Carnicero",
      permitId: "ADMIN",
    },
    create: {
      email: userEmail,
      password: passwordHash,
      firstName: "Carlos",
      lastName: "Carnicero",
      permitId: "ADMIN",
    },
  });
  console.log("✔ Usuario creado/actualizado:", user.email);

  // 2. Crear o actualizar organización
  const orgSlug = "el-buen-corte";
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Frigorífico & Carnicería El Buen Corte",
        slug: orgSlug,
        taxId: "J-409182736",
        phone: "+58 412 555-0199",
        address: "Av. Principal Los Carniceros, Local 12",
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
        name: "Frigorífico & Carnicería El Buen Corte",
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

  // 4. Suscripción activa a plan PREMIUM (Negocio)
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
    where: { organizationId: org.id, name: "Distribuidora Agropecuaria Santa Cruz" },
  });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        organizationId: org.id,
        name: "Distribuidora Agropecuaria Santa Cruz",
        taxId: "J-304918273",
        phone: "+58 414 555-8822",
        contactName: "Ing. Roberto Granados",
        address: "Carretera Nacional, Sector Granjas Porcinas",
      },
    });
  }
  console.log("✔ Proveedor de canal registrado:", supplier.name);

  // 6. Piezas / Canales Matrices (MeatCarcass)
  const carcassCochino = await prisma.meatCarcass.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "Cochino en canal",
      },
    },
    update: {
      defaultCostUSD: 2.85,
      lastCostUSD: 2.85,
      lastProcessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // hace 2 días
    },
    create: {
      organizationId: org.id,
      name: "Cochino en canal",
      code: "CANAL-COCH-01",
      defaultCostUSD: 2.85,
      lastCostUSD: 2.85,
      lastProcessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
  });

  await prisma.meatCarcass.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "Media res de novillo",
      },
    },
    update: {
      defaultCostUSD: 3.40,
      lastCostUSD: 3.40,
      lastProcessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    create: {
      organizationId: org.id,
      name: "Media res de novillo",
      code: "CANAL-RES-01",
      defaultCostUSD: 3.40,
      lastCostUSD: 3.40,
      lastProcessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  });

  await prisma.meatCarcass.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "Pollo entero beneficiado",
      },
    },
    update: {
      defaultCostUSD: 1.95,
    },
    create: {
      organizationId: org.id,
      name: "Pollo entero beneficiado",
      code: "CANAL-POL-01",
      defaultCostUSD: 1.95,
    },
  });
  console.log("✔ 3 Canales/Piezas matrices registradas (Cochino, Res, Pollo)");

  // 7. Catálogo de Cortes de Carne (Productos con unidad kg e imágenes)
  const cutsData = [
    {
      sku: "CER-CHUL-01",
      name: "Chuleta de Cerdo Fresca",
      costPriceUSD: 3.80,
      salePriceUSD: 5.80,
      stock: 45.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80",
    },
    {
      sku: "CER-COST-01",
      name: "Costilla de Cerdo BBQ",
      costPriceUSD: 4.20,
      salePriceUSD: 6.50,
      stock: 25.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    },
    {
      sku: "CER-PERN-01",
      name: "Pernil / Pierna de Cerdo",
      costPriceUSD: 3.40,
      salePriceUSD: 5.20,
      stock: 60.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&auto=format&fit=crop&q=80",
    },
    {
      sku: "RES-SOL-01",
      name: "Solomo de Cuerito / Bife de Res",
      costPriceUSD: 5.20,
      salePriceUSD: 7.90,
      stock: 35.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80",
    },
    {
      sku: "RES-MOL-01",
      name: "Carne Molida Especial de Res",
      costPriceUSD: 4.10,
      salePriceUSD: 5.90,
      stock: 30.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&auto=format&fit=crop&q=80",
    },
    {
      sku: "RES-COST-01",
      name: "Costilla de Res para Sancocho",
      costPriceUSD: 3.10,
      salePriceUSD: 4.80,
      stock: 40.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    },
    {
      sku: "SUB-TOC-01",
      name: "Panceta / Tocino de Cerdo",
      costPriceUSD: 2.20,
      salePriceUSD: 3.80,
      stock: 20.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&auto=format&fit=crop&q=80",
    },
    {
      sku: "SUB-HUES-01",
      name: "Hueso Rojo y Blanco para Caldo",
      costPriceUSD: 0.40,
      salePriceUSD: 1.20,
      stock: 50.0,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    },
  ];

  const createdProducts = [];
  for (const cut of cutsData) {
    let prod = await prisma.product.findFirst({
      where: { organizationId: org.id, sku: cut.sku },
    });
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: cut.sku,
          name: cut.name,
          costPriceUSD: cut.costPriceUSD,
          salePriceUSD: cut.salePriceUSD,
          stock: cut.stock,
          unit: cut.unit,
          imageUrl: cut.imageUrl,
          status: "ACTIVE",
        },
      });
    } else {
      prod = await prisma.product.update({
        where: { id: prod.id },
        data: {
          name: cut.name,
          costPriceUSD: cut.costPriceUSD,
          salePriceUSD: cut.salePriceUSD,
          stock: cut.stock,
          imageUrl: cut.imageUrl,
        },
      });
    }
    createdProducts.push(prod);
  }
  console.log(`✔ ${createdProducts.length} productos/cortes creados con imágenes y unidades en kg`);

  // 8. Crear una Orden de Despiece previa (para probar el historial y la memoria de última compra S5)
  const existingOrder = await prisma.meatDeconstructionOrder.findFirst({
    where: { organizationId: org.id, orderNumber: "DSP-00001" },
  });

  if (!existingOrder) {
    const chuleta = createdProducts.find((p) => p.sku === "CER-CHUL-01");
    const costilla = createdProducts.find((p) => p.sku === "CER-COST-01");
    const pernil = createdProducts.find((p) => p.sku === "CER-PERN-01");
    const tocino = createdProducts.find((p) => p.sku === "SUB-TOC-01");
    const hueso = createdProducts.find((p) => p.sku === "SUB-HUES-01");

    await prisma.meatDeconstructionOrder.create({
      data: {
        orderNumber: "DSP-00001",
        organization: { connect: { id: org.id } },
        carcass: { connect: { id: carcassCochino.id } },
        supplier: { connect: { id: supplier.id } },
        createdById: user.id,
        incomingWeightKg: 82.50,
        unitCostUSD: 2.85,
        totalCostUSD: 235.13,
        yieldWeightKg: 78.00,
        wasteWeightKg: 4.50,
        wastePercentage: 5.45,
        notes: "Primer lote de cochino en canal. Excelente rendimiento de grasa y pernil.",
        processedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        items: {
          create: [
            {
              product: { connect: { id: chuleta.id } },
              quantityKg: 20.0,
              unitCostUSD: 4.10,
              totalCostUSD: 82.00,
              isByProduct: false,
            },
            {
              product: { connect: { id: costilla.id } },
              quantityKg: 9.5,
              unitCostUSD: 4.60,
              totalCostUSD: 43.70,
              isByProduct: false,
            },
            {
              product: { connect: { id: pernil.id } },
              quantityKg: 24.0,
              unitCostUSD: 3.80,
              totalCostUSD: 91.20,
              isByProduct: false,
            },
            {
              product: { connect: { id: tocino.id } },
              quantityKg: 11.5,
              unitCostUSD: 2.50,
              totalCostUSD: 28.75,
              isByProduct: true,
            },
            {
              product: { connect: { id: hueso.id } },
              quantityKg: 13.0,
              unitCostUSD: 0.50,
              totalCostUSD: 6.50,
              isByProduct: true,
            },
          ],
        },
      },
    });
    console.log("✔ Orden histórica de prueba DSP-00001 creada (82.5 kg canal, 5.45% merma)");
  }

  console.log("\n==========================================");
  console.log("🎉 SEED DE CARNICERÍA COMPLETADO");
  console.log("==========================================");
  console.log(`Usuario: ${userEmail}`);
  console.log(`Contraseña: ${rawPassword}`);
  console.log(`Organización: ${org.name}`);
  console.log("==========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
