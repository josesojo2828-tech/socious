const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos de Cafetería, Batidos & Smoothies...");

  const userEmail = "coffe.demo@socius.com";
  const rawPassword = "Password123!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Crear o actualizar usuario
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      password: passwordHash,
      firstName: "Lucía",
      lastName: "Barista",
      permitId: "USER",
    },
    create: {
      email: userEmail,
      password: passwordHash,
      firstName: "Lucía",
      lastName: "Barista",
      permitId: "USER",
    },
  });
  console.log("✔ Usuario creado/actualizado:", user.email);

  // 2. Crear o actualizar organización
  const orgSlug = "velvet-coffee-bar";
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Velvet Coffee & Smoothie Bar",
        slug: orgSlug,
        taxId: "J-412891045",
        phone: "+58 412 888-2233",
        address: "Av. Principal de Las Mercedes, Edif. Bloom, Local 2, Caracas",
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
        name: "Velvet Coffee & Smoothie Bar",
        isMeatProcessing: false,
        isWholesaler: false,
        status: "ACTIVE",
      },
    });
  }
  console.log("✔ Organización lista:", org.name);

  // 3. Membresía OWNER
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
  console.log("✔ Membresía OWNER asociada");

  // 4. Suscripción PREMIUM
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
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });
  console.log("✔ Suscripción PREMIUM activa asignada");

  // 5. Proveedores
  const suppliersDef = [
    {
      name: "Tostaduría Café Boconó C.A.",
      taxId: "J-309182390",
      phone: "+58 212 555-4422",
      contactName: "Ernesto Boscán",
      address: "Chacao, Calle Elice, Galpón 4",
    },
    {
      name: "Distribuidora Frutas y Lácteos El Prado",
      taxId: "J-401928311",
      phone: "+58 414 555-6677",
      contactName: "María Alejandra Rivas",
      address: "Mercado Mayorista de Coche, Andén B",
    },
  ];

  const suppMap = {};
  for (const s of suppliersDef) {
    let supp = await prisma.supplier.findFirst({
      where: { organizationId: org.id, name: s.name },
    });
    if (!supp) {
      supp = await prisma.supplier.create({
        data: {
          organizationId: org.id,
          name: s.name,
          taxId: s.taxId,
          phone: s.phone,
          contactName: s.contactName,
          address: s.address,
        },
      });
    }
    suppMap[s.name] = supp.id;
  }
  console.log("✔ 2 Proveedores registrados (Café y Frutas/Lácteos)");

  // 6. Categorías
  const categoriesDef = [
    { name: "Cafetería de Especialidad", slug: "cafeteria-especialidad", description: "Espresso, lattes, cappuccinos y cold brew de origen" },
    { name: "Batidos y Smoothies Naturales", slug: "batidos-y-smoothies", description: "Smoothies a base de fruta natural, yogur griego y bowls" },
    { name: "Bebidas Frías y Refrescantes", slug: "bebidas-frias", description: "Limonadas frozen, té matcha frío y sodas artesanales" },
    { name: "Bakery y Tostadas", slug: "bakery-y-tostadas", description: "Croissants horneados diariamente, galletas y tostadas sourdough" },
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
  console.log("✔ 4 Categorías de cafetería y bebidas creadas");

  // 7. Productos del Menú y Bebidas
  const productsDef = [
    {
      sku: "CAF-CAPPUCCINO",
      name: "Cappuccino Italiano Tradicional (8 oz)",
      description: "Doble shot de café espresso de especialidad con leche cremada y microespuma sedosa",
      costPriceUSD: 0.80,
      salePriceUSD: 2.50,
      stock: 120.0,
      unit: "UND",
      categoryName: "Cafetería de Especialidad",
      supplierName: "Tostaduría Café Boconó C.A.",
      imageUrl: "/img/cafe/cappuccino.jpg",
    },
    {
      sku: "CAF-ICED-CARAMEL",
      name: "Iced Caramel Macchiato con Leche de Avena (16 oz)",
      description: "Espresso sobre hielo, leche de avena barista y drizzle de salsa de caramelo artesanal",
      costPriceUSD: 1.20,
      salePriceUSD: 4.00,
      stock: 85.0,
      unit: "UND",
      categoryName: "Cafetería de Especialidad",
      supplierName: "Tostaduría Café Boconó C.A.",
      imageUrl: "/img/cafe/iced-caramel-latte.jpg",
    },
    {
      sku: "CAF-COLD-BREW",
      name: "Cold Brew Artesanal Macerado 18h (12 oz)",
      description: "Café de origen infusionado en frío durante 18 horas. Notas a chocolate amargo y cítricos suaves",
      costPriceUSD: 1.00,
      salePriceUSD: 3.50,
      stock: 60.0,
      unit: "UND",
      categoryName: "Cafetería de Especialidad",
      supplierName: "Tostaduría Café Boconó C.A.",
      imageUrl: "/img/cafe/cold-brew.jpg",
    },
    {
      sku: "SMOOTH-FRESA-YOG",
      name: "Smoothie Frutos Rojos y Fresa con Yogur Griego",
      description: "Fresas frescas, moras silvestres, yogur griego natural y un toque de miel orgánica",
      costPriceUSD: 1.50,
      salePriceUSD: 4.50,
      stock: 50.0,
      unit: "UND",
      categoryName: "Batidos y Smoothies Naturales",
      supplierName: "Distribuidora Frutas y Lácteos El Prado",
      imageUrl: "/img/cafe/smoothie-fresa.jpg",
    },
    {
      sku: "SMOOTH-VERDE-DETOX",
      name: "Batido Detox Verde (Manzana, Espinaca y Piña)",
      description: "Manzana verde, espinacas baby, piña dulce, pepino y toque energizante de jengibre fresco",
      costPriceUSD: 1.30,
      salePriceUSD: 4.00,
      stock: 45.0,
      unit: "UND",
      categoryName: "Batidos y Smoothies Naturales",
      supplierName: "Distribuidora Frutas y Lácteos El Prado",
      imageUrl: "/img/cafe/smoothie-verde.jpg",
    },
    {
      sku: "BEB-MERENG-OREO",
      name: "Merengada Especial de Galleta Oreo & Chocolate",
      description: "Helado artesanal de vainilla americana, sirope fudge de chocolate y galletas Oreo troceadas con crema chantilly",
      costPriceUSD: 1.80,
      salePriceUSD: 5.00,
      stock: 40.0,
      unit: "UND",
      categoryName: "Batidos y Smoothies Naturales",
      supplierName: "Distribuidora Frutas y Lácteos El Prado",
      imageUrl: "/img/cafe/merengada-oreo.jpg",
    },
    {
      sku: "BEB-LIMONADA-FROZEN",
      name: "Limonada Frozen con Hierbabuena y Jengibre",
      description: "Zumo natural de limones criollos recién exprimidos, frappé refrescante con hojas de hierbabuena fresca",
      costPriceUSD: 0.70,
      salePriceUSD: 3.00,
      stock: 90.0,
      unit: "UND",
      categoryName: "Bebidas Frías y Refrescantes",
      supplierName: "Distribuidora Frutas y Lácteos El Prado",
      imageUrl: "/img/cafe/limonada-hierbabuena.jpg",
    },
    {
      sku: "BAK-CROISSANT-FRAN",
      name: "Croissant Francés de Mantequilla Horneado Diario",
      description: "Masa hojaldrada tradicional con mantequilla pura 100%, corteza dorada crujiente y miga aireada",
      costPriceUSD: 0.90,
      salePriceUSD: 2.50,
      stock: 30.0,
      unit: "UND",
      categoryName: "Bakery y Tostadas",
      supplierName: "Distribuidora Frutas y Lácteos El Prado",
      imageUrl: "/img/cafe/croissant.jpg",
    },
    {
      sku: "BAK-COOKIE-CHOCOCHIP",
      name: "Galleta Artesanal Choco-Chips estilo New York",
      description: "Galleta horneada con centro suave y húmedo, chips de chocolate belga semi-amargo al 56%",
      costPriceUSD: 0.60,
      salePriceUSD: 2.00,
      stock: 55.0,
      unit: "UND",
      categoryName: "Bakery y Tostadas",
      supplierName: "Distribuidora Frutas y Lácteos El Prado",
      imageUrl: "/img/cafe/galleta-artesanal.jpg",
    },
    {
      sku: "BAK-TOSTADA-AVOCADO",
      name: "Tostada de Masa Madre con Aguacate y Semillas",
      description: "Rebanada gruesa de pan sourdough tostado, puré de aguacate Hass, aceite de oliva extra virgen y mix de semillas de sésamo y chía",
      costPriceUSD: 1.40,
      salePriceUSD: 4.50,
      stock: 35.0,
      unit: "UND",
      categoryName: "Bakery y Tostadas",
      supplierName: "Distribuidora Frutas y Lácteos El Prado",
      imageUrl: "/img/cafe/tostada-aguacate.jpg",
    },
  ];

  const prodBySku = {};
  for (const item of productsDef) {
    let p = await prisma.product.findFirst({
      where: { organizationId: org.id, sku: item.sku },
    });
    if (!p) {
      p = await prisma.product.create({
        data: {
          organizationId: org.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          costPriceUSD: item.costPriceUSD,
          salePriceUSD: item.salePriceUSD,
          stock: item.stock,
          unit: item.unit,
          imageUrl: item.imageUrl,
          categoryId: catMap[item.categoryName],
          supplierId: suppMap[item.supplierName],
          isPublic: true,
          status: "ACTIVE",
        },
      });
    } else {
      p = await prisma.product.update({
        where: { id: p.id },
        data: {
          name: item.name,
          description: item.description,
          costPriceUSD: item.costPriceUSD,
          salePriceUSD: item.salePriceUSD,
          stock: item.stock,
          unit: item.unit,
          imageUrl: item.imageUrl,
          categoryId: catMap[item.categoryName],
          supplierId: suppMap[item.supplierName],
          isPublic: true,
          status: "ACTIVE",
        },
      });
    }
    prodBySku[item.sku] = p;
  }
  console.log("✔ 10 Productos de cafetería, batidos y repostería registrados con fotos");

  // 8. Clientes en CRM
  const clientsDef = [
    {
      name: "Agencia Creativa Pulso Digital",
      taxId: "J-409918233",
      phone: "+58 412 998-1100",
      email: "contacto@pulsodigital.com",
      address: "Las Mercedes, Torre Sena, Piso 4",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 250.00,
      currentBalanceUSD: 36.00,
      notes: "Cuenta corporativa de café y desayunos semanales para reuniones de equipo.",
    },
    {
      name: "Valeria Santoro",
      taxId: "V-26.441.902",
      phone: "+58 414 332-8811",
      email: "valeria.santoro@gmail.com",
      address: "Chacao, Res. El Parque, Apto 5-A",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 100.00,
      currentBalanceUSD: 12.00,
      notes: "Clienta habitual todas las mañanas. Pide Iced Caramel Macchiato.",
    },
    {
      name: "Estudio de Yoga Ser & Armonía",
      taxId: "J-319920114",
      phone: "+58 424 551-2244",
      email: "info@yogaser.com",
      address: "Los Palos Grandes, 3ra Transversal",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 200.00,
      currentBalanceUSD: 0.00,
      notes: "Pedidos masivos de batidos verdes detox los sábados por la mañana.",
    },
  ];

  const clientMap = {};
  for (const c of clientsDef) {
    let client = await prisma.client.findFirst({
      where: { organizationId: org.id, name: c.name },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          organizationId: org.id,
          name: c.name,
          taxId: c.taxId,
          phone: c.phone,
          email: c.email,
          address: c.address,
          city: c.city,
          state: c.state,
          creditLimitUSD: c.creditLimitUSD,
          currentBalanceUSD: c.currentBalanceUSD,
          notes: c.notes,
          isActive: true,
        },
      });
    } else {
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          taxId: c.taxId,
          phone: c.phone,
          email: c.email,
          address: c.address,
          city: c.city,
          state: c.state,
          creditLimitUSD: c.creditLimitUSD,
          currentBalanceUSD: c.currentBalanceUSD,
          notes: c.notes,
        },
      });
    }
    clientMap[c.name] = client;
  }
  console.log("✔ 3 Clientes registrados en CRM");

  // 9. Ventas y Facturas
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const existingSales = await prisma.sale.findMany({
    where: {
      organizationId: org.id,
      saleNumber: { startsWith: "VTA-CAFE-" },
    },
    select: { id: true },
  });
  if (existingSales.length > 0) {
    await prisma.sale.deleteMany({
      where: { id: { in: existingSales.map(s => s.id) } },
    });
    console.log(`🧹 Limpiadas ${existingSales.length} ventas previas`);
  }

  const salesData = [
    // 1. Cuenta corporativa mensual a crédito (Agencia Pulso Digital): $36 pendiente
    {
      saleNumber: "VTA-CAFE-001",
      clientName: "Agencia Creativa Pulso Digital",
      issueDate: new Date(now - 3 * dayMs),
      dueDate: new Date(now + 12 * dayMs),
      paymentStatus: "UNPAID",
      items: [
        { prod: prodBySku["CAF-CAPPUCCINO"], qty: 4, price: 2.50 }, // 10
        { prod: prodBySku["BAK-CROISSANT-FRAN"], qty: 4, price: 2.50 }, // 10
        { prod: prodBySku["CAF-ICED-CARAMEL"], qty: 4, price: 4.00 }, // 16
      ],
      totalUSD: 36.00,
      payments: [],
      notes: "Combo de desayuno ejecutivo para reunión de agencia. Crédito quincenal.",
    },
    // 2. Clienta habitual: $17 total con abono de $5, resta $12
    {
      saleNumber: "VTA-CAFE-002",
      clientName: "Valeria Santoro",
      issueDate: new Date(now - 6 * dayMs),
      dueDate: new Date(now + 5 * dayMs),
      paymentStatus: "PARTIAL",
      items: [
        { prod: prodBySku["CAF-ICED-CARAMEL"], qty: 2, price: 4.00 }, // 8
        { prod: prodBySku["BAK-TOSTADA-AVOCADO"], qty: 2, price: 4.50 }, // 9
      ],
      totalUSD: 17.00,
      payments: [
        {
          amountUSD: 5.00,
          paymentMethod: "PAGO_MOVIL",
          paidAt: new Date(now - 6 * dayMs),
          notes: "Abono inicial",
        },
      ],
      notes: "Consumo en mesa. Saldo pendiente: $12.00",
    },
    // 3. Venta pagada al contado en barra (Estudio de Yoga): $32 pagada
    {
      saleNumber: "VTA-CAFE-003",
      clientName: "Estudio de Yoga Ser & Armonía",
      issueDate: new Date(now - 1 * dayMs),
      dueDate: new Date(now - 1 * dayMs),
      paymentStatus: "PAID",
      items: [
        { prod: prodBySku["SMOOTH-VERDE-DETOX"], qty: 8, price: 4.00 }, // 32
      ],
      totalUSD: 32.00,
      payments: [
        {
          amountUSD: 32.00,
          paymentMethod: "PAGO_MOVIL",
          paidAt: new Date(now - 1 * dayMs),
          notes: "Pagado por Pago Móvil en barra",
        },
      ],
      notes: "Pedido para clase matutina de yoga.",
    },
  ];

  for (const s of salesData) {
    const client = clientMap[s.clientName];
    await prisma.sale.create({
      data: {
        saleNumber: s.saleNumber,
        organizationId: org.id,
        clientId: client.id,
        issueDate: s.issueDate,
        dueDate: s.dueDate,
        rateBcv: 48.50,
        rateUsdt: 1.00,
        subtotalUSD: s.totalUSD,
        discountUSD: 0.00,
        taxUSD: 0.00,
        totalUSD: s.totalUSD,
        totalVES: s.totalUSD * 48.50,
        totalUSDT: s.totalUSD,
        status: "COMPLETED",
        paymentStatus: s.paymentStatus,
        notes: s.notes,
        createdById: user.id,
        items: {
          create: s.items.map(it => ({
            productId: it.prod.id,
            productName: it.prod.name,
            quantity: it.qty,
            unitPriceUSD: it.price,
            totalUSD: it.qty * it.price,
          })),
        },
        payments: {
          create: s.payments.map(p => ({
            amountUSD: p.amountUSD,
            amountVES: p.amountUSD * 48.50,
            amountOriginal: p.amountUSD,
            currency: "USD",
            paymentMethod: p.paymentMethod,
            rateBcv: 48.50,
            rateUsdt: 1.00,
            paidAt: p.paidAt,
            notes: p.notes,
            createdById: user.id,
          })),
        },
      },
    });
  }
  console.log("✔ 3 Ventas registradas con cuentas por cobrar y cobros");

  // 10. Pedidos de cafetería y delivery
  const existingOrders = await prisma.order.findMany({
    where: {
      organizationId: org.id,
      orderNumber: { startsWith: "PED-CAFE-" },
    },
    select: { id: true },
  });
  if (existingOrders.length > 0) {
    await prisma.order.deleteMany({
      where: { id: { in: existingOrders.map(o => o.id) } },
    });
    console.log(`🧹 Limpiados ${existingOrders.length} pedidos previos`);
  }

  const ordersData = [
    {
      orderNumber: "PED-CAFE-301",
      customerName: "Gabriela Mendoza",
      customerPhone: "+58 412 771-4433",
      customerEmail: "gaby.mendoza@gmail.com",
      customerAddress: "Urb. Las Mercedes, Calle Madrid, Coworking Spaces",
      channel: "STOREFRONT",
      fulfillmentType: "DELIVERY",
      coordination: "WHATSAPP",
      deliveryFeeUSD: 2.00,
      status: "PENDING",
      notes: "Pedido entrante por la web para el almuerzo. Confirmar método de pago.",
      items: [
        { prod: prodBySku["SMOOTH-FRESA-YOG"], qty: 2, price: 4.50 }, // 9
        { prod: prodBySku["BAK-TOSTADA-AVOCADO"], qty: 2, price: 4.50 }, // 9
      ],
      totalUSD: 20.00, // 18 + 2
    },
    {
      orderNumber: "PED-CAFE-302",
      customerName: "Nicolás Padrón",
      customerPhone: "+58 414 883-9911",
      customerEmail: "nicolas.padron@outlook.com",
      customerAddress: "Retiro en barra Velvet Coffee Bar",
      channel: "STOREFRONT",
      fulfillmentType: "PICKUP",
      coordination: "WHATSAPP",
      deliveryFeeUSD: 0.00,
      status: "PREPARING",
      notes: "Cliente pasa retirando en 10 minutos antes de entrar a la oficina.",
      items: [
        { prod: prodBySku["CAF-CAPPUCCINO"], qty: 1, price: 2.50 },
        { prod: prodBySku["BAK-CROISSANT-FRAN"], qty: 1, price: 2.50 },
        { prod: prodBySku["BAK-COOKIE-CHOCOCHIP"], qty: 1, price: 2.00 },
      ],
      totalUSD: 7.00,
    },
    {
      orderNumber: "PED-CAFE-303",
      customerName: "Mariángel Colmenárez",
      customerPhone: "+58 424 119-2288",
      customerEmail: "mariangel.c@gmail.com",
      customerAddress: "Los Palos Grandes, 1era Transversal, Edif. Torre Parque",
      channel: "MANUAL",
      fulfillmentType: "DELIVERY",
      coordination: "PHONE",
      deliveryFeeUSD: 2.50,
      shippedAt: new Date(now - 1 * dayMs),
      status: "DELIVERED",
      notes: "Entregado por motorizado express.",
      items: [
        { prod: prodBySku["BEB-MERENG-OREO"], qty: 2, price: 5.00 }, // 10
        { prod: prodBySku["BEB-LIMONADA-FROZEN"], qty: 1, price: 3.00 }, // 3
      ],
      totalUSD: 15.50, // 13 + 2.50
    },
  ];

  for (const o of ordersData) {
    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        organizationId: org.id,
        channel: o.channel,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        customerAddress: o.customerAddress,
        rateBcv: 48.50,
        rateUsdt: 1.00,
        totalUSD: o.totalUSD,
        totalVES: o.totalUSD * 48.50,
        totalUSDT: o.totalUSD,
        fulfillmentType: o.fulfillmentType,
        agencyId: null,
        coordination: o.coordination,
        deliveryFeeUSD: o.deliveryFeeUSD,
        shippedAt: o.shippedAt,
        status: o.status,
        notes: o.notes,
        createdById: user.id,
        items: {
          create: o.items.map(it => ({
            productId: it.prod.id,
            productName: it.prod.name,
            quantity: it.qty,
            priceUSD: it.price,
            totalUSD: it.qty * it.price,
          })),
        },
      },
    });
  }
  console.log("✔ 3 Pedidos de cafetería registrados (Pickup, Delivery, Entregado)");

  // 11. Caja Registradora para el POS
  let cashReg = await prisma.cashRegister.findFirst({
    where: { organizationId: org.id, name: "Caja Principal Barra Cafetería" },
  });
  if (!cashReg) {
    cashReg = await prisma.cashRegister.create({
      data: {
        name: "Caja Principal Barra Cafetería",
        status: "CLOSED",
        organization: { connect: { id: org.id } },
      },
    });
  }
  console.log("✔ Caja registradora lista:", cashReg.name);

  console.log("\n==========================================");
  console.log("🎉 SEED DE CAFETERÍA, BATIDOS & REPOSTERÍA COMPLETADO");
  console.log("==========================================");
  console.log("Usuario: coffe.demo@socius.com");
  console.log("Contraseña: Password123!");
  console.log("Organización:", org.name);
  console.log("Slug:", org.slug);
  console.log("Total productos en catálogo: 10 delicias y bebidas con foto");
  console.log("Categorías: Cafetería, Batidos/Smoothies, Bebidas Frías, Bakery");
  console.log("Cuentas por cobrar activas: $48.00 (Agencia de diseño y clienta habitual)");
  console.log("Pedidos: 3 pedidos (Pickup en barra, Delivery express)");
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
