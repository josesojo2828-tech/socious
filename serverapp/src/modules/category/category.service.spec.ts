import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { CategoryService } from "./category.service";

const SUPERADMIN = { organizationId: null, isSuperadmin: true };
const TENANT_A = { organizationId: "org-a", isSuperadmin: false };
const TENANT_B = { organizationId: "org-b", isSuperadmin: false };

const SYSTEM_ROOT = {
  id: "cat-root",
  name: "Alimentos y Bebidas",
  slug: "alimentos-y-bebidas",
  icon: null,
  description: null,
  parentId: null,
  isSystem: true,
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const SYSTEM_CHILD = {
  ...SYSTEM_ROOT,
  id: "cat-child",
  name: "Víveres",
  slug: "viveres",
  parentId: "cat-root",
};

const makePrisma = () => ({
  category: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((args: any) =>
      Promise.resolve({ id: "new-cat", ...args.data }),
    ),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
  },
  product: { count: jest.fn().mockResolvedValue(0) },
});

const makeService = () => {
  const prisma = makePrisma();
  return { service: new CategoryService(prisma as any), prisma };
};

describe("CategoryService", () => {
  describe("listTree", () => {
    it("nests children under their parent root", async () => {
      const { service, prisma } = makeService();
      prisma.category.findMany.mockResolvedValue([SYSTEM_ROOT, SYSTEM_CHILD]);

      const tree = await service.listTree(null);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe("cat-root");
      expect(tree[0].subCategories).toHaveLength(1);
      expect(tree[0].subCategories[0].id).toBe("cat-child");
    });

    it("a personal context only sees the platform catalog", async () => {
      const { service, prisma } = makeService();

      await service.listTree(null);

      const where = prisma.category.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ organizationId: null }]);
    });

    it("a tenant sees the catalog plus its own categories", async () => {
      const { service, prisma } = makeService();

      await service.listTree("org-a");

      const where = prisma.category.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { organizationId: null },
        { organizationId: "org-a" },
      ]);
    });
  });

  describe("create", () => {
    it("creates a platform category only as SUPERADMIN", async () => {
      const { service, prisma } = makeService();

      await service.create(SUPERADMIN, { name: "Ropa y Moda" });

      expect(prisma.category.create.mock.calls[0][0].data).toMatchObject({
        slug: "ropa-y-moda",
        isSystem: true,
        organizationId: null,
      });
    });

    it("creates a tenant category owned by the caller's organization", async () => {
      const { service, prisma } = makeService();

      await service.create(TENANT_A, { name: "Promos locales" });

      expect(prisma.category.create.mock.calls[0][0].data).toMatchObject({
        isSystem: false,
        organizationId: "org-a",
      });
    });

    it("rejects a tenant without an organization", async () => {
      const { service } = makeService();

      await expect(
        service.create({ organizationId: null, isSuperadmin: false }, { name: "X" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects a duplicated slug inside the same owner", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({ id: "existing" });

      await expect(
        service.create(TENANT_A, { name: "Promos", slug: "promos" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("edit rules (S5)", () => {
    it("forbids a tenant from editing the system catalog", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(SYSTEM_ROOT);

      await expect(
        service.update(TENANT_A, "cat-root", { name: "Hacked" }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it("forbids a tenant from editing another tenant's category", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({
        ...SYSTEM_ROOT,
        id: "tenant-b-cat",
        isSystem: false,
        organizationId: "org-b",
      });

      await expect(
        service.update(TENANT_A, "tenant-b-cat", { name: "Hacked" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lets a tenant edit its own category", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({
        ...SYSTEM_ROOT,
        id: "tenant-a-cat",
        isSystem: false,
        organizationId: "org-a",
      });

      await expect(
        service.update(TENANT_A, "tenant-a-cat", { name: "Promos 2026" }),
      ).resolves.toMatchObject({ name: "Promos 2026" });
    });

    it("lets SUPERADMIN edit the system catalog", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(SYSTEM_ROOT);

      await expect(
        service.update(SUPERADMIN, "cat-root", { name: "Alimentos y Bebidas" }),
      ).resolves.toMatchObject({ name: "Alimentos y Bebidas" });
    });
  });

  describe("remove", () => {
    it("refuses to delete a category that still has subcategories", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(SYSTEM_ROOT);
      prisma.category.count.mockResolvedValue(2);

      await expect(service.remove(SUPERADMIN, "cat-root")).rejects.toThrow(
        ConflictException,
      );
    });

    it("refuses to delete a category that still has products", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(SYSTEM_ROOT);
      prisma.category.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(5);

      await expect(service.remove(SUPERADMIN, "cat-root")).rejects.toThrow(
        ConflictException,
      );
    });

    it("archives an empty category", async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(SYSTEM_ROOT);
      prisma.category.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      await expect(service.remove(SUPERADMIN, "cat-root")).resolves.toEqual({
        id: "cat-root",
        deleted: true,
      });
      expect(prisma.category.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(
        Date,
      );
    });
  });

  describe("getOne", () => {
    it("raises NotFound for an unknown id", async () => {
      const { service } = makeService();

      await expect(service.getOne(null, "missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
