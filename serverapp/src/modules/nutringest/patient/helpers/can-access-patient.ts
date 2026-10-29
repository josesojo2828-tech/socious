import { PatientNutritionistRole, Prisma } from "@prisma/client";
import { User } from "src/shared/types/schema.types";

// =========================================================
// ACCESO M:N A PACIENTES (PIVOTE PatientNutritionist)
// Primitiva de autorización única que reemplaza los filtros
// `patient: { nutritionistId }` por el pivote de acceso.
// =========================================================

/**
 * Permit que otorga visión global de pacientes (bypass de acceso).
 * Mantener centralizado para no repetir el string literal en cada servicio.
 */
export const PATIENT_LIST_ALL_PERMIT = "PATIENT_LIST_ALL";

/**
 * Opciones de acceso a un paciente (o a la colección de pacientes).
 *
 * Por defecto (sin opciones) se interpreta como LECTURA: se requiere una
 * membresía ACTIVA del nutricionista en el pivote, sin distinguir rol.
 */
export interface PatientAccessOptions {
  /**
   * La operación a ejecutar es de ESCRITURA.
   * Requiere una membresía activa (PRIMARY o SUPPORT) — misma predicado que
   * lectura según D2 del diseño; este flag documenta la intención y actúa
   * como futuro punto de ajuste si se endurece la semántica.
   */
  write?: boolean;
  /**
   * Restringe la operación a SOLO el PRIMARY del paciente.
   * Útil para operaciones sensibles (deactivar otro miembro, transferir,
   * borrar) donde un SUPPORT no debería poder actuar.
   */
  primaryOnly?: boolean;
}

/**
 * Paciente con sus membresías activas/inactivas cargadas.
 * Tipo derivado de Prisma para que el check post-fetch sea consistente
 * con lo que devuelve un `findFirst/findUnique` con `include: { nutritionists: true }`.
 */
export type PatientWithNutritionists = Prisma.PatientGetPayload<{
  include: { nutritionists: true };
}>;

/**
 * ¿El usuario tiene el permit global de pacientes (ADMIN)?
 * Coincide con el patrón existente en patient.service.ts: `permits?.list?.includes(...)`.
 */
export function hasPatientListAllPermit(userSession: User): boolean {
  return userSession.permits?.list?.includes(PATIENT_LIST_ALL_PERMIT) ?? false;
}

/**
 * Construye el predicado del pivote `PatientNutritionist` para el where de paciente.
 * @param nutritionistId ID del nutricionista; si es `undefined` (ADMIN con
 *   `PATIENT_LIST_ALL` u otro passthrough) se devuelve `{}` SIN filtro de acceso.
 * @param options Semántica de acceso (ver {@link PatientAccessOptions}).
 */
export function patientsWhereNutritionistAccess(
  nutritionistId: string | undefined,
  options: PatientAccessOptions = {},
): Prisma.PatientWhereInput {
  if (!nutritionistId) return {};

  return {
    nutritionists: {
      some: buildMembershipFilter(nutritionistId, options),
    },
  };
}

/**
 * Verificación de acceso post-fetch: dado un paciente ya cargado (con sus
 * membresías), decide si `nutritionistId` puede acceder.
 * @param patient Paciente con `nutritionists` incluido.
 * @param nutritionistId ID del nutricionista; `undefined` (ADMIN) siempre accede.
 * @param options Semántica de acceso (ver {@link PatientAccessOptions}).
 */
export function canAccessPatient(
  patient: PatientWithNutritionists,
  nutritionistId: string | undefined,
  options: PatientAccessOptions = {},
): boolean {
  if (!nutritionistId) return true;

  return (
    patient.nutritionists?.some(
      (membership) =>
        membership.nutritionistId === nutritionistId &&
        membership.isActive &&
        (!options.primaryOnly ||
          membership.role === PatientNutritionistRole.PRIMARY),
    ) ?? false
  );
}

/**
 * Predicado único del pivote: membresía activa (+ rol PRIMARY si `primaryOnly`).
 * Extraído para que where-builder y check post-fetch no diverjan.
 */
function buildMembershipFilter(
  nutritionistId: string,
  options: PatientAccessOptions,
): Prisma.PatientNutritionistWhereInput {
  return {
    nutritionistId,
    isActive: true,
    ...(options.primaryOnly
      ? { role: PatientNutritionistRole.PRIMARY }
      : {}),
  };
}