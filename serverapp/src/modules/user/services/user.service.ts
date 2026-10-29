import { ForbiddenException, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import * as bcrypt from "bcrypt";

// Repositories
import UserReporitory from "../repository/user.repository";
import PermitReporitory from "../../permit/repository/permit.repository";
import SubscriptionReporitory from "../repository/subscription.repository";
import SubscriptionPlanReporitory from "../../subscription/repository/subscription-plan.repository";
import UserPaymentMethodReporitory from "../repository/user-payment-method.repository";

// Services
import { SubscriptionService } from "../services/subscription.service";
import { UserPaymentMethodService } from "../services/user-payment-method.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { I18nService } from "src/shared/lang/i18n.service";

// Types & Dtos
import { Actions } from "src/shared/types/dashboard.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import { DomainEvent } from "src/shared/event/domain-listener";
import {
  CreateUserDto,
  DEFAULT_INCLUDE,
  USER_WICTH_ID,
  USER_WHERE,
} from "../dto/user.types";
import { User, UserStatus } from "src/shared/types/schema.types";
import { UserListQueryDto } from "../dto/user-list-query.dto";
import {
  Form,
  FormInput,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import { SUBSCRIPTION_WHERE } from "../dto/subscription.type";
import { USER_CREATE } from "../dto/user.types";
import { USER_PAYMENT_METHOD_WHERE } from "../dto/user-payment-method.types";

// Domain Errors
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import { FeedbackService } from "./feedback.service";
import { FEEDBACK_WHERE } from "../dto/feedback.type";
import FeedbackRepository from "../repository/feedback.repository";

import { MailService } from "../../mail/mail.service";

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserReporitory,
    private readonly permitRepository: PermitReporitory,
    private readonly eventEmitter: EventEmitter2,
    private readonly i18n: I18nService,
    private readonly susbcriptionRepository: SubscriptionReporitory,
    private readonly subscriptionService: SubscriptionService, // Corregido nombre variable
    private readonly subscriptionPlanRepository: SubscriptionPlanReporitory,
    private readonly userPaymentMethodRepository: UserPaymentMethodReporitory,
    private readonly userPaymentMethodService: UserPaymentMethodService,
    private readonly logger: LoggerService,
    private readonly feedbackService: FeedbackService,
    private readonly feedbackRepository: FeedbackRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

  /**
   * ACTUALIZACIÓN DE FOTO DE PERFIL
   * Patrón: Try -> Catch (Log/Event) -> Rethrow
   */
  public async setProfilePicture({
    where,
    file,
    path,
  }: {
    where: USER_WICTH_ID;
    file: Prisma.FileCreateInput;
    path: string;
  }) {
    const prev = new DomainEvent({
      action: this.userRepository.EVENT_UPDATED,
      entityName: this.userRepository.MODEL_NAME,
      payload: where,
    });
    this.eventEmitter.emit(this.userRepository.EVENT_UPDATED, prev);
    this.logger.logInfo("Comenzando actualización de avatar", "UserService");

    try {
      const entity = await this.userRepository.update({
        where,
        data: {
          avatarUrl: file.originalName,
          profile: {
            create: file,
          },
        },
      });

      const success = new DomainEvent({
        action: this.userRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.userRepository.MODEL_NAME,
        payload: where,
      });
      this.eventEmitter.emit(
        this.userRepository.EVENT_UPDATED_SUCCESS,
        success,
      );
      this.logger.logInfo("Actualización de avatar completada", "UserService");

      return entity;
    } catch (error) {
      // 1. Efectos secundarios (Logs y Eventos de fallo)
      const failed = new DomainEvent({
        action: this.userRepository.EVENT_UPDATED_FAILED,
        entityName: this.userRepository.MODEL_NAME,
        payload: where,
        metadata: { error: error },
      });
      this.logger.logError("Actualización de avatar fallida", error);
      this.eventEmitter.emit(this.userRepository.EVENT_UPDATED_FAILED, failed);

      // 2. IMPORTANTE: Relanzar el error.
      // Si el repositorio lanzó EntityNotFoundException, subirá tal cual.
      // Si fue un error desconocido, subirá y será un 500.
      throw error;
    }
  }

  /**
   * CREAR USUARIO
   * Eliminamos ConflictException manual. El repositorio ya lanza DuplicateEntryException.
   */
  async createUser(data: CreateUserDto) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const prev = new DomainEvent({
      action: this.userRepository.EVENT_CREATED,
      entityName: this.userRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.userRepository.EVENT_CREATED, prev);

    try {
      const referralCode = (
        data.firstName.substring(0, 3) + Math.floor(1000 + Math.random() * 9000)
      ).toUpperCase();

      let referrerId: string | null = null;
      if (data.referredByCode) {
        const referrer = await this.userRepository.findOne({
          where: { referralCode: data.referredByCode },
        });
        if (referrer) referrerId = referrer.id;
      }

       const gender = data.gender ? data.gender.toUpperCase() : 'OTHER';
      const maleAvatars = [
        '/images/avatars/male_1.png',
        '/images/avatars/male_2.png',
        '/images/avatars/male_3.png',
        '/images/avatars/male_4.png',
      ];
      const femaleAvatars = [
        '/images/avatars/female_1.png',
        '/images/avatars/female_2.png',
        '/images/avatars/female_3.png',
        '/images/avatars/female_4.png',
        '/images/avatars/female_5.png',
        '/images/avatars/female_6.png',
        '/images/avatars/female_7.png',
      ];
      const otherAvatars = [
        '/images/avatars/other_1.png',
        '/images/avatars/other_2.png',
        '/images/avatars/other_3.png',
        '/images/avatars/other_4.png',
      ];

      let selectedList = otherAvatars;
      if (gender === 'MALE') {
        selectedList = maleAvatars;
      } else if (gender === 'FEMALE') {
        selectedList = femaleAvatars;
      } else if (!data.gender) {
        selectedList = [...maleAvatars, ...femaleAvatars, ...otherAvatars];
      }

      const randomIndex = Math.floor(Math.random() * selectedList.length);
      const avatarUrl = selectedList[randomIndex];

      let finalUsername = data.username;
      if (!finalUsername && data.email) {
        finalUsername = data.email.split("@")[0];
      }

      if (finalUsername) {
        let exists = await this.userRepository.findOne({
          where: { username: finalUsername },
        });
        if (exists) {
          let attempts = 0;
          let candidate = finalUsername;
          while (exists && attempts < 50) {
            const randomDigits = Math.floor(100 + Math.random() * 900).toString();
            candidate = `${finalUsername}${randomDigits}`;
            exists = await this.userRepository.findOne({
              where: { username: candidate },
            });
            attempts++;
          }
          finalUsername = candidate;
        }
      } else {
        finalUsername = `user_${Math.floor(100 + Math.random() * 900)}`;
      }

      const dataCreate: USER_CREATE = {
        email: data.email,
        username: finalUsername,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        permits: { connect: { id: data.permitId } },
        wallet: { create: { balance: 0 } },
        referralCode: referralCode,
        referredBy: referrerId ? { connect: { id: referrerId } } : undefined,
        avatarUrl: avatarUrl,
        // S7 (legal-compliance): fecha de nacimiento del registro (gate de edad).
        birthDate: data.birthDate,
        // S1 (legal-compliance): prueba de aceptación de Términos + Aviso.
        termsAcceptedAt: data.termsAcceptedAt,
        termsVersion: data.termsVersion,
        termsAcceptedIpHash: data.termsAcceptedIpHash,
      };

      const entity = await this.userRepository.create({
        data: dataCreate,
      });

      if (!entity) throw new ForbiddenException("Usuario no creado");

      const success = new DomainEvent({
        action: this.userRepository.EVENT_CREATED_SUSSCESS,
        entityName: this.userRepository.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(
        this.userRepository.EVENT_CREATED_SUSSCESS,
        success,
      );

      if (referrerId) {
        const referrer = await this.userRepository.update({
          where: { id: referrerId },
          data: {
            wallet: { update: { balance: { increment: 1 } } },
          },
        });
        const refSuccess = new DomainEvent({
          action: this.userRepository.EVENT_USE_CODE_REF,
          entityName: this.userRepository.MODEL_NAME,
          payload: data,
        });
        this.eventEmitter.emit(
          this.userRepository.EVENT_CREATED_SUSSCESS,
          refSuccess,
        );

        // Send referral notification email
        if (referrer && referrer.email) {
          this.mailService.sendMail({
            to: referrer.email,
            subject: "¡Nuevo referido registrado en Nutringest! 🎉",
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"></head>
              <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
                  <tr><td align="center">
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:#059669;padding:32px 40px;text-align:center;">
                          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                          <p style="color:#a7f3d0;margin:8px 0 0;font-size:14px;">Programa de Referidos</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:40px;">
                          <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">¡Ganaste un nuevo crédito! 🎁</h2>
                          <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 16px;">
                            Hola <strong>${referrer.firstName || "Nutricionista"}</strong>, el colega <strong>${data.firstName} ${data.lastName}</strong> se registró exitosamente con tu código de referido.
                          </p>
                          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
                            <p style="color:#166534;font-size:15px;margin:0 0 4px;">Se acreditó en tu billetera:</p>
                            <p style="color:#15803d;font-size:32px;font-weight:800;margin:0;">+1 Crédito / $1.00 USD</p>
                          </div>
                          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                            ¡Seguí compartiendo tu código para acumular más beneficios en tu cuenta de Nutringest!
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f1f5f9;padding:20px 40px;text-align:center;">
                          <p style="color:#94a3b8;font-size:12px;margin:0;">Nutringest — Tu salud en tus manos</p>
                        </td>
                      </tr>
                    </table>
                  </td></tr>
                </table>
              </body>
              </html>
            `,
          }).catch((err) =>
            this.logger.logError("Error enviando mail de referido", err),
          );
        }
      }

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.userRepository.EVENT_CREATED_FAILED,
        entityName: this.userRepository.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(this.userRepository.EVENT_CREATED_FAILED, failed);
      this.logger.logError("Error creando usuario", error);

      // Relanzamos el error para que el GlobalExceptionFilter lo maneje
      throw error;
    }
  }

  /**
   * ACTUALIZAR USUARIO
   * No necesitamos try/catch porque no hay lógica compleja extra aquí,
   * dejamos que los errores del repositorio suban directo.
   */
  async updateUser(params: {
    where: { id: string };
    data: Prisma.UserUpdateInput;
  }) {
    const { where, data } = params;

    if (data.password) {
      this.logger.warn(
        "Intento de actualizar contraseña vía updateUser genérico. Bloqueado.",
      );
      delete data.password;
    }

    // Si el repositorio falla (ej. ID no existe), lanzará EntityNotFoundException
    return this.userRepository.update({ where, data });
  }

  /**
   * CAMBIAR CONTRASEÑA
   */
  async passwordUser(params: { where: { id: string }; data: string }) {
    const hash = await bcrypt.hash(params.data, 10);
    // update lanza EntityNotFoundException si el usuario no existe
    return this.userRepository.update({
      where: params.where,
      data: { password: hash },
    });
  }

  async deleteUser(where: { id: string }) {
    return this.userRepository.delete({ where });
  }

  // --- CONSULTAS ---

  async findOneById(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      // Opcional: Si es crítico que exista, lanza error. Si es consulta pasiva, retorna null.
      // throw new EntityNotFoundException('Usuario');
    }
    return user;
  }

  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findForAuthByEmail(email: string) {
    return await this.userRepository.findForAuthByEmail(email);
  }

  async findForAuthById(id: string) {
    return await this.userRepository.findForAuthById(id);
  }

  async findOne(userWhereInput: Prisma.UserWhereInput) {
    return await this.userRepository.findOne({ where: userWhereInput });
  }

  async findByToken(token: string) {
    return await this.userRepository.findOne({ where: { token, deletedAt: null } });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereUniqueInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<Omit<User, "password">[]> {
    const { skip, take, where, orderBy } = params;
    const users = await this.userRepository.findMany({
      skip: skip || 0,
      take: take ? Number(take) : 10,
      where: where || {},
      orderBy: orderBy || {},
    });

    // Remover password en la capa de servicio (o usar DTO con class-transformer)
    return users.map((user) => {
      if (!user) return null;
      const { password, ...result } = user;
      return result as any;
    });
  }

  // --- PAGINACIÓN Y VISTAS ---

  public async getPageSubscription({
    param,
    query,
  }: {
    param: { id: string };
    query: FilterParamsDto;
  }) {
    // Si no encuentra, findOne devuelve null. Podrías validar aquí.
    const entity = await this.susbcriptionRepository.findOne({
      where: { id: param.id },
    });

    if (!entity) throw new EntityNotFoundException("Suscripción"); // Validación de dominio

    const userId = `${entity.user.id}`;
    const columns = this.susbcriptionRepository.getColumns();
    const subscriptionNext =
      await this.susbcriptionRepository.getSubscriptionNext({
        userId,
        notId: entity.id,
      });

    const format = {
      update: {
        url: "/user/form/update",
        label: "common.user.update",
        ico: "pencil",
        color: "sky-600",
      },
      password: {
        url: "/user/form/password",
        label: "common.user.password",
        ico: "lock",
        color: "sky-600",
      },
    };

    const customWhere: SUBSCRIPTION_WHERE[] = [];
    customWhere.push({ user: { id: userId } });
    if (entity) customWhere.push({ id: { not: entity.id } });
    if (subscriptionNext)
      customWhere.push({ id: { not: subscriptionNext.id } });

    // Corregí el nombre de la variable 'susbcriptionService' a 'subscriptionService' en el constructor
    const { currentPage, limit, totalPages, hasPrev, hasNext, list, total } =
      await this.subscriptionService.getPaginate(query, customWhere);

    return {
      pageTitle: "common.user.unique",
      subscriptionNext,
      object: entity,
      format,
      history: {
        actions: {},
        total,
        list,
        columns,
        sortParams: {
          sortBy: query?.sortBy,
          sortOrder: query?.sortOrder,
        },
        currentPage,
        limit,
        totalPages,
        hasPrev,
        hasNext,
        currentQuery: query,
      },
    };
  }

  public async getPageSubscriptionByUser({
    param,
    query,
    workspaceId,
  }: {
    param: { id: string };
    query: FilterParamsDto;
    workspaceId?: string;
  }) {
    const targetOrgId = (workspaceId && workspaceId !== 'personal') ? workspaceId : null;

    // Build where clause based on workspace context
    // Include EXPIRED and GRACE_PERIOD so the UI can show the subscription
    // status and offer renewal when it's no longer ACTIVE.
    const subscriptionWhere: any = {
      userId: param.id,
      status: { in: ["ACTIVE", "EXPIRED", "GRACE_PERIOD"] },
      organizationId: targetOrgId,
    };

    const entity = await this.susbcriptionRepository.findOne({
      where: subscriptionWhere,
    });

    const entityNext = await this.susbcriptionRepository.findOne({
      where: { 
        userId: param.id, 
        status: "NEXT",
        organizationId: targetOrgId,
      },
    });

    // AQUÍ: En lugar de retornar un objeto { error: true }, lanzamos excepción
    if (!entity) throw new EntityNotFoundException("Suscripción Activa");

    const userId = `${entity.user.id}`;
    const columns = this.susbcriptionRepository.getColumns();
    const subscriptionNext =
      await this.susbcriptionRepository.getSubscriptionNext({
        userId,
        notId: entity.id,
      });

    const format = {
      update: {
        url: "/user/form/update",
        label: "common.user.update",
        ico: "pencil",
        color: "sky-600",
      },
      password: {
        url: "/user/form/password",
        label: "common.user.password",
        ico: "lock",
        color: "sky-600",
      },
    };

    const customWhere: SUBSCRIPTION_WHERE[] = [];
    customWhere.push({ user: { id: userId } });
    if (entity) customWhere.push({ id: { not: entity.id } });
    if (subscriptionNext)
      customWhere.push({ id: { not: subscriptionNext.id } });

    const { currentPage, limit, totalPages, hasPrev, hasNext, list, total } =
      await this.subscriptionService.getPaginate(query, customWhere);
    const filters = this.susbcriptionRepository.getFilters({});

    return {
      pageTitle: "common.user.unique",
      subscriptionNext,
      object: entity,
      next: entityNext,
      filters,
      format,
      history: {
        actions: {},
        total,
        list,
        columns,
        sortParams: {
          sortBy: query?.sortBy,
          sortOrder: query?.sortOrder,
        },
        currentPage,
        limit,
        totalPages,
        hasPrev,
        hasNext,
        currentQuery: query,
      },
    };
  }

  public async getPagePaymentMethod({
    param,
    query,
    sessionUser,
  }: {
    param: { id: string };
    query: FilterParamsDto;
    sessionUser: User;
  }) {
    const entity = await this.userPaymentMethodService.findOneById(param.id);
    if (!entity) throw new EntityNotFoundException("Método de pago");

    const moreItems = await this.userPaymentMethodRepository.findMany({
      skip: 0,
      take: 4,
      orderBy: { id: "asc" },
      where: { AND: [{ id: { not: entity.id } }, { deletedAt: null }] },
    });
    const actions = await this.userPaymentMethodService.getActions(
      sessionUser.permits.list,
    );

    return {
      pageTitle: "common.payment_method.user_unique",
      actions,
      object: entity,
      methods: moreItems,
    };
  }

  public async getPagePaymentMethodList({
    query,
    sessionUser,
  }: {
    query: FilterParamsDto;
    sessionUser: User;
  }) {
    const columns = this.userPaymentMethodRepository.getColumns();

    const pwhere: USER_PAYMENT_METHOD_WHERE[] = [];
    const isAdmin = sessionUser.permits?.list?.includes("USER_LIST") || sessionUser.permits?.list?.includes("PERMIT_DASHBOARD");
    if (!isAdmin) {
      pwhere.push({ user: { id: sessionUser.id } });
    }

    const { currentPage, limit, totalPages, hasPrev, hasNext, list, total } =
      await this.userPaymentMethodService.getPaginate(query, pwhere);
    const actions = await this.userPaymentMethodService.getActions(
      sessionUser.permits.list,
    );

    const filters = this.userPaymentMethodRepository.getFilters({});

    return {
      pageTitle: "common.user.payment_method",
      actions,
      total,
      list,
      columns,
      sortParams: {
        sortBy: query?.sortBy,
        sortOrder: query?.sortOrder,
      },
      currentPage,
      limit,
      totalPages,
      hasPrev,
      hasNext,
      currentQuery: query,
      filters,
    };
  }

  public async getPageFeedback({
    query,
    sessionUser,
  }: {
    query: FilterParamsDto;
    sessionUser: User;
  }) {
    const columns = this.feedbackRepository.getColumns();

    const pwhere: FEEDBACK_WHERE[] = [];
    // pwhere.push({ user: { id: sessionUser.id } });

    const { currentPage, limit, totalPages, hasPrev, hasNext, list, total } =
      await this.feedbackService.getPaginate(query, { AND: pwhere });
    const actions = await this.feedbackService.getActions(
      sessionUser.permits.list,
    );

    const filters = this.userPaymentMethodRepository.getFilters({});

    return {
      pageTitle: "common.user.feedback",
      actions,
      total,
      list,
      columns,
      sortParams: {
        sortBy: query?.sortBy,
        sortOrder: query?.sortOrder,
      },
      currentPage,
      limit,
      totalPages,
      hasPrev,
      hasNext,
      currentQuery: query,
      filters,
    };
  }

  // ... (getPaginate, getActions y translateForm se mantienen igual) ...
  async getPaginate(
    query: UserListQueryDto,
    nutritionistId?: string,
    isPatientOnly?: boolean,
    orgId?: string,
    sessionUser?: any,
  ) {
    const {
      q,
      status,
      permitId,
      permitName,
      emailVerified,
      isDemo,
      createdAt_gte,
      createdAt_lte,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const where: USER_WHERE[] = [];

    const isGlobalRole =
      sessionUser?.permits?.name === "SUPERADMIN" ||
      sessionUser?.permits?.name === "ADMIN";

    if (status === "DELETED") {
      where.push({ deletedAt: { not: null } });
    } else if (!isGlobalRole) {
      where.push({ deletedAt: null });
    }

    if (!isGlobalRole) {
      where.push({ permits: { id: { not: this.permitRepository.SUPERADMIN } } });
    }

    // Filtrar usuarios demo por defecto (excluir demo del listado principal) solo a usuarios normales
    if (isDemo !== undefined && isDemo !== null) {
      where.push({ isDemo: isDemo === true });
    } else if (!isGlobalRole) {
      where.push({ isDemo: false }); // Por defecto excluir demo
    }

    if (q) {
      where.push({
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (status && status !== "DELETED") where.push({ status: status as UserStatus });
    if (permitId) where.push({ permitId: permitId });

    // Filtro multi-selección por rol/tipo de usuario (Permit.name)
    if (permitName && permitName.length > 0) {
      where.push({ permits: { name: { in: permitName } } });
    }

    // Filtro por correo verificado (emailVerifiedAt)
    if (emailVerified !== undefined && emailVerified !== null) {
      where.push(
        emailVerified
          ? { emailVerifiedAt: { not: null } }
          : { emailVerifiedAt: null },
      );
    }

    if (createdAt_gte || createdAt_lte) {
      const dateFilter: any = {};
      if (createdAt_gte) dateFilter.gte = new Date(createdAt_gte);
      if (createdAt_lte) dateFilter.lte = new Date(createdAt_lte);
      where.push({ createdAt: dateFilter });
    }

    if (!isGlobalRole) {
      if (orgId) {
        where.push({
          organizationMembers: { some: { organizationId: orgId } },
        });
      } else if (sessionUser?.id) {
        // Personal context: a tenant never lists users from another workspace.
        where.push({ id: sessionUser.id });
      }
    } else if (isPatientOnly) {
      where.push({ organizationMembers: { some: {} } });
    }

    const currentPage = page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;
    const whereClause = { AND: where };

    const [list, total] = await Promise.all([
      this.userRepository.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: DEFAULT_INCLUDE,
      }),
      this.userRepository.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return {
      list,
      total,
      totalRecords: total,
      totalPages,
      currentPage,
      limit,
      hasPrev,
      hasNext,
    };
  }

  async getActions(
    permitList: string[],
    form: { formCreate?: Form; formUpdate?: Form; formPassword?: Form },
    object: string,
  ) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
      password: null,
    };

    if (permitList.includes(this.permitRepository.USER_LIST))
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/users",
        action: "redirect",
      };
    if (permitList.includes(this.permitRepository.USER_UNIQUE))
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/users/:id",
      };
    if (permitList.includes(this.permitRepository.USER_CREATED))
      actions.create = {
        key: "user-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/user/form/create",
        action: "modal",
        form: form.formCreate,
      };
    if (permitList.includes(this.permitRepository.USER_UPDATE))
      actions.update = {
        key: "user-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/user/form/update",
        action: "modal",
        form: form.formUpdate,
      };
    if (permitList.includes(this.permitRepository.USER_DELETE))
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/user/:id/delete",
        action: "modal",
      };

    if (
      object === "user" &&
      permitList.includes(this.permitRepository.USER_UPDATE)
    )
      actions.password = {
        key: "user-update-password-key-modal",
        label: "common.actions.update_password",
        icon: "lock",
        link: "/user/form/password",
        action: "modal",
        form: form.formPassword,
      };

    return actions;
  }

  public translateForm(form: Form, lang: string): Form {
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(
      form.submitLabel || "common.actions.save",
      lang,
    );
    form.inputs.forEach((section: FormSection) => {
      section.title = this.i18n.translate(section.title, lang);
      section.elements.forEach((control: any) => {
        control.label = this.i18n.translate(control.label, lang);
        if (control.placeholder)
          control.placeholder = this.i18n.translate(control.placeholder, lang);
        if (control.options?.length > 0) {
          control.options.forEach((option) => {
            option.label = this.i18n.translate(option.label, lang);
          });
        }
      });
    });
    return form;
  }
}
