import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// =============================================================================
// CONFIGURACIÓN
// =============================================================================
const DEMO_EMAIL = "demo@nutringest.com";
const DEMO_PASSWORD = "Demo123!";

// =============================================================================
// HELPERS
// =============================================================================
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function futureDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function shareToken(): string {
  return crypto.randomUUID().slice(0, 12);
}

async function safeFoodId(namePart: string, fallback?: string): Promise<string> {
  const food = await prisma.foodItem.findFirst({
    where: { name: { contains: namePart, mode: "insensitive" } },
    select: { id: true, name: true, calories: true, proteins: true, carbohydrates: true, fats: true },
  });
  if (food) return food.id;
  if (fallback) {
    const fb = await prisma.foodItem.findFirst({
      where: { name: { contains: fallback, mode: "insensitive" } },
      select: { id: true },
    });
    if (fb) return fb.id;
  }
  const anyFood = await prisma.foodItem.findFirst({ select: { id: true } });
  if (anyFood) return anyFood.id;
  throw new Error(`No food items found in database. Run npm run seed first.`);
}

async function safeExchangeListId(namePart: string): Promise<string> {
  const el = await prisma.foodExchangeList.findFirst({
    where: { name: { contains: namePart, mode: "insensitive" } },
    select: { id: true },
  });
  if (el) return el.id;
  const anyEl = await prisma.foodExchangeList.findFirst({ select: { id: true } });
  if (anyEl) return anyEl.id;
  throw new Error(`No FoodExchangeList entries found. Run npm run seed:exchange first.`);
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("=".repeat(60));
  console.log("  🚀 SEED DE CUENTA DEMO PARA MARKETING");
  console.log("=".repeat(60));

  // ---- PASO 0: Validación de dependencias ----
  console.log("\n🔍 Verificando dependencias...");
  const foodCount = await prisma.foodItem.count();
  if (foodCount === 0) throw new Error("❌ No hay alimentos en la BD. Ejecutá 'npm run seed' primero.");
  console.log(`   ✅ ${foodCount} alimentos disponibles`);

  const exchangeCount = await prisma.foodExchangeList.count();
  if (exchangeCount === 0) throw new Error("❌ No hay listas de intercambio maestras en la BD. Ejecutá 'npm run seed:exchange' primero.");
  console.log(`   ✅ ${exchangeCount} listas de intercambio maestras disponibles`);

  // ---- PASO 1: Permisos ----
  console.log("\n📋 Asegurando permisos...");
  const userPermit = await prisma.permit.upsert({
    where: { id: "USER" },
    create: {
      id: "USER",
      name: "USER",
      description: "User / Nutritionist Permit",
      list: [
        "MY_CURRENT_ACTION_CREATED", "MY_CURRENT_ACTION_UPDATE",
        "MY_CURRENT_ACTION_LIST", "MY_CURRENT_ACTION_UNIQUE",
        "PATIENT_CREATED", "PATIENT_UPDATE", "PATIENT_LIST", "PATIENT_UNIQUE",
        "FOOD_CREATED", "FOOD_LIST", "FOOD_UNIQUE",
        "MENU_CREATED", "MENU_UPDATE", "MENU_LIST", "MENU_UNIQUE",
        "EXCHANGE_LIST_CREATED", "EXCHANGE_LIST_LIST", "EXCHANGE_LIST_UNIQUE",
        "DIET_CREATED", "DIET_UPDATE", "DIET_LIST", "DIET_UNIQUE",
      ],
    },
    update: {},
  });
  const patientPermit = await prisma.permit.upsert({
    where: { id: "PATIENT" },
    create: {
      id: "PATIENT",
      name: "PATIENT",
      description: "Patient Permit",
      list: [
        "MY_CURRENT_ACTION_CREATED", "MY_CURRENT_ACTION_UPDATE",
        "MY_CURRENT_ACTION_LIST", "MY_CURRENT_ACTION_UNIQUE",
        "DIET_LIST", "DIET_UNIQUE", "MENU_LIST", "MENU_UNIQUE",
        "EXCHANGE_LIST_LIST", "EXCHANGE_LIST_UNIQUE",
      ],
    },
    update: {},
  });

  // ---- PASO 2: Plan de suscripción ----
  console.log("📋 Verificando plan de suscripción...");
  let plan = await prisma.subscriptionPlan.findFirst({ where: { name: "Premium" } });
  if (!plan) plan = await prisma.subscriptionPlan.findFirst();
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: {
        id: "Premium",
        name: "Premium",
        description: "Plan Profesional - Acceso completo",
        price: 11.99,
        currency: "USD",
        selected: true,
        featured: true,
        badge: "POPULAR",
        content: [],
      },
    });
  }

  // ---- PASO 3: Usuario Demo (Nutricionista) ----
  console.log("👤 Creando usuario demo...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      username: "demo",
      password: passwordHash,
      firstName: "Nutringest",
      lastName: "Demo",
      fullName: "Nutringest Demo",
      permitId: userPermit.id,
      status: "ACTIVE",
    },
    update: { password: passwordHash, status: "ACTIVE" },
  });

  const demoNutri = await prisma.nutritionist.upsert({
    where: { userId: demoUser.id },
    create: {
      userId: demoUser.id,
      licenseCode: "DEMO-MKT-001",
      specialty: "Nutrición Clínica, Deportiva y Marketing",
    },
    update: {},
  });

  // Wallet
  await prisma.userWallet.upsert({
    where: { userId: demoUser.id },
    create: { userId: demoUser.id, balance: 49.99, currency: "USD" },
    update: {},
  });

  // Subscription
  await prisma.subscription.upsert({
    where: { id: "sub-demo-marketing" },
    create: {
      id: "sub-demo-marketing",
      userId: demoUser.id,
      planId: plan.id,
      status: "ACTIVE",
      autoRenew: true,
      startDate: monthsAgo(6),
    },
    update: { status: "ACTIVE" },
  });

  // Método de pago para el demo user
  const pm = await prisma.paymentMethod.findFirst({ where: { code: "PAGOMOVIL" } });
  if (pm) {
    await prisma.userPaymentMethod.upsert({
      where: { id: "demo-pm-pagomovil" },
      create: {
        id: "demo-pm-pagomovil",
        userId: demoUser.id,
        paymentMethodId: pm.id,
        details: { phone: "0412-1234567", cedula: "V-12345678", banco: "Banco de Venezuela" },
        isDefault: true,
        active: true,
      },
      update: {},
    });
    console.log("   ✅ Método de pago PagoMóvil asignado");
  } else {
    console.log("   ⚠️ No se encontró PagoMóvil, buscando otro método de pago...");
    const anyPm = await prisma.paymentMethod.findFirst({ where: { active: true } });
    if (anyPm) {
      await prisma.userPaymentMethod.upsert({
        where: { id: "demo-pm-fallback" },
        create: {
          id: "demo-pm-fallback",
          userId: demoUser.id,
          paymentMethodId: anyPm.id,
          details: { email: "demo@nutringest.com" },
          isDefault: true,
          active: true,
        },
        update: {},
      });
      console.log(`   ✅ Método de pago ${anyPm.name} asignado como fallback`);
    }
  }

  // ---- PASO 4: Menús Reutilizables ----
  console.log("🥗 Creando menús demo...");

  const menuDefs = [
    {
      name: "Desayuno Fitness - Avena & Frutas",
      description: "Desayuno balanceado ideal para comenzar el día con energía. Avena con leche descremada, cambur y toque de canela.",
      category: "BREAKFAST" as const,
      tags: "fitness,avena,frutas",
      items: [
        { foodName: "Avena", qty: 40, unit: "g" },
        { foodName: "Leche descremada", qty: 200, unit: "ml" },
        { foodName: "Cambur", qty: 1, unit: "unidad" },
        { foodName: "Canela", qty: 2, unit: "g" },
      ],
    },
    {
      name: "Desayuno Proteico - Huevos & Aguacate",
      description: "Desayuno alto en proteínas y grasas saludables. Huevos revueltos con aguacate, tomate y pan integral tostado.",
      category: "BREAKFAST" as const,
      tags: "proteico,huevos,lowcarb",
      items: [
        { foodName: "Huevo", qty: 3, unit: "unidad" },
        { foodName: "Aguacate", qty: 50, unit: "g" },
        { foodName: "Pan integral", qty: 2, unit: "rebanadas" },
        { foodName: "Tomate", qty: 50, unit: "g" },
      ],
    },
    {
      name: "Desayuno Tradicional - Arepa & Queso",
      description: "Desayuno criollo clásico: arepa asada con queso blanco, mantequilla y un vaso de leche entera.",
      category: "BREAKFAST" as const,
      tags: "tradicional,arepa",
      items: [
        { foodName: "Arepa", qty: 1, unit: "unidad" },
        { foodName: "Queso blanco", qty: 30, unit: "g", fallback: "Queso" },
        { foodName: "Mantequilla", qty: 10, unit: "g" },
        { foodName: "Leche entera", qty: 240, unit: "ml" },
      ],
    },
    {
      name: "Desayuno Frutal - Yogurt & Granola",
      description: "Desayuno fresco y ligero con yogurt natural, fresas frescas, granola crujiente y un toque de miel.",
      category: "BREAKFAST" as const,
      tags: "frutal,yogurt,granola",
      items: [
        { foodName: "Yogurt natural", qty: 200, unit: "g", fallback: "Yogurt" },
        { foodName: "Fresa", qty: 100, unit: "g" },
        { foodName: "Granola", qty: 30, unit: "g", fallback: "Avena" },
        { foodName: "Miel", qty: 15, unit: "g" },
      ],
    },
    {
      name: "Almuerzo Clásico - Pollo & Arroz",
      description: "Almuerzo completo y balanceado: pechuga de pollo a la plancha, arroz blanco y ensalada fresca aliñada con aceite de oliva.",
      category: "LUNCH" as const,
      tags: "clasico,pollo,arroz",
      items: [
        { foodName: "Pollo", qty: 150, unit: "g" },
        { foodName: "Arroz Blanco", qty: 150, unit: "g" },
        { foodName: "Ensalada", qty: 100, unit: "g", fallback: "Lechuga" },
        { foodName: "Aceite de oliva", qty: 10, unit: "ml" },
      ],
    },
    {
      name: "Almuerzo de Carnes - Carne & Vegetales",
      description: "Almuerzo alto en proteínas con carne de res, arroz integral y vegetales salteados (brócoli y zanahoria).",
      category: "LUNCH" as const,
      tags: "carne,proteinas,vegetales",
      items: [
        { foodName: "Carne de res", qty: 150, unit: "g", fallback: "Carne" },
        { foodName: "Arroz Integral", qty: 120, unit: "g" },
        { foodName: "Brócoli", qty: 100, unit: "g", fallback: "Vegetales" },
        { foodName: "Zanahoria", qty: 50, unit: "g" },
      ],
    },
    {
      name: "Almuerzo de Pescado - Atún & Ensalada",
      description: "Almuerzo ligero y nutritivo con atún en hojuelas, pasta, lechuga fresca y aguacate.",
      category: "LUNCH" as const,
      tags: "pescado,atun,marino",
      items: [
        { foodName: "Atún", qty: 120, unit: "g" },
        { foodName: "Pasta", qty: 100, unit: "g", fallback: "Arroz" },
        { foodName: "Lechuga", qty: 80, unit: "g" },
        { foodName: "Aguacate", qty: 50, unit: "g" },
      ],
    },
    {
      name: "Almuerzo Vegetariano - Lentejas & Arroz",
      description: "Almuerzo plant-based con lentejas guisadas, arroz blanco, auyama asada y cebolla salteada.",
      category: "LUNCH" as const,
      tags: "vegetariano,lentejas,legumbres",
      items: [
        { foodName: "Lentejas", qty: 100, unit: "g" },
        { foodName: "Arroz Blanco", qty: 100, unit: "g" },
        { foodName: "Auyama", qty: 80, unit: "g" },
        { foodName: "Cebolla", qty: 30, unit: "g" },
      ],
    },
    {
      name: "Cena Ligera - Crema de Calabacín",
      description: "Cena reconfortante y baja en calorías: crema de auyama con trocitos de pollo desmenuzado y un toque de aceite de oliva.",
      category: "DINNER" as const,
      tags: "ligera,crema,vegetales",
      items: [
        { foodName: "Auyama", qty: 150, unit: "g" },
        { foodName: "Pollo", qty: 100, unit: "g" },
        { foodName: "Cebolla", qty: 20, unit: "g" },
        { foodName: "Aceite de oliva", qty: 5, unit: "ml" },
      ],
    },
    {
      name: "Cena Proteica - Tortilla & Ensalada",
      description: "Cena alta en proteínas: tortilla de huevos con espinaca, tomate fresco y una rebanada de pan integral.",
      category: "DINNER" as const,
      tags: "proteica,tortilla,ensalada",
      items: [
        { foodName: "Huevo", qty: 3, unit: "unidad" },
        { foodName: "Espinaca", qty: 60, unit: "g", fallback: "Lechuga" },
        { foodName: "Tomate", qty: 50, unit: "g" },
        { foodName: "Pan integral", qty: 1, unit: "rebanada" },
      ],
    },
    {
      name: "Cena Rápida - Sandwich Integral",
      description: "Cena práctica y nutritiva: sandwich de pan integral con pollo, lechuga fresca y un yogurt natural de acompañante.",
      category: "DINNER" as const,
      tags: "rapido,sandwich",
      items: [
        { foodName: "Pan integral", qty: 2, unit: "rebanadas" },
        { foodName: "Pollo", qty: 80, unit: "g" },
        { foodName: "Lechuga", qty: 30, unit: "g" },
        { foodName: "Yogurt natural", qty: 150, unit: "g", fallback: "Yogurt" },
      ],
    },
    {
      name: "Merienda Frutal - Frutas & Yogurt",
      description: "Merienda fresca y rápida: manzana fresca acompañada de yogurt natural. Ideal para media mañana o media tarde.",
      category: "SNACK" as const,
      tags: "frutas,yogurt,merienda",
      items: [
        { foodName: "Manzana", qty: 1, unit: "unidad" },
        { foodName: "Yogurt natural", qty: 150, unit: "g", fallback: "Yogurt" },
      ],
    },
    {
      name: "Merienda Proteica - Batido",
      description: "Batido proteico ideal para después del entrenamiento: leche descremada con cambur para recuperación muscular.",
      category: "SNACK" as const,
      tags: "batido,proteina",
      items: [
        { foodName: "Leche descremada", qty: 250, unit: "ml" },
        { foodName: "Cambur", qty: 1, unit: "unidad", fallback: "Fruta" },
      ],
    },
  ];

  const createdMenus: Array<{ id: string; name: string; category: string }> = [];

  for (const def of menuDefs) {
    const menuId = `demo-menu-${slugify(def.name)}`;
    const existing = await prisma.menu.findUnique({ where: { id: menuId } });
    if (existing) {
      createdMenus.push({ id: existing.id, name: existing.name, category: existing.category ?? "OTHER" });
      continue;
    }

    const resolvedItems: Array<{ foodId: string; qty: number; unit: string }> = [];
    for (const item of def.items) {
      const fid = await safeFoodId(item.foodName, item.fallback);
      resolvedItems.push({ foodId: fid, qty: item.qty, unit: item.unit });
    }

    const menu = await prisma.menu.create({
      data: {
        id: menuId,
        nutritionistId: demoNutri.id,
        name: def.name,
        description: (def as any).description ?? null,
        category: def.category,
        tags: def.tags,
        items: {
          create: resolvedItems.map((ri) => ({
            foodId: ri.foodId,
            quantity: ri.qty,
            unit: ri.unit,
          })),
        },
      },
    });
    createdMenus.push({ id: menu.id, name: menu.name, category: menu.category ?? "OTHER" });
    console.log(`   ✅ Menú creado: ${def.name}`);
  }

  // ---- PASO 5: Listas de Intercambio ----
  console.log("\n📋 Creando listas de intercambio demo...");

  const exchangeListDefs = [
    {
      name: "Carnes y Proteínas",
      description: "Equivalentes de proteína animal",
      baseKcal: 75,
      items: [
        { elName: "Pollo", amount: 1 },
        { elName: "Carne de res", amount: 1, fallback: "Carne" },
        { elName: "Atún", amount: 1 },
        { elName: "Huevo", amount: 1 },
      ],
    },
    {
      name: "Cereales y Tubérculos",
      description: "Equivalentes de carbohidratos complejos",
      baseKcal: 120,
      items: [
        { elName: "Arroz Blanco", amount: 1 },
        { elName: "Arroz Integral", amount: 1, fallback: "Arroz" },
        { elName: "Pasta", amount: 1, fallback: "Arroz" },
        { elName: "Avena", amount: 1 },
        { elName: "Pan integral", amount: 1, fallback: "Pan" },
        { elName: "Arepa", amount: 1 },
      ],
    },
    {
      name: "Frutas",
      description: "Equivalentes de frutas frescas",
      baseKcal: 60,
      items: [
        { elName: "Cambur", amount: 1 },
        { elName: "Manzana", amount: 1 },
        { elName: "Naranja", amount: 1 },
        { elName: "Fresa", amount: 1 },
        { elName: "Patilla", amount: 1, fallback: "Melón" },
        { elName: "Piña", amount: 1 },
      ],
    },
    {
      name: "Grasas Saludables",
      description: "Equivalentes de lípidos",
      baseKcal: 45,
      items: [
        { elName: "Aceite de oliva", amount: 1 },
        { elName: "Aguacate", amount: 1 },
        { elName: "Mantequilla", amount: 1 },
        { elName: "Almendra", amount: 1 },
      ],
    },
    {
      name: "Lácteos",
      description: "Equivalentes de productos lácteos",
      baseKcal: 120,
      items: [
        { elName: "Leche descremada", amount: 1 },
        { elName: "Leche entera", amount: 1, fallback: "Leche" },
        { elName: "Yogurt natural", amount: 1, fallback: "Yogurt" },
        { elName: "Queso blanco", amount: 1, fallback: "Queso" },
      ],
    },
  ];

  const createdExchangeLists: Array<{ id: string; name: string }> = [];

  for (const def of exchangeListDefs) {
    const elId = `demo-el-${slugify(def.name)}`;
    const existing = await prisma.exchangeList.findUnique({ where: { id: elId } });
    if (existing) {
      createdExchangeLists.push({ id: existing.id, name: existing.name });
      continue;
    }

    const resolvedItems: Array<{ foodExchangeListId: string; amount: number }> = [];
    for (const item of def.items) {
      const felId = await safeExchangeListId(item.elName);
      resolvedItems.push({ foodExchangeListId: felId, amount: item.amount });
    }

    const el = await prisma.exchangeList.create({
      data: {
        id: elId,
        nutritionistId: demoNutri.id,
        name: def.name,
        description: def.description,
        baseKcal: def.baseKcal,
        items: {
          create: resolvedItems.map((ri) => ({
            foodExchangeListId: ri.foodExchangeListId,
            amount: ri.amount,
          })),
        },
      },
    });
    createdExchangeLists.push({ id: el.id, name: el.name });
    console.log(`   ✅ Lista creada: ${def.name}`);
  }

  // ---- PASO 6: Pacientes ----
  console.log("\n👥 Creando pacientes demo...");

  const patientDefs = [
    {
      firstName: "María",
      lastName: "González",
      gender: "FEMALE" as const,
      age: 28,
      occupation: "Ingeniera de Sistemas",
      activityLevel: "SEDENTARY" as const,
      maritalStatus: "Soltera",
      medicalHistory: { allergies: ["Penicilina"], pathologies: [], notes: "Ansiedad leve" },
      startingWeight: 85,
      currentWeight: 72,
      height: 165,
      profile: "Pérdida de peso - Transformación completa",
      anthropometries: [
        { monthsAgo: 4, weight: 85, waist: 92, hip: 108, fatPct: 36 },
        { monthsAgo: 3, weight: 81, waist: 88, hip: 105, fatPct: 33 },
        { monthsAgo: 2, weight: 77, waist: 84, hip: 102, fatPct: 30 },
        { monthsAgo: 1, weight: 74, waist: 81, hip: 100, fatPct: 28 },
        { monthsAgo: 0, weight: 72, waist: 79, hip: 98, fatPct: 26 },
      ],
      goals: [
        { title: "Bajar de peso", type: "WEIGHT" as const, startValue: 85, targetValue: 70, currentValue: 72, isAchieved: false },
        { title: "Reducir circunferencia de cintura", type: "MEASUREMENT" as const, startValue: 92, targetValue: 75, currentValue: 79, isAchieved: false },
        { title: "Ejercicio 3x/semana", type: "HABIT" as const, startValue: 0, targetValue: 3, currentValue: 3, isAchieved: true },
      ],
      labs: [
        { name: "Perfil Lipídico - Inicial", monthsAgo: 4, data: { colesterolTotal: 240, ldl: 160, hdl: 38, trigliceridos: 190 } },
        { name: "Perfil Lipídico - Control", monthsAgo: 0, data: { colesterolTotal: 195, ldl: 120, hdl: 45, trigliceridos: 140 } },
      ],
      consultations: [
        { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 120, reason: "Consulta inicial - desea bajar de peso" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Control mensual - buena evolución" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control mensual - ajuste de porciones" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control mensual - muy buen progreso" },
        { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control de fin de plan" },
      ],
      plan: { name: "Plan Pérdida de Peso - María", kcal: 1600, protein: 120, carbs: 150, fats: 45, menus: ["Desayuno Fitness", "Almuerzo Clásico", "Cena Ligera", "Merienda Frutal"] as string[], lists: ["Carnes y Proteínas", "Cereales y Tubérculos", "Frutas"] as string[], supplements: [{ name: "Vitamina D", dose: "1000 UI", frequency: "1 vez al día" }] },
    },
    {
      firstName: "Carlos",
      lastName: "Rodríguez",
      gender: "MALE" as const,
      age: 45,
      occupation: "Entrenador Personal",
      activityLevel: "VERY_ACTIVE" as const,
      maritalStatus: "Casado",
      medicalHistory: { allergies: [], pathologies: [], notes: "Deportista activo" },
      startingWeight: 78,
      currentWeight: 85,
      height: 178,
      profile: "Aumento de masa muscular",
      anthropometries: [
        { monthsAgo: 5, weight: 78, waist: 84, fatPct: 18, muscleMass: 35 },
        { monthsAgo: 3, weight: 81, waist: 84, fatPct: 16, muscleMass: 37.5 },
        { monthsAgo: 1, weight: 83.5, waist: 83, fatPct: 14.5, muscleMass: 39 },
        { monthsAgo: 0, weight: 85, waist: 83, fatPct: 13, muscleMass: 40.5 },
      ],
      goals: [
        { title: "Aumentar masa muscular", type: "WEIGHT" as const, startValue: 35, targetValue: 42, currentValue: 40.5, isAchieved: false },
        { title: "Reducir porcentaje graso", type: "MEASUREMENT" as const, startValue: 18, targetValue: 12, currentValue: 13, isAchieved: false },
        { title: "Entrenar 5x/semana", type: "HABIT" as const, startValue: 3, targetValue: 5, currentValue: 5, isAchieved: true },
      ],
      labs: [
        { name: "Perfil Lipídico", monthsAgo: 5, data: { colesterolTotal: 180, ldl: 100, hdl: 55, trigliceridos: 120 } },
        { name: "Testosterona", monthsAgo: 1, data: { testosteronaTotal: 650, testosteronaLibre: 12.5 } },
      ],
      consultations: [
        { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 150, reason: "Consulta inicial - desea aumentar masa muscular" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Control trimestral - ajuste calórico" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control mensual - excelente respuesta" },
        { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -14, reason: "Control de mantenimiento" },
      ],
      plan: { name: "Plan Hipercalórico - Carlos", kcal: 2800, protein: 180, carbs: 320, fats: 75, menus: ["Desayuno Proteico", "Almuerzo de Carnes", "Cena Proteica", "Merienda Proteica"] as string[], lists: ["Carnes y Proteínas", "Cereales y Tubérculos", "Grasas Saludables"] as string[], supplements: [{ name: "Whey Protein", dose: "30g", frequency: "Post-entreno" }, { name: "Creatina", dose: "5g", frequency: "1 vez al día" }] },
    },
    {
      firstName: "Ana",
      lastName: "López",
      gender: "FEMALE" as const,
      age: 35,
      occupation: "Crossfit Coach",
      activityLevel: "EXTRA_ACTIVE" as const,
      maritalStatus: "Soltera",
      medicalHistory: { allergies: [], pathologies: [], notes: "Atleta de alto rendimiento" },
      startingWeight: 63,
      currentWeight: 64,
      height: 168,
      profile: "Rendimiento deportivo - Crossfit",
      anthropometries: [
        { monthsAgo: 3, weight: 63, waist: 72, fatPct: 22, muscleMass: 28 },
        { monthsAgo: 2, weight: 63.5, waist: 71, fatPct: 21, muscleMass: 28.5 },
        { monthsAgo: 1, weight: 64, waist: 70, fatPct: 20, muscleMass: 29 },
        { monthsAgo: 0, weight: 64, waist: 69, fatPct: 19, muscleMass: 29.5 },
      ],
      goals: [
        { title: "Mantener peso competitivo", type: "WEIGHT" as const, startValue: 63, targetValue: 65, currentValue: 64, isAchieved: true },
        { title: "Reducir grasa corporal", type: "MEASUREMENT" as const, startValue: 22, targetValue: 18, currentValue: 19, isAchieved: false },
        { title: "Mejorar tiempo en WOD", type: "OTHER" as const, startValue: 0, targetValue: 1, currentValue: 0, isAchieved: false },
      ],
      labs: [
        { name: "Hemoglobina", monthsAgo: 2, data: { hemoglobina: 13.5, hematocrito: 40, ferritina: 45 } },
      ],
      consultations: [
        { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta inicial - optimizar rendimiento" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Ajuste de macronutrientes para competencia" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - buena respuesta al plan" },
        { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Pre-competencia - última revisión" },
      ],
      plan: { name: "Plan Rendimiento Deportivo - Ana", kcal: 2400, protein: 150, carbs: 280, fats: 60, menus: ["Desayuno Fitness", "Almuerzo Clásico", "Cena Proteica", "Merienda Proteica", "Merienda Frutal"] as string[], lists: ["Carnes y Proteínas", "Cereales y Tubérculos", "Grasas Saludables", "Frutas"] as string[], supplements: [{ name: "BCAA", dose: "10g", frequency: "Pre y post entreno" }, { name: "Omega 3", dose: "2g", frequency: "1 vez al día" }] },
    },
    {
      firstName: "Pedro",
      lastName: "Martínez",
      gender: "MALE" as const,
      age: 60,
      occupation: "Contador (Jubilado)",
      activityLevel: "SEDENTARY" as const,
      maritalStatus: "Casado",
      medicalHistory: { allergies: ["Sulfa"], pathologies: ["Diabetes tipo 2", "Hipertensión"], notes: "Diagnosticado hace 2 años" },
      startingWeight: 95,
      currentWeight: 88,
      height: 172,
      profile: "Control de Diabetes tipo 2",
      anthropometries: [
        { monthsAgo: 4, weight: 95, waist: 108, fatPct: 32 },
        { monthsAgo: 3, weight: 93, waist: 105, fatPct: 31 },
        { monthsAgo: 2, weight: 91, waist: 102, fatPct: 30 },
        { monthsAgo: 1, weight: 89.5, waist: 100, fatPct: 29 },
        { monthsAgo: 0, weight: 88, waist: 98, fatPct: 28 },
      ],
      goals: [
        { title: "Controlar glucosa en ayunas", type: "OTHER" as const, startValue: 180, targetValue: 110, currentValue: 115, isAchieved: false },
        { title: "Bajar de peso", type: "WEIGHT" as const, startValue: 95, targetValue: 85, currentValue: 88, isAchieved: false },
        { title: "Reducir HbA1c", type: "OTHER" as const, startValue: 8.5, targetValue: 7, currentValue: 7.2, isAchieved: false },
        { title: "Caminar 30 min diarios", type: "HABIT" as const, startValue: 0, targetValue: 30, currentValue: 25, isAchieved: false },
      ],
      labs: [
        { name: "Glicemia - Inicial", monthsAgo: 4, data: { glucosaAyunas: 180, hba1c: 8.5 } },
        { name: "Glicemia - Control", monthsAgo: 0, data: { glucosaAyunas: 115, hba1c: 7.2 } },
      ],
      consultations: [
        { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 120, reason: "Consulta inicial - diabetes descontrolada" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Control - ajuste de carbohidratos" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - mejorando" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - muy buena evolución" },
        { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -10, reason: "Control de rutina" },
      ],
      plan: { name: "Plan Diabetes - Pedro", kcal: 1800, protein: 130, carbs: 140, fats: 55, menus: ["Desayuno Proteico", "Almuerzo de Carnes", "Cena Ligera"] as string[], lists: ["Carnes y Proteínas", "Grasas Saludables"] as string[], supplements: [{ name: "Cromo", dose: "200 mcg", frequency: "1 vez al día" }] },
    },
    {
      firstName: "Valeria",
      lastName: "Sánchez",
      gender: "FEMALE" as const,
      age: 25,
      occupation: "Diseñadora Gráfica",
      activityLevel: "LIGHTLY_ACTIVE" as const,
      maritalStatus: "Soltera",
      medicalHistory: { allergies: ["Lactosa"], pathologies: ["Anemia ferropénica (leve)"], notes: "Dieta vegana desde hace 3 años" },
      startingWeight: 62,
      currentWeight: 63,
      height: 170,
      profile: "Nutrición Plant-Based",
      anthropometries: [
        { monthsAgo: 3, weight: 62, waist: 74, fatPct: 26 },
        { monthsAgo: 2, weight: 62.5, waist: 73, fatPct: 25.5 },
        { monthsAgo: 1, weight: 63, waist: 73, fatPct: 25 },
        { monthsAgo: 0, weight: 63, waist: 72, fatPct: 24.5 },
      ],
      goals: [
        { title: "Mantener peso saludable", type: "WEIGHT" as const, startValue: 62, targetValue: 64, currentValue: 63, isAchieved: true },
        { title: "Mejorar niveles de hierro", type: "OTHER" as const, startValue: 30, targetValue: 70, currentValue: 55, isAchieved: false },
        { title: "Suplementación B12 consistente", type: "HABIT" as const, startValue: 0, targetValue: 7, currentValue: 7, isAchieved: true },
      ],
      labs: [
        { name: "Hierro - Inicial", monthsAgo: 3, data: { ferritina: 18, hemoglobina: 11.5, vitaminaB12: 200 } },
        { name: "Hierro - Control", monthsAgo: 0, data: { ferritina: 45, hemoglobina: 12.8, vitaminaB12: 450 } },
      ],
      consultations: [
        { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta inicial - dieta vegana y anemia" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste de suplementos" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando niveles" },
      ],
      plan: { name: "Plan Plant-Based - Valeria", kcal: 2000, protein: 100, carbs: 250, fats: 65, menus: ["Desayuno Frutal", "Almuerzo Vegetariano", "Cena Rápida", "Merienda Frutal"] as string[], lists: ["Cereales y Tubérculos", "Frutas", "Grasas Saludables"] as string[], supplements: [{ name: "Vitamina B12", dose: "1000 mcg", frequency: "1 vez al día" }, { name: "Hierro", dose: "30 mg", frequency: "1 vez al día" }, { name: "Omega 3 (DHA)", dose: "500 mg", frequency: "1 vez al día" }] },
    },
    {
      firstName: "Diego",
      lastName: "Fernández",
      gender: "MALE" as const,
      age: 10,
      occupation: "Estudiante",
      activityLevel: "MODERATELY_ACTIVE" as const,
      maritalStatus: undefined,
      medicalHistory: { allergies: [], pathologies: ["Sobrepeso infantil"], notes: "Derivado por pediatra" },
      startingWeight: 55,
      currentWeight: 50,
      height: 145,
      profile: "Nutrición Pediátrica - Sobrepeso",
      anthropometries: [
        { monthsAgo: 3, weight: 55, waist: 72, fatPct: 28 },
        { monthsAgo: 2, weight: 53, waist: 70, fatPct: 26 },
        { monthsAgo: 1, weight: 51.5, waist: 68, fatPct: 24.5 },
        { monthsAgo: 0, weight: 50, waist: 66, fatPct: 23 },
      ],
      goals: [
        { title: "Alcanzar peso saludable para la edad", type: "WEIGHT" as const, startValue: 55, targetValue: 45, currentValue: 50, isAchieved: false },
        { title: "Reducir tiempo de pantalla", type: "HABIT" as const, startValue: 4, targetValue: 1.5, currentValue: 2, isAchieved: false },
        { title: "Comer 5 porciones de frutas/verduras al día", type: "HABIT" as const, startValue: 1, targetValue: 5, currentValue: 4, isAchieved: false },
      ],
      labs: [],
      consultations: [
        { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta inicial - sobrepeso infantil (con madre)" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste de plan familiar" },
        { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - buen progreso" },
        { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -3, reason: "Control mensual" },
      ],
      plan: { name: "Plan Pediátrico - Diego", kcal: 1800, protein: 80, carbs: 220, fats: 50, menus: ["Desayuno Frutal", "Almuerzo Clásico", "Cena Rápida", "Merienda Frutal"] as string[], lists: ["Cereales y Tubérculos", "Lácteos", "Frutas"] as string[], supplements: [] },
    },
  ];

  for (const def of patientDefs) {
    const email = `${def.firstName.toLowerCase()}.${def.lastName.toLowerCase()}@demo.paciente.com`;
    const gender = def.gender;
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - def.age);

    // Crear User para el paciente (login opcional pero buen demo)
    let patientUserId: string | undefined;
    if (def.age >= 18) {
      const pu = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          username: `${def.firstName.toLowerCase()}.${def.lastName.toLowerCase()}`,
          password: passwordHash,
          firstName: def.firstName,
          lastName: def.lastName,
          fullName: `${def.firstName} ${def.lastName}`,
          permitId: patientPermit.id,
          status: "ACTIVE",
        },
        update: {},
      });
      patientUserId = pu.id;
    }

    // Crear Patient
    const patientId = `demo-patient-${slugify(def.firstName)}-${slugify(def.lastName)}`;
    const patient = await prisma.patient.upsert({
      where: { id: patientId },
      create: {
        id: patientId,
        userId: patientUserId,
        firstName: def.firstName,
        lastName: def.lastName,
        email,
        phone: faker.phone.number({ style: "international" }),
        gender,
        birthDate,
        maritalStatus: def.maritalStatus,
        occupation: def.occupation,
        activityLevel: def.activityLevel,
        medicalHistory: def.medicalHistory,
      },
      update: {},
    });

    await prisma.patientNutritionist.upsert({
      where: {
        patientId_nutritionistId: {
          patientId: patient.id,
          nutritionistId: demoNutri.id,
        },
      },
      create: {
        patientId: patient.id,
        nutritionistId: demoNutri.id,
        role: "PRIMARY",
      },
      update: {},
    });

    // Anamnesis
    await prisma.anamnesis.upsert({
      where: { patientId: patient.id },
      create: {
        patientId: patient.id,
        familyHistory: { diabetes: def.firstName === "Pedro", hypertension: def.firstName === "Pedro", obesity: def.firstName === "Diego", dislipidemia: false, cancer: false, anemia: def.firstName === "Valeria" },
        personalHistory: def.medicalHistory,
        physicalActivity: def.activityLevel === "SEDENTARY" ? "Ninguna" : def.activityLevel === "VERY_ACTIVE" || def.activityLevel === "EXTRA_ACTIVE" ? "Entrenamiento diario" : "Camina ocasionalmente",
        exerciseFrequency: def.activityLevel === "SEDENTARY" ? "No realiza" : def.activityLevel === "EXTRA_ACTIVE" ? "6-7 días/semana" : "3-4 días/semana",
        sleepHours: faker.number.int({ min: 6, max: 9 }),
        smoking: false,
        alcohol: def.firstName === "Carlos" ? "Ocasionalmente" : def.firstName === "Pedro" ? "No" : "No",
        eatingHabits: { mealsPerDay: faker.number.int({ min: 3, max: 5 }), mealsAtHome: faker.number.int({ min: 2, max: 4 }), mealSchedule: "Irregular" },
        allergies: (def.medicalHistory?.allergies as string[]) || [],
        intolerances: def.firstName === "Valeria" ? ["Lactosa"] : [],
        dislikes: def.firstName === "Diego" ? ["Verduras de hoja verde", "Pescado"] : ["Vísceras"],
        preferredFoods: def.firstName === "Valeria" ? ["Legumbres", "Tofu", "Frutas"] : ["Pasta", "Arroz", "Pollo"],
        nutritionalDiagnosis: def.profile,
      },
      update: {},
    });

    // Anthropometry history
    for (const ax of def.anthropometries) {
      const axDate = monthsAgo(ax.monthsAgo);
      const heightM = def.height / 100;
      const bmi = ax.weight / (heightM * heightM);
      await prisma.anthropometry.create({
        data: {
          patientId: patient.id,
          date: axDate,
          weight: ax.weight,
          height: def.height,
          bmi: Math.round(bmi * 100) / 100,
          tricipital: faker.number.float({ min: 10, max: 25, fractionDigits: 1 }),
          subscapular: faker.number.float({ min: 12, max: 30, fractionDigits: 1 }),
          waist: ax.waist,
          hip: (ax as any).hip ?? faker.number.float({ min: 90, max: 110, fractionDigits: 1 }),
          fatPercentage: ax.fatPct,
          muscleMass: (ax as any).muscleMass ?? faker.number.float({ min: 20, max: 35, fractionDigits: 1 }),
        },
      });
    }

    // Goals
    for (const g of def.goals) {
      await prisma.goal.create({
        data: {
          patientId: patient.id,
          title: g.title,
          type: g.type,
          startValue: g.startValue,
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          deadline: g.isAchieved ? monthsAgo(0) : futureDays(90),
          isAchieved: g.isAchieved,
        },
      });
    }

    // Lab results
    for (const lab of def.labs) {
      await prisma.labResult.create({
        data: {
          patientId: patient.id,
          date: monthsAgo(lab.monthsAgo),
          name: lab.name,
          data: lab.data,
        },
      });
    }

    // Consultations
    for (let ci = 0; ci < def.consultations.length; ci++) {
      const c = def.consultations[ci];
      const scheduledAt = c.daysAgo < 0 ? futureDays(Math.abs(c.daysAgo)) : daysAgo(c.daysAgo);
      // Link most recent anthropometry to the latest completed consultation
      const anthropometry = ci === def.consultations.length - 2
        ? await prisma.anthropometry.findFirst({ where: { patientId: patient.id }, orderBy: { date: "desc" }, select: { id: true } })
        : undefined;

      await prisma.consultation.create({
        data: {
          patientId: patient.id,
          nutritionistId: demoNutri.id,
          scheduledAt,
          status: c.status,
          type: c.type,
          reason: c.reason,
          notes: c.status === "COMPLETED" ? "Paciente evolucionando favorablemente. Se mantiene plan actual." : undefined,
          anthropometryId: anthropometry?.id,
        },
      });
    }

    // Nutritional Plan
    const planId = `demo-plan-${slugify(def.firstName)}-${slugify(def.lastName)}`;
    const nutritionalPlan = await prisma.nutritionalPlan.upsert({
      where: { id: planId },
      create: {
        id: planId,
        patientId: patient.id,
        status: "ACTIVE",
        name: def.plan.name,
        startDate: monthsAgo(4),
        endDate: futureDays(60),
        kcalTarget: def.plan.kcal,
        proteinTarget: def.plan.protein,
        carbsTarget: def.plan.carbs,
        fatsTarget: def.plan.fats,
        recommendations: "Mantener horarios de comida regulares. Hidratación: 2L de agua al día.",
        waterIntake: 2000,
        shareToken: shareToken(),
        isShared: false,
      },
      update: {},
    });

    // Assign menus to plan
    for (const menuName of def.plan.menus) {
      const menu = createdMenus.find((m) => m.name.includes(menuName) || menuName.includes(m.name));
      if (menu) {
        const eatingMoment =
          menu.category === "BREAKFAST" ? "Desayuno" :
          menu.category === "LUNCH" ? "Almuerzo" :
          menu.category === "DINNER" ? "Cena" :
          menu.category === "SNACK" ? "Merienda" : "Otro";
        await prisma.assignedMenu.create({
          data: {
            planId: nutritionalPlan.id,
            menuId: menu.id,
            eatingMoment,
            notes: `Incluir como ${eatingMoment.toLowerCase()} del plan`,
          },
        });
      }
    }

    // Assign exchange lists to plan
    for (const elName of def.plan.lists) {
      const el = createdExchangeLists.find((e) => e.name.includes(elName) || elName.includes(e.name));
      if (el) {
        await prisma.assignedExchangeList.create({
          data: {
            planId: nutritionalPlan.id,
            exchangeListId: el.id,
            portions: faker.number.int({ min: 2, max: 4 }),
            eatingMoment: "Distribuir en comidas principales",
          },
        });
      }
    }

    // Assign supplements
    for (const sup of def.plan.supplements) {
      await prisma.assignedSupplement.create({
        data: {
          planId: nutritionalPlan.id,
          name: sup.name,
          dose: sup.dose,
          frequency: sup.frequency,
          brand: "Suplemento Demo",
        },
      });
    }

    console.log(`   ✅ Paciente ${def.firstName} ${def.lastName} (${def.profile})`);
  }

  // ---- FINAL ----
  console.log("\n" + "=".repeat(60));
  console.log(`  ✅ SEED DE DEMO COMPLETADO`);
  console.log("=".repeat(60));
  console.log(`\n📧 Email:     ${DEMO_EMAIL}`);
  console.log(`🔑 Password:  ${DEMO_PASSWORD}`);
  console.log(`👥 Pacientes: ${patientDefs.length}`);
  console.log(`🥗 Menús:     ${createdMenus.length}`);
  console.log(`📋 Listas:    ${createdExchangeLists.length}`);
  console.log(`\n⚠️  IMPORTANTE: Cambiá la contraseña después del primer ingreso.`);
  console.log(`⚠️  EJECUTAR después de: npm run seed`);
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed demo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
