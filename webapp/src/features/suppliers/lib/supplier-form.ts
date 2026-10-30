import type { Supplier } from "../types/supplier.type";

/** Supplier form logic (S8): same rules as clients, different payload. */

export interface SupplierForm {
  name: string;
  taxId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  isActive?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSupplierForm(form: SupplierForm): string | null {
  if (!form.name?.trim()) return "El nombre es obligatorio.";
  if (form.email && form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
    return "El correo no tiene un formato válido.";
  }
  return null;
}

export function buildSupplierPayload(
  form: SupplierForm,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { name: form.name.trim() };

  const optional: [keyof SupplierForm, string | undefined][] = [
    ["taxId", form.taxId],
    ["contactName", form.contactName],
    ["email", form.email],
    ["phone", form.phone],
    ["address", form.address],
    ["city", form.city],
    ["state", form.state],
    ["notes", form.notes],
  ];

  for (const [key, value] of optional) {
    const trimmed = value?.trim();
    if (trimmed) payload[key] = trimmed;
  }

  if (form.isActive !== undefined) payload.isActive = form.isActive;
  return payload;
}

export function toSupplierForm(supplier: Supplier): SupplierForm {
  return {
    name: supplier.name,
    taxId: supplier.taxId ?? "",
    contactName: supplier.contactName ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
    city: supplier.city ?? "",
    state: supplier.state ?? "",
    notes: supplier.notes ?? "",
    isActive: supplier.isActive,
  };
}
