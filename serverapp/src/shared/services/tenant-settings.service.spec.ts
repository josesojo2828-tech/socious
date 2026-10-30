import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  DEFAULT_TENANT_SETTINGS,
  type TenantSettings,
} from "src/shared/constants/tenant-settings";
import { TenantSettingsService } from "./tenant-settings.service";

const ORG = "11111111-1111-4111-8111-111111111111";

/**
 * Stateful stub: the update writes back what it received, so a second `get`
 * inside the same test reads the merged result — which is exactly what the
 * service does against a real database.
 */
const makePrisma = (initial: unknown = null) => {
  let stored = initial;

  return {
    organization: {
      findUnique: jest.fn(async () => ({ settings: stored })),
      update: jest.fn(async (args: any) => {
        stored = args.data.settings;
        return { id: args.where.id, settings: stored };
      }),
    },
  };
};

const makeService = (settings: unknown = null) => {
  const prisma = makePrisma(settings);
  return {
    service: new TenantSettingsService(prisma as any),
    prisma,
  };
};

const defaults = (): TenantSettings => JSON.parse(JSON.stringify(DEFAULT_TENANT_SETTINGS));

describe("TenantSettingsService", () => {
  describe("get (total read path)", () => {
    it("returns the defaults without an organization", async () => {
      const { service, prisma } = makeService();

      const settings = await service.get(null);

      expect(settings).toEqual(DEFAULT_TENANT_SETTINGS);
      expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it("returns the defaults for a never-configured organization", async () => {
      const { service } = makeService(null);

      expect(await service.get(ORG)).toEqual(DEFAULT_TENANT_SETTINGS);
    });

    it("survives corrupt JSON instead of throwing", async () => {
      const { service } = makeService(42);

      const settings = await service.get(ORG);

      expect(settings).toEqual(DEFAULT_TENANT_SETTINGS);
    });

    it("keeps stored values and fills the missing fields", async () => {
      const { service } = makeService({
        cash: { shiftControl: false },
        currencies: { showEUR: true },
        nonsense: "drop me",
      });

      const settings = await service.get(ORG);

      expect(settings.cash.shiftControl).toBe(false);
      expect(settings.currencies.showEUR).toBe(true);
      // untouched section keeps its default
      expect(settings.delivery).toEqual(DEFAULT_TENANT_SETTINGS.delivery);
      // unknown keys never reach the caller
      expect(settings).not.toHaveProperty("nonsense");
    });
  });

  describe("update (strict write path)", () => {
    it("rejects a write without an organization", async () => {
      const { service } = makeService();

      await expect(
        service.update(null, { cash: { shiftControl: false } }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("persists only the patched section", async () => {
      const { service, prisma } = makeService({
        delivery: { enabled: false, feeUSD: 3 },
      });

      const settings = await service.update(ORG, { routes: { enabled: true } });

      expect(settings.routes.enabled).toBe(true);
      expect(settings.delivery).toEqual({ enabled: false, feeUSD: 3 });
      expect(prisma.organization.update).toHaveBeenCalledTimes(1);
      expect(settings.cash).toEqual(DEFAULT_TENANT_SETTINGS.cash);
    });

    it("rounds the delivery fee to cents", async () => {
      const { service } = makeService();

      const settings = await service.update(ORG, {
        delivery: { feeUSD: 2.9999 },
      });

      expect(settings.delivery.feeUSD).toBe(3);
    });

    const rejects = (
      name: string,
      patch: unknown,
      expected: RegExp,
      setup?: { settings?: unknown },
    ) => {
      it(name, async () => {
        const { service } = makeService(setup?.settings);
        await expect(service.update(ORG, patch)).rejects.toThrow(expected);
      });
    };

    rejects("rejects an unknown section", { nuevo: {} }, /desconocida/i);
    rejects(
      "rejects a non-boolean check",
      { cash: { shiftControl: "yes" } },
      /verdadero o falso/i,
    );
    rejects(
      "rejects an unknown currency switch",
      { currencies: { showBTC: true } },
      /desconocida/i,
    );
    rejects(
      "rejects an unknown fulfillment type",
      { fulfillment: { enabledTypes: ["DRONE"] } },
      /Tipo de entrega desconocido/,
    );
    rejects(
      "rejects an empty fulfillment list at the service boundary too",
      { fulfillment: { enabledTypes: [] } },
      /./,
      undefined,
    );
    rejects(
      "rejects a negative delivery fee",
      { delivery: { feeUSD: -1 } },
      /mayor o igual a cero/,
    );
    rejects(
      "rejects a malformed agency key",
      { shipping: { enabledAgencies: ["zoom sa"] } },
      /Clave de agencia inválida/,
    );
    rejects("rejects a non-object body", "nope", /objeto/i);
  });

  describe("mergeTenantSettings", () => {
    it("never lets a partial patch wipe an untouched sibling", async () => {
      const { service } = makeService();

      const first = await service.update(ORG, {
        fulfillment: { coordination: "PHONE" },
      });
      expect(first.fulfillment.coordination).toBe("PHONE");
      expect(first.fulfillment.enabledTypes).toEqual(
        DEFAULT_TENANT_SETTINGS.fulfillment.enabledTypes,
      );

      const second = await service.update(ORG, {
        fulfillment: { enabledTypes: ["PICKUP"] },
      });
      expect(second.fulfillment.coordination).toBe("PHONE");
      expect(second.fulfillment.enabledTypes).toEqual(["PICKUP"]);
    });
  });
});
