/**
 * seed.historia-demo.ts
 *
 * Seed DEMO para Winder (F4.3): nutre un nutricionista demo + paciente demo con
 * fatPercentage en Anthropometry + SportsHistory + PediatricHistory, para probar
 * end-to-end la creación/edición de ambas historias clínicas.
 *
 * Los resultados (Cunningham/METS/FFM, Schofield/Harris-Benedict/RCT/Mirwald)
 * se calculan INLINE replicando los engines de webapp
 * (features/nutringest/patient/lib/{sports-history,pediatric-calculation}.engine.ts)
 * para que el seed sea autónomo (NO importa los motores de la webapp) y sirva
 * como drift-check: si algún día el engine cambia, este seed queda desactualizado.
 *
 * Idempotente: se ejecuta con la misma identidad (mismo patient id fijo y mismos
 * emails), limpiando primero las historias/antropometrías previas del paciente demo.
 *
 * Uso:
 *   npm run seed:historia-demo
 *   (o) npx ts-node -r tsconfig-paths/register src/shared/fixtures/nutrition/seed.historia-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// =============================================================================
// CONFIGURACIÓN
// =============================================================================
const DEMO_EMAIL = "deportiva.demo@nutringest.app";
const DEMO_PASSWORD = "Demo123!";

const PATIENT_ID = "demo-patient-historia-deportiva";
const PATIENT_FIRST_NAME = "Valentina";
const PATIENT_LAST_NAME = "Demo";
const PATIENT_EMAIL = "valentina.demo@deportiva.paciente.com";

// Valores clínicos de la paciente demo (13 años, F).
const PATIENT_WEIGHT_KG = 52;
const PATIENT_HEIGHT_CM = 162;
const PATIENT_SITTING_HEIGHT_CM = 84;
const PATIENT_FAT_PERCENTAGE = 20;
const PATIENT_AGE_YEARS = 13;

// Carga de entrenamiento (min/sesión, días/semana, sesiones/día).
const LOAD = { minutesPerSession: 60, daysPerWeek: 4, sessionsPerDay: 1 };

// Disciplinas del catálogo SportDiscipline (se buscan por nombre en la DB).
const DISCIPLINE_NAMES = [
  "Entrenamiento de pesas (moderado)",
  "Fútbol (recreativo)",
];

// Factor de actividad pediátrico (ACTIVE: 1.6–1.7, FAO/WHO/UNU 2004).
const PEDIATRIC_ACTIVITY_FACTOR = 1.6;

// =============================================================================
// MOTORES INLINE (réplica exacta de los engines de webapp)
// =============================================================================

const round2 = (n: number): number => parseFloat(n.toFixed(2));

const calculateAverageTrainingMinutes = (
  min: number,
  days: number,
  sessions: number,
): number => round2((min * days * sessions) / 7);

/** Cunningham: RMR = 500 + 22 × FFM (Cunningham 1991). */
const calculateCunninghamRmr = (ffmKg: number): number =>
  round2(500 + 22 * ffmKg);

/** FFM derivada: peso × (1 − fatPercentage/100) (AD4/D4). */
const deriveFfm = (p: { weightKg: number; fatPercentage: number }): number =>
  round2(p.weightKg * (1 - p.fatPercentage / 100));

/** Gasto METS 4 pasos (Compendium Ainsworth 2011), round2 en cada paso. */
const calculateMetsExpenditure = (p: {
  met: number;
  weightKg: number;
  minutesPerSession: number;
  daysPerWeek: number;
  sessionsPerDay: number;
}): number => {
  const { met, weightKg, minutesPerSession, daysPerWeek, sessionsPerDay } = p;
  const promedioMin = calculateAverageTrainingMinutes(
    minutesPerSession,
    daysPerWeek,
    sessionsPerDay,
  );
  const mlO2PorKgMin = round2(met * 3.5);
  const ltO2PorMin = round2((weightKg * mlO2PorKgMin) / 1000);
  const kcalPorMin = round2(ltO2PorMin * 5);
  return round2(kcalPorMin * promedioMin);
};

