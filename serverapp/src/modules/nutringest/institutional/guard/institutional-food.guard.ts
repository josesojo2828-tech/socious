import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { PermissionService } from "src/modules/permit/service/permission.service";

@Injectable()
export class InstitutionalFoodGuard implements CanActivate {
  constructor(private readonly permissionService: PermissionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Usuario no autenticado");
    }

    const hasAccess = this.permissionService.hasInstitutionalFoodAccess(user);
    if (!hasAccess) {
      throw new ForbiddenException(
        "Esta funcionalidad es exclusiva de los planes Premium o Clínica."
      );
    }

    return true;
  }
}
