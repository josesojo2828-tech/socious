import { UserDetailService } from "./user-detail.service";

/**
 * La ficha del usuario (S1) expone sus organizaciones activas: es lo que
 * permite al admin abrir la configuración del cliente sin cambiar de contexto.
 */
const ORG_ROW = {
  id: "u-1",
  firstName: "Ana",
  lastName: "Perez",
  fullName: "Ana Perez",
  email: "ana@boutique.test",
  username: null,
  avatarUrl: null,
  status: "ACTIVE",
  createdAt: new Date("2026-01-01"),
  referralCode: null,
  permitId: "permit-1",
  permits: { id: "permit-1", name: "ADMIN", description: null },
  referredBy: null,
  _count: {
    referrals: 0,
    sessions: 0,
    transactions: 0,
    activityLogs: 0,
    createdClients: 0,
    createdSales: 0,
  },
  wallet: null,
  subscriptions: [],
  sessions: [],
  organizationMembers: [] as any[],
};

const makeService = (user: any) => {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => user) },
  };
  return { service: new UserDetailService(prisma), prisma };
};

describe("UserDetailService", () => {
  it("expone las organizaciones activas con su rol", async () => {
    const { service } = makeService({
      ...ORG_ROW,
      organizationMembers: [
        {
          role: "CLINIC_ADMIN",
          organization: {
            id: "org-1",
            name: "Boutique Centro",
            slug: "boutique-centro",
            status: "ACTIVE",
          },
        },
      ],
    });

    const detail = await service.getUserDetail("u-1");

    expect(detail?.organizations).toEqual([
      {
        id: "org-1",
        name: "Boutique Centro",
        slug: "boutique-centro",
        status: "ACTIVE",
        role: "CLINIC_ADMIN",
      },
    ]);
  });

  it("devuelve una lista vacía cuando el usuario no tiene membresías", async () => {
    const { service } = makeService(ORG_ROW);

    const detail = await service.getUserDetail("u-1");

    expect(detail?.organizations).toEqual([]);
  });

  it("responde null cuando el usuario no existe", async () => {
    const { service } = makeService(null);

    expect(await service.getUserDetail("nope")).toBeNull();
  });
});
