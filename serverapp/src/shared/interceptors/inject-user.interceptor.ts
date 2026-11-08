import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, from, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { FastifyRequest } from "fastify";
import { UserService } from "../../modules/user/services/user.service"; // Ajusta la ruta si es necesario
import { DashboardService } from "src/modules/dashboard/dashboard.service";
import { PrismaService } from "nestjs-prisma";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import {
  buildSidebarSections,
  resolveOrganizationSlug,
} from "src/modules/dashboard/sidebar.helper";
import { Logger } from "@nestjs/common";
const logger = new Logger("inject-user.interceptor");


@Injectable()
export class InjectUserInterceptor implements NestInterceptor {
  /** Same tenant rule every controller uses (S6/S8). */
  private readonly organizationScope: OrganizationScopeService;

  // 1. Inyecta UserService
  constructor(
    private userService: UserService,
    private dashboardService: DashboardService,
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {
    this.organizationScope = new OrganizationScopeService(this.prisma);
  }

  /**
   * Resolved workspace of the request, so the sidebar built here matches the
   * one `DashboardController.sidebar()` builds (both must not drift).
   */
  private async resolveOrganizationId(
    request: FastifyRequest,
    currentUser: { id?: string; permits?: { name?: string | null } | null },
  ): Promise<string | null> {
    if (!currentUser?.id) return null;

    const resolved = await this.organizationScope.resolveOrganizationScope({
      user: currentUser as any,
      requestedOrganizationId: this.workspaceContext.getWorkspaceId(),
      unauthorizedFallback: "personal",
      missingFallback: "personal",
    });

    return resolved.organizationId;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // 2. Obtén el userId del usuario inyectado por el guard (Bearer JWT)
    const currentUser = (request as any).user;
    const userId = currentUser?.id;

    if (!userId) {
      return next.handle();
    }

    return new Observable((observer) => {
      this.userService
        .findForAuthById(userId)
        .then(async (user) => {
          const organizationId = await this.resolveOrganizationId(
            request,
            currentUser ?? {},
          );
          // Only a CATALOG_ONLINE workspace renders a shop entry: skip the
          // extra lookup for every other request.
          const organizationSlug = (
            currentUser?.entitlements?.modules ?? []
          ).some((module: { key?: string }) => module.key === "CATALOG_ONLINE")
            ? await resolveOrganizationSlug(this.prisma, organizationId)
            : null;

          next
            .handle()
            .pipe(
              switchMap((data) => {
                if (
                  user &&
                  data &&
                  typeof data === "object" &&
                  !Array.isArray(data)
                ) {
                  // Entitlements are attached to the request user by
                  // `SessionAuthGuard`. The shared helper is the SINGLE sidebar
                  // build site alongside `DashboardController.sidebar()` (task
                  // 3.4) — both must not drift.
                  const resolved = currentUser?.entitlements;
                  return from(
                    buildSidebarSections(
                      this.dashboardService,
                      user,
                      resolved,
                      organizationId,
                      organizationSlug,
                    ),
                  ).pipe(
                    map((sidebar) => ({
                      ...data,
                      // A response may legitimately carry its own `user` payload
                      // (e.g. the admin user-detail endpoint). Never overwrite it
                      // with the session user — only fall back to the session user
                      // when the payload does not already provide one.
                      user: data.user ?? user,
                      sidebar,
                    })),
                  );
                }
                return of(data);
              }),
            )
            .subscribe(observer);
        })
        .catch((error) => {
          logger.error("InjectUserInterceptor: Error fetching user:", error);
          next.handle().subscribe(observer);
        });
    });
  }
}
