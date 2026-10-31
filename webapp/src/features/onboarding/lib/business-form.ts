export interface BusinessFormValues {
  name: string;
}

/**
 * Validates the business onboarding form. The organization name is the only
 * required field: the backend derives the public slug from it and the rest of
 * the business profile lives in the settings screen after onboarding.
 */
export function validateBusinessForm(values: BusinessFormValues): string | null {
  const name = values.name.trim();
  if (!name) return "Ingresá el nombre de tu negocio.";
  if (name.length < 2) return "El nombre debe tener al menos 2 caracteres.";
  if (name.length > 80) return "El nombre no puede exceder 80 caracteres.";
  return null;
}

export function buildBusinessPayload(values: BusinessFormValues) {
  return { name: values.name.trim() };
}
