import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import type { Prisma } from "@prisma/client";
import {
  AGENCY_KEY_PATTERN,
  COORDINATION_METHODS,
  CURRENCY_VISIBILITY_KEYS,
  DEFAULT_TENANT_SETTINGS,
  FULFILLMENT_TYPES,
  cloneDefaultSettings,
  isCoordinationMethod,
  isFulfillmentType,
  normalizeTenantSettings,
  type TenantSettings,
  type TenantSettingsPatch,
} from "../constants/tenant-settings";

const KNOWN_SECTIONS = Object.keys(DEFAULT_TENANT_SETTINGS);

/**
 * Read/write gateway for `Organization.settings` (S1).
 *
 * Read: total and never-throwing (`normalizeTenantSettings`).
 * Write: strict — an explicit typo is a `400` with the offending path, because
 * a silently-dropped check would leave the merchant believing they turned
 * something on. Sections not present in the patch are left untouched.
 */
@Injectable()
export class TenantSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    organizationId: string | null | undefined,
  ): Promise<TenantSettings> {
    if (!organizationId) return cloneDefaultSettings();

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    return normalizeTenantSettings(organization?.settings);
  }

  async update(
    organizationId: string | null | undefined,
    patch: unknown,
  ): Promise<TenantSettings> {
    if (!organizationId) {
      throw new ForbiddenException(
        "Crea una organización para configurar el negocio.",
      );
    }

    const validated = this.validatePatch(patch);
    const current = await this.get(organizationId);
    const merged = mergeTenantSettings(current, validated);

    await this.prisma.organization.update({
      where: { id: organizationId },
      // Prisma's JSON input wants an index signature; the settings type is a
      // closed interface, so the shape is asserted at this single boundary.
      data: { settings: merged as unknown as Prisma.InputJsonValue },
    });

    return merged;
  }

  private validatePatch(patch: unknown): TenantSettingsPatch {
    if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
      throw new BadRequestException("La configuración debe ser un objeto.");
    }

    const input = patch as Record<string, unknown>;
    const result: TenantSettingsPatch = {};

    for (const [section, value] of Object.entries(input)) {
      if (value === undefined) continue;
      if (!KNOWN_SECTIONS.includes(section)) {
        throw new BadRequestException(
          `Sección de configuración desconocida: "${section}".`,
        );
      }
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new BadRequestException(`"${section}" debe ser un objeto.`);
      }
    }

    if (input.cash !== undefined) {
      const cash = input.cash as Record<string, unknown>;
      assertKnownKeys("cash", cash, ["shiftControl"]);
      if (cash.shiftControl !== undefined) {
        if (typeof cash.shiftControl !== "boolean") {
          throw new BadRequestException(
            "cash.shiftControl debe ser verdadero o falso.",
          );
        }
        result.cash = { shiftControl: cash.shiftControl };
      }
    }

    if (input.currencies !== undefined) {
      const currencies = input.currencies as Record<string, unknown>;
      const known = CURRENCY_VISIBILITY_KEYS as readonly string[];
      for (const [key, value] of Object.entries(currencies)) {
        if (value === undefined) continue;
        if (!known.includes(key)) {
          throw new BadRequestException(`Moneda desconocida: "${key}".`);
        }
        if (typeof value !== "boolean") {
          throw new BadRequestException(
            `currencies.${key} debe ser verdadero o falso.`,
          );
        }
      }
      result.currencies = pickBooleans(currencies, known);
    }

    if (input.fulfillment !== undefined) {
      const fulfillment = input.fulfillment as Record<string, unknown>;
      assertKnownKeys("fulfillment", fulfillment, [
        "enabledTypes",
        "coordination",
      ]);

      const patchSection: Partial<TenantSettings["fulfillment"]> = {};

      if (fulfillment.enabledTypes !== undefined) {
        const list = fulfillment.enabledTypes;
        if (!Array.isArray(list)) {
          throw new BadRequestException(
            "fulfillment.enabledTypes debe ser una lista.",
          );
        }
        const invalid = list.find((item) => !isFulfillmentType(item));
        if (invalid !== undefined) {
          throw new BadRequestException(
            `Tipo de entrega desconocido: "${String(invalid)}". Valores: ${FULFILLMENT_TYPES.join(", ")}.`,
          );
        }
        if (list.length === 0) {
          throw new BadRequestException(
            "Selecciona al menos un tipo de entrega.",
          );
        }
        patchSection.enabledTypes = [...new Set(list)] as FulfillmentEnabled;
      }

      if (fulfillment.coordination !== undefined) {
        if (!isCoordinationMethod(fulfillment.coordination)) {
          throw new BadRequestException(
            `Coordinación desconocida: "${String(fulfillment.coordination)}". Valores: ${COORDINATION_METHODS.join(", ")}.`,
          );
        }
        patchSection.coordination = fulfillment.coordination;
      }

      result.fulfillment = patchSection;
    }

    if (input.shipping !== undefined) {
      const shipping = input.shipping as Record<string, unknown>;
      assertKnownKeys("shipping", shipping, ["enabledAgencies"]);

      if (shipping.enabledAgencies !== undefined) {
        const list = shipping.enabledAgencies;
        if (!Array.isArray(list)) {
          throw new BadRequestException(
            "shipping.enabledAgencies debe ser una lista.",
          );
        }
        const invalid = list.find(
          (item) => typeof item !== "string" || !AGENCY_KEY_PATTERN.test(item),
        );
        if (invalid !== undefined) {
          throw new BadRequestException(
            `Clave de agencia inválida: "${String(invalid)}". Usa mayúsculas, números y guiones bajos (ej. ZOOM).`,
          );
        }
        result.shipping = {
          enabledAgencies: [...new Set(list)] as string[],
        };
      }
    }

    if (input.delivery !== undefined) {
      const delivery = input.delivery as Record<string, unknown>;
      assertKnownKeys("delivery", delivery, ["enabled", "feeUSD"]);
      const patchSection: Partial<TenantSettings["delivery"]> = {};

      if (delivery.enabled !== undefined) {
        if (typeof delivery.enabled !== "boolean") {
          throw new BadRequestException(
            "delivery.enabled debe ser verdadero o falso.",
          );
        }
        patchSection.enabled = delivery.enabled;
      }

      if (delivery.feeUSD !== undefined) {
        const fee = delivery.feeUSD;
        if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
          throw new BadRequestException(
            "delivery.feeUSD debe ser un número mayor o igual a cero.",
          );
        }
        patchSection.feeUSD = Math.round(fee * 100) / 100;
      }

      result.delivery = patchSection;
    }

    if (input.routes !== undefined) {
      const routes = input.routes as Record<string, unknown>;
      assertKnownKeys("routes", routes, ["enabled"]);
      if (routes.enabled !== undefined) {
        if (typeof routes.enabled !== "boolean") {
          throw new BadRequestException(
            "routes.enabled debe ser verdadero o falso.",
          );
        }
        result.routes = { enabled: routes.enabled };
      }
    }

    return result;
  }
}

