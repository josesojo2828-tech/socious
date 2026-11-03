import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { DomainEvent } from "src/shared/event/domain-listener";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { Subscription } from "src/shared/types/schema.types";
import { Actions } from "src/shared/types/dashboard.type";
import {
  Form,
  FormInput,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import PermitReporitory from "../../permit/repository/permit.repository";
import { EntitlementCacheService } from "../../permit/cache/entitlement-cache";
import { I18nService } from "src/shared/lang/i18n.service";
import { FilterParamsDto } from "src/shared/types/server.type";
import SubscriptionReporitory from "../repository/subscription.repository";
import {
  IUserSubscriptionCreate,
  SUBSCRIPTION_ORDER,
  SUBSCRIPTION_UPDATE,
  SUBSCRIPTION_WHERE,
  SUBSCRIPTION_WHERE_UNIQUE,
} from "../dto/subscription.type";
import { CreateSubscriptionDto } from "../dto/user.types";
import { LoggerService } from "src/shared/logger/logger.service";
import { PrismaService } from "nestjs-prisma";
import { ExchangeService } from "../../exchange/exchange.service";

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: SubscriptionReporitory,
    private eventEmitter: EventEmitter2,

    private readonly permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly exchangeService: ExchangeService,
    private readonly entitlementCache: EntitlementCacheService,
  ) { }

  async renewNow({ userId, organizationId }: { userId: string; organizationId?: string | null }) {
    const whereClause: any = { userId, deletedAt: null };
    if (organizationId !== undefined) {
      whereClause.organizationId = organizationId;
    } else {
      whereClause.organizationId = null;
    }

    const sub = await this.prisma.subscription.findFirst({
      where: whereClause,
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    if (!sub) {
      throw new NotFoundException("No posees una suscripción para renovar.");
    }

    // SECURITY: Only allow renewal if subscription is EXPIRED, GRACE_PERIOD, CANCELED, or DECLINED
    const now = new Date();
    const isExpired = sub.endDate && new Date(sub.endDate) < now;
    const isRenewableStatus = ['EXPIRED', 'GRACE_PERIOD', 'CANCELED', 'DECLINED'].includes(sub.status);
    
    if (!isExpired && !isRenewableStatus) {
      throw new BadRequestException(
        "Tu suscripción aún está activa. Solo puedes renovar cuando esté vencida o en período de gracia."
      );
    }

    const planPrice = Number(sub.plan.price);
    if (planPrice <= 0) {
      throw new BadRequestException("Tu plan actual es gratuito y no requiere renovación.");
    }

    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException("No se encontró tu billetera.");
    }

    // Fetch user's payment method for transaction record
    const userPaymentMethod = await this.prisma.userPaymentMethod.findFirst({
      where: { userId, active: true, deletedAt: null },
      orderBy: { isDefault: 'desc' },
    });

    if (!userPaymentMethod) {
      throw new BadRequestException("No tienes un método de pago configurado. Agrega uno desde tu perfil antes de renovar.");
    }

    // Handle VES currency conversion
    const planCurrency = sub.plan.currency || 'USD';
    let amountToDeduct: number;
    let rateUsed: number | null = null;
    let originalAmount: number = planPrice;
    let originalCurrency: string = planCurrency;

    if (planCurrency === 'VES') {
      // Plan in Bolívares: convert to USD for wallet deduction
      const rate = await this.exchangeService.getBcvRate();
      amountToDeduct = planPrice / rate;
      rateUsed = rate;
    } else {
      // Plan in USD: deduct directly
      amountToDeduct = planPrice;
    }

    // Check sufficient balance (USD wallet)
    if (Number(wallet.balance) < amountToDeduct) {
      throw new BadRequestException(
        `Saldo insuficiente. Tienes $${Number(wallet.balance).toFixed(2)} USD y necesitas $${amountToDeduct.toFixed(2)} USD para renovar este plan.`
      );
    }

    // Deduct from wallet
    await this.prisma.userWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amountToDeduct } },
    });

    // Create transaction record
    await this.prisma.transaction.create({
      data: {
        userId,
        paymentMethodId: userPaymentMethod.id,
        type: 'PAYMENT',
        amount: amountToDeduct,
        currency: 'USD',
        originalAmount,
        originalCurrency,
        exchangeRateUsed: rateUsed,
        description: `Renovación plan ${sub.plan.name}`,
        status: 'SUCCESS',
        organizationId: sub.organizationId,
      },
    });

    // Calculate new end date
    const prevEndDate = sub.endDate ? new Date(sub.endDate) : new Date();
    const newEndDate = new Date(prevEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        endDate: newEndDate,
        gracePeriodEndsAt: null,
        readOnlyEndsAt: null,
        canceledAt: null,
      },
      include: { plan: true },
    });

    await this.entitlementCache.invalidate(userId, sub.organizationId ?? null);
    this.eventEmitter.emit("subscription.activated", { userId, organizationId: sub.organizationId });
    return updated;
  }

  async previewUpgrade(userId: string, newPlanId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException("El plan seleccionado no existe.");
    }

    const now = new Date();
    const currentPlanPrice = sub?.plan ? Number(sub.plan.price) : 0;
    const newPlanPriceUsd = Number(newPlan.price);

    let daysTotal = 30;
    let daysUsed = 0;
    let daysRemaining = 30;
    let unusedCreditUsd = 0;

    if (sub && sub.status === SubscriptionStatus.ACTIVE && sub.startDate) {
      const startDate = new Date(sub.startDate);
      const endDate = sub.endDate
        ? new Date(sub.endDate)
        : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (endDate > startDate) {
        const totalMs = endDate.getTime() - startDate.getTime();
        daysTotal = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));

        const usedMs = Math.max(0, now.getTime() - startDate.getTime());
        daysUsed = Math.max(
          0,
          Math.min(daysTotal, Math.floor(usedMs / (1000 * 60 * 60 * 24))),
        );
        daysRemaining = Math.max(0, daysTotal - daysUsed);

        if (currentPlanPrice > 0 && daysTotal > 0) {
          unusedCreditUsd = Number(
            ((daysRemaining / daysTotal) * currentPlanPrice).toFixed(2),
          );
        }
      }
    }

    const amountDueUsd = Math.max(
      0,
      Number((newPlanPriceUsd - unusedCreditUsd).toFixed(2)),
    );

    let canChangePlan = true;
    let nextAllowedDate: string | undefined = undefined;

    if (sub && sub.lastPlanChangeAt) {
      const lastChangeDate = new Date(sub.lastPlanChangeAt);
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const elapsed = now.getTime() - lastChangeDate.getTime();
      if (elapsed < THIRTY_DAYS_MS) {
        canChangePlan = false;
        const nextAllowed = new Date(lastChangeDate.getTime() + THIRTY_DAYS_MS);
        const day = String(nextAllowed.getDate()).padStart(2, "0");
        const month = String(nextAllowed.getMonth() + 1).padStart(2, "0");
        const year = nextAllowed.getFullYear();
        nextAllowedDate = `${day}/${month}/${year}`;
      }
    }

    return {
      currentPlan: sub?.plan || null,
      newPlan,
      daysTotal,
      daysUsed,
      daysRemaining,
      unusedCreditUsd,
      newPlanPriceUsd,
      amountDueUsd,
      canChangePlan,
      nextAllowedDate,
    };
  }

  async changePlan(userId: string, newPlanId: string, autoRenew?: boolean) {
    const preview = await this.previewUpgrade(userId, newPlanId);

    if (!preview.canChangePlan) {
      throw new BadRequestException(
        "Solo puedes cambiar de plan una vez al mes. Tu próximo cambio estará disponible el " +
          preview.nextAllowedDate,
      );
    }

    const amountDueUsd = preview.amountDueUsd;

    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet || Number(wallet.balance) < amountDueUsd) {
      const currentBalance = Number(wallet?.balance || 0);
      throw new BadRequestException(
        `Saldo insuficiente en tu billetera. Tienes $${currentBalance.toFixed(2)} USD y requieres $${amountDueUsd.toFixed(2)} USD.`,
      );
    }

    if (amountDueUsd > 0) {
      await this.prisma.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amountDueUsd } },
      });

      let userPaymentMethod = await this.prisma.userPaymentMethod.findFirst({
        where: { userId, active: true, deletedAt: null },
        orderBy: { isDefault: "desc" },
      });

      if (!userPaymentMethod) {
        let pm = await this.prisma.paymentMethod.findFirst({
          where: { active: true, deletedAt: null },
        });
        if (!pm) {
          pm = await this.prisma.paymentMethod.create({
            data: {
              name: "Billetera",
              code: "WALLET",
              description: "Pago con billetera",
            },
          });
        }
        userPaymentMethod = await this.prisma.userPaymentMethod.create({
          data: {
            userId,
            paymentMethodId: pm.id,
            active: true,
            isDefault: true,
            details: { name: "Billetera Virtual" },
          },
        });
      }

      await this.prisma.transaction.create({
        data: {
          userId,
          paymentMethodId: userPaymentMethod.id,
          type: "PAYMENT",
          amount: amountDueUsd,
          currency: "USD",
          description: `Cambio de plan a ${preview.newPlan.name} (prorrateado)`,
          status: "SUCCESS",
        },
      });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    let updatedSub;
    if (sub) {
      updatedSub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          planId: newPlanId,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          endDate,
          autoRenew: autoRenew !== undefined ? autoRenew : sub.autoRenew,
          gracePeriodEndsAt: null,
          readOnlyEndsAt: null,
          canceledAt: null,
          lastPlanChangeAt: now,
        },
        include: { plan: true },
      });
    } else {
      updatedSub = await this.prisma.subscription.create({
        data: {
          userId,
          planId: newPlanId,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          endDate,
          autoRenew: autoRenew ?? true,
          lastPlanChangeAt: now,
        },
        include: { plan: true },
      });
    }

    await this.entitlementCache.invalidate(userId, updatedSub.organizationId ?? null);
    this.eventEmitter.emit("subscription.activated", {
      userId,
      organizationId: updatedSub.organizationId,
    });
    return updatedSub;
  }

  async create({ data }: { data: IUserSubscriptionCreate }) {
    // 1. Obtener el plan
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: data.planId },
    });
    if (!plan) {
      throw new BadRequestException("El plan seleccionado no existe.");
    }

    let organizationId = data.organizationId || null;

    // 2. Si es plan CLINICA y no hay organización, crear una automáticamente
    if (data.planId === "Clinica" && !organizationId) {
      // Obtener datos del usuario para el nombre de la organización
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { firstName: true, lastName: true, email: true },
      });

      const orgName = user?.firstName
        ? `Clínica de ${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : `Clínica ${user?.email?.split("@")[0] || "Nueva"}`;

      // Crear la organización
      const organization = await this.prisma.organization.create({
        data: {
          name: orgName,
          maxSeats: 5,
          status: "ACTIVE",
          members: {
            create: {
              userId: data.userId,
              role: "CLINIC_ADMIN",
              status: "ACTIVE",
              colorHex: "#7c3aed",
            },
          },
        },
      });

      organizationId = organization.id;
      this.logger.log(`Organización "${orgName}" creada automáticamente para usuario ${data.userId}`);
    }

    // 3. Trial gratis: sin suscripción previa en este workspace, o solo el
    //    BASICO de arranque que crea la organización (endDate infinito y
    //    nunca cambiado). Elegir el primer plan no debe pedir wallet.
    const found = await this.subscriptionRepository.findByUserAndWorkspace(
      data.userId,
      organizationId,
    );
    const existingCount = await this.subscriptionRepository.countByUserAndWorkspace(
      data.userId,
      organizationId,
    );
    const isBootstrapOnly =
      existingCount === 1 &&
      !!found &&
      found.endDate === null &&
      !found.lastPlanChangeAt;
    const isFirstSubscription = existingCount === 0 || isBootstrapOnly;

    if (isFirstSubscription) {
      // Primera suscripción (o primer plan sobre el BASICO de arranque) = trial
      data.ignorePayment = true;
    }

    // 3. Obtener la wallet del usuario
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId: data.userId },
    });

    const planPrice = Number(plan.price);

    if (planPrice > 0 && !data.ignorePayment) {
      if (!wallet || Number(wallet.balance) < planPrice) {
        throw new BadRequestException(
          "Saldo insuficiente en tu billetera. Por favor, reporta un pago primero.",
        );
      }

      // 4. Descontar saldo de la wallet
      await this.prisma.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: planPrice } },
      });
    }

    // 5. Actualizar la suscripción existente (no re-fetch: `found` ya se cargó
    //    arriba para el chequeo de trial bootstrap).
    if (found) {
      const prev = new DomainEvent({
        action: this.subscriptionRepository.EVENT_UPDATED,
        entityName: this.subscriptionRepository.MODEL_NAME,
        payload: data,
      });
      const success = new DomainEvent({
        action: this.subscriptionRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.subscriptionRepository.MODEL_NAME,
        payload: data,
      });

      this.eventEmitter.emit(this.subscriptionRepository.EVENT_UPDATED, prev);

      const startDate = new Date();
      const endDate = data.endDate
        ? new Date(data.endDate)
        : (planPrice === 0 ? null : this.subscriptionRepository.addOneMonth(startDate));

      try {
        const entityPromise = this.subscriptionRepository.update({
          data: {
            plan: { connect: { id: data.planId } },
            status: SubscriptionStatus.ACTIVE,
            startDate,
            endDate,
            autoRenew: data.autoRenew ? true : false,
            gracePeriodEndsAt: null,
            readOnlyEndsAt: null,
            canceledAt: null,
            // Marca la primera elección explícita de plan: el próximo cambio
            // sí pasa por la wallet (el bootstrap ya no cuenta como trial).
            lastPlanChangeAt: new Date(),
          },
          where: { id: found.id },
        });

        const entity = await entityPromise;
        await this.entitlementCache.invalidate(data.userId, organizationId ?? null);
        this.eventEmitter.emit(
          this.subscriptionRepository.EVENT_UPDATED_SUCCESS,
          success,
        );
        this.eventEmitter.emit('subscription.activated', { userId: data.userId, organizationId });
        return entity;
      } catch (error) {
        const failed = new DomainEvent({
          action: this.subscriptionRepository.EVENT_UPDATED_FAILED,
          entityName: this.subscriptionRepository.MODEL_NAME,
          payload: data,
          metadata: { error: error },
        });
        this.eventEmitter.emit(
          this.subscriptionRepository.EVENT_UPDATED_FAILED,
          failed,
        );
        return { error: true, object: error };
      }
    }

    const prev = new DomainEvent({
      action: this.subscriptionRepository.EVENT_CREATED,
      entityName: this.subscriptionRepository.MODEL_NAME,
      payload: data,
    });
    const success = new DomainEvent({
      action: this.subscriptionRepository.EVENT_CREATED_SUSSCESS,
      entityName: this.subscriptionRepository.MODEL_NAME,
      payload: data,
    });

    this.eventEmitter.emit(this.subscriptionRepository.EVENT_CREATED, prev);

    const startDate = new Date();
    const endDate = data.endDate
      ? new Date(data.endDate)
      : (planPrice === 0 ? null : this.subscriptionRepository.addOneMonth(startDate));

    const objectCreated: Prisma.SubscriptionCreateInput = {
      user: { connect: { id: data.userId } },
      plan: { connect: { id: data.planId } },
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
      autoRenew: data.autoRenew ? true : false,
      lastPlanChangeAt: new Date(),
      ...(organizationId && {
        organization: { connect: { id: organizationId } },
      }),
    };

    try {
      const entityPromise = this.subscriptionRepository.create({
        data: objectCreated,
      });

      const entity = await entityPromise;
      await this.entitlementCache.invalidate(data.userId, organizationId ?? null);
      this.eventEmitter.emit(
        this.subscriptionRepository.EVENT_CREATED_SUSSCESS,
        success,
      );
      this.eventEmitter.emit('subscription.activated', { userId: data.userId, organizationId });
      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.subscriptionRepository.EVENT_CREATED_FAILED,
        entityName: this.subscriptionRepository.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(
        this.subscriptionRepository.EVENT_CREATED_FAILED,
        failed,
      );
      return { error: true, object: error };
    }
  }

  async getPaginate(query: FilterParamsDto, pwhere?: SUBSCRIPTION_WHERE[]) {
    // const { sortBy, sortOrder } = query;

    const limit = query && query.limit ? Number(query.limit) : 10;
    const page = query && query.page ? Number(query.page) : 1;

    const where: SUBSCRIPTION_WHERE[] = [];
    if (pwhere) pwhere.forEach((wh) => where.push(wh));

    where.push({ deletedAt: null });
    where.push({ user: { deletedAt: null } });
    // where.push({ permits: { id: { not: this.permitRepository.SUPERADMIN } } });

    const currentPage = page && page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    const listPromise = this.subscriptionRepository.findMany({
      where: { AND: where },
      skip,
      take: limit,
      orderBy: {
        // [sortBy as keyof SUBSCRIPTION_ORDER]: sortOrder,
        status: "asc",
        // startDate: 'asc',
      },
    });
    const totalPromise = this.subscriptionRepository.count({
      where: { AND: where },
    });

    const list = await listPromise;
    const total = await totalPromise;

    const totalRecords = total;
    const totalPages = Math.ceil(totalRecords / limit);

    // ¿Hay una página anterior? Sí, si la página actual es mayor a 1.
    const hasPrev = currentPage > 1;

    // ¿Hay una página siguiente? Sí, si la página actual es menor que el total de páginas.
    const hasNext = currentPage < totalPages;

    const columns = this.subscriptionRepository.getColumns();

    return {
      list,
      total,
      totalRecords,
      totalPages,
      currentPage,
      limit,
      hasPrev,
      hasNext,
      columns,
    };
  }

  async findOne(userWhereUniqueInput: SUBSCRIPTION_WHERE) {
    const user = await this.subscriptionRepository.findOne({
      where: userWhereUniqueInput,
    });
    return user;
  }

  async update(params: { where: { id: string }; data: SUBSCRIPTION_UPDATE }) {
    const { where, data } = params;
    const entity = await this.subscriptionRepository.update({ where, data });
    if (entity) {
      await this.entitlementCache.invalidate(entity.userId, entity.organizationId ?? null);
      if (data.status === SubscriptionStatus.CANCELED) {
        this.eventEmitter.emit('subscription.canceled', {
          userId: entity.userId,
          organizationId: entity.organizationId,
        });
      } else if (data.status === SubscriptionStatus.EXPIRED) {
        this.eventEmitter.emit('subscription.expired', {
          userId: entity.userId,
          organizationId: entity.organizationId,
        });
      }
    }
    return entity;
  }

  async cancelWithGracePeriod(subscriptionId: string) {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!sub) {
      throw new BadRequestException("Suscripción no encontrada.");
    }

    const now = new Date();
    const gracePeriodEndsAt = new Date(now);
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 5);

    const readOnlyEndsAt = new Date(now);
    readOnlyEndsAt.setDate(readOnlyEndsAt.getDate() + 35);

    const updated = await this.subscriptionRepository.update({
      where: { id: subscriptionId },
      data: {
        canceledAt: now,
        gracePeriodEndsAt,
        readOnlyEndsAt,
      },
    });

    await this.entitlementCache.invalidate(sub.userId, sub.organizationId ?? null);
    this.eventEmitter.emit('subscription.canceled', {
      userId: sub.userId,
      organizationId: sub.organizationId,
    });

    return updated;
  }

  async getWorkspaceSubscription(userId: string, organizationId: string | null) {
    return this.subscriptionRepository.findByUserAndWorkspace(userId, organizationId);
  }

  async delete(where: { id: string }) {
    const sub = await this.subscriptionRepository.findOne({ where });
    const result = await this.subscriptionRepository.delete({ where });
    if (sub) {
      await this.entitlementCache.invalidate(sub.userId, sub.organizationId ?? null);
    }
    return result;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: SUBSCRIPTION_WHERE_UNIQUE;
    where?: SUBSCRIPTION_WHERE;
    orderBy?: SUBSCRIPTION_ORDER;
  }): Promise<Subscription[]> {
    const { skip, take, cursor, where, orderBy } = params;
    const enetities = await this.subscriptionRepository.findMany({
      skip: skip ? skip : 0,
      take: take ? Number(take) : 10,
      where: where ? where : {},
      orderBy: orderBy ? orderBy : {},
    });

    return enetities.map((entity) => {
      const { ...result } = entity;
      return result;
    });
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

    if (permitList.includes(this.permitRepository.SUBSCRIPTION_LIST))
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/users/subscriptions",
        action: "redirect",
      };
    if (permitList.includes(this.permitRepository.SUBSCRIPTION_UNIQUE))
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/users/subscriptions/:id",
      };
    if (permitList.includes(this.permitRepository.SUBSCRIPTION_CREATED))
      actions.create = {
        key: "subscriptions-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/subscriptions/form/create",
        action: "modal",
        form: form.formCreate,
      };
    if (permitList.includes(this.permitRepository.SUBSCRIPTION_UPDATE))
      actions.update = {
        key: "subscriptions-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/subscriptions/form/update",
        action: "modal",
        form: form.formUpdate,
      };
    if (permitList.includes(this.permitRepository.SUBSCRIPTION_DELETE))
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/subscriptions/:id/delete",
        action: "modal",
      };

    return actions;
  }

  async CustomCreate({
    body,
    param,
  }: {
    body: CreateSubscriptionDto;
    param: { id: string };
  }) {
    body.userId = param.id;

    const entity = await this.create({
      data: body as IUserSubscriptionCreate,
    });

    return entity;
  }

  async setAutoRewnew({
    body,
    param,
  }: {
    body: CreateSubscriptionDto;
    param: { id: string };
  }) {
    const found = await this.subscriptionRepository.findOne({
      where: { id: param.id },
    });
    this.logger.log(`[LOGGER] Set AutoRenew: ${found?.autoRenew}`);
    const entity = await this.update({
      where: { id: param.id },
      data: { autoRenew: !found?.autoRenew },
    });

    return entity;
  }

  /**
   * Esta función recorre el objeto Form y traduce todas las claves.
   */
  public translateForm(form: Form, lang: string): Form {
    // Traduce los campos principales
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(
      form.submitLabel || "common.actions.save",
      lang,
    );

    // Traduce secciones (inputs)
    form.inputs.forEach((section: FormSection) => {
      section.title = this.i18n.translate(section.title, lang);

      section.elements.forEach((control: FormInput | FormSelect | any) => {
        control.label = this.i18n.translate(control.label, lang);

        if (control.placeholder) {
          control.placeholder = this.i18n.translate(control.placeholder, lang);
        }

        if (control.options && control.options.length > 0) {
          control.options.forEach((option) => {
            option.label = this.i18n.translate(option.label, lang);
          });
        }
      });
    });

    return form;
  }
}
