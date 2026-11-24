import type { UnitKind, UnitOfMeasure } from "../types/unit.type";

/**
 * Decimal places a quantity field must accept for a unit of measure.
 *
 * `UnitOfMeasure.kind` is the source of truth (`prisma/schema.prisma`): COUNT
 * units are whole numbers; WEIGHT, VOLUME and LENGTH admit decimals (the DB
 * stores `Decimal(12, 2)` for stock either way). The fallback covers the system
 * units on screens that do not load the catalog; an unknown abbreviation stays
 * permissive so a legitimate fraction is never blocked.
 */
const SYSTEM_UNIT_KIND: Record<string, UnitKind> = {
  und: "COUNT",
  kg: "WEIGHT",
  kgs: "WEIGHT",
  kilo: "WEIGHT",
  kilos: "WEIGHT",
  kilogramo: "WEIGHT",
  kilogramos: "WEIGHT",
  g: "WEIGHT",
  gr: "WEIGHT",
  grs: "WEIGHT",
  gramo: "WEIGHT",
  gramos: "WEIGHT",
  lb: "WEIGHT",
  lbs: "WEIGHT",
  libra: "WEIGHT",
  libras: "WEIGHT",
  oz: "WEIGHT",
  onza: "WEIGHT",
  onzas: "WEIGHT",
  l: "VOLUME",
  lt: "VOLUME",
  lts: "VOLUME",
  litro: "VOLUME",
  litros: "VOLUME",
  ml: "VOLUME",
  mls: "VOLUME",
  m: "LENGTH",
  mts: "LENGTH",
  metro: "LENGTH",
  metros: "LENGTH",
  cm: "LENGTH",
};

/** Checks if a line is a meat cut or weight/volume measure admitting decimal quantities. */
export function isMeatOrWeight(
  unit?: string | null,
  productName?: string | null,
  isMeatOrg?: boolean,
): boolean {
  if (isMeatOrg) return true;
  const u = (unit ?? "").trim().toLowerCase();
  if (
    [
      "kg", "kgs", "kilo", "kilos", "kilogramo", "kilogramos",
      "g", "gr", "grs", "gramo", "gramos",
      "lb", "lbs", "libra", "libras",
      "oz", "onza", "onzas",
      "l", "lt", "lts", "litro", "litros",
      "ml", "mls", "m", "mts", "metro", "metros", "cm",
    ].includes(u)
  ) {
    return true;
  }
  const name = (productName ?? "").toLowerCase();
  const meatKeywords = [
    "carne", "cerdo", "cochino", "res", "pollo", "chuleta", "costilla",
    "pernil", "solomo", "molida", "tocino", "bife", "corte", "lomo",
    "falda", "lagarto", "pechuga", "muslo", "ala", "hueso", "panceta",
    "ternera", "cordero", "chivo", "canal", "despiece", "pulpa",
    "bistec", "bisteck", "milanesa", "asado", "punta trasera",
  ];
  return meatKeywords.some((keyword) => name.includes(keyword));
}

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