type FulfillmentEnabled = TenantSettings["fulfillment"]["enabledTypes"];

function assertKnownKeys(
  section: string,
  input: Record<string, unknown>,
  allowed: string[],
): void {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      throw new BadRequestException(
        `Clave desconocida en "${section}": "${key}".`,
      );
    }
  }
}

function pickBooleans(
  input: Record<string, unknown>,
  allowed: readonly string[],
): Partial<TenantSettings["currencies"]> {
  const out: Partial<TenantSettings["currencies"]> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || !allowed.includes(key)) continue;
    if (typeof value === "boolean") {
      (out as Record<string, boolean>)[key] = value;
    }
  }
  return out;
}

/** Shallow-per-section merge: only the sections present in the patch change. */
export function mergeTenantSettings(
  base: TenantSettings,
  patch: TenantSettingsPatch,
): TenantSettings {
  return normalizeTenantSettings({
    ...base,
    ...patch,
    cash: { ...base.cash, ...(patch.cash ?? {}) },
    currencies: { ...base.currencies, ...(patch.currencies ?? {}) },
    fulfillment: {
      ...base.fulfillment,
      ...(patch.fulfillment ?? {}),
      enabledTypes:
        patch.fulfillment?.enabledTypes ?? base.fulfillment.enabledTypes,
      coordination:
        patch.fulfillment?.coordination ?? base.fulfillment.coordination,
    },
    shipping: {
      ...base.shipping,
      ...(patch.shipping ?? {}),
      enabledAgencies:
        patch.shipping?.enabledAgencies ?? base.shipping.enabledAgencies,
    },
    delivery: { ...base.delivery, ...(patch.delivery ?? {}) },
    routes: { ...base.routes, ...(patch.routes ?? {}) },
  });
}
