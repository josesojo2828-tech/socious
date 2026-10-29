// import { faker } from '@faker-js/faker';

// const prisma = new PrismaClient();

// // Configuración
// const NUTRICIONISTA_EMAIL = 'admin@nutringest.com'; // Email del usuario al que asignaremos los pacientes
// const CANTIDAD_PACIENTES = 5;
// const HISTORIAL_MESES = 3; // Cuántos meses de historia crear

// async function main() {
//   console.log('🏥 Iniciando Seeding de Pacientes y Dietas...');

//   // 1. BUSCAR NUTRICIONISTA (DUEÑO DE LOS DATOS)
//   let nutritionist = await prisma.user.findUnique({
//     where: { email: NUTRICIONISTA_EMAIL }
//   });

//   // Fallback: Si no existe el admin, usamos el primer usuario que encontremos
//   if (!nutritionist) {
//     console.log(`⚠️ No se encontró al usuario ${NUTRICIONISTA_EMAIL}. Buscando cualquier usuario...`);
//     nutritionist = await prisma.user.findFirst();
//   }

//   if (!nutritionist) {
//     throw new Error('❌ No se encontró ningún usuario (Nutricionista) en la base de datos. Crea uno primero.');
//   }

//   console.log(`👨‍⚕️ Asignando pacientes al Nutricionista: ${nutritionist.firstName} ${nutritionist.lastName} (${nutritionist.email})`);

//   // 2. PREPARAR ALIMENTOS (Necesarios para crear dietas)
//   // Buscamos algunos alimentos existentes para usarlos en el plan
//   const foods = await prisma.foodItem.findMany({ take: 10 });

//   if (foods.length === 0) {
//       console.warn('⚠️ No hay alimentos en la base de datos. Las dietas se crearán vacías.');
//   }

//   // 3. GENERAR PACIENTES
//   for (let i = 0; i < CANTIDAD_PACIENTES; i++) {
//     const sexType = faker.person.sexType(); // 'female' | 'male'
//     const gender = sexType === 'female' ? Gender.FEMALE : Gender.MALE;
//     const firstName = faker.person.firstName(sexType);
//     const lastName = faker.person.lastName();

//     // Crear Paciente
//     const patient = await prisma.patient.create({
//       data: {
//         nutritionistId: nutritionist.id,
//         firstName: firstName,
//         lastName: lastName,
//         email: faker.internet.email({ firstName, lastName }).toLowerCase(),
//         phone: faker.phone.number(),
//         gender: gender,
//         birthDate: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
//         occupation: faker.person.jobTitle(),
//         activityLevel: faker.helpers.arrayElement(Object.values(ActivityLevel)),
//         medicalHistory: {
//             allergies: faker.helpers.maybe(() => [faker.science.chemicalElement().name], { probability: 0.3 }),
//             pathologies: faker.helpers.maybe(() => ['Hipertensión', 'Diabetes Tipo 2'], { probability: 0.2 }),
//             notes: faker.lorem.sentence()
//         }
//       }
//     });

//     console.log(`   👤 Paciente creado: ${firstName} ${lastName}`);

//     // 4. CREAR HISTORIAL ANTROPOMÉTRICO (Simular progreso)
//     // Generamos 3 mediciones: Hace 3 meses, Hace 1 mes, Hoy.
//     // Simulamos que el paciente está bajando de peso.

//     let currentWeight = faker.number.float({ min: 70, max: 100, fractionDigits: 1 });
//     const heightCm = faker.number.int({ min: 155, max: 190 });
//     const heightM = heightCm / 100;

//     for (let month = HISTORIAL_MESES; month >= 0; month--) {
//         const date = new Date();
//         date.setMonth(date.getMonth() - month); // Retroceder en el tiempo

//         // El peso baja 1.5kg por mes aprox
//         const weight = currentWeight + (month * 1.5);
//         const bmi = weight / (heightM * heightM);

//         await prisma.anthropometricAssessment.create({
//             data: {
//                 patientId: patient.id,
//                 date: date,
//                 weight: parseFloat(weight.toFixed(2)),
//                 height: heightCm,
//                 bmi: parseFloat(bmi.toFixed(2)),
//                 // Datos ficticios de pliegues
//                 tricipital: faker.number.float({ min: 10, max: 25, fractionDigits: 1 }),
//                 subscapular: faker.number.float({ min: 12, max: 30, fractionDigits: 1 }),
//                 suprailiac: faker.number.float({ min: 15, max: 35, fractionDigits: 1 }),
//                 waist: faker.number.float({ min: 70, max: 110, fractionDigits: 1 }),
//                 hip: faker.number.float({ min: 90, max: 120, fractionDigits: 1 }),
//                 notes: month === 0 ? 'Medición actual' : 'Control mensual'
//             }
//         });
//     }

//     // 5. CREAR PLAN DE ALIMENTACIÓN (Solo si hay alimentos)
//     // Le creamos una dieta al primer y tercer paciente para probar variedad
//     if ((i === 0 || i === 2) && foods.length > 0) {
//         console.log(`      🥗 Asignando Dieta a ${firstName}...`);

//         await prisma.dietPlan.create({
//             data: {
//                 patientId: patient.id,
//                 name: `Plan Personalizado - ${firstName}`,
//                 startDate: new Date(),
//                 status: DietStatus.ACTIVE,
//                 totalKcal: 2000,
//                 macroSplit: { protein: 30, carbs: 40, fat: 30 },
//                 days: {
//                     create: [
//                         // Día 1: Lunes
//                         {
//                             name: 'Lunes (Entrenamiento)',
//                             order: 1,
//                             meals: {
//                                 create: [
//                                     {
//                                         name: 'Desayuno',
//                                         order: 1,
//                                         foods: {
//                                             create: {
//                                                 foodId: foods[0].id, // Primer alimento disponible
//                                                 quantity: 2,
//                                                 portionName: 'Porciones',
//                                                 calculatedGrams: 200 // Ejemplo
//                                             }
//                                         }
//                                     },
//                                     {
//                                         name: 'Almuerzo',
//                                         order: 2,
//                                         foods: {
//                                             create: {
//                                                 foodId: foods[1]?.id || foods[0].id,
//                                                 quantity: 150,
//                                                 portionName: 'g',
//                                                 calculatedGrams: 150
//                                             }
//                                         }
//                                     }
//                                 ]
//                             }
//                         },
//                         // Día 2: Martes (Estructura vacía para rellenar en UI)
//                         {
//                             name: 'Martes (Descanso)',
//                             order: 2,
//                             meals: {
//                                 create: [
//                                     { name: 'Desayuno', order: 1 },
//                                     { name: 'Almuerzo', order: 2 },
//                                     { name: 'Cena', order: 3 }
//                                 ]
//                             }
//                         }
//                     ]
//                 }
//             }
//         });
//     }
//   }

//   console.log('✅ Seeding de Pacientes finalizado correctamente.');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
