import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

const ADMIN_PERMIT_NAMES = ["ADMIN", "SUPERADMIN"];

/**
 * S6 (legal-compliance): endpoints administrativos solo para cuentas con
 * permit ADMIN o SUPERADMIN. Usar DESPUÉS de SessionAuthGuard:
 *
 *   @UseGuards(SessionAuthGuard, AdminGuard)
 *
 * Sigue el patrón de chequeo de user.controller / user.service
 * (permits.name === "ADMIN" || "SUPERADMIN").
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: { permits?: { name?: string } } }>();

    const permitName = request.user?.permits?.name;
    if (!permitName || !ADMIN_PERMIT_NAMES.includes(permitName)) {
      throw new ForbiddenException("Requiere permisos de administrador");
    }

    return true;
  }
}
