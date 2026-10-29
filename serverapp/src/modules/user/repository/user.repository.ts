import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import UserModel from "../model/user-model";
import { PrismaService } from "nestjs-prisma";
import { DomainEvent } from "src/shared/event/domain-listener";
import type { User, UserStatus } from "src/shared/types/schema.types";
import {
  USER_INCLUDE,
  USER_WHERE_UNIQUE,
  USER_CREATE,
  USER_UPDATE,
  USER_WHERE,
  USER_WICTH_ID,
  USER_ORDER,
  DEFAULT_INCLUDE,
} from "../dto/user.types";
import { LoggerService } from "src/shared/logger/logger.service";
import {
  DuplicateEntryException,
  EntityNotFoundException,
} from "src/shared/error/domain-errors";

const SUBSCRIPTION_SELECT = {
  include: {
    plan: true,
  },
};

@Injectable()
export default class UserRepository extends UserModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private format(entity: any): User | null {
    if (!entity) return null;

    return {
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,

      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      username: entity.username,
      email: entity.email,
      fullName: entity.fullName,

      status: entity.status as UserStatus,
      avatarUrl: entity.avatarUrl,
      permitId: entity.permitId,
      permits: entity.permits,
      wallet: entity.wallet,
      subscriptions: entity.subscriptions,
      transactions: entity.transactions,
      sessions: entity.sessions,
      activityLogs: entity.activityLogs,
      files: entity.files,
      paymentMethods: entity.paymentMethods,
      addresses: entity.addresses,
      password: entity.password,

      referrals: entity.referrals,
      referredBy: entity.referredBy,
      referredById: entity.referredById,
      referralCode: entity.referralCode,

      nutritionistProfile: entity.nutritionistProfile,
      patientProfiles: entity.patientProfiles,

      emailVerifiedAt: entity.emailVerifiedAt,
      hashedRefreshToken: entity.hashedRefreshToken,
      emailVerificationToken: entity.emailVerificationToken,
      emailVerificationExpiresAt: entity.emailVerificationExpiresAt,
      failedLoginAttempts: entity.failedLoginAttempts,
      lockedUntil: entity.lockedUntil,

      userPermissions: entity.userPermissions,
      organizationMembers: entity.organizationMembers,
    };
  }

  public async findMany({
    include,
    orderBy,
    skip,
    take,
    where,
  }: {
    where: USER_WHERE;
    include?: USER_INCLUDE;
    orderBy?: USER_ORDER;
    skip: number;
    take: number;
  }) {
    const entity = await this.prisma.user.findMany({
      where,
      include: include || DEFAULT_INCLUDE,
      orderBy,
      skip: Number(skip),
      take: Number(take),
    });

    return entity.map((e) => this.format(e) as User);
  }

  public async findOne({
    where,
    include,
  }: {
    where: USER_WHERE;
    include?: USER_INCLUDE;
  }) {
    // Validación: Prevenir que Prisma devuelva el primer registro si el where está vacío
    if (
      !where ||
      Object.keys(where).length === 0 ||
      Object.values(where).every((v) => v === undefined)
    ) {
      return null;
    }

    // Si buscamos por campos únicos (id o email), usamos findUnique
    if (where.id && typeof where.id === "string") {
      const entity = await this.prisma.user.findUnique({
        where: { id: where.id },
        include: include || {
          ...DEFAULT_INCLUDE,
          profile: {
            include: {
              userAsProfile: true,
            },
          },
        },
      });
      return this.format(entity);
    }

    if (where.email && typeof where.email === "string") {
      const entity = await this.prisma.user.findUnique({
        where: { email: where.email },
        include: include || {
          ...DEFAULT_INCLUDE,
          profile: {
            include: {
              userAsProfile: true,
            },
          },
        },
      });
      return this.format(entity);
    }

    const entity = await this.prisma.user.findFirst({
      where,
      include: include || {
        ...DEFAULT_INCLUDE,
        profile: {
          include: {
            userAsProfile: true,
          },
        },
      },
    });

    return this.format(entity);
  }

  public async findForAuthByEmail(email: string): Promise<User | null> {
    if (!email || typeof email !== "string") {
      return null;
    }

    const entity = await this.prisma.user.findUnique({
      where: { email },
      include: {
        permits: true,
        subscriptions: SUBSCRIPTION_SELECT,
        nutritionistProfile: true,
      },
    });

    return this.format(entity);
  }

  public async findForAuthById(id: string): Promise<User | null> {
    if (!id || typeof id !== "string") {
      return null;
    }

    const entity = await this.prisma.user.findUnique({
      where: { id },
      include: {
        permits: true,
        userPermissions: true,
        subscriptions: SUBSCRIPTION_SELECT,
        nutritionistProfile: true,
      },
    });

    return this.format(entity);
  }


  public async create({ data }: { data: USER_CREATE }) {
    const prev = new DomainEvent({
      action: this.EVENT_CREATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_CREATED, prev);
    this.logger.logInfo(`Creando usuario: ${data.email}`);

    try {
      const entity = await this.prisma.user.create({
        data,
        include: DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_CREATED_SUSSCESS,
        entityName: this.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(this.EVENT_CREATED_SUSSCESS, success);
      this.logger.logInfo(`Usuario creado: ${data.email}`);

      return this.format(entity);
    } catch (error: any) {
      if (error.code === "P2002") {
        const target =
          (error.meta?.target as string[])?.join(", ") || "campo único";
        throw new DuplicateEntryException(
          `El valor para ${target} ya está en uso.`,
        );
      }
      throw error;
    }
  }

  public async update({
    data,
    where,
  }: {
    data: USER_UPDATE;
    where: USER_WICTH_ID;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.user.update({
        where,
        data,
        include: DEFAULT_INCLUDE,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      this.logger.logInfo(`Usuario actualizado: ${where.id}`);

      return this.format(entity);
    } catch (error: any) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);
      this.logger.logError(`Error al actualizar usuario: ${where.id}`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Usuario con ID ${where.id}`);
      }
      if (error.code === "P2002") {
        throw new DuplicateEntryException(
          "Datos duplicados (email o username ya existen).",
        );
      }

      throw error;
    }
  }

  public async delete({ where }: { where: USER_WICTH_ID }) {
    const prev = new DomainEvent({
      action: this.EVENT_DELETED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_DELETED, prev);
    this.logger.logInfo(`Eliminando usuario: ${where.id}`);

    try {
      // Telemetry cascade (task 5.2): user deletion is a soft delete, so a
      // DB-level FK cascade would never fire. Explicitly purge the user's
      // activity log and sessions in the same transaction.
      const entity = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where,
          data: { deletedAt: new Date() },
        });

        await tx.userActivityLog.deleteMany({ where: { userId: where.id } });
        await tx.userSession.deleteMany({ where: { userId: where.id } });

        return updated;
      });

      const success = new DomainEvent({
        action: this.EVENT_DELETED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_DELETED_SUCCESS, success);
      this.logger.logInfo(`Usuario eliminado: ${where.id}`);

      return this.format(entity);
    } catch (error: any) {
      const failed = new DomainEvent({
        action: this.EVENT_DELETED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_DELETED_FAILED, failed);
      this.logger.logError(`Error al eliminar usuario: ${where.id}`, error);

      if (error.code === "P2025") {
        throw new EntityNotFoundException(`Usuario con ID ${where.id}`);
      }

      throw error;
    }
  }

  public async count({ where }: { where: USER_WHERE }) {
    return await this.prisma.user.count({ where });
  }

  public async upsert({
    where,
    create,
    update,
  }: {
    where: USER_WHERE_UNIQUE;
    create: USER_CREATE;
    update: USER_UPDATE;
  }) {
    const prev = new DomainEvent({
      action: this.EVENT_UPDATED,
      entityName: this.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.EVENT_UPDATED, prev);

    try {
      const entity = await this.prisma.user.upsert({
        where,
        create,
        update,
      });

      const success = new DomainEvent({
        action: this.EVENT_UPDATED_SUCCESS,
        entityName: this.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_SUCCESS, success);
      return this.format(entity);
    } catch (error: any) {
      const failed = new DomainEvent({
        action: this.EVENT_UPDATED_FAILED,
        entityName: this.MODEL_NAME,
        payload: where,
        metadata: { error },
      });
      this.eventEmitter.emit(this.EVENT_UPDATED_FAILED, failed);

      if (error.code === "P2002") throw new DuplicateEntryException();

      throw error;
    }
  }

  public async getSubscriptionActive({ userId }: { userId: string }) {
    return await this.prisma.subscription.findFirst({
      where: { status: "ACTIVE", userId },
      include: { plan: true },
    });
  }

  public async getSubscriptionNext({ userId }: { userId: string }) {
    return await this.prisma.subscription.findFirst({
      where: { status: "NEXT", userId },
      include: { plan: true },
    });
  }
}
