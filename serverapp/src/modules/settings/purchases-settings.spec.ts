import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BadRequestException } from "@nestjs/common";
import { DEFAULT_TENANT_SETTINGS } from "src/shared/constants/tenant-settings";
import { TenantSettingsService } from "src/shared/services/tenant-settings.service";
import { UpdateTenantSettingsDto } from "./dto/settings.dto";

/**
 * `purchases.onlySupplierProducts` (S14 #2): the in-context switch the
 * /dashboard/compras/nuevo screen reads from GET /api/settings and writes
 * back through PATCH.
 *
 *  - default `false` = "mostrar todos" (the UI states it explicitly)
 *  - DTO accepts only a boolean (the global ValidationPipe runs this DTO)
 *  - the service re-validates: unknown keys and wrong types are a 400
 *
 * The service is exercised end to end (DTO shape → validatePatch → merge)
 * because both layers must agree on the section name.
 */

const ORG = "11111111-1111-4111-8111-111111111111";

/** Stateful stub mirroring the real read/write of Organization.settings. */
const makeService = (initial: unknown = null) => {
  let stored = initial;
  const prisma = {
    organization: {
      findUnique: jest.fn(async () => ({ settings: stored })),
      update: jest.fn(async (args: any) => {
        stored = args.data.settings;
        return { id: args.where.id, settings: stored };
      }),
    },
  };
  return { service: new TenantSettingsService(prisma as any), prisma };
};

const dto = (body: unknown) => plainToInstance(UpdateTenantSettingsDto, body);

describe("purchases settings section (S14 #2)", () => {
  it("defaults to false — mostrar todos los productos", () => {
    expect(DEFAULT_TENANT_SETTINGS.purchases).toEqual({
      onlySupplierProducts: false,
    });
  });

  it("DTO accepts the boolean check the screen sends", async () => {
    await expect(
      validate(dto({ purchases: { onlySupplierProducts: true } })),
    ).resolves.toHaveLength(0);
    await expect(
      validate(dto({ purchases: { onlySupplierProducts: false } })),
    ).resolves.toHaveLength(0);
  });

  it("DTO rejects a non-boolean check", async () => {
    const errors = await validate(dto({ purchases: { onlySupplierProducts: "yes" } }));
    expect(errors).not.toHaveLength(0);
    expect(JSON.stringify(errors)).toMatch(/verdadero o falso/i);
  });

  it("persists the switch and leaves every sibling section untouched", async () => {
    const { service } = makeService({ routes: { enabled: true } });

    const settings = await service.update(ORG, {
      purchases: { onlySupplierProducts: true },
    });

    expect(settings.purchases.onlySupplierProducts).toBe(true);
    expect(settings.routes.enabled).toBe(true);
    expect(settings.cash).toEqual(DEFAULT_TENANT_SETTINGS.cash);

    const back = await service.update(ORG, {
      purchases: { onlySupplierProducts: false },
    });
    expect(back.purchases.onlySupplierProducts).toBe(false);
  });

  it("rejects an unknown key inside the section", async () => {
    const { service } = makeService();

    await expect(
      service.update(ORG, { purchases: { onlySuppliers: true } }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(ORG, { purchases: { onlySuppliers: true } }),
    ).rejects.toThrow(/Clave desconocida/);
  });

  it("rejects a non-boolean value inside the section", async () => {
    const { service } = makeService();

    await expect(
      service.update(ORG, { purchases: { onlySupplierProducts: "yes" } }),
    ).rejects.toThrow(/verdadero o falso/i);
  });

  it("reads back a stored value and normalizes corrupt data to the default", async () => {
    const stored = makeService({ purchases: { onlySupplierProducts: true } });
    expect((await stored.service.get(ORG)).purchases.onlySupplierProducts).toBe(
      true,
    );

    const corrupt = makeService({ purchases: "nope" });
    expect((await corrupt.service.get(ORG)).purchases.onlySupplierProducts).toBe(
      false,
    );
  });
});
