import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify"; // <--- Tipos de Fastify
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { Prisma } from "@prisma/client";

// Services
import { UserService } from "./services/user.service";
import { UserAddressService } from "./services/user-address.service";
import { UserPaymentMethodService } from "./services/user-payment-method.service";
import { SubscriptionService } from "./services/subscription.service";
import UserAnaliticsService from "./services/user-analytics.service";

// Repositories (Necesarios solo para construir formularios UI, si no, mover al servicio)
import UserReporitory from "./repository/user.repository";
import PermitReporitory from "../permit/repository/permit.repository";
import SubscriptionReporitory from "./repository/subscription.repository";
import UserPaymentMethodReporitory from "./repository/user-payment-method.repository";
import PaymentMethodReporitory from "../payment-method/repository/payment-method.repository";
import SubscriptionPlanReporitory from "../subscription/repository/subscription-plan.repository";

// DTOs
import {
  CreateLocationDto,
  CreateSubscriptionDto,
  CreateUserAddressDto,
  CreateUserDto,
  CreateUserPaymentMethodDto,
  PasswordUserDto,
  UpdateUserDto,
} from "./dto/user.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { UserStatus } from "src/shared/types/schema.types";
import { SUBSCRIPTION_WHERE } from "./dto/subscription.type";
import { FeedbackService } from "./services/feedback.service";
import { CreateFeedbackDto } from "./dto/feedback.type";
import { EntityNotFoundException } from "src/shared/error/domain-errors";

