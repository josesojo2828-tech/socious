import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { DeliveryRouteStatus } from "@prisma/client";
import { DeliveryRouteService } from "./delivery-route.service";

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const UUID_ORDER = "11111111-1111-4111-8111-111111111111";

const ROUTE = {
  id: "route-1",
  routeNumber: "RUT-00001",
  organizationId: ORG_A,
  date: new Date("2026-11-07T00:00:00.000Z"),
  status: DeliveryRouteStatus.OPEN,
  deletedAt: null,
};

const makeTx = (opts: {
  settings?: any;
  sameDayRoute?: any;
  orders?: any[];
  held?: any[];
  existingItems?: any[];
  route?: any;
  item?: any;
  lastSort?: any;
} = {}) => ({
  deliveryRoute: {
    findFirst: jest.fn().mockResolvedValue(opts.route ?? ROUTE),
    findMany: jest.fn().mockResolvedValue([ROUTE]),
    count: jest.fn().mockResolvedValue(1),
    create: jest.fn((args: any) => Promise.resolve({ id: "route-1", ...args.data })),
    update: jest.fn((args: any) => Promise.resolve({ id: "route-1", ...args.data })),
  },
  deliveryRouteItem: {
    findFirst: jest.fn().mockImplementation(async (args: any) => {
      if (args?.where?.id && opts.item === null) return null;
      if (args?.where?.id) return opts.item ?? { id: "item-1", routeId: "route-1" };
      // sortOrder probe / orderId probe
      return args?.where?.orderId ? null : (opts.lastSort ?? null);
    }),
    findMany: jest.fn().mockResolvedValue(opts.held ? opts.held : []),
    create: jest.fn().mockResolvedValue({ id: "item-new" }),
    delete: jest.fn().mockResolvedValue({}),
    update: jest.fn((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
  },
  order: {
    findMany: jest
      .fn()
      .mockResolvedValue(opts.orders ?? [{ id: UUID_ORDER, status: "CONFIRMED" }]),
  },
  _settings: opts.settings,
});

const makeService = (txOpts: Parameters<typeof makeTx>[0] = {}) => {
  const tx = makeTx(txOpts);
  const settings = txOpts.settings ?? {
    cash: { shiftControl: true },
    routes: { enabled: true },
  };
  const prisma = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const tenantSettings = { get: jest.fn().mockResolvedValue(settings) };
  const sequence = { nextFormatted: jest.fn().mockResolvedValue("RUT-00001") };
  const emitter = { emit: jest.fn() };

  const service = new DeliveryRouteService(
    prisma as any,
    sequence as any,
    tenantSettings as any,
    emitter as any,
  );

  return { service, tx, sequence, tenantSettings, emitter };
};

const scope = (organizationId: string | null = ORG_A) => ({
  organizationId,
  createdById: "22222222-2222-4222-8222-222222222222",
});

describe("DeliveryRouteService", () => {
  describe("configuration gate (S8)", () => {
    it("answers 409 while the tenant has routes disabled", async () => {
      const { service } = makeService({ settings: { routes: { enabled: false } } });

      await expect(
        service.create(scope(), { date: "2026-11-07" }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.list(scope(), { page: 1, limit: 10 }),
      ).rejects.toThrow(/no están habilitadas/);
    });

    it("refuses a personal context: routes belong to an organization", async () => {
      const { service } = makeService();

      await expect(
        service.create(scope(null), { date: "2026-11-07" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("create", () => {
    it("opens a route for the calendar day with RUT numbering", async () => {
      const { service, tx, sequence } = makeService({
        sameDayRoute: null,
      });
      // 1st probe: no open route that day; 2nd: loadRoute returns the row.
      tx.deliveryRoute.findFirst.mockResolvedValueOnce(null);
      tx.deliveryRoute.create.mockResolvedValue({
        ...ROUTE,
        createdBy: null,
        items: [],
      });

      const created = await service.create(scope(), {
        date: "2026-11-07T04:00:00.000Z", // local evening → its own calendar day
        name: "Entregas sábado",
      });

      expect(sequence.nextFormatted).toHaveBeenCalledWith(
        "ROUTE",
        ORG_A,
        "RUT",
        5,
        expect.anything(),
      );
      expect(tx.deliveryRoute.create.mock.calls[0][0].data).toMatchObject({
        routeNumber: "RUT-00001",
        organizationId: ORG_A,
        name: "Entregas sábado",
      });
      expect(created).toBeTruthy();
    });

    it("uses the calendar date written by the client, not the UTC shift", async () => {
      const { service, tx } = makeService();
      // only the "another route this day" probe sees null; loadRoute falls back
      // to the default ROUTE row.
      tx.deliveryRoute.findFirst.mockResolvedValueOnce(null);

      await service.create(scope(), { date: "2026-11-07" });

      expect(tx.deliveryRoute.create.mock.calls[0][0].data.date.toISOString()).toBe(
        "2026-11-07T00:00:00.000Z",
      );
    });

    it("refuses a second open route on the same day", async () => {
      const { service, tx } = makeService();
      tx.deliveryRoute.findFirst.mockResolvedValue({
        id: "route-open",
        routeNumber: "RUT-00002",
      });

      await expect(
        service.create(scope(), { date: "2026-11-07" }),
      ).rejects.toThrow(/Ya hay una ruta abierta para ese día/);
      expect(tx.deliveryRoute.create).not.toHaveBeenCalled();
    });

    it("rejects a malformed date", async () => {
      const { service } = makeService();

      await expect(
        service.create(scope(), { date: "mañana" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("assigning orders", () => {
    it("rejects a pending (unconfirmed) order", async () => {
      const { service, tx } = makeService({
        orders: [{ id: UUID_ORDER, status: "PENDING" }],
      });
      tx.deliveryRoute.findFirst.mockResolvedValue(ROUTE);

      await expect(
        service.assignOrders(scope(), "route-1", [UUID_ORDER]),
      ).rejects.toThrow(/todavía no está confirmado/);
      expect(tx.deliveryRouteItem.create).not.toHaveBeenCalled();
    });

    it("rejects an order that belongs to another shop", async () => {
      const { service, tx } = makeService({ orders: [] });
      tx.deliveryRoute.findFirst.mockResolvedValue(ROUTE);

      await expect(
        service.assignOrders(scope(), "route-1", [UUID_ORDER]),
      ).rejects.toThrow(/no existe en este negocio/);
    });

    it("rejects an order already held by another open route", async () => {
      const { service, tx } = makeService({
        held: [{ orderId: UUID_ORDER }],
      });
      tx.deliveryRoute.findFirst.mockResolvedValue(ROUTE);

      await expect(
        service.assignOrders(scope(), "route-1", [UUID_ORDER]),
      ).rejects.toThrow(/ya están en otra ruta abierta/);
    });

    it("skips orders already in this same route (idempotent)", async () => {
      const { service, tx } = makeService();
      tx.deliveryRoute.findFirst.mockResolvedValue(ROUTE);
      tx.deliveryRouteItem.findMany
        .mockResolvedValueOnce([]) // held elsewhere
        .mockResolvedValueOnce([{ orderId: UUID_ORDER }]); // already in this route

      await service.assignOrders(scope(), "route-1", [UUID_ORDER]);

      expect(tx.deliveryRouteItem.create).not.toHaveBeenCalled();
    });
  });

  describe("marking stops", () => {
    it("requires a reason when the delivery failed", async () => {
      const { service, tx } = makeService({ item: { id: "item-1" } });
      tx.deliveryRoute.findFirst.mockResolvedValue(ROUTE);

      await expect(
        service.markItem(scope(), "route-1", "item-1", { status: "FAILED" }),
      ).rejects.toThrow(/Indica el motivo/);
    });

    it("stamps deliveredAt on a delivered stop", async () => {
      const { service, tx } = makeService({ item: { id: "item-1" } });
      tx.deliveryRoute.findFirst.mockResolvedValue(ROUTE);

      await service.markItem(scope(), "route-1", "item-1", {
        status: "DELIVERED",
      });

      expect(tx.deliveryRouteItem.update.mock.calls[0][0].data).toMatchObject({
        status: "DELIVERED",
        failureReason: null,
      });
      expect(
        tx.deliveryRouteItem.update.mock.calls[0][0].data.deliveredAt,
      ).toBeInstanceOf(Date);
    });

    it("stops editing a route that is already closed", async () => {
      const { service, tx } = makeService({ item: { id: "item-1" } });
      tx.deliveryRoute.findFirst.mockResolvedValue({
        ...ROUTE,
        status: DeliveryRouteStatus.COMPLETED,
      });

      await expect(
        service.markItem(scope(), "route-1", "item-1", { status: "DELIVERED" }),
      ).rejects.toThrow(/solo se actualizan pedidos de una ruta abierta/i);
    });
  });

  describe("route status machine", () => {
    it("walks OPEN → IN_PROGRESS → COMPLETED", async () => {
      const { service, tx } = makeService();
      tx.deliveryRoute.findFirst.mockResolvedValueOnce(ROUTE);
      await service.updateStatus(scope(), "route-1", DeliveryRouteStatus.IN_PROGRESS);

      tx.deliveryRoute.findFirst.mockResolvedValueOnce({
        ...ROUTE,
        status: DeliveryRouteStatus.IN_PROGRESS,
      });
      const completed = await service.updateStatus(
        scope(),
        "route-1",
        DeliveryRouteStatus.COMPLETED,
      );

      expect(tx.deliveryRoute.update).toHaveBeenCalledTimes(2);
      expect(completed).toBeTruthy();
    });

    it("never reopens a finished route", async () => {
      const { service, tx } = makeService();
      tx.deliveryRoute.findFirst.mockResolvedValue({
        ...ROUTE,
        status: DeliveryRouteStatus.COMPLETED,
      });

      await expect(
        service.updateStatus(scope(), "route-1", DeliveryRouteStatus.OPEN),
      ).rejects.toThrow(/No se puede pasar de COMPLETED a OPEN/);
    });
  });
});
