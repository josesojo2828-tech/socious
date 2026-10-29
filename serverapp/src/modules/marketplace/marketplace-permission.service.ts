import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class MarketplacePermissionService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly SELLER_PERMISSION = 'MARKET_SELLER';

  async isSeller(userId: string): Promise<boolean> {
    const permission = await this.prisma.userPermission.findFirst({
      where: {
        userId,
        organizationId: null,
        permission: this.SELLER_PERMISSION,
      },
    });
    
    if (!permission) return false;
    
    if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) {
      return false;
    }
    
    return true;
  }

  async grantSellerPermission(userId: string, expiresAt?: Date) {
    const existing = await this.prisma.userPermission.findFirst({
      where: {
        userId,
        organizationId: null,
        permission: this.SELLER_PERMISSION,
      },
    });

    if (existing) {
      if (expiresAt) {
        return this.prisma.userPermission.update({
          where: { id: existing.id },
          data: { expiresAt },
        });
      }
      return existing;
    }

    return this.prisma.userPermission.create({
      data: {
        userId,
        permission: this.SELLER_PERMISSION,
        expiresAt,
      },
    });
  }

  async revokeSellerPermission(userId: string) {
    const permission = await this.prisma.userPermission.findFirst({
      where: {
        userId,
        organizationId: null,
        permission: this.SELLER_PERMISSION,
      },
    });

    if (!permission) {
      throw new NotFoundException('Permiso de vendedor no encontrado');
    }

    return this.prisma.userPermission.delete({
      where: { id: permission.id },
    });
  }

  async getSellerPermissions() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        userPermissions: {
          where: { permission: this.SELLER_PERMISSION },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      avatar: u.avatarUrl,
      isSeller: u.userPermissions.length > 0 && (!u.userPermissions[0].expiresAt || new Date(u.userPermissions[0].expiresAt) > new Date()),
    }));
  }
}