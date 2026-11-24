const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos de Tecnología, Gadgets & Smart Home...");

  const userEmail = "productos.demo@socius.com";
  const rawPassword = "Password123!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Crear o actualizar usuario
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      password: passwordHash,
      firstName: "Alex",
      lastName: "Tech",
      permitId: "USER",
    },
    create: {
      email: userEmail,
      password: passwordHash,
      firstName: "Alex",
      lastName: "Tech",
      permitId: "USER",
    },
  });
  console.log("✔ Usuario creado/actualizado:", user.email);

  // 2. Crear o actualizar organización
  const orgSlug = "novatech-gadgets";
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "NovaTech Gadgets & Smart Home",
        slug: orgSlug,
        taxId: "J-409128452",
        phone: "+58 424 555-4040",
        address: "C.C. City Market, Nivel Plaza, Local Tech-20, Sabana Grande, Caracas",
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
        name: "NovaTech Gadgets & Smart Home",
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
      name: "Shenzhen Electronics Import C.A.",
      taxId: "J-318492019",
      phone: "+58 212 555-8811",
      contactName: "Kevin Zhang",
      address: "Zona Franca La Guaira, Galpón 12",
    },
    {
      name: "Distribuidora Smart Solutions Vzla",
      taxId: "J-401928392",
      phone: "+58 412 555-3377",
      contactName: "Gabriel Fuentes",
      address: "Av. Libertador, Torre Maracaibo, Piso 6",
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
  console.log("✔ 2 Proveedores tecnológicos registrados");

  // 6. Categorías
  const categoriesDef = [
    { name: "Audio y Audífonos", slug: "audio-y-audifonos", description: "Audífonos TWS inalámbricos, diademas y cornetas bluetooth" },
    { name: "Smartwatches y Wearables", slug: "smartwatches-y-wearables", description: "Relojes inteligentes, pulseras fitness y bandas" },
    { name: "Seguridad y Smart Home", slug: "seguridad-y-smart-home", description: "Cámaras Wi-Fi 360°, cámaras solares y enchufes inteligentes" },
    { name: "Accesorios y Carga", slug: "accesorios-y-carga", description: "Power banks, cargadores magnéticos 3 en 1 y cables" },
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
  console.log("✔ 4 Categorías tecnológicas creadas");

  // 7. Productos Tecnológicos
  const productsDef = [
    {
      sku: "AUD-TWS-ANC",
      name: "Audífonos In-Ear Bluetooth Pro con Cancelación Activa de Ruido (ANC)",
      description: "Bluetooth 5.3, cancelación activa híbrida de 35dB, estuche de carga con hasta 30h de autonomía y resistencia IPX4",
      costPriceUSD: 18.00,
      salePriceUSD: 38.00,
      stock: 35.0,
      unit: "UND",
      categoryName: "Audio y Audífonos",
      supplierName: "Shenzhen Electronics Import C.A.",
      imageUrl: "/img/tech/audifonos-tws.jpg",
    },
    {
      sku: "AUD-HEAD-HIRES",
      name: "Audífonos Diadema Wireless Hi-Res Over-Ear",
      description: "Drivers de 40mm, almohadillas viscoelásticas, ecualización por app y 50 horas de reproducción continua",
      costPriceUSD: 25.00,
      salePriceUSD: 55.00,
      stock: 20.0,
      unit: "UND",
      categoryName: "Audio y Audífonos",
      supplierName: "Shenzhen Electronics Import C.A.",
      imageUrl: "/img/tech/audifonos-diadema.jpg",
    },
    {
      sku: "WATCH-ULTRA-AMOLED",
      name: "Smartwatch Ultra AMOLED Deportivo con GPS y Llamadas",
      description: "Pantalla AMOLED 2.02 pulgadas, caja de titanio reforzada, llamadas Bluetooth, monitoreo cardíaco y resistencia al agua 5ATM",
      costPriceUSD: 35.00,
      salePriceUSD: 75.00,
      stock: 25.0,
      unit: "UND",
      categoryName: "Smartwatches y Wearables",
      supplierName: "Distribuidora Smart Solutions Vzla",
      imageUrl: "/img/tech/smartwatch-ultra.jpg",
    },
    {
      sku: "BAND-FIT-TRACKER",
      name: "Smartband Fitness Tracker Ritmo Cardíaco y Oxígeno",
      description: "Pantalla táctil OLED a color, más de 30 modos deportivos, sensor SpO2, monitor de sueño y batería de 14 días",
      costPriceUSD: 14.00,
      salePriceUSD: 28.00,
      stock: 40.0,
      unit: "UND",
      categoryName: "Smartwatches y Wearables",
      supplierName: "Distribuidora Smart Solutions Vzla",
      imageUrl: "/img/tech/smartband-fitness.jpg",
    },
    {
      sku: "CAM-WIFI-360-INT",
      name: "Cámara de Seguridad Wi-Fi 360° Interior Visión Nocturna",
      description: "Resolución 2K Full HD, rotación motorizada pan/tilt 360°, audio bidireccional, detección de humanos y ranura micro-SD",
      costPriceUSD: 16.00,
      salePriceUSD: 35.00,
      stock: 30.0,
      unit: "UND",
      categoryName: "Seguridad y Smart Home",
      supplierName: "Distribuidora Smart Solutions Vzla",
      imageUrl: "/img/tech/camara-wifi-interior.jpg",
    },
    {
      sku: "CAM-SOLAR-EXT-PTZ",
      name: "Cámara de Seguridad Solar Exterior PTZ Doble Lente",
      description: "Panel solar integrado con batería recargable 12000mAh, conexión Wi-Fi, visión nocturna a color, sirena y protección IP66 para intemperie",
      costPriceUSD: 48.00,
      salePriceUSD: 98.00,
      stock: 15.0,
      unit: "UND",
      categoryName: "Seguridad y Smart Home",
      supplierName: "Distribuidora Smart Solutions Vzla",
      imageUrl: "/img/tech/camara-exterior.jpg",
    },
    {
      sku: "SPK-BT-PORTABLE",
      name: "Corneta Parlante Bluetooth Portátil Resistente al Agua IPX7",
      description: "Sonido estéreo 20W con bajos reforzados, iluminación LED RGB ambiental y correa de transporte para exteriores",
      costPriceUSD: 15.00,
      salePriceUSD: 32.00,
      stock: 28.0,
      unit: "UND",
      categoryName: "Audio y Audífonos",
      supplierName: "Shenzhen Electronics Import C.A.",
      imageUrl: "/img/tech/parlante-bluetooth.jpg",
    },
    {
      sku: "PWR-BANK-20K-PD",
      name: "Power Bank 20.000mAh Carga Rápida 22.5W Doble USB-C",
      description: "Batería de polímero de litio de alta densidad, display digital LED de porcentaje, compatible con Power Delivery y Quick Charge",
      costPriceUSD: 13.00,
      salePriceUSD: 28.00,
      stock: 45.0,
      unit: "UND",
      categoryName: "Accesorios y Carga",
      supplierName: "Shenzhen Electronics Import C.A.",
      imageUrl: "/img/tech/powerbank-20k.jpg",
    },
    {
      sku: "CHG-MAG-3IN1-STAND",
      name: "Estación de Carga Inalámbrica Magnética 3 en 1 Plegable",
      description: "Carga simultánea para smartphone (15W), smartwatch (5W) y audífonos (5W) con alineación magnética y diseño plegable de viaje",
      costPriceUSD: 17.00,
      salePriceUSD: 36.00,
      stock: 22.0,
      unit: "UND",
      categoryName: "Accesorios y Carga",
      supplierName: "Shenzhen Electronics Import C.A.",
      imageUrl: "/img/tech/cargador-inalambrico.jpg",
    },
    {
      sku: "SMART-PLUG-WIFI",
      name: "Enchufe Inteligente Wi-Fi Medidor de Consumo Smart Home",
      description: "Control remoto desde el celular por app Tuya / Smart Life, temporizador, monitoreo de energía en tiempo real y compatible con Alexa",
      costPriceUSD: 6.50,
      salePriceUSD: 15.00,
      stock: 50.0,
      unit: "UND",
      categoryName: "Seguridad y Smart Home",
      supplierName: "Distribuidora Smart Solutions Vzla",
      imageUrl: "/img/tech/gadget-smart.jpg",
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
  console.log("✔ 10 Productos de tecnología y smart home registrados con fotos");

  // 8. Clientes (CRM)
  const clientsDef = [
    {
      name: "Alejandro Colina",
      taxId: "V-23.771.849",
      phone: "+58 414 112-9900",
      email: "alejandro.colina@gmail.com",
      address: "Bello Campo, Res. Sans Souci, Apto 8-C",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 300.00,
      currentBalanceUSD: 45.00,
      notes: "Instalador de cámaras y equipos de seguridad para hogares.",
    },
    {
      name: "Stephanie Morales",
      taxId: "V-25.109.344",
      phone: "+58 412 334-7711",
      email: "steph.morales@hotmail.com",
      address: "Urb. Prebo, Calle 130, Valencia",
      city: "Valencia",
      state: "Carabobo",
      creditLimitUSD: 200.00,
      currentBalanceUSD: 38.00,
      notes: "Clienta habitual de audífonos y accesorios wearables.",
    },
    {
      name: "Grupo Residencial El Ávila",
      taxId: "J-401128394",
      phone: "+58 212 991-2244",
      email: "condominio.avila@gmail.com",
      address: "Los Chorros, Av. Santander, Edif. El Ávila",
      city: "Caracas",
      state: "Miranda",
      creditLimitUSD: 600.00,
      currentBalanceUSD: 98.00,
      notes: "Condominio residencial. Compras corporativas de cámaras de seguridad.",
    },
    {
      name: "David Benítez",
      taxId: "V-20.458.120",
      phone: "+58 424 990-1122",
      email: "david.b@gmail.com",
      address: "Lechería, Calle Arismendi, Conjunto Las Villas",
      city: "Lechería",
      state: "Anzoátegui",
      creditLimitUSD: 400.00,
      currentBalanceUSD: 0.00,
      notes: "Cliente recurrente con pagos al día por Zelle.",
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
  console.log("✔ 4 Clientes registrados en CRM");

  // 9. Ventas y Cuentas por Cobrar
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const existingSales = await prisma.sale.findMany({
    where: {
      organizationId: org.id,
      saleNumber: { startsWith: "VTA-TECH-" },
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
    // 1. Corriente: Smartwatch Ultra + Audífonos TWS ($113.00), abono de $68, pendiente $45
    {
      saleNumber: "VTA-TECH-001",
      clientName: "Alejandro Colina",
      issueDate: new Date(now - 4 * dayMs),
      dueDate: new Date(now + 10 * dayMs),
      paymentStatus: "PARTIAL",
      items: [
        { prod: prodBySku["WATCH-ULTRA-AMOLED"], qty: 1, price: 75.00 },
        { prod: prodBySku["AUD-TWS-ANC"], qty: 1, price: 38.00 },
      ],
      totalUSD: 113.00,
      payments: [
        {
          amountUSD: 68.00,
          paymentMethod: "PAGO_MOVIL",
          paidAt: new Date(now - 4 * dayMs),
          notes: "Abono inicial 60%",
        },
      ],
      notes: "Saldo restante para saldar el 15 de mes: $45.00",
    },
    // 2. Vencida 1-30 días: Audífonos Pro ANC ($38.00) pendiente
    {
      saleNumber: "VTA-TECH-002",
      clientName: "Stephanie Morales",
      issueDate: new Date(now - 22 * dayMs),
      dueDate: new Date(now - 8 * dayMs),
      paymentStatus: "UNPAID",
      items: [
        { prod: prodBySku["AUD-TWS-ANC"], qty: 1, price: 38.00 },
      ],
      totalUSD: 38.00,
      payments: [],
      notes: "Envío a Valencia. Pendiente de pago acordado.",
    },
    // 3. Vencida 31-60 días: Cámara Solar Exterior PTZ ($98.00) para condominio
    {
      saleNumber: "VTA-TECH-003",
      clientName: "Grupo Residencial El Ávila",
      issueDate: new Date(now - 50 * dayMs),
      dueDate: new Date(now - 35 * dayMs),
      paymentStatus: "UNPAID",
      items: [
        { prod: prodBySku["CAM-SOLAR-EXT-PTZ"], qty: 1, price: 98.00 },
      ],
      totalUSD: 98.00,
      payments: [],
      notes: "Factura a crédito para junta de condominio.",
    },
    // 4. Pagada en su totalidad: Smartwatch + Estación de carga 3en1 ($111.00)
    {
      saleNumber: "VTA-TECH-004",
      clientName: "David Benítez",
      issueDate: new Date(now - 15 * dayMs),
      dueDate: new Date(now - 15 * dayMs),
      paymentStatus: "PAID",
      items: [
        { prod: prodBySku["WATCH-ULTRA-AMOLED"], qty: 1, price: 75.00 },
        { prod: prodBySku["CHG-MAG-3IN1-STAND"], qty: 1, price: 36.00 },
      ],
      totalUSD: 111.00,
      payments: [
        {
          amountUSD: 111.00,
          paymentMethod: "ZELLE",
          paidAt: new Date(now - 15 * dayMs),
          notes: "Pago completo por Zelle",
        },
      ],
      notes: "Cliente verificado y pagado.",
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
  console.log("✔ 4 Ventas tecnológicas registradas con abonos y cuentas por cobrar");

  // 10. Pedidos (Orders)
  const existingOrders = await prisma.order.findMany({
    where: {
      organizationId: org.id,
      orderNumber: { startsWith: "PED-TECH-" },
    },
    select: { id: true },
  });
  if (existingOrders.length > 0) {
    await prisma.order.deleteMany({
      where: { id: { in: existingOrders.map(o => o.id) } },
    });
    console.log(`🧹 Limpiados ${existingOrders.length} pedidos previos`);
  }

  const mrwAgency = await prisma.shippingAgency.findFirst({ where: { key: "MRW" } });
  const zoomAgency = await prisma.shippingAgency.findFirst({ where: { key: "ZOOM" } });

  const ordersData = [
    {
      orderNumber: "PED-TECH-201",
      customerName: "Carlos Méndez",
      customerPhone: "+58 412 882-1922",
      customerEmail: "carlos.m@gmail.com",
      customerAddress: "Los Dos Caminos, Av. Sucre, Res. Ávila Real, Apto 12-A, Caracas",
      channel: "STOREFRONT",
      fulfillmentType: "DELIVERY",
      coordination: "WHATSAPP",
      deliveryFeeUSD: 3.00,
      status: "PENDING",
      notes: "Pedido web entrante. Combo de seguridad Wi-Fi 360 y enchufe inteligente.",
      items: [
        { prod: prodBySku["CAM-WIFI-360-INT"], qty: 2, price: 35.00 }, // 70
        { prod: prodBySku["SMART-PLUG-WIFI"], qty: 2, price: 15.00 }, // 30
      ],
      totalUSD: 103.00, // 100 + 3
    },
    {
      orderNumber: "PED-TECH-202",
      customerName: "Stephanie Morales",
      customerPhone: "+58 412 334-7711",
      customerEmail: "steph.morales@hotmail.com",
      customerAddress: "Agencia ZOOM Valencia El Viñedo, Edo. Carabobo",
      channel: "STOREFRONT",
      fulfillmentType: "SHIPPING",
      agencyId: zoomAgency ? zoomAgency.id : null,
      coordination: "WHATSAPP",
      deliveryFeeUSD: 6.00,
      status: "CONFIRMED",
      notes: "Pago verificado. Preparando empaque con burbuja para envío nacional.",
      items: [
        { prod: prodBySku["WATCH-ULTRA-AMOLED"], qty: 1, price: 75.00 },
        { prod: prodBySku["CHG-MAG-3IN1-STAND"], qty: 1, price: 36.00 },
      ],
      totalUSD: 117.00, // 111 + 6
    },
    {
      orderNumber: "PED-TECH-203",
      customerName: "Javier Rodríguez",
      customerPhone: "+58 414 551-9988",
      customerEmail: "javier.rodriguez@gmail.com",
      customerAddress: "Retiro en tienda C.C. City Market Sabana Grande",
      channel: "MANUAL",
      fulfillmentType: "PICKUP",
      coordination: "WHATSAPP",
      deliveryFeeUSD: 0.00,
      status: "PREPARING",
      notes: "Apartado en mostrador. Cliente retira en la tarde.",
      items: [
        { prod: prodBySku["AUD-HEAD-HIRES"], qty: 1, price: 55.00 },
        { prod: prodBySku["PWR-BANK-20K-PD"], qty: 1, price: 28.00 },
      ],
      totalUSD: 83.00,
    },
    {
      orderNumber: "PED-TECH-204",
      customerName: "David Benítez",
      customerPhone: "+58 424 990-1122",
      customerEmail: "david.b@gmail.com",
      customerAddress: "Agencia MRW Lechería Centro, Edo. Anzoátegui",
      channel: "STOREFRONT",
      fulfillmentType: "SHIPPING",
      agencyId: mrwAgency ? mrwAgency.id : null,
      coordination: "WHATSAPP",
      deliveryFeeUSD: 5.00,
      trackingNumber: "MRW-992014-ANZ",
      shippedAt: new Date(now - 2 * dayMs),
      status: "DELIVERED",
      notes: "Guía entregada y paquete recibido por el cliente.",
      items: [
        { prod: prodBySku["CAM-SOLAR-EXT-PTZ"], qty: 1, price: 98.00 },
        { prod: prodBySku["SPK-BT-PORTABLE"], qty: 1, price: 32.00 },
      ],
      totalUSD: 135.00, // 130 + 5
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
  console.log("✔ 4 Pedidos tecnológicos registrados en diferentes estados");

  // 11. Caja Registradora para POS
  let cashReg = await prisma.cashRegister.findFirst({
    where: { organizationId: org.id, name: "Caja Principal Tienda Tech" },
  });
  if (!cashReg) {
    cashReg = await prisma.cashRegister.create({
      data: {
        name: "Caja Principal Tienda Tech",
        status: "CLOSED",
        organization: { connect: { id: org.id } },
      },
    });
  }
  console.log("✔ Caja registradora lista:", cashReg.name);

  console.log("\n==========================================");
  console.log("🎉 SEED DE TECNOLOGÍA, GADGETS & SMART HOME COMPLETADO");
  console.log("==========================================");
  console.log("Usuario: productos.demo@socius.com");
  console.log("Contraseña: Password123!");
  console.log("Organización:", org.name);
  console.log("Slug:", org.slug);
  console.log("Total productos en catálogo: 10 dispositivos con foto");
  console.log("Categorías: Audio/Audífonos, Smartwatches, Cámaras/Smart Home, Carga");
  console.log("Cuentas por cobrar activas: $181.00 en 3 clientes");
  console.log("Pedidos: 4 pedidos (Delivery, Tienda, MRW, Zoom)");
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
