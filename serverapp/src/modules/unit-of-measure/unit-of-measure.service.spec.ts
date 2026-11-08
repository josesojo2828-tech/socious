import { ForbiddenException } from "@nestjs/common";
import { UnitOfMeasureService } from "./unit-of-measure.service";
import { UnitKind } from "@prisma/client";

/**
 * Units of measure contract (S2): system defaults are shared and read-only,
 * but each tenant can hide them for itself; tenants own their own rows, and
 * `Product.unit` keeps storing the abbreviation string.
 */
const makeService = (overrides: Record<string, unknown> = {}) => {
  const store: Record<string, unknown[]> = {};
  const unitOverrides: any[] = [];
  const prisma = {
    unitOfMeasure: {
      findFirst: jest.fn(async ({ where }: any) => {
        const rows = (store.units ?? []) as any[];
        return (
          rows.find(
            (row) =>
              (!where.organizationId ||
                row.organizationId === where.organizationId) &&
              (!where.abbreviation ||
                row.abbreviation === where.abbreviation) &&
              (!where.id || row.id === where.id),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        // Mirrors the Prisma default: `active` defaults to true.
        const row = {
          id: `u-${(store.units ?? []).length + 1}`,
          active: true,
          ...data,
        };
        store.units = [...((store.units ?? []) as any[]), row];
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        store.units = ((store.units ?? []) as any[]).map((row) =>
          row.id === where.id ? { ...row, ...data } : row,
        );
        return ((store.units ?? []) as any[]).find(
          (row) => row.id === where.id,
        );
      }),
      delete: jest.fn(async ({ where }: any) => {
        store.units = ((store.units ?? []) as any[]).filter(
          (row) => row.id !== where.id,
        );
        return { id: where.id };
      }),
      findMany: jest.fn(async () => store.units ?? []),
      ...((overrides.unitOfMeasure as object) ?? {}),
    },
    unitOfMeasureOverride: {
      findMany: jest.fn(async ({ where }: any) =>
        unitOverrides.filter(
          (row) => row.organizationId === where.organizationId,
        ),
      ),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = where.organizationId_unitId;
        const existing = unitOverrides.find(
          (row) =>
            row.organizationId === key.organizationId &&
            row.unitId === key.unitId,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `ov-${unitOverrides.length + 1}`, ...create };
        unitOverrides.push(row);
        return row;
      }),
      ...((overrides.unitOfMeasureOverride as object) ?? {}),
    },
  };
  return {
    service: new UnitOfMeasureService(prisma as any),
    prisma,
    store,
    unitOverrides,
  };
};

const ORG = "org-1";

describe("UnitOfMeasureService", () => {
  it("seeds the system catalog once and never duplicates it", async () => {
    const { service } = makeService();

    await service.ensureSystemDefaults();
    await service.ensureSystemDefaults();

    const rows = await service.list(ORG);
    const system = rows.filter((row: any) => row.organizationId === null);
    expect(system.map((row: any) => row.abbreviation)).toEqual([
      "UND",
      "kg",
      "g",
      "lb",
      "oz",
      "L",
      "mL",
    ]);
  });

  it("creates a tenant unit and lists it next to the system catalog", async () => {
    const { service } = makeService();
    await service.ensureSystemDefaults();

    await service.create(ORG, {
      name: "Bolsa",
      abbreviation: "bolsa",
      kind: UnitKind.COUNT,
    });

    const rows = await service.list(ORG);
    expect(rows.some((row: any) => row.abbreviation === "bolsa")).toBe(true);
    expect(
      rows.some((row: any) => row.organizationId === null),
    ).toBe(true);
  });

  it("rejects a duplicated abbreviation inside the same tenant", async () => {
    const { service } = makeService();
    await service.create(ORG, {
      name: "Bolsa",
      abbreviation: "bolsa",
      kind: UnitKind.COUNT,
    });

    await expect(
      service.create(ORG, {
        name: "Bolsita",
        abbreviation: "bolsa",
        kind: UnitKind.COUNT,
      }),
    ).rejects.toThrow(/Ya existe una unidad/);
  });

  it("refuses to mutate the system units", async () => {
    const { service, store } = makeService();
    await service.ensureSystemDefaults();
    const systemId = ((store.units ?? []) as any[]).find(
      (row) => row.abbreviation === "kg",
    ).id;

    await expect(
      service.update(ORG, systemId, { name: "Kilo" }),
    ).rejects.toThrow(ForbiddenException);
    await expect(service.remove(ORG, systemId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("deactivates a tenant unit without deleting it", async () => {
    const { service } = makeService();
    const unit = await service.create(ORG, {
      name: "Bolsa",
      abbreviation: "bolsa",
      kind: UnitKind.COUNT,
    });

    const updated = await service.update(ORG, unit.id, { active: false });
    expect(updated.active).toBe(false);
  });

  it("lets a tenant disable a system unit without mutating the shared row", async () => {
    const { service, store, unitOverrides } = makeService();
    await service.ensureSystemDefaults();
    const kg = ((store.units ?? []) as any[]).find(
      (row) => row.abbreviation === "kg",
    );

    const updated = await service.update(ORG, kg.id, { active: false });

    expect(updated.active).toBe(false);
    expect(
      ((store.units ?? []) as any[]).find((row) => row.id === kg.id).active,
    ).toBe(true);
    expect(unitOverrides).toEqual([
      expect.objectContaining({
        organizationId: ORG,
        unitId: kg.id,
        active: false,
      }),
    ]);

    const rows = await service.list(ORG);
    expect(rows.find((row: any) => row.id === kg.id).active).toBe(false);
  });

  it("keeps a system-unit override scoped to its own tenant", async () => {
    const { service, store } = makeService();
    await service.ensureSystemDefaults();
    const kg = ((store.units ?? []) as any[]).find(
      (row) => row.abbreviation === "kg",
    );

    await service.update(ORG, kg.id, { active: false });

    const otherTenant = await service.list("org-2");
    expect(otherTenant.find((row: any) => row.id === kg.id).active).toBe(true);
  });

  it("re-enables a system unit for the tenant", async () => {
    const { service, store } = makeService();
    await service.ensureSystemDefaults();
    const kg = ((store.units ?? []) as any[]).find(
      (row) => row.abbreviation === "kg",
    );

    await service.update(ORG, kg.id, { active: false });
    await service.update(ORG, kg.id, { active: true });

    const rows = await service.list(ORG);
    expect(rows.find((row: any) => row.id === kg.id).active).toBe(true);
  });
});
