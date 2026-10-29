import { PrismaClient, OrganizationRole, Gender, ActivityLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_NUTRITIONISTS = [
  {
    email: 'nutri.sofia@nutringest.com',
    username: 'nutri.sofia',
    firstName: 'Sofía',
    lastName: 'Valenzuela',
    role: OrganizationRole.CLINIC_ADMIN,
    colorHex: '#4F46E5', // Indigo
    specialty: 'Nutrición Deportiva',
  },
  {
    email: 'nutri.carlos@nutringest.com',
    username: 'nutri.carlos',
    firstName: 'Carlos',
    lastName: 'Mendoza',
    role: OrganizationRole.NUTRITIONIST,
    colorHex: '#059669', // Emerald
    specialty: 'Nutrición Clínica y Renal',
  },
  {
    email: 'nutri.valentina@nutringest.com',
    username: 'nutri.valentina',
    firstName: 'Valentina',
    lastName: 'Ríos',
    role: OrganizationRole.NUTRITIONIST,
    colorHex: '#D97706', // Amber
    specialty: 'Nutrición Pediátrica',
  },
  {
    email: 'nutri.mateo@nutringest.com',
    username: 'nutri.mateo',
    firstName: 'Mateo',
    lastName: 'Silva',
    role: OrganizationRole.NUTRITIONIST,
    colorHex: '#7C3AED', // Violet
    specialty: 'Nutrición Vegetariana & Plant Based',
  },
  {
    email: 'nutri.camila@nutringest.com',
    username: 'nutri.camila',
    firstName: 'Camila',
    lastName: 'Ortega',
    role: OrganizationRole.NUTRITIONIST,
    colorHex: '#DB2777', // Pink
    specialty: 'Nutrición Bariátrica y Metabólica',
  },
];

const DEMO_PATIENTS = [
  { firstName: 'Mariana', lastName: 'Hernández', email: 'mariana.h@gmail.com', phone: '+58 412 111 2233', gender: Gender.FEMALE, birthDate: new Date('1994-05-12'), activityLevel: ActivityLevel.MODERATELY_ACTIVE },
  { firstName: 'Alejandro', lastName: 'Gómez', email: 'alejo.gomez@gmail.com', phone: '+58 414 222 3344', gender: Gender.MALE, birthDate: new Date('1988-11-23'), activityLevel: ActivityLevel.VERY_ACTIVE },
  { firstName: 'Lucía', lastName: 'Fernández', email: 'lucia.fer@gmail.com', phone: '+58 416 333 4455', gender: Gender.FEMALE, birthDate: new Date('2015-03-08'), activityLevel: ActivityLevel.LIGHTLY_ACTIVE },
  { firstName: 'Roberto', lastName: 'Morales', email: 'roberto.m@gmail.com', phone: '+58 424 444 5566', gender: Gender.MALE, birthDate: new Date('1990-08-19'), activityLevel: ActivityLevel.SEDENTARY },
  { firstName: 'Camila', lastName: 'Navarro', email: 'camila.n@gmail.com', phone: '+58 412 555 6677', gender: Gender.FEMALE, birthDate: new Date('1997-01-30'), activityLevel: ActivityLevel.MODERATELY_ACTIVE },
  { firstName: 'Gabriel', lastName: 'Martínez', email: 'gabriel.m@gmail.com', phone: '+58 414 666 7788', gender: Gender.MALE, birthDate: new Date('1985-09-14'), activityLevel: ActivityLevel.VERY_ACTIVE },
  { firstName: 'Daniela', lastName: 'Castillo', email: 'dani.castillo@gmail.com', phone: '+58 416 777 8899', gender: Gender.FEMALE, birthDate: new Date('2001-12-05'), activityLevel: ActivityLevel.LIGHTLY_ACTIVE },
  { firstName: 'Esteban', lastName: 'Rojas', email: 'esteban.r@gmail.com', phone: '+58 424 888 9900', gender: Gender.MALE, birthDate: new Date('1992-06-18'), activityLevel: ActivityLevel.EXTRA_ACTIVE },
  { firstName: 'Valeria', lastName: 'Salazar', email: 'valeria.s@gmail.com', phone: '+58 412 999 0011', gender: Gender.FEMALE, birthDate: new Date('1996-04-25'), activityLevel: ActivityLevel.MODERATELY_ACTIVE },
  { firstName: 'Fernando', lastName: 'Torres', email: 'fernando.t@gmail.com', phone: '+58 414 000 1122', gender: Gender.MALE, birthDate: new Date('1983-07-07'), activityLevel: ActivityLevel.SEDENTARY },
];

async function main() {
  console.log('🌱 iniciando seeding de Clínica Demo, Pacientes y Calendario de Septiembre...');

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // 1. Get or create CLINIC permits
  const permitAdmin = await prisma.permit.upsert({
    where: { id: 'CLINIC_ADMIN' },
    create: {
      id: 'CLINIC_ADMIN',
      name: 'CLINIC_ADMIN',
      description: 'Administrador de Clínica',
      list: [
        'PERMIT_DASHBOARD',
        'MY_CURRENT_ACTION_CREATED',
        'MY_CURRENT_ACTION_UPDATE',
        'MY_CURRENT_ACTION_LIST',
        'MY_CURRENT_ACTION_UNIQUE',
        'DIET_CREATED',
        'DIET_UPDATE',
        'DIET_LIST',
        'DIET_UNIQUE',
        'PATIENT_CREATED',
        'PATIENT_UPDATE',
        'PATIENT_LIST_ALL',
        'PATIENT_LIST_OWN',
        'PATIENT_LIST',
        'PATIENT_UNIQUE',
        'CONSULTATION_LIST_ALL',
        'CONSULTATION_LIST_OWN',
        'FOOD_CREATED',
        'FOOD_LIST',
        'FOOD_LIST_OWN',
        'FOOD_LIST_ALL',
        'FOOD_UNIQUE',
        'MENU_CREATED',
        'MENU_UPDATE',
        'MENU_LIST',
        'MENU_LIST_OWN',
        'MENU_LIST_ALL',
        'MENU_UNIQUE',
        'EXCHANGE_LIST_CREATED',
        'EXCHANGE_LIST_LIST',
        'EXCHANGE_LIST_LIST_OWN',
        'EXCHANGE_LIST_LIST_ALL',
        'EXCHANGE_LIST_UNIQUE',
        'CONDIMENT_LIST',
        'CONDIMENT_LIST_OWN',
        'CONDIMENT_LIST_ALL',
        'INSTITUTIONAL_FOOD_ACCESS',
        'PERMIT_DASHBOARD_TAB_SETTINGS',
      ],
    },
    update: {
      list: [
        'PERMIT_DASHBOARD',
        'MY_CURRENT_ACTION_CREATED',
        'MY_CURRENT_ACTION_UPDATE',
        'MY_CURRENT_ACTION_LIST',
        'MY_CURRENT_ACTION_UNIQUE',
        'DIET_CREATED',
        'DIET_UPDATE',
        'DIET_LIST',
        'DIET_UNIQUE',
        'PATIENT_CREATED',
        'PATIENT_UPDATE',
        'PATIENT_LIST_ALL',
        'PATIENT_LIST_OWN',
        'PATIENT_LIST',
        'PATIENT_UNIQUE',
        'CONSULTATION_LIST_ALL',
        'CONSULTATION_LIST_OWN',
        'FOOD_CREATED',
        'FOOD_LIST',
        'FOOD_LIST_OWN',
        'FOOD_LIST_ALL',
        'FOOD_UNIQUE',
        'MENU_CREATED',
        'MENU_UPDATE',
        'MENU_LIST',
        'MENU_LIST_OWN',
        'MENU_LIST_ALL',
        'MENU_UNIQUE',
        'EXCHANGE_LIST_CREATED',
        'EXCHANGE_LIST_LIST',
        'EXCHANGE_LIST_LIST_OWN',
        'EXCHANGE_LIST_LIST_ALL',
        'EXCHANGE_LIST_UNIQUE',
        'CONDIMENT_LIST',
        'CONDIMENT_LIST_OWN',
        'CONDIMENT_LIST_ALL',
        'INSTITUTIONAL_FOOD_ACCESS',
        'PERMIT_DASHBOARD_TAB_SETTINGS',
      ],
    },
  });

  const permitStaff = await prisma.permit.upsert({
    where: { id: 'CLINIC_STAFF' },
    create: {
      id: 'CLINIC_STAFF',
      name: 'CLINIC_STAFF',
      description: 'Nutricionista de Clínica (Staff)',
      list: [
        'PERMIT_DASHBOARD',
        'MY_CURRENT_ACTION_CREATED',
        'MY_CURRENT_ACTION_UPDATE',
        'MY_CURRENT_ACTION_LIST',
        'MY_CURRENT_ACTION_UNIQUE',
        'DIET_CREATED',
        'DIET_UPDATE',
        'DIET_LIST',
        'DIET_UNIQUE',
        'PATIENT_CREATED',
        'PATIENT_UPDATE',
        'PATIENT_LIST_OWN',
        'PATIENT_LIST',
        'PATIENT_UNIQUE',
        'CONSULTATION_LIST_OWN',
        'FOOD_CREATED',
        'FOOD_LIST',
        'FOOD_LIST_OWN',
        'FOOD_LIST_ALL',
        'FOOD_UNIQUE',
        'MENU_CREATED',
        'MENU_UPDATE',
        'MENU_LIST',
        'MENU_LIST_OWN',
        'MENU_LIST_ALL',
        'MENU_UNIQUE',
        'EXCHANGE_LIST_CREATED',
        'EXCHANGE_LIST_LIST',
        'EXCHANGE_LIST_LIST_OWN',
        'EXCHANGE_LIST_LIST_ALL',
        'EXCHANGE_LIST_UNIQUE',
        'CONDIMENT_LIST',
        'CONDIMENT_LIST_OWN',
        'CONDIMENT_LIST_ALL',
        'INSTITUTIONAL_FOOD_ACCESS',
        'PERMIT_DASHBOARD_TAB_SETTINGS',
      ],
    },
    update: {
      list: [
        'PERMIT_DASHBOARD',
        'MY_CURRENT_ACTION_CREATED',
        'MY_CURRENT_ACTION_UPDATE',
        'MY_CURRENT_ACTION_LIST',
        'MY_CURRENT_ACTION_UNIQUE',
        'DIET_CREATED',
        'DIET_UPDATE',
        'DIET_LIST',
        'DIET_UNIQUE',
        'PATIENT_CREATED',
        'PATIENT_UPDATE',
        'PATIENT_LIST_OWN',
        'PATIENT_LIST',
        'PATIENT_UNIQUE',
        'CONSULTATION_LIST_OWN',
        'FOOD_CREATED',
        'FOOD_LIST',
        'FOOD_LIST_OWN',
        'FOOD_LIST_ALL',
        'FOOD_UNIQUE',
        'MENU_CREATED',
        'MENU_UPDATE',
        'MENU_LIST',
        'MENU_LIST_OWN',
        'MENU_LIST_ALL',
        'MENU_UNIQUE',
        'EXCHANGE_LIST_CREATED',
        'EXCHANGE_LIST_LIST',
        'EXCHANGE_LIST_LIST_OWN',
        'EXCHANGE_LIST_LIST_ALL',
        'EXCHANGE_LIST_UNIQUE',
        'CONDIMENT_LIST',
        'CONDIMENT_LIST_OWN',
        'CONDIMENT_LIST_ALL',
        'INSTITUTIONAL_FOOD_ACCESS',
        'PERMIT_DASHBOARD_TAB_SETTINGS',
      ],
    },
  });

  // 2. Ensure CLINIC Subscription Plan exists
  const clinicaPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'Clinica' },
    create: {
      id: 'Clinica',
      name: 'Clínica',
      description: 'Solución integral para clínicas y equipos de nutricionistas con herramientas colaborativas.',
      price: 99.99,
      selected: true,
      content: [],
    },
    update: {},
  });

  // 3. Create/Update users for the 5 nutritionists
  const createdUsers: any[] = [];
  for (let i = 0; i < DEMO_NUTRITIONISTS.length; i++) {
    const n = DEMO_NUTRITIONISTS[i];
    let user = await prisma.user.findUnique({ where: { email: n.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: n.email,
          username: n.username,
          password: defaultPasswordHash,
          firstName: n.firstName,
          lastName: n.lastName,
          fullName: `${n.firstName} ${n.lastName}`,
          permitId: n.role === OrganizationRole.CLINIC_ADMIN || n.role === 'ADMIN' || (n.role as any) === 'CLINIC_ADMIN' ? permitAdmin.id : permitStaff.id,
          status: 'ACTIVE',
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: n.username,
          password: defaultPasswordHash,
          permitId: n.role === OrganizationRole.CLINIC_ADMIN || n.role === 'ADMIN' || (n.role as any) === 'CLINIC_ADMIN' ? permitAdmin.id : permitStaff.id,
          status: 'ACTIVE',
        },
      });
    }

    // Wallet
    await prisma.userWallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: 0.0 },
      update: {},
    });

    // Nutritionist Profile
    const nutProfile = await prisma.nutritionist.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        licenseCode: `LIC-CLINIC-${i + 1}00`,
        specialty: n.specialty,
      },
      update: {
        specialty: n.specialty,
      },
    });

    createdUsers.push({ ...n, userId: user.id, nutritionistProfileId: nutProfile.id });
  }

  // 4. Create Clinic Organization (5 seats)
  let org = await prisma.organization.findFirst({
    where: { name: 'Centro Nutricional Santa María' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Centro Nutricional Santa María',
        taxId: 'J-12345678-9',
        logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300',
        maxSeats: 5,
        status: 'ACTIVE',
      },
    });
  }

  // 5. Link Members to Organization with assigned colors
  for (const u of createdUsers) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: u.userId,
        },
      },
      update: {
        role: u.role,
        colorHex: u.colorHex,
        status: 'ACTIVE',
      },
      create: {
        organizationId: org.id,
        userId: u.userId,
        role: u.role,
        colorHex: u.colorHex,
        status: 'ACTIVE',
      },
    });
  }

  // 5.1. Create Subscriptions (Multi-Subscription Architecture)
  // Admin (Sofía) gets workspace subscription covering the clinic
  const adminUser = createdUsers[0]; // Sofía
  await prisma.subscription.upsert({
    where: { id: 'sub-workspace-admin' },
    create: {
      id: 'sub-workspace-admin',
      userId: adminUser.userId,
      organizationId: org.id, // Workspace subscription
      planId: clinicaPlan.id,
      status: 'ACTIVE',
      autoRenew: true,
    },
    update: {
      planId: clinicaPlan.id,
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  // Carlos gets personal subscription (demo multi-subscription scenario)
  const carlosUser = createdUsers[1]; // Carlos
  await prisma.subscription.upsert({
    where: { id: 'sub-personal-carlos' },
    create: {
      id: 'sub-personal-carlos',
      userId: carlosUser.userId,
      organizationId: null, // Personal subscription
      planId: clinicaPlan.id,
      status: 'ACTIVE',
      autoRenew: true,
    },
    update: {
      planId: clinicaPlan.id,
      organizationId: null,
      status: 'ACTIVE',
    },
  });
  // Note: Valentina, Mateo, Camila do NOT have subscriptions - admin covers them

  // 6. Create 10 Demo Patients linked to Clinic & Nutritionists
  const createdPatients: any[] = [];
  let patientPermit = await prisma.permit.findUnique({ where: { id: 'PATIENT' } });

  for (let i = 0; i < DEMO_PATIENTS.length; i++) {
    const pData = DEMO_PATIENTS[i];
    const assignedNutri = createdUsers[i % createdUsers.length];

    let pUser = await prisma.user.findFirst({ where: { email: pData.email } });
    if (!pUser) {
      pUser = await prisma.user.create({
        data: {
          firstName: pData.firstName,
          lastName: pData.lastName,
          email: pData.email,
          username: pData.email.split('@')[0],
          password: defaultPasswordHash,
          permitId: patientPermit ? patientPermit.id : 'PATIENT',
          status: 'ACTIVE',
        },
      });
    }

    let patient = await prisma.patient.findFirst({
      where: { email: pData.email },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          userId: pUser.id,
          firstName: pData.firstName,
          lastName: pData.lastName,
          email: pData.email,
          phone: pData.phone,
          gender: pData.gender,
          birthDate: pData.birthDate,
          activityLevel: pData.activityLevel,
          organizationId: org.id,
          createdById: adminUser.userId,
        },
      });
    } else {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          userId: pUser.id,
          organizationId: org.id,
          createdById: adminUser.userId,
        },
      });
    }

    // Link Patient to Nutritionist via PatientNutritionist pivot
    await prisma.patientNutritionist.upsert({
      where: {
        patientId_nutritionistId: {
          patientId: patient.id,
          nutritionistId: assignedNutri.nutritionistProfileId,
        },
      },
      create: {
        patientId: patient.id,
        nutritionistId: assignedNutri.nutritionistProfileId,
        assignedById: adminUser.nutritionistProfileId,
      },
      update: {},
    });

    createdPatients.push(patient);
  }

  // 7. Clear old clinic appointments to avoid clutter
  const patientIds = createdPatients.map((p) => p.id);
  await prisma.consultation.deleteMany({
    where: { patientId: { in: patientIds } },
  });
  await prisma.appointment.deleteMany({
    where: { organizationId: org.id },
  });

  // 8. Schedule multiple appointments & consultations (3-4 time slots per day) continuously from TODAY (August 28, 2026) to September 15, 2026
  console.log('📅 Agendando múltiples citas y consultas (3 a 4 por día) desde hoy (28 de Agosto) hasta el 15 de Septiembre 2026...');

  const timeSlots = [9, 11, 14, 16]; // 4 time slots per day
  const startDate = new Date(2026, 7, 28); // August 28, 2026
  const endDate = new Date(2026, 8, 15);   // September 15, 2026

  let currentDate = new Date(startDate);
  let dayOffset = 0;
  let totalSeeded = 0;

  while (currentDate <= endDate) {
    for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
      const hour = timeSlots[slotIdx];
      for (let nIdx = 0; nIdx < createdUsers.length; nIdx++) {
        const u = createdUsers[nIdx];
        const patient = createdPatients[(dayOffset * 4 + slotIdx + nIdx) % createdPatients.length];

        const appointmentDate = new Date(currentDate);
        appointmentDate.setHours(hour, 0, 0, 0);

        await prisma.appointment.create({
          data: {
            organizationId: org.id,
            nutritionistId: u.userId,
            patientId: patient.id,
            scheduledAt: appointmentDate,
            duration: 45,
            status: 'SCHEDULED',
            reason: `Consulta ${u.specialty}`,
            boxName: `Consultorio ${nIdx + 1}`,
            notes: `Sesión agendada para ${patient.firstName} ${patient.lastName} con Dra./Dr. ${u.firstName} ${u.lastName}`,
          },
        });

        await prisma.consultation.create({
          data: {
            patientId: patient.id,
            nutritionistId: u.nutritionistProfileId,
            scheduledAt: appointmentDate,
            status: 'SCHEDULED',
            type: slotIdx === 0 ? 'FIRST_TIME' : 'FOLLOW_UP',
            reason: `Consulta ${u.specialty}`,
            notes: `Sesión agendada para ${patient.firstName} ${patient.lastName} con Dra./Dr. ${u.firstName} ${u.lastName}`,
          },
        });

        totalSeeded++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
    dayOffset++;
  }

  console.log(`✅ Clínica Demo: Se crearon 10 Pacientes y se agendaron ${totalSeeded} citas y consultas continuas (3-4 horarios diarios) desde hoy (28 de Agosto) hasta el 15 de Septiembre 2026.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
