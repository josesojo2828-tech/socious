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
  CREDIT_CADENCES,
  CURRENCY_VISIBILITY_KEYS,
  DEFAULT_TENANT_SETTINGS,
  FULFILLMENT_TYPES,
  cloneDefaultSettings,
  isCoordinationMethod,
  isCreditCadence,
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

  /**
   * Límites de imágenes por plan (S8): el módulo no distingue Avanzado de
   * Premium, así que la verdad del plan sale de la suscripción de la org.
   * Sin suscripción → Básico (1/1).
   */
  async imageLimits(
    organizationId: string | null | undefined,
  ): Promise<{ product: number; variant: number }> {
    if (!organizationId) return { product: 1, variant: 1 };
    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId, status: "ACTIVE" },
      include: { plan: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });
    const planId = subscription?.plan?.id;
    if (planId === "PREMIUM") return { product: 5, variant: 3 };
    if (planId === "AVANZADO") return { product: 3, variant: 2 };
    return { product: 1, variant: 1 };
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
        // An empty list is legal: the merchant may turn every type off and
        // coordinate pickups manually (e.g. over WhatsApp).
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

    if (input.returns !== undefined) {
      const returns = input.returns as Record<string, unknown>;
      assertKnownKeys("returns", returns, ["reasons"]);
      if (returns.reasons !== undefined) {
        const list = returns.reasons;
        if (!Array.isArray(list)) {
          throw new BadRequestException("returns.reasons debe ser una lista.");
        }
        const invalid = list.find(
          (item) => typeof item !== "string" || !item.trim() || item.length > 160,
        );
        if (invalid !== undefined) {
          throw new BadRequestException(
            "Cada motivo de devolución debe ser un texto de hasta 160 caracteres.",
          );
        }
        result.returns = {
          reasons: [...new Set((list as string[]).map((item) => item.trim()))],
        };
      }
    }

    if (input.credit !== undefined) {
      const credit = input.credit as Record<string, unknown>;
      assertKnownKeys("credit", credit, [
        "initialPaymentUSD",
        "cadence",
        "everyNDays",
        "monthlyDay",
        "initialPercent",
      ]);
      const patchSection: Partial<TenantSettings["credit"]> = {};
      if (credit.initialPaymentUSD !== undefined) {
        const raw = credit.initialPaymentUSD;
        if (raw !== null) {
          if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
            throw new BadRequestException(
              "credit.initialPaymentUSD debe ser un monto válido o null.",
            );
          }
          patchSection.initialPaymentUSD = Math.round(raw * 100) / 100;
        } else {
          patchSection.initialPaymentUSD = null;
        }
      }
      if (credit.initialPercent !== undefined) {
        const pct = credit.initialPercent;
        if (typeof pct !== "number" || pct < 0 || pct > 100) {
          throw new BadRequestException(
            "credit.initialPercent debe estar entre 0 y 100.",
          );
        }
        patchSection.initialPercent = Math.round(pct);
      }
      if (credit.cadence !== undefined) {
        if (!isCreditCadence(credit.cadence)) {
          throw new BadRequestException(
            `Cadencia desconocida: "${String(credit.cadence)}". Valores: ${CREDIT_CADENCES.join(", ")}.`,
          );
        }
        patchSection.cadence = credit.cadence;
      }
      if (credit.everyNDays !== undefined) {
        const days = credit.everyNDays;
        if (typeof days !== "number" || days < 1 || days > 365) {
          throw new BadRequestException(
            "credit.everyNDays debe estar entre 1 y 365.",
          );
        }
        patchSection.everyNDays = Math.floor(days);
      }
      if (credit.monthlyDay !== undefined) {
        const day = credit.monthlyDay;
        if (typeof day !== "number" || day < 1 || day > 28) {
          throw new BadRequestException(
            "credit.monthlyDay debe estar entre 1 y 28.",
          );
        }
        patchSection.monthlyDay = Math.floor(day);
      }
      result.credit = patchSection;
    }

    if (input.payments !== undefined) {
      const payments = input.payments as Record<string, unknown>;
      assertKnownKeys("payments", payments, ["disabledCodes"]);
      if (payments.disabledCodes !== undefined) {
        const list = payments.disabledCodes;
        if (!Array.isArray(list) || list.some((c) => typeof c !== "string")) {
          throw new BadRequestException("payments.disabledCodes debe ser una lista de códigos.");
        }
        result.payments = {
          disabledCodes: [...new Set(list as string[])],
        };
      }
    }

    if (input.notifications !== undefined) {
      const notifications = input.notifications as Record<string, unknown>;
      assertKnownKeys("notifications", notifications, [
        "lowStock",
        "creditDue",
        "orderReceived",
        "saleCreated",
      ]);
      const patchSection: Partial<TenantSettings["notifications"]> = {};
      for (const key of [
        "lowStock",
        "creditDue",
        "orderReceived",
        "saleCreated",
      ] as const) {
        const value = notifications[key];
        if (value === undefined) continue;
        if (typeof value !== "boolean") {
          throw new BadRequestException(
            `notifications.${key} debe ser verdadero o falso.`,
          );
        }
        patchSection[key] = value;
      }
      result.notifications = patchSection;
    }

    if (input.purchases !== undefined) {
      const purchases = input.purchases as Record<string, unknown>;
      assertKnownKeys("purchases", purchases, ["onlySupplierProducts"]);
      if (purchases.onlySupplierProducts !== undefined) {
        if (typeof purchases.onlySupplierProducts !== "boolean") {
          throw new BadRequestException(
            "purchases.onlySupplierProducts debe ser verdadero o falso.",
          );
        }
        result.purchases = {
          onlySupplierProducts: purchases.onlySupplierProducts,
        };
      }
    }

    if (input.storefront !== undefined) {
      const storefront = input.storefront as Record<string, unknown>;
      assertKnownKeys("storefront", storefront, ["whatsapp"]);
      if (storefront.whatsapp !== undefined) {
        if (typeof storefront.whatsapp !== "string") {
          throw new BadRequestException(
            "storefront.whatsapp debe ser texto.",
          );
        }
        const digits = storefront.whatsapp.replace(/[^0-9]/g, "");
        if (digits !== "" && (digits.length < 8 || digits.length > 15)) {
          throw new BadRequestException(
            "storefront.whatsapp debe tener entre 8 y 15 dígitos, con código de país.",
          );
        }
        result.storefront = { whatsapp: digits };
      }
    }

    if (input.inventory !== undefined) {
      const inventory = input.inventory as Record<string, unknown>;
      assertKnownKeys("inventory", inventory, [
        "useRawMaterials",
        "useServices",
      ]);
      const nextInventory: { useRawMaterials?: boolean; useServices?: boolean } =
        {};
      if (inventory.useRawMaterials !== undefined) {
        if (typeof inventory.useRawMaterials !== "boolean") {
          throw new BadRequestException(
            "inventory.useRawMaterials debe ser verdadero o falso.",
          );
        }
        nextInventory.useRawMaterials = inventory.useRawMaterials;
      }
      if (inventory.useServices !== undefined) {
        if (typeof inventory.useServices !== "boolean") {
          throw new BadRequestException(
            "inventory.useServices debe ser verdadero o falso.",
          );
        }
        nextInventory.useServices = inventory.useServices;
      }
      if (Object.keys(nextInventory).length > 0) {
        result.inventory = nextInventory;
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
    returns: {
      ...base.returns,
      ...(patch.returns ?? {}),
      reasons: patch.returns?.reasons ?? base.returns.reasons,
    },
    credit: { ...base.credit, ...(patch.credit ?? {}) },
    notifications: { ...base.notifications, ...(patch.notifications ?? {}) },
    payments: {
      ...base.payments,
      ...(patch.payments ?? {}),
      disabledCodes:
        patch.payments?.disabledCodes ?? base.payments.disabledCodes,
    },
    purchases: { ...base.purchases, ...(patch.purchases ?? {}) },
    inventory: { ...base.inventory, ...(patch.inventory ?? {}) },
    storefront: { ...base.storefront, ...(patch.storefront ?? {}) },
  });
}
