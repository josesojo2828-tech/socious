/**
 * seed.social-media.ts
 *
 * Seed para datos de producción con 20 pacientes diversos para capturas de redes sociales.
 * Incluye: adultos, pediátricos, deportistas, pacientes con condiciones especiales.
 * Progresión de peso impresionantte para screenshots.
 *
 * Idempotente: usa upsert con IDs fijos para evitar duplicados.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/shared/fixtures/seed.social-media.ts
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// =============================================================================
// CONFIGURACIÓN
// =============================================================================
const TARGET_EMAIL = "josesojo2828@gmail.com";

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

function futureDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function shareToken(): string {
  return Math.random().toString(36).substring(2, 14);
}

function generatePhone(): string {
  const codes = ["0412", "0414", "0416", "0424", "0426"];
  const code = codes[Math.floor(Math.random() * codes.length)];
  const num = Math.floor(1000000 + Math.random() * 9000000);
  return `+58${code}${num}`;
}

// =============================================================================
// DATOS DE PACIENTES (20 pacientes diversos)
// =============================================================================
const PATIENT_DEFS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // GRUPO 1: ADULTOS CON PROGRESIÓN NOTABLE (6 pacientes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "social-patient-001-maria-garcia",
    firstName: "María",
    lastName: "García",
    gender: "FEMALE" as const,
    age: 32,
    occupation: "Abogada",
    activityLevel: "LIGHTLY_ACTIVE" as const,
    maritalStatus: "Soltera",
    medicalHistory: { allergies: [], pathologies: [], notes: "Sedentaria, estrés laboral" },
    height: 162,
    profile: "Pérdida de peso - Transformación completa",
    anthropometries: [
      { monthsAgo: 3, weight: 78, waist: 92, hip: 108, fatPct: 34, muscleMass: 28 },
      { monthsAgo: 2, weight: 75, waist: 89, hip: 105, fatPct: 32, muscleMass: 29 },
      { monthsAgo: 1, weight: 72, waist: 86, hip: 102, fatPct: 30, muscleMass: 30 },
      { monthsAgo: 0, weight: 69, waist: 83, hip: 100, fatPct: 28, muscleMass: 31 },
    ],
    goals: [
      { title: "Bajar de peso", type: "WEIGHT" as const, start: 78, target: 65, current: 69 },
      { title: "Reducir cintura", type: "MEASUREMENT" as const, start: 92, target: 78, current: 83 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta inicial - desea bajar de peso" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control mensual - buena evolución" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control mensual - ajuste de porciones" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control de fin de plan" },
    ],
    plan: { name: "Plan Pérdida de Peso - María", kcal: 1500, protein: 110, carbs: 140, fats: 45 },
  },
  {
    id: "social-patient-002-carlos-lopez",
    firstName: "Carlos",
    lastName: "López",
    gender: "MALE" as const,
    age: 45,
    occupation: "Empresario",
    activityLevel: "SEDENTARY" as const,
    maritalStatus: "Casado",
    medicalHistory: { allergies: ["Mariscos"], pathologies: ["Hipertensión"], notes: "Diagnosticado hace 1 año" },
    height: 175,
    profile: "Control de Hipertensión + Pérdida de peso",
    anthropometries: [
      { monthsAgo: 4, weight: 98, waist: 110, hip: 105, fatPct: 35, muscleMass: 32 },
      { monthsAgo: 3, weight: 95, waist: 107, hip: 103, fatPct: 33, muscleMass: 33 },
      { monthsAgo: 2, weight: 92, waist: 104, hip: 101, fatPct: 31, muscleMass: 34 },
      { monthsAgo: 1, weight: 89, waist: 101, hip: 99, fatPct: 29, muscleMass: 35 },
      { monthsAgo: 0, weight: 86, waist: 98, hip: 97, fatPct: 27, muscleMass: 36 },
    ],
    goals: [
      { title: "Bajar de peso", type: "WEIGHT" as const, start: 98, target: 85, current: 86 },
      { title: "Reducir presión arterial", type: "OTHER" as const, start: 150, target: 130, current: 135 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 120, reason: "Consulta inicial - hipertensión y sobrepeso" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Control - ajuste de sodio" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - mejorando presión" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - excelente progreso" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -10, reason: "Control de mantenimiento" },
    ],
    plan: { name: "Plan Hipertensión - Carlos", kcal: 1800, protein: 130, carbs: 160, fats: 55 },
  },
  {
    id: "social-patient-003-ana-martinez",
    firstName: "Ana",
    lastName: "Martínez",
    gender: "FEMALE" as const,
    age: 28,
    occupation: "Doctora",
    activityLevel: "LIGHTLY_ACTIVE" as const,
    maritalStatus: "Casada",
    medicalHistory: { allergies: [], pathologies: [], notes: "Post-parto, desea recuperar figura" },
    height: 168,
    profile: "Recuperación Post-Parto",
    anthropometries: [
      { monthsAgo: 3, weight: 82, waist: 95, hip: 110, fatPct: 38, muscleMass: 27 },
      { monthsAgo: 2, weight: 79, waist: 92, hip: 107, fatPct: 35, muscleMass: 28 },
      { monthsAgo: 1, weight: 76, waist: 89, hip: 104, fatPct: 32, muscleMass: 29 },
      { monthsAgo: 0, weight: 73, waist: 86, hip: 102, fatPct: 30, muscleMass: 30 },
    ],
    goals: [
      { title: "Recuperar peso pre-embarazo", type: "WEIGHT" as const, start: 82, target: 68, current: 73 },
      { title: "Reducir cintura", type: "MEASUREMENT" as const, start: 95, target: 78, current: 86 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta post-parto" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - retomando actividad" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - muy buen progreso" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control mensual" },
    ],
    plan: { name: "Plan Post-Parto - Ana", kcal: 1600, protein: 120, carbs: 150, fats: 50 },
  },
  {
    id: "social-patient-004-roberto-sanchez",
    firstName: "Roberto",
    lastName: "Sánchez",
    gender: "MALE" as const,
    age: 52,
    occupation: "Ingeniero",
    activityLevel: "MODERATELY_ACTIVE" as const,
    maritalStatus: "Divorciado",
    medicalHistory: { allergies: [], pathologies: ["Diabetes tipo 2"], notes: "Control glucémico" },
    height: 170,
    profile: "Control de Diabetes tipo 2",
    anthropometries: [
      { monthsAgo: 4, weight: 92, waist: 106, hip: 100, fatPct: 33, muscleMass: 30 },
      { monthsAgo: 3, weight: 90, waist: 104, hip: 99, fatPct: 31, muscleMass: 31 },
      { monthsAgo: 2, weight: 88, waist: 102, hip: 98, fatPct: 29, muscleMass: 32 },
      { monthsAgo: 1, weight: 86, waist: 100, hip: 97, fatPct: 27, muscleMass: 33 },
      { monthsAgo: 0, weight: 84, waist: 98, hip: 96, fatPct: 25, muscleMass: 34 },
    ],
    goals: [
      { title: "Controlar glucosa", type: "OTHER" as const, start: 180, target: 110, current: 120 },
      { title: "Bajar de peso", type: "WEIGHT" as const, start: 92, target: 80, current: 84 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 120, reason: "Consulta inicial - diabetes" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Control - ajuste de carbohidratos" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - mejorando glucosa" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - excelente evolución" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -8, reason: "Control de rutina" },
    ],
    plan: { name: "Plan Diabetes - Roberto", kcal: 1700, protein: 120, carbs: 130, fats: 50 },
  },
  {
    id: "social-patient-005-laura-diaz",
    firstName: "Laura",
    lastName: "Díaz",
    gender: "FEMALE" as const,
    age: 35,
    occupation: "Profesora de yoga",
    activityLevel: "MODERATELY_ACTIVE" as const,
    maritalStatus: "Soltera",
    medicalHistory: { allergies: ["Gluten"], pathologies: [], notes: "Intolerancia al gluten" },
    height: 165,
    profile: "Nutrición sin gluten + Tonificación",
    anthropometries: [
      { monthsAgo: 3, weight: 68, waist: 82, hip: 98, fatPct: 30, muscleMass: 27 },
      { monthsAgo: 2, weight: 67, waist: 81, hip: 97, fatPct: 29, muscleMass: 27.5 },
      { monthsAgo: 1, weight: 66, waist: 80, hip: 96, fatPct: 28, muscleMass: 28 },
      { monthsAgo: 0, weight: 65, waist: 79, hip: 95, fatPct: 27, muscleMass: 28.5 },
    ],
    goals: [
      { title: "Tonificar cuerpo", type: "MEASUREMENT" as const, start: 30, target: 24, current: 27 },
      { title: "Mantener peso saludable", type: "WEIGHT" as const, start: 68, target: 63, current: 65 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - intolerancia gluten" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste de plan" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - buena evolución" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control mensual" },
    ],
    plan: { name: "Plan Sin Gluten - Laura", kcal: 1650, protein: 115, carbs: 155, fats: 48 },
  },
  {
    id: "social-patient-006-fernando-morales",
    firstName: "Fernando",
    lastName: "Morales",
    gender: "MALE" as const,
    age: 38,
    occupation: "Vendedor",
    activityLevel: "SEDENTARY" as const,
    maritalStatus: "Casado",
    medicalHistory: { allergies: [], pathologies: ["Colesterol alto"], notes: "Dislipidemia" },
    height: 178,
    profile: "Control de Colesterol + Pérdida de peso",
    anthropometries: [
      { monthsAgo: 3, weight: 105, waist: 112, hip: 108, fatPct: 36, muscleMass: 33 },
      { monthsAgo: 2, weight: 102, waist: 109, hip: 106, fatPct: 34, muscleMass: 34 },
      { monthsAgo: 1, weight: 99, waist: 106, hip: 104, fatPct: 32, muscleMass: 35 },
      { monthsAgo: 0, weight: 96, waist: 103, hip: 102, fatPct: 30, muscleMass: 36 },
    ],
    goals: [
      { title: "Bajar de peso", type: "WEIGHT" as const, start: 105, target: 90, current: 96 },
      { title: "Reducir colesterol", type: "OTHER" as const, start: 280, target: 200, current: 220 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - colesterol alto" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste lipídico" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control mensual" },
    ],
    plan: { name: "Plan Colesterol - Fernando", kcal: 1800, protein: 130, carbs: 160, fats: 50 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRUPO 2: PEDIÁTRICOS CON CURVAS (5 pacientes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "social-patient-007-lucas-hernandez",
    firstName: "Lucas",
    lastName: "Hernández",
    gender: "MALE" as const,
    age: 8,
    occupation: "Estudiante",
    activityLevel: "MODERATELY_ACTIVE" as const,
    maritalStatus: undefined,
    medicalHistory: { allergies: [], pathologies: ["Bajo peso"], notes: "Derivado por pediatra" },
    height: 128,
    profile: "Nutrición Pediátrica - Bajo peso",
    anthropometries: [
      { monthsAgo: 3, weight: 22, waist: 56, hip: 60, fatPct: 14, muscleMass: 16 },
      { monthsAgo: 2, weight: 23, waist: 57, hip: 61, fatPct: 15, muscleMass: 16.5 },
      { monthsAgo: 1, weight: 24, waist: 58, hip: 62, fatPct: 15.5, muscleMass: 17 },
      { monthsAgo: 0, weight: 25, waist: 59, hip: 63, fatPct: 16, muscleMass: 17.5 },
    ],
    goals: [
      { title: "Alcanzar peso saludable", type: "WEIGHT" as const, start: 22, target: 26, current: 25 },
      { title: "Comer 5 frutas/verduras al día", type: "HABIT" as const, start: 2, target: 5, current: 4 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - bajo peso (con madre)" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste de plan" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - subiendo de peso" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -3, reason: "Control mensual" },
    ],
    plan: { name: "Plan Pediátrico - Lucas", kcal: 1400, protein: 60, carbs: 180, fats: 40 },
  },
  {
    id: "social-patient-008-sofia-torres",
    firstName: "Sofía",
    lastName: "Torres",
    gender: "FEMALE" as const,
    age: 6,
    occupation: "Estudiante",
    activityLevel: "LIGHTLY_ACTIVE" as const,
    maritalStatus: undefined,
    medicalHistory: { allergies: [], pathologies: ["Sobrepeso"], notes: "Obesidad infantil" },
    height: 118,
    profile: "Nutrición Pediátrica - Sobrepeso",
    anthropometries: [
      { monthsAgo: 3, weight: 32, waist: 64, hip: 68, fatPct: 30, muscleMass: 18 },
      { monthsAgo: 2, weight: 31, waist: 63, hip: 67, fatPct: 29, muscleMass: 18.5 },
      { monthsAgo: 1, weight: 30, waist: 62, hip: 66, fatPct: 28, muscleMass: 19 },
      { monthsAgo: 0, weight: 29, waist: 61, hip: 65, fatPct: 27, muscleMass: 19.5 },
    ],
    goals: [
      { title: "Alcanzar peso saludable", type: "WEIGHT" as const, start: 32, target: 27, current: 29 },
      { title: "Reducir tiempo de pantalla", type: "HABIT" as const, start: 4, target: 1.5, current: 2.5 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - sobrepeso (con madre)" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - plan familiar" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - bajando peso" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control mensual" },
    ],
    plan: { name: "Plan Pediátrico - Sofía", kcal: 1300, protein: 55, carbs: 160, fats: 38 },
  },
  {
    id: "social-patient-009-mateo-ruiz",
    firstName: "Mateo",
    lastName: "Ruiz",
    gender: "MALE" as const,
    age: 12,
    occupation: "Estudiante",
    activityLevel: "VERY_ACTIVE" as const,
    maritalStatus: undefined,
    medicalHistory: { allergies: [], pathologies: [], notes: "Futbolista juvenil" },
    height: 155,
    profile: "Nutrición Deportiva Pediátrica",
    anthropometries: [
      { monthsAgo: 3, weight: 45, waist: 68, hip: 72, fatPct: 16, muscleMass: 30 },
      { monthsAgo: 2, weight: 46, waist: 68, hip: 73, fatPct: 15.5, muscleMass: 31 },
      { monthsAgo: 1, weight: 47, waist: 69, hip: 74, fatPct: 15, muscleMass: 32 },
      { monthsAgo: 0, weight: 48, waist: 69, hip: 75, fatPct: 14.5, muscleMass: 33 },
    ],
    goals: [
      { title: "Ganar masa muscular", type: "WEIGHT" as const, start: 45, target: 50, current: 48 },
      { title: "Mejorar rendimiento", type: "OTHER" as const, start: 0, target: 1, current: 0.7 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - optimizar rendimiento" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste calórico" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control pre-competencia" },
    ],
    plan: { name: "Plan Deportivo Pediátrico - Mateo", kcal: 2200, protein: 90, carbs: 280, fats: 60 },
  },
  {
    id: "social-patient-010-emma-garcia",
    firstName: "Emma",
    lastName: "García",
    gender: "FEMALE" as const,
    age: 4,
    occupation: "",
    activityLevel: "MODERATELY_ACTIVE" as const,
    maritalStatus: undefined,
    medicalHistory: { allergies: ["Huevo", "Maní"], pathologies: [], notes: "Alergias alimentarias" },
    height: 102,
    profile: "Nutrición Pediátrica - Alergias",
    anthropometries: [
      { monthsAgo: 3, weight: 16, waist: 50, hip: 54, fatPct: 18, muscleMass: 10 },
      { monthsAgo: 2, weight: 16.5, waist: 50.5, hip: 54.5, fatPct: 17.5, muscleMass: 10.5 },
      { monthsAgo: 1, weight: 17, waist: 51, hip: 55, fatPct: 17, muscleMass: 11 },
      { monthsAgo: 0, weight: 17.5, waist: 51.5, hip: 55.5, fatPct: 16.5, muscleMass: 11.5 },
    ],
    goals: [
      { title: "Crecimiento saludable", type: "WEIGHT" as const, start: 16, target: 18, current: 17.5 },
      { title: "Evitar alérgenos", type: "HABIT" as const, start: 0, target: 100, current: 95 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - alergias (con madre)" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste de dieta" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - creciendo bien" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control mensual" },
    ],
    plan: { name: "Plan Pediátrico Sin Alérgenos - Emma", kcal: 1200, protein: 45, carbs: 150, fats: 35 },
  },
  {
    id: "social-patient-011-santiago-torres",
    firstName: "Santiago",
    lastName: "Torres",
    gender: "MALE" as const,
    age: 10,
    occupation: "Estudiante",
    activityLevel: "MODERATELY_ACTIVE" as const,
    maritalStatus: undefined,
    medicalHistory: { allergies: [], pathologies: ["Talla baja"], notes: "Retraso madurativo" },
    height: 135,
    profile: "Nutrición Pediátrica - Estimulación de crecimiento",
    anthropometries: [
      { monthsAgo: 3, weight: 28, waist: 60, hip: 64, fatPct: 17, muscleMass: 18 },
      { monthsAgo: 2, weight: 28.5, waist: 60.5, hip: 64.5, fatPct: 16.5, muscleMass: 18.5 },
      { monthsAgo: 1, weight: 29, waist: 61, hip: 65, fatPct: 16, muscleMass: 19 },
      { monthsAgo: 0, weight: 29.5, waist: 61.5, hip: 65.5, fatPct: 15.5, muscleMass: 19.5 },
    ],
    goals: [
      { title: "Aumentar talla", type: "WEIGHT" as const, start: 135, target: 140, current: 136 },
      { title: "Ganar peso saludable", type: "WEIGHT" as const, start: 28, target: 31, current: 29.5 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - talla baja (con padre)" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - plan de crecimiento" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - creciendo" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -3, reason: "Control mensual" },
    ],
    plan: { name: "Plan Crecimiento - Santiago", kcal: 1800, protein: 75, carbs: 220, fats: 55 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRUPO 3: DEPORTISTAS (4 pacientes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "social-patient-012-diego-lopez",
    firstName: "Diego",
    lastName: "López",
    gender: "MALE" as const,
    age: 24,
    occupation: "Futbolista semiprofesional",
    activityLevel: "EXTRA_ACTIVE" as const,
    maritalStatus: "Soltero",
    medicalHistory: { allergies: [], pathologies: [], notes: "Deportista de alto rendimiento" },
    height: 180,
    profile: "Rendimiento Deportivo - Fútbol",
    anthropometries: [
      { monthsAgo: 3, weight: 75, waist: 80, hip: 94, fatPct: 14, muscleMass: 40 },
      { monthsAgo: 2, weight: 76, waist: 80, hip: 95, fatPct: 13.5, muscleMass: 41 },
      { monthsAgo: 1, weight: 77, waist: 79, hip: 95, fatPct: 13, muscleMass: 42 },
      { monthsAgo: 0, weight: 78, waist: 79, hip: 96, fatPct: 12.5, muscleMass: 43 },
    ],
    goals: [
      { title: "Ganar masa muscular", type: "WEIGHT" as const, start: 40, target: 45, current: 43 },
      { title: "Reducir grasa corporal", type: "MEASUREMENT" as const, start: 14, target: 10, current: 12.5 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - optimizar rendimiento" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste pre-temporada" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - buena respuesta" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control post-competencia" },
    ],
    plan: { name: "Plan Rendimiento Deportivo - Diego", kcal: 3200, protein: 180, carbs: 400, fats: 80 },
  },
  {
    id: "social-patient-013-valentina-ruiz",
    firstName: "Valentina",
    lastName: "Ruiz",
    gender: "FEMALE" as const,
    age: 22,
    occupation: "Corredora de fondo",
    activityLevel: "EXTRA_ACTIVE" as const,
    maritalStatus: "Soltera",
    medicalHistory: { allergies: [], pathologies: [], notes: "Atleta de resistencia" },
    height: 165,
    profile: "Rendimiento Deportivo - Running",
    anthropometries: [
      { monthsAgo: 3, weight: 55, waist: 68, hip: 88, fatPct: 18, muscleMass: 25 },
      { monthsAgo: 2, weight: 55.5, waist: 67.5, hip: 88.5, fatPct: 17.5, muscleMass: 25.5 },
      { monthsAgo: 1, weight: 56, waist: 67, hip: 89, fatPct: 17, muscleMass: 26 },
      { monthsAgo: 0, weight: 56.5, waist: 66.5, hip: 89.5, fatPct: 16.5, muscleMass: 26.5 },
    ],
    goals: [
      { title: "Mejorar tiempo en maratón", type: "OTHER" as const, start: 240, target: 210, current: 225 },
      { title: "Optimizar composición corporal", type: "MEASUREMENT" as const, start: 18, target: 15, current: 16.5 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - optimizar running" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste nutricional" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando tiempos" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control pre-maratón" },
    ],
    plan: { name: "Plan Rendimiento Deportivo - Valentina", kcal: 2600, protein: 140, carbs: 320, fats: 65 },
  },
  {
    id: "social-patient-014-sebastian-diaz",
    firstName: "Sebastián",
    lastName: "Díaz",
    gender: "MALE" as const,
    age: 28,
    occupation: "CrossFit Coach",
    activityLevel: "EXTRA_ACTIVE" as const,
    maritalStatus: "Soltero",
    medicalHistory: { allergies: [], pathologies: [], notes: "Atleta de CrossFit" },
    height: 176,
    profile: "Rendimiento Deportivo - CrossFit",
    anthropometries: [
      { monthsAgo: 3, weight: 82, waist: 82, hip: 98, fatPct: 15, muscleMass: 42 },
      { monthsAgo: 2, weight: 83, waist: 81, hip: 98.5, fatPct: 14.5, muscleMass: 43 },
      { monthsAgo: 1, weight: 84, waist: 80, hip: 99, fatPct: 14, muscleMass: 44 },
      { monthsAgo: 0, weight: 85, waist: 80, hip: 99.5, fatPct: 13.5, muscleMass: 45 },
    ],
    goals: [
      { title: "Ganar masa muscular", type: "WEIGHT" as const, start: 42, target: 47, current: 45 },
      { title: "Reducir grasa corporal", type: "MEASUREMENT" as const, start: 15, target: 12, current: 13.5 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - composición corporal" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste de macros" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - excelente progreso" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control mensual" },
    ],
    plan: { name: "Plan CrossFit - Sebastián", kcal: 3000, protein: 170, carbs: 350, fats: 75 },
  },
  {
    id: "social-patient-015-isabella-morales",
    firstName: "Isabella",
    lastName: "Morales",
    gender: "FEMALE" as const,
    age: 26,
    occupation: "Nadadora",
    activityLevel: "EXTRA_ACTIVE" as const,
    maritalStatus: "Soltera",
    medicalHistory: { allergies: [], pathologies: [], notes: "Nadadora competitiva" },
    height: 172,
    profile: "Rendimiento Deportivo - Natación",
    anthropometries: [
      { monthsAgo: 3, weight: 65, waist: 70, hip: 92, fatPct: 20, muscleMass: 30 },
      { monthsAgo: 2, weight: 65.5, waist: 69.5, hip: 92.5, fatPct: 19.5, muscleMass: 30.5 },
      { monthsAgo: 1, weight: 66, waist: 69, hip: 93, fatPct: 19, muscleMass: 31 },
      { monthsAgo: 0, weight: 66.5, waist: 68.5, hip: 93.5, fatPct: 18.5, muscleMass: 31.5 },
    ],
    goals: [
      { title: "Optimizar composición corporal", type: "MEASUREMENT" as const, start: 20, target: 17, current: 18.5 },
      { title: "Mejorar tiempo en 200m libre", type: "OTHER" as const, start: 125, target: 118, current: 120 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - rendimiento acuático" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste calórico" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control pre-competencia" },
    ],
    plan: { name: "Plan Natación - Isabella", kcal: 2800, protein: 150, carbs: 340, fats: 70 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRUPO 4: CONDICIONES ESPECIALES (5 pacientes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "social-patient-016-camila-herrera",
    firstName: "Camila",
    lastName: "Herrera",
    gender: "FEMALE" as const,
    age: 42,
    occupation: "Contadora",
    activityLevel: "SEDENTARY" as const,
    maritalStatus: "Casada",
    medicalHistory: { allergies: [], pathologies: ["Ansiedad alimentaria"], notes: "Trastorno alimentario controlado" },
    height: 160,
    profile: "Relación sana con la comida",
    anthropometries: [
      { monthsAgo: 3, weight: 70, waist: 88, hip: 102, fatPct: 35, muscleMass: 25 },
      { monthsAgo: 2, weight: 69, waist: 87, hip: 101, fatPct: 34, muscleMass: 25.5 },
      { monthsAgo: 1, weight: 68, waist: 86, hip: 100, fatPct: 33, muscleMass: 26 },
      { monthsAgo: 0, weight: 67, waist: 85, hip: 99, fatPct: 32, muscleMass: 26.5 },
    ],
    goals: [
      { title: "Mejorar relación con comida", type: "OTHER" as const, start: 20, target: 90, current: 70 },
      { title: "Peso saludable", type: "WEIGHT" as const, start: 70, target: 62, current: 67 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - ansiedad alimentaria" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - avance psicológico" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control mensual" },
    ],
    plan: { name: "Plan Relación con Comida - Camila", kcal: 1700, protein: 110, carbs: 160, fats: 55 },
  },
  {
    id: "social-patient-017-daniel-vargas",
    firstName: "Daniel",
    lastName: "Vargas",
    gender: "MALE" as const,
    age: 55,
    occupation: "Pensionado",
    activityLevel: "LIGHTLY_ACTIVE" as const,
    maritalStatus: "Viudo",
    medicalHistory: { allergies: ["Penicilina"], pathologies: ["Hipertensión", "Diabetes tipo 2"], notes: "Polipatología" },
    height: 168,
    profile: "Manejo Nutricional Polipatología",
    anthropometries: [
      { monthsAgo: 4, weight: 88, waist: 104, hip: 100, fatPct: 32, muscleMass: 28 },
      { monthsAgo: 3, weight: 86, waist: 102, hip: 99, fatPct: 31, muscleMass: 28.5 },
      { monthsAgo: 2, weight: 84, waist: 100, hip: 98, fatPct: 30, muscleMass: 29 },
      { monthsAgo: 1, weight: 82, waist: 98, hip: 97, fatPct: 29, muscleMass: 29.5 },
      { monthsAgo: 0, weight: 80, waist: 96, hip: 96, fatPct: 28, muscleMass: 30 },
    ],
    goals: [
      { title: "Controlar glucosa", type: "OTHER" as const, start: 200, target: 120, current: 130 },
      { title: "Controlar presión", type: "OTHER" as const, start: 160, target: 130, current: 138 },
      { title: "Bajar de peso", type: "WEIGHT" as const, start: 88, target: 75, current: 80 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 120, reason: "Consulta - polipatología" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Control - ajuste integral" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - excelente evolución" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -10, reason: "Control de rutina" },
    ],
    plan: { name: "Plan Polipatología - Daniel", kcal: 1600, protein: 110, carbs: 120, fats: 45 },
  },
  {
    id: "social-patient-018-lucia-fernandez",
    firstName: "Lucía",
    lastName: "Fernández",
    gender: "FEMALE" as const,
    age: 30,
    occupation: "Diseñadora",
    activityLevel: "LIGHTLY_ACTIVE" as const,
    maritalStatus: "Soltera",
    medicalHistory: { allergies: ["Lactosa"], pathologies: ["Síndrome de intestino irritable"], notes: "SII diagnosticado" },
    height: 163,
    profile: "Nutrición para SII",
    anthropometries: [
      { monthsAgo: 3, weight: 62, waist: 76, hip: 94, fatPct: 28, muscleMass: 24 },
      { monthsAgo: 2, weight: 61.5, waist: 75.5, hip: 93.5, fatPct: 27.5, muscleMass: 24.5 },
      { monthsAgo: 1, weight: 61, waist: 75, hip: 93, fatPct: 27, muscleMass: 25 },
      { monthsAgo: 0, weight: 60.5, waist: 74.5, hip: 92.5, fatPct: 26.5, muscleMass: 25.5 },
    ],
    goals: [
      { title: "Controlar síntomas SII", type: "OTHER" as const, start: 20, target: 80, current: 65 },
      { title: "Peso saludable", type: "WEIGHT" as const, start: 62, target: 58, current: 60.5 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - SII" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste FODMAP" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control mensual" },
    ],
    plan: { name: "Plan SII - Lucía", kcal: 1600, protein: 100, carbs: 150, fats: 50 },
  },
  {
    id: "social-patient-019-miguel-torres",
    firstName: "Miguel",
    lastName: "Torres",
    gender: "MALE" as const,
    age: 67,
    occupation: "Jubilado",
    activityLevel: "SEDENTARY" as const,
    maritalStatus: "Casado",
    medicalHistory: { allergies: [], pathologies: ["Artrosis", "Osteoporosis"], notes: "Paciente geriátrico" },
    height: 170,
    profile: "Nutrición Geriátrica - Salud ósea",
    anthropometries: [
      { monthsAgo: 3, weight: 75, waist: 96, hip: 94, fatPct: 30, muscleMass: 28 },
      { monthsAgo: 2, weight: 74.5, waist: 95.5, hip: 93.5, fatPct: 29.5, muscleMass: 28.5 },
      { monthsAgo: 1, weight: 74, waist: 95, hip: 93, fatPct: 29, muscleMass: 29 },
      { monthsAgo: 0, weight: 73.5, waist: 94.5, hip: 92.5, fatPct: 28.5, muscleMass: 29.5 },
    ],
    goals: [
      { title: "Mantener masa muscular", type: "WEIGHT" as const, start: 28, target: 30, current: 29.5 },
      { title: "Mejorar densidad ósea", type: "OTHER" as const, start: 60, target: 85, current: 70 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - salud ósea" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - suplementación" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -7, reason: "Control mensual" },
    ],
    plan: { name: "Plan Geriátrico - Miguel", kcal: 1800, protein: 120, carbs: 170, fats: 55 },
  },
  {
    id: "social-patient-020-andrea-ruiz",
    firstName: "Andrea",
    lastName: "Ruiz",
    gender: "FEMALE" as const,
    age: 48,
    occupation: "Emprendedora",
    activityLevel: "MODERATELY_ACTIVE" as const,
    maritalStatus: "Divorciada",
    medicalHistory: { allergies: [], pathologies: ["Hipotiroidismo"], notes: "En tratamiento con levotiroxina" },
    height: 166,
    profile: "Nutrición para Hipotiroidismo",
    anthropometries: [
      { monthsAgo: 3, weight: 80, waist: 90, hip: 104, fatPct: 34, muscleMass: 28 },
      { monthsAgo: 2, weight: 78, waist: 88, hip: 102, fatPct: 32, muscleMass: 29 },
      { monthsAgo: 1, weight: 76, waist: 86, hip: 100, fatPct: 30, muscleMass: 30 },
      { monthsAgo: 0, weight: 74, waist: 84, hip: 98, fatPct: 28, muscleMass: 31 },
    ],
    goals: [
      { title: "Controlar peso con hipotiroidismo", type: "WEIGHT" as const, start: 80, target: 68, current: 74 },
      { title: "Mejorar metabolismo", type: "OTHER" as const, start: 40, target: 80, current: 65 },
    ],
    consultations: [
      { type: "FIRST_TIME" as const, status: "COMPLETED" as const, daysAgo: 90, reason: "Consulta - hipotiroidismo" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 60, reason: "Control - ajuste de yodo" },
      { type: "FOLLOW_UP" as const, status: "COMPLETED" as const, daysAgo: 30, reason: "Control - mejorando" },
      { type: "FOLLOW_UP" as const, status: "SCHEDULED" as const, daysAgo: -5, reason: "Control mensual" },
    ],
    plan: { name: "Plan Hipotiroidismo - Andrea", kcal: 1650, protein: 115, carbs: 155, fats: 50 },
  },
];

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("=".repeat(60));
  console.log("  🚀 SEED PARA REDES SOCIALES - 20 PACIENTES");
  console.log("=".repeat(60));

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

  // Password para usuarios de pacientes
  const passwordHash = await bcrypt.hash("Paciente123!", 10);

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

  // ---- PASO 3: Buscar usuario existente ----
  console.log("👤 Buscando usuario existente...");
  const demoUser = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
  });

  if (!demoUser) {
    throw new Error(`❌ No se encontró el usuario con email: ${TARGET_EMAIL}`);
  }
  console.log(`   ✅ Usuario encontrado: ${demoUser.email} (${demoUser.id})`);

  // Buscar o crear perfil de nutricionista
  let demoNutri = await prisma.nutritionist.findUnique({
    where: { userId: demoUser.id },
  });

  if (!demoNutri) {
    demoNutri = await prisma.nutritionist.create({
      data: {
        userId: demoUser.id,
        licenseCode: `LIC-${demoUser.id.slice(0, 8).toUpperCase()}`,
        specialty: "Nutrición Clínica, Deportiva, Pediátrica",
      },
    });
    console.log(`   ✅ Perfil de nutricionista creado`);
  } else {
    console.log(`   ✅ Perfil de nutricionista existente: ${demoNutri.licenseCode}`);
  }

  // ---- PASO 4: Pacientes ----
  console.log("\n👥 Creando 20 pacientes diversos...");
  let patientCount = 0;

  for (const def of PATIENT_DEFS) {
    const email = `${def.firstName.toLowerCase()}.${def.lastName.toLowerCase()}@social.paciente.com`;
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - def.age);

    // Crear User para pacientes adultos
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
    const patient = await prisma.patient.upsert({
      where: { id: def.id },
      create: {
        id: def.id,
        userId: patientUserId,
        firstName: def.firstName,
        lastName: def.lastName,
        email,
        phone: generatePhone(),
        gender: def.gender,
        birthDate,
        maritalStatus: def.maritalStatus,
        occupation: def.occupation,
        activityLevel: def.activityLevel,
        medicalHistory: def.medicalHistory,
        createdById: demoUser.id,
      },
      update: {},
    });

    // Asignar a nutricionista
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

    // Anamnesis
    await prisma.anamnesis.upsert({
      where: { patientId: patient.id },
      create: {
        patientId: patient.id,
        familyHistory: { diabetes: false, hypertension: false, obesity: false, dislipidemia: false, cancer: false, anemia: false },
        personalHistory: def.medicalHistory,
        physicalActivity: def.activityLevel === "SEDENTARY" ? "Ninguna" : def.activityLevel === "EXTRA_ACTIVE" ? "Entrenamiento diario" : "Actividad moderada",
        exerciseFrequency: def.activityLevel === "SEDENTARY" ? "No realiza" : def.activityLevel === "EXTRA_ACTIVE" ? "6-7 días/semana" : "3-4 días/semana",
        sleepHours: 7,
        smoking: false,
        alcohol: "No",
        eatingHabits: { mealsPerDay: 4, mealsAtHome: 3, mealSchedule: "Regular" },
        allergies: (def.medicalHistory?.allergies as string[]) || [],
        intolerances: [],
        dislikes: [],
        preferredFoods: ["Pollo", "Arroz", "Verduras"],
        nutritionalDiagnosis: def.profile,
      },
      update: {},
    });

    // Antropometrías
    for (const ax of def.anthropometries) {
      const axDate = monthsAgo(ax.monthsAgo);
      const heightM = def.height / 100;
      const bmi = Math.round((ax.weight / (heightM * heightM)) * 100) / 100;

      await prisma.anthropometry.create({
        data: {
          patientId: patient.id,
          date: axDate,
          weight: ax.weight,
          height: def.height,
          bmi,
          waist: ax.waist,
          hip: ax.hip,
          fatPercentage: ax.fatPct,
          muscleMass: ax.muscleMass,
          createdById: demoUser.id,
        },
      });
    }

    // Metas
    for (const g of def.goals) {
      await prisma.goal.create({
        data: {
          patientId: patient.id,
          title: g.title,
          type: g.type,
          startValue: g.start,
          targetValue: g.target,
          currentValue: g.current,
          deadline: futureDays(90),
          isAchieved: g.current >= g.target,
        },
      });
    }

    // Consultas
    for (const c of def.consultations) {
      const scheduledAt = c.daysAgo < 0 ? futureDays(Math.abs(c.daysAgo)) : new Date(Date.now() - c.daysAgo * 86400000);
      await prisma.consultation.create({
        data: {
          patientId: patient.id,
          nutritionistId: demoNutri.id,
          scheduledAt,
          status: c.status,
          type: c.type,
          reason: c.reason,
          notes: c.status === "COMPLETED" ? "Paciente evolucionando favorablemente." : undefined,
          createdById: demoUser.id,
        },
      });
    }

    // Plan Nutricional
    const planId = `social-plan-${slugify(def.firstName)}-${slugify(def.lastName)}`;
    await prisma.nutritionalPlan.upsert({
      where: { id: planId },
      create: {
        id: planId,
        patientId: patient.id,
        status: "ACTIVE",
        name: def.plan.name,
        startDate: monthsAgo(3),
        endDate: futureDays(60),
        kcalTarget: def.plan.kcal,
        proteinTarget: def.plan.protein,
        carbsTarget: def.plan.carbs,
        fatsTarget: def.plan.fats,
        recommendations: "Mantener horarios regulares. Hidratación: 2L diarios.",
        waterIntake: 2000,
        shareToken: shareToken(),
        isShared: false,
      },
      update: {},
    });

    patientCount++;
    console.log(`   ✅ [${patientCount}/20] ${def.firstName} ${def.lastName} - ${def.profile}`);
  }

  // ---- PASO 5: Citas de Septiembre 2026 ----
  console.log("\n📅 Creando citas de septiembre 2026...");
  
  // Generar citas para cada paciente (3-7 por semana)
  let appointmentCount = 0;
  const SEPTEMBER_2026_START = new Date(2026, 8, 1); // Sept 1, 2026
  const SEPTEMBER_2026_END = new Date(2026, 8, 30); // Sept 30, 2026

  for (const def of PATIENT_DEFS) {
    // Cada paciente tiene entre 2-4 citas en septiembre
    const numAppointments = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numAppointments; i++) {
      // Generar fecha en septiembre (lunes a viernes)
      let appointmentDate: Date;
      do {
        const day = 1 + Math.floor(Math.random() * 30);
        appointmentDate = new Date(2026, 8, day);
      } while (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6); // Evitar domingos y sábados
      
      // Hora aleatoria entre 8am y 5pm
      const hour = 8 + Math.floor(Math.random() * 10);
      const minute = Math.random() > 0.5 ? 0 : 30;
      appointmentDate.setHours(hour, minute, 0, 0);

      const status = appointmentDate < new Date() ? "COMPLETED" : "SCHEDULED";
      const types = ["FOLLOW_UP", "FIRST_TIME", "FOLLOW_UP", "FOLLOW_UP"];
      const type = types[Math.floor(Math.random() * types.length)];

      await prisma.appointment.create({
        data: {
          organizationId: null,
          nutritionistId: demoNutri.id,
          patientId: def.id,
          scheduledAt: appointmentDate,
          duration: 30,
          status: status as any,
          reason: `Control ${def.profile}`,
          notes: null,
          boxName: `Consultorio ${1 + Math.floor(Math.random() * 3)}`,
        },
      });
      appointmentCount++;
    }
  }

  console.log(`   ✅ ${appointmentCount} citas creadas en septiembre 2026`);

  // ---- FINAL ----
  console.log("\n" + "=".repeat(60));
  console.log("  ✅ SEED PARA REDES SOCIALES COMPLETADO");
  console.log("=".repeat(60));
  console.log(`\n📧 Email:        ${TARGET_EMAIL}`);
  console.log(`👤 Usuario ID:   ${demoUser.id}`);
  console.log(`👨‍⚕️ Nutricionista: ${demoNutri.id}`);
  console.log(`👥 Pacientes:    ${patientCount}`);
  console.log(`📅 Citas:        ${appointmentCount}`);
  console.log(`📊 Antropometrías: ~${patientCount * 4}`);
  console.log(`🎯 Metas:        ~${patientCount * 2}`);
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed social media:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