/** Resultados deportivos con carga COMPARTIDA (promedioMin global) y Σ diario. */
const calculateSportsResults = (p: {
  weightKg: number;
  ffmKg: number;
  disciplines: { met: number }[];
  load: {
    minutesPerSession: number;
    daysPerWeek: number;
    sessionsPerDay: number;
  };
}): { metsExpenditure: number; cunninghamRmr: number; total: number } => {
  const { weightKg, ffmKg, disciplines, load } = p;
  const metsExpenditure = round2(
    disciplines.reduce(
      (sum, d) =>
        sum +
        calculateMetsExpenditure({
          met: d.met,
          weightKg,
          ...load,
        }),
      0,
    ),
  );
  const cunninghamRmr = calculateCunninghamRmr(ffmKg);
  return {
    metsExpenditure,
    cunninghamRmr,
    total: round2(cunninghamRmr + metsExpenditure),
  };
};

/**
 * Schofield (1985) TMB — rama mujer 10-18a.
 *
 * NOTA (drift-check 2026-08-18): el engine de webapp (F1.1) tenía los branches
 * INVERTIDOS (17.5P + 651 a FEMALE). Se corrigió: FEMALE 10-18a = 12.2P + 746.
 * Para la demo (F, 13a, 52 kg): TMB = 12.2×52 + 746 = 1380.4 → RCT = 1380.4×1.6 = 2208.64.
 */
const calculateSchofieldTmb = (p: {
  gender: "FEMALE";
  weightKg: number;
}): number => round2(12.2 * p.weightKg + 746);

