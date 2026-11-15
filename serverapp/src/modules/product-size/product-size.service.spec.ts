import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ProductSizeService } from "./product-size.service";

/** Size catalog (tallas): system rows are read-only, tenant rows are CRUD. */
const makeService = () => {
  const state = {
    rows: [
      { id: "sys-s", organizationId: null, label: "S", sortOrder: 1, active: true },
      { id: "own-38", organizationId: "org-1", label: "38", sortOrder: 2, active: true },
    ] as Array<Record<string, unknown>>,
  };

  const prisma = {
    productSize: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const wantedId =
          typeof where.id === "string" ? where.id : undefined;
        const notId = (where.id as { not?: string } | undefined)?.not;
        return (
          state.rows.find((row) => {
            if (wantedId && row.id !== wantedId) return false;
            if (notId && row.id === notId) return false;
            if (
              where.organizationId !== undefined &&
              row.organizationId !== where.organizationId
            ) {
              return false;
            }
            if (where.label !== undefined && row.label !== where.label) {
              return false;
            }
            return true;
          }) ?? null
        );
      }),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const or = where.OR as Array<Record<string, unknown>> | undefined;
        if (!or) {
          return state.rows.filter(
            (row) => row.organizationId === (where.organizationId ?? null),
          );
        }
        return state.rows.filter((row) =>
          or.some((clause) => row.organizationId === clause.organizationId),
        );
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `new-${state.rows.length}`, active: true, ...data };
        state.rows.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = state.rows.find((candidate) => candidate.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        state.rows = state.rows.filter((row) => row.id !== where.id);
        return { id: where.id };
      }),
    },
  };

  return { service: new ProductSizeService(prisma as never), state, prisma };
};

describe("ProductSizeService", () => {
  it("lists the system catalog plus the tenant rows", async () => {
    const { service } = makeService();
    const rows = await service.list("org-1");
    expect(rows.map((row) => row.id)).toEqual(["sys-s", "own-38"]);
  });

  it("only lists the system catalog in the personal context", async () => {
    const { service } = makeService();
    const rows = await service.list(null);
    expect(rows.map((row) => row.id)).toEqual(["sys-s"]);
  });

  it("creates a tenant size and rejects a duplicate label", async () => {
    const { service, state } = makeService();
    const created = await service.create("org-1", { label: " 40 " });
    expect(created.label).toBe("40");
    expect(state.rows).toHaveLength(3);
    await expect(service.create("org-1", { label: "40" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("does not let a tenant edit or delete a system size", async () => {
    const { service } = makeService();
    await expect(service.update("org-1", "sys-s", { label: "X" })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove("org-1", "sys-s")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("updates and deletes a tenant size", async () => {
    const { service } = makeService();
    const updated = await service.update("org-1", "own-38", { active: false });
    expect(updated.active).toBe(false);
    await expect(service.remove("org-1", "own-38")).resolves.toEqual({
      deleted: true,
    });
  });
});
