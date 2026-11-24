import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ForbiddenException } from "@nestjs/common";
import { OrganizationController } from "./organization.controller";
import { UpdateMeatProcessingDto } from "./dto/organization.dto";
import { AdminGuard } from "src/shared/guards/admin.guard";

/**
 * Flag carnes y procesados (S1): SOLO la plataforma lo escribe.
 * La ruta exige AdminGuard.
 */
const GUARDS_METADATA = "__guards__";

const makeController = () => {
  const service = {
    setMeatProcessing: jest
      .fn()
      .mockResolvedValue({ id: "org-1", name: "Carnicería Central", isMeatProcessing: true }),
  };
  return {
    controller: new OrganizationController(service as any),
    service,
  };
};

describe("OrganizationController — flag carnes y procesados (S1)", () => {
  it("la ruta exige el guard de plataforma", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      OrganizationController.prototype.setMeatProcessing,
    );

    expect(guards).toEqual([AdminGuard]);
  });

  it("delega el cambio al servicio", async () => {
    const { controller, service } = makeController();

    const result = await controller.setMeatProcessing("org-1", {
      isMeatProcessing: true,
    });

    expect(service.setMeatProcessing).toHaveBeenCalledWith("org-1", true);
    expect(result).toMatchObject({ isMeatProcessing: true });
  });
});

describe("AdminGuard en la ruta carnes y procesados (S1)", () => {
  const ctx = (permit?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: permit ? { permits: { name: permit } } : {} }),
      }),
    }) as any;

  it("deniega al cliente y permite a la plataforma", () => {
    for (const permit of ["USER", "CLINIC_ADMIN", "OWNER", "SELLER"]) {
      expect(() => new AdminGuard().canActivate(ctx(permit))).toThrow(
        ForbiddenException,
      );
    }
    expect(new AdminGuard().canActivate(ctx("ADMIN"))).toBe(true);
    expect(new AdminGuard().canActivate(ctx("SUPERADMIN"))).toBe(true);
    expect(() => new AdminGuard().canActivate(ctx())).toThrow();
  });
});

describe("UpdateMeatProcessingDto", () => {
  const validateDto = async (payload: Record<string, unknown>) =>
    validate(plainToInstance(UpdateMeatProcessingDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it("acepta un booleano", async () => {
    expect(await validateDto({ isMeatProcessing: true })).toHaveLength(0);
    expect(await validateDto({ isMeatProcessing: false })).toHaveLength(0);
  });

  it("rechaza cualquier otra cosa", async () => {
    expect(await validateDto({ isMeatProcessing: "true" })).not.toHaveLength(0);
    expect(await validateDto({})).not.toHaveLength(0);
  });
});
