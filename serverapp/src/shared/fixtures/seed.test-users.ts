import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando creación de datos de prueba para multi-inquilino...");

  // 1. Asegurar la existencia de los permisos/roles básicos
  console.log("Asegurando permisos básicos...");
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
        "DIET_CREATED",
        "DIET_UPDATE",
        "DIET_LIST",
        "DIET_UNIQUE",
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
        "MY_CURRENT_ACTION_CREATED",
        "MY_CURRENT_ACTION_UPDATE",
        "MY_CURRENT_ACTION_LIST",
        "MY_CURRENT_ACTION_UNIQUE",
        "DIET_LIST",
        "DIET_UNIQUE",
        "MENU_LIST",
        "MENU_UNIQUE",
        "EXCHANGE_LIST_LIST",
        "EXCHANGE_LIST_UNIQUE",
      ],
    },
    update: {},
  });

  // Asegurar plan PRO
  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { id: "PRO" },
    create: {
      id: "PRO",
      name: "PRO",
      description: "Plan profesional individual",
      price: 11.99,
      selected: true,
      content: [],
    },
    update: {},
  });

  const seedPassword = process.env.SEED_TEST_USER_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      "SEED_TEST_USER_PASSWORD no está definido. Definilo antes de correr el seed de usuarios de prueba.",
    );
  }
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  // 2. Crear 3 Nutricionistas
  console.log("Creando nutricionistas...");
  const nutritionists: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const email = `nutri${i}@example.com`;
    const username = `nutri${i}`;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        username,
        password: passwordHash,
        firstName: "Nutri",
        lastName: `Número ${i}`,
        fullName: `Nutri Número ${i}`,
        permitId: userPermit.id,
        status: "ACTIVE",
      },
      update: {
        password: passwordHash,
        status: "ACTIVE",
      },
    });

    const existingWallet = await prisma.userWallet.findUnique({
      where: { userId: user.id },
    });
    if (!existingWallet) {
      await prisma.userWallet.create({
        data: {
          userId: user.id,
          balance: 0.0,
        },
      });
    }

    const nutritionist = await prisma.nutritionist.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        licenseCode: `LIC-${i}00${i}00`,
        specialty: "Nutrición Clínica y Deportiva",
      },
      update: {},
    });

    // Asignar suscripción PRO activa
    await prisma.subscription.upsert({
      where: { id: `sub-nutri-${i}` },
      create: {
        id: `sub-nutri-${i}`,
        userId: user.id,
        planId: proPlan.id,
        status: "ACTIVE",
        autoRenew: true,
      },
      update: {
        status: "ACTIVE",
      },
    });

    console.log(`Nutricionista ${i} creado: ${email} (Password: 123456)`);
    nutritionists.push(nutritionist);
  }

  // 3. Crear 1 Paciente asignado al primer Nutricionista
  console.log("Creando paciente de prueba...");
  const patientEmail = "paciente@example.com";
  const patientUser = await prisma.user.upsert({
    where: { email: patientEmail },
    create: {
      email: patientEmail,
      username: "paciente",
      password: passwordHash,
      firstName: "Paciente",
      lastName: "Prueba",
      fullName: "Paciente Prueba",
      permitId: patientPermit.id,
      status: "ACTIVE",
    },
    update: {
      password: passwordHash,
      status: "ACTIVE",
    },
  });

  const existingPatientWallet = await prisma.userWallet.findUnique({
    where: { userId: patientUser.id },
  });
  if (!existingPatientWallet) {
    await prisma.userWallet.create({
      data: {
        userId: patientUser.id,
        balance: 0.0,
      },
    });
  }

  const patientProfile = await prisma.patient.findFirst({
    where: {
      email: patientEmail,
    },
  });

  if (!patientProfile) {
    const patient = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: "Paciente",
        lastName: "Prueba",
        email: patientEmail,
        phone: "+5491122334455",
        gender: "MALE",
        birthDate: new Date("1995-05-15"),
      },
    });

    await prisma.patientNutritionist.create({
      data: {
        patientId: patient.id,
        nutritionistId: nutritionists[0].id,
        role: "PRIMARY",
      },
    });
  }

  console.log(`Paciente creado: ${patientEmail} (Password: 123456) asignado a ${nutritionists[0].id}`);
  console.log("Seeding completado con éxito!");
}

main()
  .catch((e) => {
    console.error("Error ejecutando el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
