import type { UnitKind, UnitOfMeasure } from "../types/unit.type";

/**
 * Decimal places a quantity field must accept for a unit of measure.
 *
 * `UnitOfMeasure.kind` is the source of truth (`prisma/schema.prisma`): COUNT
 * units are whole numbers; WEIGHT and VOLUME admit decimals (the DB stores
 * `Decimal(12, 2)` for stock either way). The fallback covers the system units
 * on screens that do not load the catalog; an unknown abbreviation stays
 * permissive so a legitimate fraction is never blocked.
 */
const SYSTEM_UNIT_KIND: Record<string, UnitKind> = {
  und: "COUNT",
  kg: "WEIGHT",
  g: "WEIGHT",
  lb: "WEIGHT",
  oz: "WEIGHT",
  l: "VOLUME",
  ml: "VOLUME",
};

export function resolveUnitDecimals(
  abbreviation?: string | null,
  units?: readonly UnitOfMeasure[],
): number {
  const normalized = (abbreviation ?? "").trim().toLowerCase();
  if (!normalized) return 2;

  const match = units?.find(
    (unit) => unit.abbreviation.trim().toLowerCase() === normalized,
  );
  const kind = match?.kind ?? SYSTEM_UNIT_KIND[normalized];
  if (!kind) return 2;
  return kind === "COUNT" ? 0 : 2;
}
