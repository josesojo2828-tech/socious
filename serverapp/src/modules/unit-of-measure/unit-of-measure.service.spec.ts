import { ForbiddenException } from "@nestjs/common";
import { UnitOfMeasureService } from "./unit-of-measure.service";
import { UnitKind } from "@prisma/client";

/**
 * Units of measure contract (S2): system defaults are read-only, tenants own
 * their rows, and `Product.unit` keeps storing the abbreviation string.
 */
const makeService = (overrides: Record<string, unknown> = {}) => {
  const store: Record<string, unknown[]> = {};
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
        const row = { id: `u-${(store.units ?? []).length + 1}`, ...data };
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
  };
  return { service: new UnitOfMeasureService(prisma as any), prisma, store };
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
});
