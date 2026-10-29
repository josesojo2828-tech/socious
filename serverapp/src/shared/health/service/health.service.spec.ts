import { HealthCheckError } from "@nestjs/terminus";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  let service: HealthService;

  const health = { check: jest.fn() };
  const prismaHealth = { pingCheck: jest.fn() };
  const prisma = {};
  const logger = { info: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();

    health.check.mockImplementation(
      async (checkers: Array<() => Promise<Record<string, unknown>>>) => {
        const details: Record<string, unknown> = {};
        let status = "ok";
        for (const checker of checkers) {
          try {
            Object.assign(details, await checker());
          } catch (error: unknown) {
            status = "error";
            details["prisma"] = {
              status: "down",
              message: (error as Error).message,
            };
          }
        }
        return { status, details };
      }
    );

    service = new HealthService(
      health as any,
      prismaHealth as any,
      prisma as any,
      logger as any
    );
  });

  it("debe exponer un método check()", () => {
    expect(typeof service.check).toBe("function");
  });

  it("debe reportar status ok cuando el ping de prisma es exitoso", async () => {
    prismaHealth.pingCheck.mockResolvedValue({ prisma: { status: "up" } });

    const result = await service.check();

    expect(prismaHealth.pingCheck).toHaveBeenCalledWith("prisma", prisma);
    expect(result).toEqual({
      status: "ok",
      details: {
        status: "ok",
        details: { prisma: { status: "up" } },
      },
    });
    expect(logger.info).toHaveBeenCalledWith("Health check completed", {
      status: "ok",
    });
  });

  it("debe reportar status error cuando el ping de prisma falla", async () => {
    prismaHealth.pingCheck.mockRejectedValue(
      new HealthCheckError("prisma ping failed", {
        prisma: { status: "down" },
      })
    );

    const result = await service.check();

    expect(prismaHealth.pingCheck).toHaveBeenCalledWith("prisma", prisma);
    expect(result.status).toBe("error");
    expect(result).toEqual({
      status: "error",
      details: {
        status: "error",
        details: {
          prisma: { status: "down", message: "prisma ping failed" },
        },
      },
    });
  });
});