/** Harris-Benedict mujer: 655 + 9.6P + 1.8T − 4.7E (1919). */
const calculateHarrisBenedictWoman = (p: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number =>
  round2(655 + 9.6 * p.weightKg + 1.8 * p.heightCm - 4.7 * p.ageYears);

/** RCT = round2(TMB × FA × (1 + % crecimiento)). */
const calculateRct = (p: {
  tmb: number;
  activityFactor: number;
  growthCostPercent: number;
}): number => round2(p.tmb * p.activityFactor * (1 + p.growthCostPercent));

/** Costo de crecimiento como % del gasto (FAO/WHO/UNU 2004). */
const getGrowthCostPercent = (ageYears: number): number => {
  if (ageYears < 0 || ageYears >= 18) return 0;
  const months = ageYears * 12;
  if (months < 3) return 0.35;
  if (months < 6) return 0.07;
  if (months < 12) return 0.03;
  if (months < 24) return 0.02;
  if (ageYears < 10) return 0.02;
  return 0.04;
};

/** Mirwald PHV LEI-only (LEI = talla − talla sentado), rama FEMALE (2002). */
const calculateMirwaldPhv = (p: {
  age: number;
  weightKg: number;
  heightCm: number;
  sittingHeightCm: number;
}): number => {
  const { age, weightKg, heightCm, sittingHeightCm } = p;
  const lei = heightCm - sittingHeightCm;
  return round2(
    -9.376 +
      0.0001882 * lei * sittingHeightCm +
      0.0022 * age * lei +
      0.005841 * age * sittingHeightCm -
      0.002658 * age * weightKg +
      0.07693 * weightKg * (100 / heightCm),
  );
};

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("=".repeat(60));
  console.log("  🚀 SEED DEMO HISTORIA DEPORTIVA + PEDIÁTRICA");
  console.log("=".repeat(60));

  // ---- PASO 0: Validación de dependencias ----
  console.log("\n🔍 Verificando catálogo de disciplinas...");
  const disciplineCount = await prisma.sportDiscipline.count();
  if (disciplineCount === 0) {
    throw new Error(
      "❌ No hay disciplinas deportivas en la BD. Ejecutá 'npm run seed:sports' primero.",
    );
  }
  const disciplines = await Promise.all(
    DISCIPLINE_NAMES.map(async (name) => {
      const d = await prisma.sportDiscipline.findUnique({ where: { name } });
      if (!d) {
        throw new Error(
          `❌ No se encontró la disciplina "${name}". Ejecutá 'npm run seed:sports' para sembrar el catálogo.`,
        );
      }
      return d;
    }),
  );
  for (const d of disciplines) {
    console.log(`   ✅ ${d.name} (${d.code}) → MET ${Number(d.metValue)}`);
  }

  // ---- PASO 1: Permisos ----
  console.log("\n📋 Asegurando permisos...");
  const userPermit = await prisma.permit.upsert({
    where: { id: "USER" },
    create: {
      id: "USER",
      name: "USER",
      description: "User / Nutritionist Permit",
      list: [
        "MY_CURRENT_ACTION_CREATED",
        "MY_CURRENT_ACTION_UPDATE",
        "MY_CURRENT_ACTION_LIST",
        "MY_CURRENT_ACTION_UNIQUE",
        "PATIENT_CREATED",
        "PATIENT_UPDATE",
        "PATIENT_LIST",
        "PATIENT_UNIQUE",
        "FOOD_CREATED",
        "FOOD_LIST",
        "FOOD_UNIQUE",
        "MENU_CREATED",
        "MENU_UPDATE",
        "MENU_LIST",
        "MENU_UNIQUE",
        "EXCHANGE_LIST_CREATED",
        "EXCHANGE_LIST_LIST",
        "EXCHANGE_LIST_UNIQUE",
        "DIET_CREATED",
        "DIET_UPDATE",
        "DIET_LIST",
        "DIET_UNIQUE",
      ],
    },
    update: {},
  });

  // ---- PASO 2: Plan de suscripción ----
  console.log("📋 Verificando plan de suscripción...");
  let plan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Premium" },
  });
  if (!plan) plan = await prisma.subscriptionPlan.findFirst();
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: {
        id: "Premium",
        name: "Premium",
        description: "Plan Profesional - Acceso completo",
        price: 11.99,
        selected: true,
        featured: true,
        badge: "POPULAR",
        content: [],
      },
    });
  }

  // ---- PASO 3: Nutricionista Demo (Deportiva, Clínica) ----
  console.log("\n👤 Creando nutricionista demo...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      username: "deportiva.demo",
      password: passwordHash,
      firstName: "Deportiva",
      lastName: "Demo",
      fullName: "Deportiva Demo",
      permitId: userPermit.id,
      status: "ACTIVE",
    },
    update: { password: passwordHash, status: "ACTIVE" },
  });

  const demoNutri = await prisma.nutritionist.upsert({
    where: { userId: demoUser.id },
    create: {
      userId: demoUser.id,
      licenseCode: "DEMO-DEP-001",
      specialty: "Deportiva, Clínica",
    },
    update: {},
  });

  await prisma.userWallet.upsert({
    where: { userId: demoUser.id },
    create: { userId: demoUser.id, balance: 0.0 },
    update: {},
  });

  await prisma.subscription.upsert({
    where: { id: "sub-demo-deportiva" },
    create: {
      id: "sub-demo-deportiva",
      userId: demoUser.id,
      planId: plan.id,
      status: "ACTIVE",
      autoRenew: true,
    },
    update: { status: "ACTIVE" },
  });
  console.log(
    `   ✅ Nutricionista ${DEMO_EMAIL} (specialty: ${demoNutri.specialty})`,
  );

  // ---- PASO 4: Limpieza idempotente del paciente demo ----
  console.log("\n🧹 Limpieza de datos demo previos...");
  const existingPatient = await prisma.patient.findUnique({
    where: { id: PATIENT_ID },
  });
  if (existingPatient) {
    const priorSports = await prisma.sportsHistory.findMany({
      where: { patientId: PATIENT_ID },
      select: { id: true },
    });
    await prisma.sportsHistoryDiscipline.deleteMany({
      where: { sportsHistoryId: { in: priorSports.map((s) => s.id) } },
    });
    const delSports = await prisma.sportsHistory.deleteMany({
      where: { patientId: PATIENT_ID },
    });
    const delPediatric = await prisma.pediatricHistory.deleteMany({
      where: { patientId: PATIENT_ID },
    });
    const delAnthropometry = await prisma.anthropometry.deleteMany({
      where: { patientId: PATIENT_ID },
    });
    console.log(
      `   ✅ Históricos previos eliminados (sports: ${delSports.count}, pediatric: ${delPediatric.count}, anthropometry: ${delAnthropometry.count})`,
    );
  }

  // ---- PASO 5: Paciente demo ----
  console.log("\n👥 Creando paciente demo...");
  const birthDate = new Date();
  birthDate.setFullYear(birthDate.getFullYear() - PATIENT_AGE_YEARS);

  const patient = await prisma.patient.upsert({
    where: { id: PATIENT_ID },
    create: {
      id: PATIENT_ID,
      firstName: PATIENT_FIRST_NAME,
      lastName: PATIENT_LAST_NAME,
      email: PATIENT_EMAIL,
      phone: "+5491100000000",
      gender: "FEMALE",
      birthDate,
      occupation: "Estudiante",
      activityLevel: "VERY_ACTIVE",
      medicalHistory: {
        allergies: [],
        pathologies: [],
        notes: "Paciente demo deportiva + pediátrica",
      },
      createdById: demoUser.id,
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
      isActive: true,
    },
    update: { isActive: true },
  });

  // ---- PASO 6: Anthropometry con fatPercentage ----
  const heightM = PATIENT_HEIGHT_CM / 100;
  const bmi = Math.round((PATIENT_WEIGHT_KG / (heightM * heightM)) * 100) / 100;
  const anthropometry = await prisma.anthropometry.create({
    data: {
      patientId: patient.id,
      weight: PATIENT_WEIGHT_KG,
      height: PATIENT_HEIGHT_CM,
      bmi,
      sittingHeight: PATIENT_SITTING_HEIGHT_CM,
      fatPercentage: PATIENT_FAT_PERCENTAGE,
      waist: 70,
      hip: 92,
      createdById: demoUser.id,
    },
  });
  console.log(
    `   ✅ Anthropometry ${anthropometry.id} → peso ${PATIENT_WEIGHT_KG} kg, talla ${PATIENT_HEIGHT_CM} cm, IMC ${bmi}, fatPercentage ${PATIENT_FAT_PERCENTAGE}%`,
  );

  // ---- PASO 7: SportsHistory (FFM derivada + Cunningham + METS) ----
  console.log("\n🏋️ Creando historia deportiva...");
  const ffmKg = deriveFfm({
    weightKg: PATIENT_WEIGHT_KG,
    fatPercentage: PATIENT_FAT_PERCENTAGE,
  });
  const sportsResults = calculateSportsResults({
    weightKg: PATIENT_WEIGHT_KG,
    ffmKg,
    disciplines: disciplines.map((d) => ({ met: Number(d.metValue) })),
    load: LOAD,
  });

  const sportsHistory = await prisma.sportsHistory.create({
    data: {
      patientId: patient.id,
      background: {
        experience: "Entrena fuerza desde hace 6 meses",
        history: "Inició entrenamiento de pesas por recomendación médica",
      },
      goals: {
        primary: "Ganar masa muscular",
        secondary: "Mejorar composición corporal",
      },
      competitionLevel: "AMATEUR",
      trainingMinutesPerSession: LOAD.minutesPerSession,
      trainingDaysPerWeek: LOAD.daysPerWeek,
      trainingSessionsPerDay: LOAD.sessionsPerDay,
      cunninghamRmr: sportsResults.cunninghamRmr,
      metsExpenditure: sportsResults.metsExpenditure,
      assessment: {
        energyAvailability: "Adecuada",
        macros: { protein: "1.6 g/kg", carbs: "balanceados", fats: "30%" },
        hydration: "2L/día",
        supplements: [],
        reds: null,
      },
      disciplines: {
        create: disciplines.map((d) => ({ sportDisciplineId: d.id })),
      },
      createdById: demoUser.id,
    },
    include: { disciplines: { include: { sportDiscipline: true } } },
  });
  console.log(
    `   ✅ SportsHistory ${sportsHistory.id} → FFM ${ffmKg} kg | Cunningham ${sportsResults.cunninghamRmr} kcal | METS ${sportsResults.metsExpenditure} kcal | total ${sportsResults.total}`,
  );
  for (const pivot of sportsHistory.disciplines) {
    console.log(
      `      · ${pivot.sportDiscipline.name} (MET ${Number(pivot.sportDiscipline.metValue)})`,
    );
  }

  // ---- PASO 8: PediatricHistory (Schofield + Harris-Benedict + RCT + Mirwald) ----
  console.log("\n🧒 Creando historia pediátrica...");
  const schofieldTmb = calculateSchofieldTmb({
    gender: "FEMALE",
    weightKg: PATIENT_WEIGHT_KG,
  });
  const harrisBenedictWoman = calculateHarrisBenedictWoman({
    weightKg: PATIENT_WEIGHT_KG,
    heightCm: PATIENT_HEIGHT_CM,
    ageYears: PATIENT_AGE_YEARS,
  });
  const growthCostPercent = getGrowthCostPercent(PATIENT_AGE_YEARS);
  const growthCost = round2(schofieldTmb * PEDIATRIC_ACTIVITY_FACTOR * growthCostPercent);
  const rct = calculateRct({
    tmb: schofieldTmb,
    activityFactor: PEDIATRIC_ACTIVITY_FACTOR,
    growthCostPercent,
  });
  const mirwaldPhv = calculateMirwaldPhv({
    age: PATIENT_AGE_YEARS,
    weightKg: PATIENT_WEIGHT_KG,
    heightCm: PATIENT_HEIGHT_CM,
    sittingHeightCm: PATIENT_SITTING_HEIGHT_CM,
  });
  const mirwaldLabel = mirwaldPhv >= 0 ? "DESDE_PHV" : "HASTA_PHV";

  const pediatricHistory = await prisma.pediatricHistory.create({
    data: {
      patientId: patient.id,
      weightKg: PATIENT_WEIGHT_KG,
      heightCm: PATIENT_HEIGHT_CM,
      sittingHeightCm: PATIENT_SITTING_HEIGHT_CM,
      activityFactor: PEDIATRIC_ACTIVITY_FACTOR,
      growthCost,
      schofieldTmb,
      harrisBenedictWoman,
      rct,
      mirwaldPhv,
      growthClassification: "NORMAL",
      growthChartType: "DE_PIE",
      createdById: demoUser.id,
    },
  });
  console.log(
    `   ✅ PediatricHistory ${pediatricHistory.id} → Schofield ${schofieldTmb} | HB ${harrisBenedictWoman} | RCT ${rct} (FA ${PEDIATRIC_ACTIVITY_FACTOR}) | Mirwald ${mirwaldPhv} (${mirwaldLabel})`,
  );
  console.log(
    `      · growthCost ${growthCost === null ? "null (≥2 años)" : growthCost} | zona NORMAL | chart DE_PIE`,
  );

  // ---- FINAL ----
  console.log("\n" + "=".repeat(60));
  console.log("  ✅ SEED DEMO HISTORIA DEPORTIVA + PEDIÁTRICA COMPLETADO");
  console.log("=".repeat(60));
  console.log(`\n📧 Email nutricionista: ${DEMO_EMAIL}`);
  console.log(`🔑 Password:            ${DEMO_PASSWORD}`);
  console.log(
    `👤 Paciente:            ${PATIENT_FIRST_NAME} ${PATIENT_LAST_NAME} (${patient.id})`,
  );
  console.log(`\n🌐 URLs del dashboard:`);
  console.log(`   /dashboard/patients/${patient.id}/historia-deportiva`);
  console.log(`   /dashboard/patients/${patient.id}/historia-pediatrica`);
  console.log(
    `\n⚠️  IMPORTANTE: Cambiá la contraseña después del primer ingreso.`,
  );
  console.log(
    `⚠️  EJECUTAR después de: npm run seed:sports (catálogo de disciplinas).`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed demo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
