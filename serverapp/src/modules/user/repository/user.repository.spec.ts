import UserRepository from "./user.repository";

/**
 * Phase 8 (task 8.3) — R1 payload regression at the mapping layer.
 *
 * Both `/api/auth/login` (via `findOne({ email })`) and `/user/me` (via
 * `findOne({ id })`) flow through `UserRepository.findOne` → `format()`. The
 * roles-permisos change required NO payload change, so this spec LOCKS the
 * contract: the mapped user MUST keep `permits` and `userPermissions`.
 */
const USER_ID = "11111111-1111-4111-8111-111111111111";

const makeEntity = () => ({
  id: USER_ID,
  email: "ana@nutringest.test",
  firstName: "Ana",
  lastName: "Diaz",
  username: "ana",
  fullName: "Ana Diaz",
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  deletedAt: null,
  permits: { id: "USER", name: "USER", list: ["USER_LIST", "CAMPUS_LIST"] },
  userPermissions: [{ id: "perm-1", permission: "USER_DELETE", expiresAt: null }],
  password: "hashed-password",
});

const makeRepository = () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const eventEmitter = { emit: jest.fn() };
  const logger = { logInfo: jest.fn(), logError: jest.fn() };
  const repository = new UserRepository(
    prisma as any,
    eventEmitter as any,
    logger as any,
  );
  return { repository, prisma };
};

describe("UserRepository.findOne — R1 payload contract (task 8.3)", () => {
  it("preserves permits + userPermissions when looked up by id (/user/me)", async () => {
    const { repository, prisma } = makeRepository();
    prisma.user.findUnique.mockResolvedValue(makeEntity());

    const user = await repository.findOne({ where: { id: USER_ID } });

    expect(user).not.toBeNull();
    expect(user!.permits).toEqual({
      id: "USER",
      name: "USER",
      list: ["USER_LIST", "CAMPUS_LIST"],
    });
    expect(user!.userPermissions).toEqual([
      { id: "perm-1", permission: "USER_DELETE", expiresAt: null },
    ]);
  });

  it("preserves permits + userPermissions when looked up by email (login path)", async () => {
    const { repository, prisma } = makeRepository();
    prisma.user.findUnique.mockResolvedValue(makeEntity());

    const user = await repository.findOne({ where: { email: "ana@nutringest.test" } });

    expect(user!.permits).toMatchObject({ name: "USER" });
    expect(user!.userPermissions).toHaveLength(1);
    expect(user!.userPermissions![0].permission).toBe("USER_DELETE");
  });

  it("keeps userPermissions as an empty array when the user has no grants", async () => {
    const { repository, prisma } = makeRepository();
    prisma.user.findUnique.mockResolvedValue({ ...makeEntity(), userPermissions: [] });

    const user = await repository.findOne({ where: { id: USER_ID } });

    expect(Array.isArray(user!.userPermissions)).toBe(true);
    expect(user!.userPermissions).toEqual([]);
  });

  it("returns null (no throw) when no entity is found", async () => {
    const { repository, prisma } = makeRepository();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      repository.findOne({ where: { id: "missing-id" } }),
    ).resolves.toBeNull();
  });

  describe("findForAuthById & findForAuthByEmail", () => {
    it("preserves nutritionistProfile in findForAuthById", async () => {
      const { repository, prisma } = makeRepository();
      const entity = {
        ...makeEntity(),
        nutritionistProfile: { id: "nut-auth-id", userId: USER_ID },
      };
      prisma.user.findUnique.mockResolvedValue(entity);

      const user = await repository.findForAuthById(USER_ID);

      expect(user).not.toBeNull();
      expect(user!.nutritionistProfile).toEqual({ id: "nut-auth-id", userId: USER_ID });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
        include: expect.objectContaining({
          nutritionistProfile: true,
        }),
      });
    });

    it("preserves nutritionistProfile in findForAuthByEmail", async () => {
      const { repository, prisma } = makeRepository();
      const entity = {
        ...makeEntity(),
        nutritionistProfile: { id: "nut-auth-id", userId: USER_ID },
      };
      prisma.user.findUnique.mockResolvedValue(entity);

      const user = await repository.findForAuthByEmail("ana@nutringest.test");

      expect(user).not.toBeNull();
      expect(user!.nutritionistProfile).toEqual({ id: "nut-auth-id", userId: USER_ID });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "ana@nutringest.test" },
        include: expect.objectContaining({
          nutritionistProfile: true,
        }),
      });
    });
  });
});
