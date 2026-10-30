import type { Client } from "../types/client.type";

/** Client form logic (S8): payload shaping and quick validation. */

export interface ClientForm {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  creditLimitUSD?: number;
  notes?: string;
  isActive?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `null` when the form is acceptable, otherwise the message to show. */
export function validateClientForm(form: ClientForm): string | null {
  if (!form.name?.trim()) return "El nombre es obligatorio.";
  if (form.email && form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
    return "El correo no tiene un formato válido.";
  }
  if (form.creditLimitUSD !== undefined && Number(form.creditLimitUSD) < 0) {
    return "El límite de crédito no puede ser negativo.";
  }
  return null;
}

/** Trimmed body for POST /api/clients (create) — empty fields stay absent. */
export function buildClientPayload(form: ClientForm): Record<string, unknown> {
  const payload: Record<string, unknown> = { name: form.name.trim() };

  const optional: [keyof ClientForm, string | undefined][] = [
    ["taxId", form.taxId],
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

  if (form.creditLimitUSD !== undefined) {
    payload.creditLimitUSD = Math.max(0, Number(form.creditLimitUSD) || 0);
  }
  if (form.isActive !== undefined) payload.isActive = form.isActive;

  return payload;
}

export type BalanceTone = "ok" | "attention" | "over";

/** How the list labels a balance at a glance. */
export function balanceState(currentBalanceUSD: number, creditLimitUSD: number): {
  tone: BalanceTone;
  label: string;
} {
  const balance = Number.isFinite(currentBalanceUSD) ? currentBalanceUSD : 0;
  const limit = Number.isFinite(creditLimitUSD) ? creditLimitUSD : 0;

  if (balance <= 0) return { tone: "ok", label: "Al día" };
  if (limit > 0 && balance >= limit) {
    return { tone: "over", label: "Límite alcanzado" };
  }
  if (limit > 0 && balance >= limit * 0.8) {
    return { tone: "attention", label: "Cerca del límite" };
  }
  return { tone: "attention", label: `Debe $${balance.toFixed(2)}` };
}

/** Flattens a client into the editable form. */
export function toClientForm(client: Client): ClientForm {
  return {
    name: client.name,
    taxId: client.taxId ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    creditLimitUSD: Number(client.creditLimitUSD),
    notes: client.notes ?? "",
    isActive: client.isActive,
  };
}
