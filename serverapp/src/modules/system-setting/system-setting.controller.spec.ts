import { IS_PUBLIC_KEY } from "src/shared/decorators/public.decorator";
import { SystemSettingController } from "./system-setting.controller";
import { SystemSettingService } from "./system-setting.service";

/**
 * El registro es una pantalla sin sesión: si la ruta de días de prueba no es
 * pública, el CTA no puede leerla y vuelve a mostrar un número inventado.
 */
describe("SystemSettingController — días de prueba", () => {
  const controller = new SystemSettingController(
    new SystemSettingService({
      systemSetting: {
        findUnique: jest.fn(async () => ({ value: "45" })),
      },
    } as any),
  );

  it("expone GET api/system-settings/trial-days marcado como público", () => {
    const path = Reflect.getMetadata("path", SystemSettingController.prototype.findTrialDays);
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      SystemSettingController.prototype.findTrialDays,
    );

    expect(path).toBe("trial-days");
    expect(isPublic).toBe(true);
  });

  it("devuelve el valor resuelto, no la fila cruda ni un 404", async () => {
    await expect(controller.findTrialDays()).resolves.toEqual({ days: 45 });
  });
});
