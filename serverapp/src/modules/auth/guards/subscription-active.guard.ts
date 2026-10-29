import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { isAdmin } from "../../permit/authz";

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as any).user;
    return SubscriptionActiveGuard.validateUserSubscription(request, user);
  }

  public static validateUserSubscription(request: FastifyRequest, user: any): boolean {
    const method = request.method.toUpperCase();

    // 1. Las peticiones de lectura (GET, HEAD, OPTIONS) siempre se permiten
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return true;
    }

    if (!user) {
      return true; // Dejar que SessionAuthGuard maneje la autenticación
    }

    // Rutas exentas de validación de mutación (renovaciones, logout, pagos, recargas, marketplace)
    const url = request.url || "";
    if (
      url.includes("/subscription/renew") ||
      url.includes("/api/auth/logout") ||
      url.includes("/api/wallet") ||
      url.includes("/api/payment-methods") ||
      url.includes("/api/marketplace")
    ) {
      return true;
    }

    // SuperAdmin o Admin (clase admin vía permits.name) sin restricción
    if (isAdmin(user)) {
      return true;
    }

    const subscriptions = user.subscriptions || [];
    if (subscriptions.length === 0) {
      return true; // Sin suscripción configurada
    }

    // 2. Leer X-Workspace-Id header para contexto de workspace
    const workspaceIdHeader = request.headers["x-workspace-id"] as string | undefined;
    const organizationId = (workspaceIdHeader && workspaceIdHeader !== "personal") ? workspaceIdHeader : null;

    // 3. Buscar suscripción para el contexto actual
    const activeSub = organizationId
      ? // Buscar suscripción para el workspace específico
        subscriptions.find((sub) => sub.organizationId === organizationId)
      : // Buscar suscripción personal (organizationId: null)
        subscriptions.find(
          (sub) => sub.organizationId === null || sub.organizationId === undefined,
        );

    // No subscription for THIS context -> nothing to enforce. We MUST NOT fall
    // back to `subscriptions[0]`: that would enforce (or bypass) another
    // workspace's subscription against the current one.
    if (!activeSub || !activeSub.endDate) {
      return true; // Plan sin fecha fin (o plan gratuito)
    }

    const planPrice = Number(activeSub.plan?.price || 0);
    if (planPrice <= 0) {
      return true; // Plan gratuito
    }

    // 4. Verificar campos de cascada de cancelación
    const now = new Date();

    // Si tiene readOnlyEndsAt y aún no ha expirado → solo lectura
    if (activeSub.readOnlyEndsAt) {
      const readOnlyEnd = new Date(activeSub.readOnlyEndsAt);
      if (now <= readOnlyEnd) {
        // Período de solo lectura: permitir GET, rechazar mutaciones
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          throw new ForbiddenException({
            code: "SUBSCRIPTION_READ_ONLY",
            message:
              "Tu suscripción está en período de solo lectura. Renueva tu suscripción para realizar cambios.",
          });
        }
        return true;
      }
      // Período de solo lectura expirado → bloqueado
      throw new ForbiddenException({
        code: "SUBSCRIPTION_EXPIRED_BLOCKED",
        message:
          "Tu suscripción ha vencido y ha finalizado el período de gracia. Por favor renueva tu suscripción para continuar realizando acciones.",
      });
    }

    // Si tiene gracePeriodEndsAt y aún no ha expirado → permitir con flag
    if (activeSub.gracePeriodEndsAt) {
      const graceEnd = new Date(activeSub.gracePeriodEndsAt);
      if (now <= graceEnd) {
        // Dentro del período de gracia: permitir acciones
        return true;
      }
      // Período de gracia expirado → pasar a solo lectura (se verificará readOnlyEndsAt arriba)
    }

    if (activeSub.status === "EXPIRED") {
      throw new ForbiddenException({
        code: "SUBSCRIPTION_EXPIRED_BLOCKED",
        message:
          "Tu suscripción ha vencido y ha finalizado el período de gracia. Por favor renueva tu suscripción para continuar realizando acciones.",
      });
    }

    const endDate = new Date(activeSub.endDate);

    // 5. Lógica de gracia original (5 días)
    const graceEndDate = new Date(endDate);
    graceEndDate.setDate(graceEndDate.getDate() + 5);

    if (now > graceEndDate) {
      throw new ForbiddenException({
        code: "SUBSCRIPTION_EXPIRED_BLOCKED",
        message:
          "Tu suscripción ha vencido y ha finalizado el período de gracia. Por favor renueva tu suscripción para continuar realizando acciones.",
      });
    }

    return true;
  }
}

