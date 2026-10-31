import type { Client, ClientBalance } from "../types/client.type";

/** Pure helpers behind the client ficha (S1 + S3). */

export interface DetailRow {
  label: string;
  value: string;
  mono?: boolean;
}

export type DetailSectionKey = "identity" | "contact" | "credit" | "notes";

export interface DetailSection {
  key: DetailSectionKey;
  title: string;
  rows: DetailRow[];
}

const DASH = "—";

function money(value: string | number | null | undefined): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DASH;
  return `$${numeric.toFixed(2)}`;
}

function text(value: string | null | undefined): string {
  return value?.trim() ? value : DASH;
}

/** Sections rendered by the client ficha: identity, contact, credit, notes. */
export function clientSections(
  client: Client,
  balance: ClientBalance | null,
): DetailSection[] {
  return [
    {
      key: "identity",
      title: "Identidad",
      rows: [
        { label: "Documento", value: text(client.taxId), mono: true },
        {
          label: "Estado",
          value: client.isActive ? "Activo" : "Inactivo",
        },
      ],
    },
    {
      key: "contact",
      title: "Contacto",
      rows: [
        { label: "Correo", value: text(client.email) },
        { label: "Teléfono", value: text(client.phone), mono: true },
        { label: "Dirección", value: text(client.address) },
        { label: "Ciudad", value: text(client.city) },
        { label: "Estado", value: text(client.state) },
      ],
    },
    {
      key: "credit",
      title: "Crédito",
      rows: [
        {
          label: "Límite de crédito",
          value: money(balance?.creditLimitUSD ?? client.creditLimitUSD),
          mono: true,
        },
        {
          label: "Saldo actual",
          value: money(balance?.currentBalanceUSD ?? client.currentBalanceUSD),
          mono: true,
        },
        {
          label: "Facturado",
          value: balance ? money(balance.totalUSD) : DASH,
          mono: true,
        },
        {
          label: "Cobrado",
          value: balance ? money(balance.paidUSD) : DASH,
          mono: true,
        },
        {
          label: "Disponible",
          value: balance ? money(balance.availableCreditUSD) : DASH,
          mono: true,
        },
      ],
    },
    {
      key: "notes",
      title: "Notas",
      rows: [{ label: "Notas", value: text(client.notes) }],
    },
  ];
}
