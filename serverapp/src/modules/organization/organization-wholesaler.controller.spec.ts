import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OrganizationController } from "./organization.controller";
import { UpdateWholesalerDto } from "./dto/organization.dto";
import { AdminGuard } from "src/shared/guards/admin.guard";

/**
 * Flag mayorista (S1): SOLO la plataforma lo escribe. El dueño del cliente
 * tiene el rol de administración de su organización, así que la ruta no puede
 * usar OrgAdminGuard — tiene que exigir AdminGuard.
 */
const GUARDS_METADATA = "__guards__";

const makeController = () => {
  const service = {
    setWholesaler: jest
      .fn()
      .mockResolvedValue({ id: "org-1", name: "Boutique", isWholesaler: true }),
  };
  return {
    controller: new OrganizationController(service as any),
    service,
  };
};

describe("OrganizationController — flag mayorista", () => {
  it("la ruta exige el guard de plataforma", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      OrganizationController.prototype.setWholesaler,
    );

    expect(guards).toEqual([AdminGuard]);
  });

  it("delega el cambio al servicio", async () => {
    const { controller, service } = makeController();

    const result = await controller.setWholesaler("org-1", {
      isWholesaler: true,
    });

    expect(service.setWholesaler).toHaveBeenCalledWith("org-1", true);
    expect(result).toMatchObject({ isWholesaler: true });
  });
});

describe("UpdateWholesalerDto", () => {
  const validateDto = async (payload: Record<string, unknown>) =>
    validate(plainToInstance(UpdateWholesalerDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it("acepta un booleano", async () => {
    expect(await validateDto({ isWholesaler: true })).toHaveLength(0);
    expect(await validateDto({ isWholesaler: false })).toHaveLength(0);
  });

  it("rechaza cualquier otra cosa", async () => {
    expect(await validateDto({ isWholesaler: "true" })).not.toHaveLength(0);
    expect(await validateDto({})).not.toHaveLength(0);
  });
});
