import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { StudioService } from "./studio.service";

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const makeService = (
  opts: {
    stations?: any[];
    appointments?: any[];
    station?: any;
    appointment?: any;
    clash?: any;
    client?: any;
    service?: any;
    member?: any;
    createError?: any;
  } = {},
) => {
  const prisma: any = {
    studioStation: {
      findMany: jest.fn().mockResolvedValue(opts.stations ?? []),
      findFirst: jest.fn().mockResolvedValue(opts.station ?? null),
      create: jest.fn(
        opts.createError
          ? () => Promise.reject(opts.createError)
          : async (args: any) => ({ id: "station-new", ...args.data }),
      ),
      update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
      delete: jest.fn(async () => ({ id: "x" })),
    },
    studioAppointment: {
      findMany: jest.fn().mockResolvedValue(opts.appointments ?? []),
      findFirst: jest
        .fn()
        // First call is the overlap probe; later calls read the entity.
        .mockResolvedValueOnce(opts.clash ?? null)
        .mockResolvedValue(opts.appointment ?? null),
      create: jest.fn(async (args: any) => ({ id: "appt-new", ...args.data })),
      update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
    },
    client: { findFirst: jest.fn().mockResolvedValue(opts.client ?? null) },
    product: { findFirst: jest.fn().mockResolvedValue(opts.service ?? null) },
    organizationMember: {
      findFirst: jest.fn().mockResolvedValue(opts.member ?? null),
    },
  };

  return { service: new StudioService(prisma), prisma };
};

const scope = (organizationId: string | null = ORG_A) => ({ organizationId });

describe("StudioService", () => {
  it("refuses a personal context for stations", async () => {
    const { service } = makeService();

    await expect(service.listStations(scope(null))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("lists the stations of the workspace", async () => {
    const { service, prisma } = makeService({
      stations: [{ id: "s-1", name: "Mesa 1" }],
    });

    const list = await service.listStations(scope());

    expect(list).toHaveLength(1);
    expect(prisma.studioStation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: ORG_A } }),
    );
  });

  it("maps a duplicated station name to a clear conflict", async () => {
    const { service } = makeService({
      createError: Object.assign(new Error("unique"), { code: "P2002" }),
    });

    await expect(
      service.createStation(scope(), { name: "Mesa 1" }),
    ).rejects.toThrow(/Ya existe una mesa o silla llamada "Mesa 1"/);
  });

  it("rejects an appointment whose end is not after its start", async () => {
    const { service } = makeService();

    await expect(
      service.createAppointment(scope(), {
        startAt: "2026-11-09T10:00:00.000Z",
        endAt: "2026-11-09T09:00:00.000Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a slot that overlaps the same station", async () => {
    const { service } = makeService({
      clash: { id: "appt-old", startAt: new Date("2026-11-09T09:30:00.000Z") },
    });

    await expect(
      service.createAppointment(scope(), {
        startAt: "2026-11-09T09:00:00.000Z",
        endAt: "2026-11-09T10:00:00.000Z",
        stationId: "station-1",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("creates an appointment scoped to the workspace", async () => {
    const { service, prisma } = makeService({
      station: { id: "station-1", organizationId: ORG_A },
    });

    await service.createAppointment(
      scope(),
      {
        startAt: "2026-11-09T09:00:00.000Z",
        endAt: "2026-11-09T10:00:00.000Z",
        stationId: "station-1",
      },
      "user-1",
    );

    expect(prisma.studioAppointment.create.mock.calls[0][0].data).toMatchObject(
      {
        organizationId: ORG_A,
        stationId: "station-1",
        status: "SCHEDULED",
        createdById: "user-1",
      },
    );
  });

  it("lists the agenda of the workspace ordered by start", async () => {
    const { service, prisma } = makeService({ appointments: [] });

    await service.listAppointments(scope(), {
      from: "2026-11-09T00:00:00.000Z",
      to: "2026-11-10T00:00:00.000Z",
    });

    expect(prisma.studioAppointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG_A }),
        orderBy: { startAt: "asc" },
      }),
    );
  });

  it("refuses to cancel an appointment outside the workspace", async () => {
    const { service } = makeService({ appointment: null });

    await expect(
      service.cancelAppointment(scope(), "appt-x"),
    ).rejects.toThrow(/Cita no encontrada/);
  });
});
