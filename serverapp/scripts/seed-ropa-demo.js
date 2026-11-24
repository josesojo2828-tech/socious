const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos de Tienda de Ropa / Emprendedor Boutique...");

  const userEmail = "ropa.demo@socius.com";
  const rawPassword = "Password123!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Crear o actualizar usuario
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      password: passwordHash,
      firstName: "Valeria",
      lastName: "Boutique",
      permitId: "USER",
    },
    create: {
      email: userEmail,
      password: passwordHash,
      firstName: "Valeria",
      lastName: "Boutique",
      permitId: "USER",
    },
  });
  console.log("✔ Usuario creado/actualizado:", user.email);

  // 2. Crear o actualizar organización
  const orgSlug = "aura-studio-boutique";
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Aura Studio & Concept Store",
        slug: orgSlug,
        taxId: "J-501839201",
        phone: "+58 412 770-9911",
        address: "C.C. San Ignacio, Nivel Jardín, Local J-14, Chacao, Caracas",
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
        name: "Aura Studio & Concept Store",
        isMeatProcessing: false,
        isWholesaler: false,
        status: "ACTIVE",
      },
    });
  }
  console.log("✔ Organización lista:", org.name);

  // 3. Membresía de OWNER
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
      name: "Confecciones & Textiles Gamarra C.A.",
      taxId: "J-401928374",
      phone: "+58 212 555-1234",
      contactName: "Mateo Silva",
      address: "Zona Industrial La Bandera, Calle 3",
    },
    {
      name: "Importadora Fashion Trend C.A.",
      taxId: "J-309182371",
      phone: "+58 412 555-9090",
      contactName: "Camila Duarte",
      address: "Boleíta Norte, Edif. Trend Plaza, Piso 2",
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
  console.log("✔ 2 Proveedores registrados");

  // 6. Categorías
  const categoriesDef = [
    { name: "Tops y Franelas", slug: "tops-y-franelas", description: "Franelas oversize, crop tops y camisas" },
    { name: "Pantalones y Jeans", slug: "pantalones-y-jeans", description: "Jeans baggy, cargo, lino y joggers" },
    { name: "Abrigos y Hoodies", slug: "abrigos-y-hoodies", description: "Hoodies heavyweight, suéteres y chaquetas" },
    { name: "Vestidos y Conjuntos", slug: "vestidos-y-conjuntos", description: "Vestidos casuales y sets de dos piezas" },
    { name: "Calzado y Accesorios", slug: "calzado-y-accesorios", description: "Sneakers, gorras, carteras y bolsos" },
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
  console.log("✔ 5 Categorías de moda creadas");

  // 7. Productos de Boutique / Ropa
  const productsDef = [
    {
      sku: "TOP-OVS-VINT",
      name: "Franela Oversize Streetwear Vintage",
      description: "100% Algodón peinado 240g, caída relajada unisex con estampado frontal",
      costPriceUSD: 12.00,
      salePriceUSD: 25.00,
      stock: 45.0,
      unit: "UND",
      categoryName: "Tops y Franelas",
      supplierName: "Confecciones & Textiles Gamarra C.A.",
      imageUrl: "/img/ropa/franela-oversize.jpg",
    },
    {
      sku: "PANT-CARGO-DENIM",
      name: "Pantalón Jean Cargo Baggy Denim",
      description: "Jean rígido 14oz, bolsillos utilitarios laterales y tiro medio",
      costPriceUSD: 22.00,
      salePriceUSD: 45.00,
      stock: 30.0,
      unit: "UND",
      categoryName: "Pantalones y Jeans",
      supplierName: "Importadora Fashion Trend C.A.",
      imageUrl: "/img/ropa/jean-cargo.jpg",
    },
    {
      sku: "HOOD-UNISEX-HVY",
      name: "Hoodie Heavyweight Algodón Unisex",
      description: "Sudadera con capucha felpa pesada 400g, bolsillo canguro y cordones gruesos",
      costPriceUSD: 28.00,
      salePriceUSD: 55.00,
      stock: 25.0,
      unit: "UND",
      categoryName: "Abrigos y Hoodies",
      supplierName: "Confecciones & Textiles Gamarra C.A.",
      imageUrl: "/img/ropa/hoodie-urbano.jpg",
    },
    {
      sku: "CAM-LINO-MAO",
      name: "Camisa Casual Lino Cuello Mao",
      description: "Tela lino transpirable, corte regular manga larga remangable",
      costPriceUSD: 18.00,
      salePriceUSD: 38.00,
      stock: 20.0,
      unit: "UND",
      categoryName: "Tops y Franelas",
      supplierName: "Importadora Fashion Trend C.A.",
      imageUrl: "/img/ropa/camisa-lino.jpg",
    },
    {
      sku: "VEST-FLORAL-MIDI",
      name: "Vestido Casual Estampado Floral Verano",
      description: "Vestido corte midi con abertura lateral y tirantes ajustables",
      costPriceUSD: 24.00,
      salePriceUSD: 50.00,
      stock: 18.0,
      unit: "UND",
      categoryName: "Vestidos y Conjuntos",
      supplierName: "Importadora Fashion Trend C.A.",
      imageUrl: "/img/ropa/vestido-floral.jpg",
    },
    {
      sku: "SET-BIKER-TOP",
      name: "Conjunto Deportivo Seamless Biker & Top",
      description: "Set licra acanalada moldeadora de alta compresión",
      costPriceUSD: 20.00,
      salePriceUSD: 45.00,
      stock: 22.0,
      unit: "UND",
      categoryName: "Vestidos y Conjuntos",
      supplierName: "Confecciones & Textiles Gamarra C.A.",
      imageUrl: "/img/ropa/conjunto-deportivo.jpg",
    },
    {
      sku: "ACC-GORRA-TRUCK",
      name: "Gorra Urbana Trucker Bordada",
      description: "Malla posterior transpirable con parche bordado frontal y ajuste snapback",
      costPriceUSD: 6.00,
      salePriceUSD: 15.00,
      stock: 50.0,
      unit: "UND",
      categoryName: "Calzado y Accesorios",
      supplierName: "Confecciones & Textiles Gamarra C.A.",
      imageUrl: "/img/ropa/gorra-urbana.jpg",
    },
    {
      sku: "CALZ-SNEAK-WHITE",
      name: "Sneakers Urbanos Plataforma Blancos",
      description: "Zapatillas deportivas casuales en piel sintética vegana y suela ergonómica",
      costPriceUSD: 28.00,
      salePriceUSD: 58.00,
      stock: 16.0,
      unit: "UND",
      categoryName: "Calzado y Accesorios",
      supplierName: "Importadora Fashion Trend C.A.",
      imageUrl: "/img/ropa/sneakers-blancos.jpg",
    },
    {
      sku: "ABR-CHAQ-DENIM",
      name: "Chaqueta Denim Clásica Oversize",
      description: "Chaqueta vaquera de lavado medio vintage con botones metálicos",
      costPriceUSD: 32.00,
      salePriceUSD: 65.00,
      stock: 15.0,
      unit: "UND",
      categoryName: "Abrigos y Hoodies",
      supplierName: "Importadora Fashion Trend C.A.",
      imageUrl: "/img/ropa/chaqueta-denim.jpg",
    },
    {
      sku: "ACC-TOTE-CANVAS",
      name: "Bolso Tote Bag Canvas de Algodón",
      description: "Bolso espacioso en lona de algodón natural con bolsillo interno",
      costPriceUSD: 9.00,
      salePriceUSD: 22.00,
      stock: 35.0,
      unit: "UND",
      categoryName: "Calzado y Accesorios",
      supplierName: "Confecciones & Textiles Gamarra C.A.",
      imageUrl: "/img/ropa/bolso-tote.jpg",
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
  console.log("✔ 10 Productos de ropa y accesorios registrados con imágenes");

  // 8. Clientes (CRM con cupo de crédito y saldos por cobrar)
  const clientsDef = [
    {
      name: "Mariana Castillo",
      taxId: "V-24.891.034",
      phone: "+58 412 889-1122",
      email: "mariana.castillo@gmail.com",
      address: "Chacao, Av. Francisco de Miranda, Edif. Parque Cristal",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 300.00,
      currentBalanceUSD: 50.00, // Deuda corriente
      notes: "Clienta frecuente y creadora de contenido. Compra conjuntos y vestidos.",
    },
    {
      name: "Carlos Eduardo Páez",
      taxId: "V-19.452.110",
      phone: "+58 414 772-3344",
      email: "carlos.paez@outlook.com",
      address: "Urb. El Viñedo, Calle 139, Valencia",
      city: "Valencia",
      state: "Carabobo",
      creditLimitUSD: 500.00,
      currentBalanceUSD: 160.00, // Deuda de 1 a 30 días
      notes: "Revendedor mayorista de piezas streetwear en Carabobo.",
    },
    {
      name: "Valeria Gómez",
      taxId: "V-26.115.478",
      phone: "+58 424 331-9988",
      email: "valeria.g@gmail.com",
      address: "Las Mercedes, Calle París, Qta. Los Tulipanes",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 400.00,
      currentBalanceUSD: 120.00, // Deuda de 31 a 60 días
      notes: "Clienta VIP. Paga usualmente en 2 partes.",
    },
    {
      name: "Andrés Bello",
      taxId: "V-18.720.903",
      phone: "+58 416 662-4411",
      email: "andres.bello@gmail.com",
      address: "Los Palos Grandes, 2da Avenida, Edif. Ávila",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 250.00,
      currentBalanceUSD: 130.00, // Deuda de más de 60 días
      notes: "Cliente personal. Debe liquidar saldo vencido antes de nuevos créditos.",
    },
    {
      name: "Andrea Colmenares",
      taxId: "V-27.443.901",
      phone: "+58 412 110-5566",
      email: "andrea.colme@gmail.com",
      address: "Colinas de Bello Monte, Av. Leonardo Da Vinci",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 350.00,
      currentBalanceUSD: 100.00, // Cuenta abierta sin vencimiento estricto
      notes: "Familiar / Cuenta abierta de confianza.",
    },
    {
      name: "Daniela Rivas",
      taxId: "V-25.334.812",
      phone: "+58 424 551-7722",
      email: "daniela.rivas@gmail.com",
      address: "Altamira Sur, Av. San Juan Bosco",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 200.00,
      currentBalanceUSD: 0.00, // Al día
      notes: "Excelente pagadora. Saldo al día.",
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
  console.log("✔ 6 Clientes registrados en el CRM con límites de crédito");

  // 9. Ventas a Crédito y Cuentas por Cobrar (Reporte de Antigüedad de Saldos / Aging)
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Limpiar ventas anteriores generadas por este seed para evitar duplicados en el reporte
  const existingSeedSales = await prisma.sale.findMany({
    where: {
      organizationId: org.id,
      saleNumber: { startsWith: "VTA-MODA-" },
    },
    select: { id: true },
  });
  if (existingSeedSales.length > 0) {
    await prisma.sale.deleteMany({
      where: { id: { in: existingSeedSales.map(s => s.id) } },
    });
    console.log(`🧹 Limpiadas ${existingSeedSales.length} ventas previas del demo`);
  }

  const salesData = [
    // 1. Corriente: dueDate en +10 días
    {
      saleNumber: "VTA-MODA-001",
      clientName: "Mariana Castillo",
      issueDate: new Date(now - 5 * dayMs),
      dueDate: new Date(now + 10 * dayMs),
      paymentStatus: "PARTIAL",
      items: [
        { prod: prodBySku["SET-BIKER-TOP"], qty: 1, price: 45.00 },
        { prod: prodBySku["ACC-GORRA-TRUCK"], qty: 1, price: 15.00 },
        { prod: prodBySku["TOP-OVS-VINT"], qty: 1, price: 25.00 },
      ],
      totalUSD: 85.00,
      payments: [
        {
          amountUSD: 35.00,
          paymentMethod: "PAGO_MOVIL",
          paidAt: new Date(now - 5 * dayMs),
          notes: "Abono inicial de 35$ al retirar",
        },
      ],
      notes: "Crédito quincenal acordado. Saldo pendiente: $50.00",
    },
    // 2. 1 a 30 días vencida: dueDate hace 12 días
    {
      saleNumber: "VTA-MODA-002",
      clientName: "Carlos Eduardo Páez",
      issueDate: new Date(now - 27 * dayMs),
      dueDate: new Date(now - 12 * dayMs),
      paymentStatus: "UNPAID",
      items: [
        { prod: prodBySku["TOP-OVS-VINT"], qty: 2, price: 25.00 }, // 50
        { prod: prodBySku["PANT-CARGO-DENIM"], qty: 2, price: 45.00 }, // 90
        { prod: prodBySku["ACC-TOTE-CANVAS"], qty: 1, price: 20.00 }, // 20
      ],
      totalUSD: 160.00,
      payments: [],
      notes: "Pedido al mayor para boutique aliada. Vencido hace 12 días.",
    },
    // 3. 31 a 60 días vencida: dueDate hace 42 días
    {
      saleNumber: "VTA-MODA-003",
      clientName: "Valeria Gómez",
      issueDate: new Date(now - 57 * dayMs),
      dueDate: new Date(now - 42 * dayMs),
      paymentStatus: "PARTIAL",
      items: [
        { prod: prodBySku["VEST-FLORAL-MIDI"], qty: 1, price: 50.00 },
        { prod: prodBySku["ABR-CHAQ-DENIM"], qty: 1, price: 65.00 },
        { prod: prodBySku["CALZ-SNEAK-WHITE"], qty: 1, price: 58.00 },
        { prod: prodBySku["ACC-TOTE-CANVAS"], qty: 1, price: 22.00 },
      ],
      totalUSD: 195.00,
      payments: [
        {
          amountUSD: 75.00,
          paymentMethod: "CASH_USD",
          paidAt: new Date(now - 57 * dayMs),
          notes: "Abono en efectivo entregado en showroom",
        },
      ],
      notes: "Outfit completo para evento. Saldo restante: $120.00",
    },
    // 4. Más de 60 días vencida: dueDate hace 75 días
    {
      saleNumber: "VTA-MODA-004",
      clientName: "Andrés Bello",
      issueDate: new Date(now - 90 * dayMs),
      dueDate: new Date(now - 75 * dayMs),
      paymentStatus: "UNPAID",
      items: [
        { prod: prodBySku["HOOD-UNISEX-HVY"], qty: 1, price: 55.00 },
        { prod: prodBySku["CALZ-SNEAK-WHITE"], qty: 1, price: 58.00 },
        { prod: prodBySku["ACC-GORRA-TRUCK"], qty: 1, price: 17.00 },
      ],
      totalUSD: 130.00,
      payments: [],
      notes: "Saldo con retraso severo (>60 días). Se envió recordatorio de cobro.",
    },
    // 5. Sin vencimiento fijado (Open Account)
    {
      saleNumber: "VTA-MODA-005",
      clientName: "Andrea Colmenares",
      issueDate: new Date(now - 15 * dayMs),
      dueDate: null,
      paymentStatus: "PARTIAL",
      items: [
        { prod: prodBySku["CAM-LINO-MAO"], qty: 1, price: 38.00 },
        { prod: prodBySku["PANT-CARGO-DENIM"], qty: 1, price: 45.00 },
        { prod: prodBySku["HOOD-UNISEX-HVY"], qty: 1, price: 55.00 },
        { prod: prodBySku["ACC-GORRA-TRUCK"], qty: 1, price: 7.00 },
      ],
      totalUSD: 145.00,
      payments: [
        {
          amountUSD: 45.00,
          paymentMethod: "ZELLE",
          paidAt: new Date(now - 14 * dayMs),
          notes: "Transferencia Zelle parcial",
        },
      ],
      notes: "Cuenta de confianza familiar. Saldo pendiente: $100.00",
    },
    // 6. Pagada en su totalidad (Histórico para métricas de cobranza)
    {
      saleNumber: "VTA-MODA-006",
      clientName: "Daniela Rivas",
      issueDate: new Date(now - 40 * dayMs),
      dueDate: new Date(now - 25 * dayMs),
      paymentStatus: "PAID",
      items: [
        { prod: prodBySku["VEST-FLORAL-MIDI"], qty: 1, price: 50.00 },
        { prod: prodBySku["ACC-GORRA-TRUCK"], qty: 2, price: 15.00 },
      ],
      totalUSD: 80.00,
      payments: [
        {
          amountUSD: 40.00,
          paymentMethod: "PAGO_MOVIL",
          paidAt: new Date(now - 40 * dayMs),
          notes: "Inicial 50%",
        },
        {
          amountUSD: 40.00,
          paymentMethod: "PAGO_MOVIL",
          paidAt: new Date(now - 26 * dayMs),
          notes: "Liquidación total",
        },
      ],
      notes: "Cobrada puntualmente.",
    },
  ];

  for (const s of salesData) {
    const client = clientMap[s.clientName];
    const sale = await prisma.sale.create({
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
  console.log("✔ 6 Ventas a crédito registradas con sus abonos y aging completo");

  // 10. Pedidos (Gestión de Pedidos / Storefront / WhatsApp / Envíos)
  const existingOrders = await prisma.order.findMany({
    where: {
      organizationId: org.id,
      orderNumber: { startsWith: "PED-MODA-" },
    },
    select: { id: true },
  });
  if (existingOrders.length > 0) {
    await prisma.order.deleteMany({
      where: { id: { in: existingOrders.map(o => o.id) } },
    });
    console.log(`🧹 Limpiados ${existingOrders.length} pedidos previos`);
  }

  // Obtener agencias
  const mrwAgency = await prisma.shippingAgency.findFirst({ where: { key: "MRW" } });
  const zoomAgency = await prisma.shippingAgency.findFirst({ where: { key: "ZOOM" } });

  const ordersData = [
    {
      orderNumber: "PED-MODA-101",
      customerName: "Sofía Hernández",
      customerPhone: "+58 412 998-4433",
      customerEmail: "sofia.hdez@gmail.com",
      customerAddress: "Urb. Santa Mónica, Res. Los Samanes, Apto 4-B, Caracas",
      channel: "STOREFRONT",
      fulfillmentType: "DELIVERY",
      coordination: "WHATSAPP",
      deliveryFeeUSD: 3.00,
      status: "PENDING",
      notes: "Pedido nuevo entrante desde la tienda online. Confirmar método de pago.",
      items: [
        { prod: prodBySku["TOP-OVS-VINT"], qty: 1, price: 25.00 },
        { prod: prodBySku["ACC-GORRA-TRUCK"], qty: 1, price: 15.00 },
      ],
      totalUSD: 43.00, // 25 + 15 + 3
    },
    {
      orderNumber: "PED-MODA-102",
      customerName: "Carlos Eduardo Páez",
      customerPhone: "+58 414 772-3344",
      customerEmail: "carlos.paez@outlook.com",
      customerAddress: "Agencia MRW Valencia Centro (Cod. 0102), Edo. Carabobo",
      channel: "MANUAL",
      fulfillmentType: "SHIPPING",
      agencyId: mrwAgency ? mrwAgency.id : null,
      coordination: "WHATSAPP",
      deliveryFeeUSD: 5.00,
      status: "CONFIRMED",
      notes: "Pago verificado. Listo para embalar y llevar a agencia MRW.",
      items: [
        { prod: prodBySku["PANT-CARGO-DENIM"], qty: 2, price: 45.00 },
        { prod: prodBySku["HOOD-UNISEX-HVY"], qty: 1, price: 55.00 },
      ],
      totalUSD: 150.00, // 90 + 55 + 5
    },
    {
      orderNumber: "PED-MODA-103",
      customerName: "Valeria Gómez",
      customerPhone: "+58 424 331-9988",
      customerEmail: "valeria.g@gmail.com",
      customerAddress: "Retiro en Showroom C.C. San Ignacio",
      channel: "STOREFRONT",
      fulfillmentType: "PICKUP",
      coordination: "WHATSAPP",
      deliveryFeeUSD: 0.00,
      status: "PREPARING",
      notes: "Separado en perchero de entregas. Retira hoy a las 4:00 PM.",
      items: [
        { prod: prodBySku["VEST-FLORAL-MIDI"], qty: 1, price: 50.00 },
        { prod: prodBySku["ACC-TOTE-CANVAS"], qty: 1, price: 22.00 },
      ],
      totalUSD: 72.00,
    },
    {
      orderNumber: "PED-MODA-104",
      customerName: "Roberto Méndez",
      customerPhone: "+58 416 112-8877",
      customerEmail: "roberto.m@gmail.com",
      customerAddress: "Agencia ZOOM Barquisimeto Este, Av. Lara, Edo. Lara",
      channel: "STOREFRONT",
      fulfillmentType: "SHIPPING",
      agencyId: zoomAgency ? zoomAgency.id : null,
      coordination: "WHATSAPP",
      deliveryFeeUSD: 6.00,
      trackingNumber: "ZM-8839104-VE",
      shippedAt: new Date(now - 3 * dayMs),
      status: "DELIVERED",
      notes: "Guía entregada al cliente con éxito.",
      items: [
        { prod: prodBySku["ABR-CHAQ-DENIM"], qty: 1, price: 65.00 },
        { prod: prodBySku["CALZ-SNEAK-WHITE"], qty: 1, price: 58.00 },
      ],
      totalUSD: 129.00, // 65 + 58 + 6
    },
    {
      orderNumber: "PED-MODA-105",
      customerName: "Mariana Castillo",
      customerPhone: "+58 412 889-1122",
      customerEmail: "mariana.castillo@gmail.com",
      customerAddress: "Chacao, Av. Francisco de Miranda, Edif. Parque Cristal",
      channel: "MANUAL",
      fulfillmentType: "DELIVERY",
      coordination: "PHONE",
      deliveryFeeUSD: 4.00,
      shippedAt: new Date(now - 1 * dayMs),
      status: "DELIVERED",
      notes: "Entregado por motorizado.",
      items: [
        { prod: prodBySku["SET-BIKER-TOP"], qty: 1, price: 45.00 },
      ],
      totalUSD: 49.00,
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
        agencyId: o.agencyId,
        coordination: o.coordination,
        deliveryFeeUSD: o.deliveryFeeUSD,
        trackingNumber: o.trackingNumber,
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
  console.log("✔ 5 Pedidos registrados en diferentes estados (PENDING, CONFIRMED, PREPARING, DELIVERED)");

  // 11. Caja Registradora para POS
  let cashReg = await prisma.cashRegister.findFirst({
    where: { organizationId: org.id, name: "Caja Principal Showroom" },
  });
  if (!cashReg) {
    cashReg = await prisma.cashRegister.create({
      data: {
        organizationId: org.id,
        name: "Caja Principal Showroom",
        currency: "USD",
        isActive: true,
      },
    });
  }
  console.log("✔ Caja registradora lista:", cashReg.name);

  console.log("\n==========================================");
  console.log("🎉 SEED DE TIENDA DE ROPA / EMPRENDEDOR COMPLETADO");
  console.log("==========================================");
  console.log("Usuario: ropa.demo@socius.com");
  console.log("Contraseña: Password123!");
  console.log("Organización:", org.name);
  console.log("Slug:", org.slug);
  console.log("Total cuentas por cobrar registradas: $560.00 en 5 clientes");
  console.log("Total pedidos registrados: 5 pedidos (Pickup, Delivery, Envíos MRW/Zoom)");
  console.log("Total productos de moda en catálogo: 10 prendas con foto");
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
