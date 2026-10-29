import { PATIENT_BASE_FIELDS } from "./form-fields-patient";

/**
 * S5 legal-compliance: el formulario dinámico de alta del dashboard debe poder
 * registrar la atestación del aviso y disparar la invitación, sin que ninguno
 * de los dos bloquee la creación del paciente.
 */
describe("PATIENT_BASE_FIELDS", () => {
  const flatten = (elements: any[]): any[] =>
    elements.flatMap((element) =>
      Array.isArray(element?.elements) ? element.elements : [element],
    );

  it("includes the privacy notice attestation and the invitation toggle", () => {
    const fields = flatten(PATIENT_BASE_FIELDS(undefined));
    const byName = Object.fromEntries(
      fields.filter((field) => field?.name).map((field) => [field.name, field]),
    );

    expect(byName.privacyNoticeAccepted).toBeDefined();
    expect(byName.privacyNoticeAccepted.controlType).toBe("checkbox");
    expect(byName.privacyNoticeAccepted.required).toBe(false);

    expect(byName.sendInvitation).toBeDefined();
    expect(byName.sendInvitation.controlType).toBe("checkbox");
    expect(byName.sendInvitation.value).toBe(true);
    expect(byName.sendInvitation.required).toBe(false);
  });

  it("includes the minor toggle and the representative fields, none of them blocking", () => {
    const fields = flatten(PATIENT_BASE_FIELDS(undefined));
    const byName = Object.fromEntries(
      fields.filter((field) => field?.name).map((field) => [field.name, field]),
    );

    expect(byName.isPediatric).toBeDefined();
    expect(byName.isPediatric.controlType).toBe("checkbox");
    expect(byName.isPediatric.required).toBe(false);

    // El formulario dinámico envía campos planos con puntos: el servicio los
    // convierte al objeto anidado del representante.
    for (const name of [
      "representative.fullName",
      "representative.email",
      "representative.phone",
      "representative.relationship",
    ]) {
      expect(byName[name]).toBeDefined();
      expect(byName[name].required).toBe(false);
    }

    expect(
      byName["representative.relationship"].options.map((o: any) => o.value),
    ).toEqual(["MADRE", "PADRE", "TUTOR", "OTRO"]);
  });

  it("pre-fills the minor toggle from the patient profile when editing", () => {
    const fields = flatten(
      PATIENT_BASE_FIELDS({ patientProfile: { isPediatric: true } }),
    );
    const toggle = fields.find((field) => field?.name === "isPediatric");

    expect(toggle?.value).toBe(true);
  });
});
