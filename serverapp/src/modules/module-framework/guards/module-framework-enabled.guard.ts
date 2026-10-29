import { CanActivate, Injectable, NotFoundException } from "@nestjs/common";
import { isModuleFrameworkEnabled } from "../util/module-framework.flag";

/**
 * Task 5.1 — gates the module routes behind `MODULE_FRAMEWORK_ENABLED`.
 *
 * When the flag is off the routes behave as if they did not exist (404), so a
 * deployment can ship the code without exposing the framework. Applied at the
 * controller level (`@UseGuards`) on `ModuleController` and
 * `ModuleDashboardController`.
 */
@Injectable()
export class ModuleFrameworkEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!isModuleFrameworkEnabled()) {
      throw new NotFoundException("El framework de módulos no está habilitado");
    }
    return true;
  }
}
