import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { RequestWithUser } from 'src/shared/types/server.type';

@Injectable()
export class OrgAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    // Global admins bypass this guard
    if (user.permits?.name === 'SUPERADMIN' || user.permits?.name === 'ADMIN') {
      return true;
    }

    const orgId = (request.params as { id?: string } | undefined)?.id;
    if (!orgId) {
      throw new ForbiddenException('ID de organización no proporcionado');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE' || membership.role !== 'CLINIC_ADMIN') {
      throw new ForbiddenException('No tienes permisos de administrador en esta clínica');
    }

    return true;
  }
}
