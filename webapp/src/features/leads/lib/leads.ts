import type { Lead, LeadStatus } from "../types/lead.type";

export const STATUS_OPTIONS: ReadonlyArray<{ value: LeadStatus; label: string }> = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "respondió", label: "Respondió" },
  { value: "no interesado", label: "No interesado" },
  { value: "cerrado", label: "Cerrado" },
];

export interface LeadFilters {
  term: string;
  rubro: string;
  status: LeadStatus | "";
  onlyPhone: boolean;
}

/** Numbers arrive as "+58 412-6803793", "0414-1493300 (WhatsApp)" or masked. */
export function normalizePhone(raw: string): string {
  if (!raw || raw.includes("*")) return "";
  const first = raw.split("/")[0] ?? "";
  const digits = first.replace(/\D/g, "");
  if (digits.length < 10) return "";
  if (digits.startsWith("58")) return digits;
  if (digits.startsWith("0")) return `58${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(raw: string): string {
  const digits = normalizePhone(raw);
  return digits ? `https://wa.me/${digits}` : "";
}

const SOCIAL_DOMAINS = /(?:instagram\.com|tiktok\.com|facebook\.com|linkedin\.com)\/[^\s·,]+/i;

/** Returns the first social URL found in the free-text field, if any. */
export function socialLink(raw: string): string {
  const match = raw.match(SOCIAL_DOMAINS);
  return match ? `https://${match[0]}` : "";
}

export function leadStatus(
  statuses: Record<string, LeadStatus>,
  name: string,
): LeadStatus {
  return statuses[name] ?? "nuevo";
}

export function filterLeads(
  leads: readonly Lead[],
  filters: LeadFilters,
  statuses: Record<string, LeadStatus>,
): Lead[] {
  const term = filters.term.trim().toLowerCase();

  return leads.filter((lead) => {
    if (filters.rubro && lead.rubro !== filters.rubro) return false;
    if (filters.onlyPhone && !lead.phone) return false;
    if (filters.status && leadStatus(statuses, lead.name) !== filters.status) {
      return false;
    }
    if (!term) return true;
    return [
      lead.name,
      lead.rubro,
      lead.address,
      lead.note,
      lead.phone,
      lead.instagram,
      lead.source,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
}

export interface LeadCounts {
  total: number;
  withPhone: number;
  worked: number;
  answered: number;
}

export function leadCounts(
  leads: readonly Lead[],
  statuses: Record<string, LeadStatus>,
): LeadCounts {
  return leads.reduce<LeadCounts>(
    (acc, lead) => {
      const status = leadStatus(statuses, lead.name);
      acc.total += 1;
      if (lead.phone) acc.withPhone += 1;
      if (status !== "nuevo") acc.worked += 1;
      if (status === "respondió" || status === "cerrado") acc.answered += 1;
      return acc;
    },
    { total: 0, withPhone: 0, worked: 0, answered: 0 },
  );
}

function csvCell(value: string | number | null): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function leadsToCsv(
  leads: readonly Lead[],
  statuses: Record<string, LeadStatus>,
): string {
  const header = [
    "Estado",
    "Negocio",
    "Rubro",
    "Teléfono",
    "WhatsApp",
    "Red",
    "Dirección",
    "Rating",
    "Reseñas",
    "Prioridad",
    "Fuente",
    "Notas",
  ];

  const lines = leads.map((lead) =>
    [
      leadStatus(statuses, lead.name),
      lead.name,
      lead.rubro,
      lead.phone,
      whatsappLink(lead.phone),
      lead.instagram,
      lead.address,
      lead.rating ?? "",
      lead.reviews,
      lead.priority,
      lead.source,
      lead.note,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}
