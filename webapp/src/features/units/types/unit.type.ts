export type UnitKind = "COUNT" | "WEIGHT" | "VOLUME";

export interface UnitOfMeasure {
  id: string;
  /** null = system default (read-only for tenants). */
  organizationId: string | null;
  name: string;
  abbreviation: string;
  kind: UnitKind;
  active: boolean;
}

export const UNIT_KIND_LABELS: Record<UnitKind, string> = {
  COUNT: "Unidad",
  WEIGHT: "Peso",
  VOLUME: "Volumen",
};
