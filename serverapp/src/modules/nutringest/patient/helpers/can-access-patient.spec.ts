import {
  canAccessPatient,
  hasPatientListAllPermit,
  patientsWhereNutritionistAccess,
  PatientWithNutritionists,
} from "./can-access-patient";
import { PatientNutritionistRole } from "@prisma/client";

function patient(
  memberships: Array<{ nutritionistId: string; isActive: boolean; role: PatientNutritionistRole }> | null,
): PatientWithNutritionists {
  return { id: "p-1", nutritionists: memberships ?? null } as unknown as PatientWithNutritionists;
}

function activeMembership(
  nutritionistId: string,
  role: PatientNutritionistRole = PatientNutritionistRole.PRIMARY,
) {
  return { nutritionistId, isActive: true, role };
}

const NUT_1 = "nut-1";
const NUT_2 = "nut-2";

describe("canAccessPatient", () => {
  describe("cuando el nutritionistId es undefined (ADMIN/passthrough)", () => {
    it("siempre concede acceso, incluso sin membresías", () => {
      const result = canAccessPatient(patient([]), undefined);
      expect(result).toBe(true);
    });

    it("concede acceso incluso si nutritionists es null", () => {
      const result = canAccessPatient(patient(null), undefined, { primaryOnly: true });
      expect(result).toBe(true);
    });
  });

  describe("membresías ausentes o incompatibles", () => {
    it("devuelve false cuando nutritionists es null (pivote sin cargar)", () => {
      expect(canAccessPatient(patient(null), NUT_1)).toBe(false);
    });

    it("devuelve false cuando nutritionists es un array vacío", () => {
      expect(canAccessPatient(patient([]), NUT_1)).toBe(false);
    });

    it("devuelve false cuando ninguna membresía corresponde al nutritionistId", () => {
      const patientsWithOtherNut = patient([activeMembership(NUT_2)]);
      expect(canAccessPatient(patientsWithOtherNut, NUT_1)).toBe(false);
    });
  });

  describe("flag isActive", () => {
    it("devuelve false cuando la membresía coincidente está INACTIVA", () => {
      const inact = patient([
        { nutritionistId: NUT_1, isActive: false, role: PatientNutritionistRole.PRIMARY },
      ]);
      expect(canAccessPatient(inact, NUT_1)).toBe(false);
    });

    it("devuelve false con isActive:false aunque sea PRIMARY y primaryOnly", () => {
      const inact = patient([
        { nutritionistId: NUT_1, isActive: false, role: PatientNutritionistRole.PRIMARY },
      ]);
      expect(canAccessPatient(inact, NUT_1, { primaryOnly: true })).toBe(false);
    });
  });

  describe("lectura por defecto (sin options)", () => {
    it("concede acceso a un miembro ACTIVO con rol PRIMARY", () => {
      const p = patient([activeMembership(NUT_1, PatientNutritionistRole.PRIMARY)]);
      expect(canAccessPatient(p, NUT_1)).toBe(true);
    });

    it("concede acceso a un miembro ACTIVO con rol SUPPORT", () => {
      const p = patient([activeMembership(NUT_1, PatientNutritionistRole.SUPPORT)]);
      expect(canAccessPatient(p, NUT_1)).toBe(true);
    });
  });

  describe("primaryOnly", () => {
    it("deniega a un SUPPORT activo cuando primaryOnly es true", () => {
      const p = patient([activeMembership(NUT_1, PatientNutritionistRole.SUPPORT)]);
      expect(canAccessPatient(p, NUT_1, { primaryOnly: true })).toBe(false);
    });

    it("concede a un PRIMARY activo cuando primaryOnly es true", () => {
      const p = patient([activeMembership(NUT_1, PatientNutritionistRole.PRIMARY)]);
      expect(canAccessPatient(p, NUT_1, { primaryOnly: true })).toBe(true);
    });
  });

  describe("opción write", () => {
    it("no cambia el predicado: una membresía activa SUPPORT sigue accediendo (documenta intención)", () => {
      const p = patient([activeMembership(NUT_1, PatientNutritionistRole.SUPPORT)]);
      expect(canAccessPatient(p, NUT_1, { write: true })).toBe(true);
    });

    it("no cambia el predicado: una membresía activa PRIMARY también accede", () => {
      const p = patient([activeMembership(NUT_1, PatientNutritionistRole.PRIMARY)]);
      expect(canAccessPatient(p, NUT_1, { write: true, primaryOnly: true })).toBe(true);
    });
  });
});

describe("hasPatientListAllPermit", () => {
  const baseSession = { permits: { list: [] } } as any;

  it("devuelve true cuando el permit PATIENT_LIST_ALL está en la lista", () => {
    const session = { permits: { list: ["PATIENT_LIST_ALL"] } } as any;
    expect(hasPatientListAllPermit(session)).toBe(true);
  });

  it("devuelve false cuando el permit no está en la lista", () => {
    expect(hasPatientListAllPermit(baseSession)).toBe(false);
  });

  it("devuelve false cuando permits es undefined", () => {
    expect(hasPatientListAllPermit({} as any)).toBe(false);
  });
});

describe("patientsWhereNutritionistAccess", () => {
  it("cuando nutritionistId es undefined devuelve un where sin filtros ({})", () => {
    expect(patientsWhereNutritionistAccess(undefined)).toEqual({});
  });

  it("por defecto filtra por una membresía ACTIVA sin exigir rol", () => {
    const where: any = patientsWhereNutritionistAccess(NUT_1);
    expect(where.nutritionists.some).toEqual({
      nutritionistId: NUT_1,
      isActive: true,
    });
  });

  it("con primaryOnly agrega el rol PRIMARY al filtro de membresía", () => {
    const where: any = patientsWhereNutritionistAccess(NUT_1, { primaryOnly: true });
    expect(where.nutritionists.some).toEqual({
      nutritionistId: NUT_1,
      isActive: true,
      role: PatientNutritionistRole.PRIMARY,
    });
  });
});