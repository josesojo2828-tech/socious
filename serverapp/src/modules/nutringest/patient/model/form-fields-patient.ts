import { FormInput, FormSelect, FormElement } from "src/shared/types/form/form";

export const PATIENT_BASE_FIELDS = (patient?: any): FormElement[] => {
  return [
    // --- SECCIÓN 1: CUENTA DE USUARIO (Acceso) ---
    {
      title: "Datos de Cuenta",
      gridCols: 2,
      elements: [
        {
          controlType: "input",
          name: "email",
          label: "Correo Electrónico",
          type: "email",
          placeholder: "paciente@email.com",
          required: true,
          value: patient?.email,
          autoComplete: "off",
          className: "",
        },
        {
          controlType: "input",
          name: "username", // Generado auto si se deja vacío en frontend, pero útil tenerlo
          label: "Nombre de Usuario",
          type: "text",
          placeholder: "juan.perez",
          required: true,
          value: patient?.username,
          autoComplete: "off",
          className: "",
        },
        {
          controlType: "input",
          name: "password",
          label: "Contraseña Temporal",
          type: "password",
          placeholder: "********",
          required: !patient, // Solo requerida al crear
          autoComplete: "new-password",
          className: "",
        },
      ],
    },

    // --- SECCIÓN 2: PERFIL CLÍNICO ---
    {
      title: "Información Personal",
      gridCols: 2,
      elements: [
        {
          controlType: "input",
          name: "firstName",
          label: "Nombre",
          type: "text",
          required: true,
          value: patient?.firstName,
          className: "",
        },
        {
          controlType: "input",
          name: "lastName",
          label: "Apellido",
          type: "text",
          required: true,
          value: patient?.lastName,
          className: "",
        },
        {
          controlType: "input",
          name: "phone",
          label: "Teléfono",
          type: "tel",
          placeholder: "+58 412 1234567",
          value: patient?.patientProfile?.phone, // Acceso al perfil anidado
          pattern: "^\\+?[0-9\\s\\-\\(\\)]{7,20}$",
        },
        {
          controlType: "input",
          name: "birthDate",
          label: "Fecha de Nacimiento",
          type: "date",
          required: true,
          value: patient?.patientProfile?.birthDate
            ? new Date(patient.patientProfile.birthDate)
                .toISOString()
                .split("T")[0]
            : "",
          className: "",
        },
        {
          controlType: "select",
          name: "gender",
          label: "Género",
          required: true,
          value: patient?.patientProfile?.gender || "MALE",
          options: [
            { label: "Masculino", value: "MALE" },
            { label: "Femenino", value: "FEMALE" },
            { label: "Otro", value: "OTHER" },
          ],
          className: "",
        },
      ],
    },
    // --- SECCIÓN 3: PACIENTE MENOR DE EDAD ---
    //
    // S2 / C2: cuando el paciente es menor, la cuenta y el portal son del
    // REPRESENTANTE. El flag se puede encender al crear o corregirlo desde la
    // ficha; al encenderlo se exigen los datos del representante.
    {
      title: "Paciente menor de edad",
      gridCols: 2,
      elements: [
        {
          controlType: "checkbox",
          name: "isPediatric",
          label: "El paciente es menor de edad (la cuenta es del representante)",
          type: "checkbox",
          required: false,
          value: patient?.patientProfile?.isPediatric ?? false,
          className: "",
        },
        {
          controlType: "input",
          name: "representative.fullName",
          label: "Nombre completo del representante",
          type: "text",
          placeholder: "María Pérez",
          required: false,
          value: patient?.representative?.fullName,
          className: "",
        },
        {
          controlType: "input",
          name: "representative.email",
          label: "Correo del representante",
          type: "email",
          placeholder: "representante@email.com",
          required: false,
          value: patient?.representative?.email,
          className: "",
        },
        {
          controlType: "input",
          name: "representative.phone",
          label: "Teléfono del representante",
          type: "tel",
          placeholder: "+58 412 1234567",
          required: false,
          value: patient?.representative?.phone,
          pattern: "^\\+?[0-9\\s\\-\\(\\)]{7,20}$",
          className: "",
        },
        {
          controlType: "select",
          name: "representative.relationship",
          label: "Parentesco con el paciente",
          required: false,
          value: patient?.representative?.relationship || "MADRE",
          options: [
            { label: "Madre", value: "MADRE" },
            { label: "Padre", value: "PADRE" },
            { label: "Tutor", value: "TUTOR" },
            { label: "Otro", value: "OTRO" },
          ],
          className: "",
        },
      ],
    },
    // --- SECCIÓN 4: AVISO DE PRIVACIDAD Y ACCESO ---
    //
    // S5 legal-compliance: crear al paciente y notificarlo son pasos
    // independientes. La atestación es opcional y no bloquea el alta; la
    // invitación por correo entrega el aviso y permite definir la contraseña.
    {
      title: "Aviso de Privacidad y acceso",
      gridCols: 1,
      elements: [
        {
          controlType: "checkbox",
          name: "privacyNoticeAccepted",
          label: "El paciente recibió y aceptó el Aviso de Privacidad",
          type: "checkbox",
          required: false,
          value: false,
          className: "",
        },
        {
          controlType: "checkbox",
          name: "sendInvitation",
          label: "Enviar la invitación por correo al paciente",
          type: "checkbox",
          required: false,
          value: true,
          className: "",
        },
      ],
    },
  ];
};
