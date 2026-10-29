import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  Logger,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UserService } from "src/modules/user/services/user.service";
import { Reflector } from "@nestjs/core";
import { SubscriptionActiveGuard } from "./subscription-active.guard";
import { EntitlementService } from "src/modules/permit/service/entitlement.service";
import type { ResolvedEntitlements } from "src/modules/permit/service/entitlement-resolver";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionAuthGuard.name);

  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService, // 1. Inyectamos JwtService
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // ---------------------------------------------------------
    // ESTRATEGIA A: ¿Es una petición API con Token? (Bearer)
    // ---------------------------------------------------------
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        // Validamos la FIRMA del JWT (ya no confiamos en un lookup por token crudo en DB)
        const atSecret = this.config.get<string>("AT_SECRET");
        if (!atSecret) {
          throw new UnauthorizedException("Auth no configurada");
        }

        const payload = await this.jwtService.verifyAsync<{ sub: string }>(
          token,
          { secret: atSecret },
        );

        const user = payload?.sub
          ? await this.usersService.findForAuthById(payload.sub)
          : null;
        if (!user || user.deletedAt) throw new UnauthorizedException();

        // Resolve the effective entitlements once per request (cached 60s) and
        // attach them to the request user so guards, permission checks and the
        // dashboard consume the SAME union instead of re-synthesizing permits.
        const workspaceId =
          (request.headers["x-workspace-id"] as string | undefined) ?? null;
        const userWithEntitlements = user as typeof user & {
          entitlements: ResolvedEntitlements;
        };
        userWithEntitlements.entitlements = await this.entitlements.resolve(
          user.id,
          workspaceId,
          user,
        );

        (request as any).user = userWithEntitlements;
        SubscriptionActiveGuard.validateUserSubscription(request, user);
        return true; // ✅ Acceso concedido vía JWT
      } catch (error) {
        if (error instanceof HttpException) throw error;
        console.error("[SessionAuthGuard] ❌ ERROR EN GUARD:", error);
        this.logger.error("Error en SessionAuthGuard:", error);
        throw new UnauthorizedException("Token inválido o expirado");
      }
    }

    // Sin Bearer token válido no hay fallback de sesión/MVC: siempre 401 JSON
    throw new UnauthorizedException("No autorizado");
  }
}