@Controller("api/user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userAddressService: UserAddressService,
    private readonly userPaymentMethodService: UserPaymentMethodService,
    private readonly subscriptionService: SubscriptionService,
    private readonly userAnaliticsService: UserAnaliticsService,

    // Repositorios (Mantener solo si se usan para getForm UI logic)
    private readonly userPaymentMethodRepository: UserPaymentMethodReporitory,
    private readonly paymentMethodRepository: PaymentMethodReporitory,
    private readonly subscriptionRepository: SubscriptionReporitory,
    private readonly userRepository: UserReporitory,
    private readonly subscriptionPlanRepository: SubscriptionPlanReporitory,
    private readonly permitRepository: PermitReporitory,
    private readonly feedbackService: FeedbackService,
  ) { }

  @Get("/me")
  @UseGuards(SessionAuthGuard)
  private async getMe(@Req() req: RequestWithUser) {
    const user = await this.userService.findForAuthById(req.user.id);
    return { data: user };
  }

  @Post("/feedback/public")
  private async createPublicFeedback(@Body() body: CreateFeedbackDto) {
    const data = await this.feedbackService.create(body);
    return { data: { ...data, message: "Feedback enviado correctamente." } };
  }

  @Post("/feedback")
  @UseGuards(SessionAuthGuard)
  private async createFeedback(
    @Req() req: RequestWithUser,
    @Body() body: CreateFeedbackDto,
  ) {
    const user = req.user;
    const data = await this.feedbackService.create(body, user.id);
    return { data: { ...data, message: "Feedback creado correctamente." } };
  }

  @Post("/subscription/renew-now")
  @UseGuards(SessionAuthGuard)
  private async renewSubscriptionNow(@Req() req: RequestWithUser) {
    const user = req.user;
    const data = await this.subscriptionService.renewNow({ userId: user.id });
    return {
      data: { ...data, message: "Suscripción renovada exitosamente." },
    };
  }

  @Get("/subscription/preview-upgrade")
  @UseGuards(SessionAuthGuard)
  private async previewUpgrade(
    @Req() req: RequestWithUser,
    @Query("newPlanId") newPlanId: string,
  ) {
    if (!newPlanId) {
      throw new BadRequestException("El parámetro newPlanId es requerido");
    }
    const data = await this.subscriptionService.previewUpgrade(
      req.user.id,
      newPlanId,
    );
    return { data };
  }

  @Post("/subscription/change-plan")
  @UseGuards(SessionAuthGuard)
  private async changePlan(
    @Req() req: RequestWithUser,
    @Body() body: { newPlanId: string; autoRenew?: boolean },
  ) {
    if (!body?.newPlanId) {
      throw new BadRequestException("El parámetro newPlanId es requerido");
    }
    const data = await this.subscriptionService.changePlan(
      req.user.id,
      body.newPlanId,
      body.autoRenew,
    );
    return {
      data: { ...data, message: "Plan actualizado exitosamente." },
    };
  }

  @Post("/location")
  @UseGuards(SessionAuthGuard)
  private async createLocation(
    @Req() req: RequestWithUser,
    @Body() body: CreateLocationDto,
  ) {
    const user = req.user;
    const data = await this.userAddressService.setLocation(user, body);
    return {
      data: { ...data, message: "Ubicación actualizada correctamente." },
    };
  }

  // ---------- MANAGEMENT USERS ---------- //

  @Post("/")
  @UseGuards(SessionAuthGuard)
  private async create(@Body() body: CreateUserDto) {
    return await this.userService.createUser(body);
  }

  @Post(":id/delete")
  @UseGuards(SessionAuthGuard)
  private async delete(
    @Req() req: FastifyRequest,
    @Param() param: { id: string },
  ) {
    const sessionUser = (req as any).user;
    const isAdmin =
      sessionUser?.permits?.name === "SUPERADMIN" ||
      sessionUser?.permits?.name === "ADMIN";

    if (!isAdmin) {
      throw new ForbiddenException("No autorizado para eliminar usuarios");
    }

    await this.userService.deleteUser({ id: param.id });
    return { success: true };
  }

  @Post(":id/update")
  @UseGuards(SessionAuthGuard)
  private async update(
    @Req() req: FastifyRequest,
    @Param() param: { id: string },
    @Body() body: UpdateUserDto,
  ) {
    const sessionUser = (req as any).user;
    const isAdmin =
      sessionUser?.permits?.name === "SUPERADMIN" ||
      sessionUser?.permits?.name === "ADMIN";

    if (!isAdmin && sessionUser?.id !== param.id) {
      throw new ForbiddenException("No autorizado para modificar este usuario");
    }

    const data: Prisma.UserUpdateInput = {};
    if (body.firstName) data.firstName = body.firstName;
    if (body.lastName) data.lastName = body.lastName;
    if (body.username) data.username = body.username;
    if (body.email) data.email = body.email;

    // Solo administradores pueden modificar Estado o Permiso, y nunca a sí mismos desde el perfil
    if (isAdmin && sessionUser?.id !== param.id) {
      if (body.status) data.status = body.status as any;
      if (body.permitId) data.permits = { connect: { id: body.permitId } };
    }

    const entity = await this.userService.updateUser({
      where: { id: param.id },
      data,
    });

    return { success: true, entity };
  }

  @Post(":id/password")
  @UseGuards(SessionAuthGuard)
  private async password(
    @Req() req: FastifyRequest,
    @Param() param: { id: string },
    @Body() body: PasswordUserDto,
  ) {
    const sessionUser = (req as any).user;
    const isAdmin =
      sessionUser?.permits?.name === "SUPERADMIN" ||
      sessionUser?.permits?.name === "ADMIN";

    if (!isAdmin && sessionUser?.id !== param.id) {
      throw new ForbiddenException("No autorizado para cambiar esta contraseña");
    }

    const entity = await this.userService.passwordUser({
      where: { id: param.id },
      data: body.password,
    });

    return { success: true, entity };
  }

  // ---------- MANAGEMENT PAYMENT METHODS ---------- //

  @Get("/payment-methods")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async indexPaymentMethods(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    // Retorna objeto directo (MVC renderiza o API responde JSON según el contexto del request)
    return await this.userService.getPagePaymentMethodList({
      query,
      sessionUser: req.user,
    });
  }

  @Get("/payment-methods/:id")
  @UseGuards(SessionAuthGuard)
  public async uniquePaymentMethods(
    @Req() req: RequestWithUser,
    @Param() param: { id: string },
    @Query() query: FilterParamsDto,
  ) {
    return await this.userService.getPagePaymentMethod({
      param: { id: param.id },
      query,
      sessionUser: req.user,
    });
  }

  @Post("/payment-method/:id")
  @UseGuards(SessionAuthGuard)
  private async createPaymentMethod(
    @Param() param: { id: string },
    @Body() body: any,
  ) {
    const { userId, paymentMethodId, details, active, isDefault, ...restFields } = body;
    const targetPaymentMethodId = paymentMethodId || body.paymentMethodId;
    const targetDetails = details || restFields;

    const entity = await this.userPaymentMethodService.create({
      active: true,
      details: targetDetails,
      isDefault: false,
      paymentMethodId: targetPaymentMethodId,
      userId: param.id,
    });

    return { success: true, message: "Método de pago agregado.", entity };
  }

  // --- API JSON ENDPOINTS (Para llamadas AJAX) ---
  // Estos endpoints NO redirigen. Si fallan, el Filter retorna JSON con error.

  @Post("/payment-method/:id/create")
  @UseGuards(SessionAuthGuard)
  private async createPaymentMethodApi(
    @Req() req: RequestWithUser,
    @Param() param: { id: string },
    @Body() body: any,
  ) {
    await this.userPaymentMethodService.create({
      active: true,
      details: body,
      isDefault: false,
      paymentMethodId: param.id,
      userId: req.user.id,
    });

    return { message: "Método de pago agregado." };
  }

  @Post("/payment-method/:id/update")
  @UseGuards(SessionAuthGuard)
  private async createPaymentMethodApiUpdate(
    @Param() param: { id: string },
    @Body() body: any,
  ) {
    const currentMethod = await this.userPaymentMethodService.findOneById(param.id);
    if (!currentMethod) {
      throw new NotFoundException("Método de pago no encontrado");
    }

    const { active, isDefault, userId, paymentMethodId, ...detailsFields } = body;

    const savedDetails = (currentMethod.details as any)?.dateails || (currentMethod.details as any)?.details || {};
    const mergedDetails = { ...savedDetails, ...detailsFields };

    const entity = await this.userPaymentMethodService.update({
      data: {
        active: true,
        isDefault: false,
        details: {
          id: currentMethod.userId,
          dateails: mergedDetails,
        },
        paymentMethodId: currentMethod.paymentMethodId,
        userId: currentMethod.userId,
      },
      where: { id: param.id },
    });
    return { entity };
  }

  @Post("/payment-method/:id/delete")
  @UseGuards(SessionAuthGuard)
  private async createPaymentMethodApiDelete(@Param() param: { id: string }) {
    const entity = await this.userPaymentMethodService.delete({ id: param.id });
    return { entity };
  }

  // ---------- MANAGEMENT SUBSCRIPTIONS ---------- //

  @Get("/subscriptions")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async getSubscriptionPage(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const user = req.user;
    const columns = this.subscriptionRepository.getColumns();
    
    const targetOrgId = (workspaceId && workspaceId !== 'personal') ? workspaceId : null;

    // Build where clause based on workspace context
    const pwhere: SUBSCRIPTION_WHERE[] = [];
    
    // Always filter by user
    pwhere.push({ user: { id: user.id } });
    
    // Filter by workspace context
    pwhere.push({ organizationId: targetOrgId });
    
    const { currentPage, limit, totalPages, hasPrev, hasNext, list, total } =
      await this.subscriptionService.getPaginate(query, pwhere);
    const actions = await this.subscriptionService.getActions(
      user?.permits?.list,
      {},
      "susbcription",
    );

    return {
      pageTitle: "common.subscription.list",
      actions: { ...actions, create: undefined },
      total,
      list,
      columns,
      sortParams: { sortBy: query.sortBy, sortOrder: query.sortOrder },
      currentPage,
      limit,
      totalPages,
      hasPrev,
      hasNext,
      currentQuery: query,
    };
  }

  @Get("/subscriptions/:id")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async subscriptionsUnique(
    @Param() param: { id: string },
    @Query() query: FilterParamsDto,
  ) {
    return await this.userService.getPageSubscription({
      param: { id: param.id },
      query,
    });
  }

  @Get("/subscriptions/user/session")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async subscriptionsUserUnique(
    @Query() query: FilterParamsDto,
    @Req() req: RequestWithUser,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    return await this.userService.getPageSubscriptionByUser({
      param: { id: req.user.id },
      query,
      workspaceId,
    });
  }

  @Post("/:id/subscription")
  @UseGuards(SessionAuthGuard)
  private async subscription(
    @Param() param: { id: string },
    @Body() body: CreateSubscriptionDto,
  ) {
    return await this.subscriptionService.CustomCreate({ body, param });
  }

  // --- API JSON Endpoints ---

  @Post("subscriptions/:id/create")
  @UseGuards(SessionAuthGuard)
  private async subscriptionApi(
    @Param() param: { id: string },
    @Body() body: any,
  ) {
    return await this.subscriptionService.CustomCreate({ body, param });
  }

  @Post("subscription/:id/autorenew")
  @UseGuards(SessionAuthGuard)
  private async subscriptionApiSetAutorenew(
    @Param() param: { id: string },
    @Body() body: any,
  ) {
    return await this.subscriptionService.setAutoRewnew({ body, param });
  }

  // ---------- MANAGEMENT ADDRESS ---------- //

  @Post("/address/:id")
  @UseGuards(SessionAuthGuard)
  private async createAddress(
    @Param() param: { id: string },
    @Body() body: CreateUserAddressDto,
  ) {
    return await this.userAddressService.create({
      ...body,
      userId: param.id,
      type: body.type ?? "HOME",
    });
  }

  // ------ UI FORMS (Mantengo lógica existente) ------ //
  @Get("form/:type")
  @UseGuards(SessionAuthGuard)
  private async form(
    @Req() req: RequestWithUser,
    @Query()
    query: { id?: string; lang?: string; internal?: "update" | "create" },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    // Nota: Aquí se mantiene la lógica de construcción de formularios.
    // Si algo falla al buscar datos (ej DB down), el Global Filter lo manejará.

    if (param.type === "create" || param.type === "control") {
      const statusOptions = Object.values(UserStatus).map((status) => ({
        label: `common.status.${status.toLowerCase()}`,
        value: status,
      }));
      const permits = await this.permitRepository.findMany({
        skip: 0,
        take: 100,
        orderBy: { id: "asc" },
        where: { deletedAt: null },
      });
      const permitOptions = permits.map((permit) => ({
        label: `${permit.name}`,
        value: permit.id,
      }));
      const formStructure = this.userRepository.getFormCreateUser({
        statusOptions,
        permitOptions,
      });
      return this.userService.translateForm(formStructure, effectiveLang);
    } else if (param.type === "update") {
      const object = await this.userRepository.findOne({
        where: { id: query.id },
      });
      if (!object) throw new EntityNotFoundException("Usuario");

      const sessionUser = req.user;
      const isAdmin =
        sessionUser?.permits?.name === "SUPERADMIN" ||
        sessionUser?.permits?.name === "ADMIN";
      const isEditingSelf = sessionUser?.id === query.id;

      let statusOptions = undefined;
      let permitOptions = undefined;

      if (isAdmin && !isEditingSelf) {
        statusOptions = Object.values(UserStatus).map((status) => ({
          label: `common.status.${status.toLowerCase()}`,
          value: status,
        }));
        const permits = await this.permitRepository.findMany({
          skip: 0,
          take: 100,
          orderBy: { id: "asc" },
          where: { deletedAt: null },
        });
        permitOptions = permits.map((permit) => ({
          label: `${permit.name}`,
          value: permit.id,
        }));
      }

      const formStructure = this.userRepository.getFormUpdateUser({
        object,
        statusOptions,
        permitOptions,
      });
      return this.userService.translateForm(formStructure, effectiveLang);
    } else if (param.type === "password") {
      const object = await this.userRepository.findOne({
        where: { id: query.id },
      });
      if (!object) throw new EntityNotFoundException("Usuario");
      const formStructure = this.userRepository.getFormUpdatePassword({
        object,
      });
      return this.userService.translateForm(formStructure, effectiveLang);
    } else if (param.type === "subscription") {
      const subs = await this.subscriptionPlanRepository.findMany({
        skip: 0,
        take: 100,
        orderBy: { id: "asc" },
        where: { deletedAt: null, selected: true },
      });
      const formStructure = this.subscriptionRepository.getFormCreate({
        plans: subs,
        userId: req.user.id,
        path: `/api/user/${req.user.id}/subscription`,
      });
      return this.userService.translateForm(formStructure, effectiveLang);
    } else if (param.type === "payment-method") {
      const paymentMethods = await this.paymentMethodRepository.findMany({
        skip: 0,
        take: 100,
        orderBy: { id: "asc" },
        where: { deletedAt: null },
      });
      if (query && query.id && query.internal === "update") {
        const entity = await this.userPaymentMethodRepository.findOne({
          where: { id: query.id },
        });
        if (entity) {
          const formStructure = this.userPaymentMethodRepository.getFormUpdate({
            object: entity,
            paymentsMethods: paymentMethods,
            userId: query.id,
          });
          return this.userService.translateForm(formStructure, effectiveLang);
        }
      }
      const formStructure = this.userPaymentMethodRepository.getFormCreate({
        paymentsMethods: paymentMethods,
        userId: req.user.id,
      });
      return this.userService.translateForm(formStructure, effectiveLang);
    }

    // Si no coincide ningún tipo
    return { error: true, message: "Formulario no encontrado" };
  }
}
