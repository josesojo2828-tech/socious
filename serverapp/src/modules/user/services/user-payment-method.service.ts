import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import PermitReporitory from "../../permit/repository/permit.repository";
import { Actions } from "src/shared/types/dashboard.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainEvent } from "src/shared/event/domain-listener";
import UserPaymentMethodReporitory from "../repository/user-payment-method.repository";
import { IUserPaymentMethod } from "src/shared/types/schema.types";
import {
  USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
  USER_PAYMENT_METHOD_ORDER,
  USER_PAYMENT_METHOD_UPDATE,
  USER_PAYMENT_METHOD_WHERE,
  USER_PAYMENT_METHOD_WHERE_UNIQUE,
} from "../dto/user-payment-method.types";
import {
  CreateUserPaymentMethodDto,
  USER_ORDER,
  USER_UPDATE,
  USER_WHERE,
  USER_WHERE_UNIQUE,
} from "../dto/user.types";
import { Logger } from "@nestjs/common";
const logger = new Logger("user-payment-method.service");


@Injectable()
export class UserPaymentMethodService {
  constructor(
    private userPaymentMethodRepository: UserPaymentMethodReporitory,
    private permitRepository: PermitReporitory,
    private eventEmitter: EventEmitter2,
  ) {}

  async getPaginate(
    query: FilterParamsDto,
    pwhere?: USER_PAYMENT_METHOD_WHERE[],
  ) {
    // 1. Desestructurar
    const {
      q,
      paymentMethodId, // ID del proveedor (ej: ID de Stripe o PayPal)
      active, // Booleano: ¿Está habilitado?
      isDefault, // Booleano: ¿Es el principal?
      createdAt_gte,
      createdAt_lte,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;

    // 2. Construcción del WHERE
    const where: USER_PAYMENT_METHOD_WHERE[] = [];

    // A. Filtros forzados (si existen)
    // Útil si llamas a esto desde "Mis Tarjetas" para forzar { userId: x }
    if (pwhere) pwhere.forEach((wh) => where.push(wh));

    // B. Base
    where.push({ deletedAt: null });

    // C. Búsqueda Global (q)
    if (q) {
      where.push({
        OR: [
          // Buscar por datos del usuario
          { user: { email: { contains: q, mode: "insensitive" } } },
          { user: { firstName: { contains: q, mode: "insensitive" } } },
          { user: { lastName: { contains: q, mode: "insensitive" } } },
          // Buscar por nombre del método (ej: "Visa", "MasterCard")
          { paymentMethod: { name: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    // D. Filtros Específicos
    if (paymentMethodId) {
      where.push({ paymentMethodId: paymentMethodId });
    }

    // Filtros Booleanos (Usamos !== undefined porque active puede ser false)
    if (active !== undefined) {
      where.push({ active: active });
    }

    if (isDefault !== undefined) {
      where.push({ isDefault: isDefault });
    }

    // E. Rango de Fechas
    if (createdAt_gte || createdAt_lte) {
      const dateFilter: any = {};
      if (createdAt_gte) dateFilter.gte = new Date(createdAt_gte);
      if (createdAt_lte) dateFilter.lte = new Date(createdAt_lte);
      where.push({ createdAt: dateFilter });
    }

    // 3. Paginación
    const currentPage = page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;
    const whereClause = { AND: where };

    // 4. Ejecución
    const [list, total] = await Promise.all([
      this.userPaymentMethodRepository.findMany({
        where: whereClause,
        skip: Number(skip),
        take: Number(limit),
        orderBy: {
          [sortBy]: sortOrder,
        },
        // Incluimos relaciones clave para mostrar en la tabla
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true,
              avatarUrl: true,
            },
          },
          paymentMethod: true, // Para ver nombre, logo, colores, etc.
        },
      }),
      this.userPaymentMethodRepository.count({
        where: whereClause,
      }),
    ]);

    // 5. Cálculos finales
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
      // Mantenemos la devolución de columnas si tu vista las usa dinámicamente
      columns: this.userPaymentMethodRepository.getColumns
        ? this.userPaymentMethodRepository.getColumns()
        : [],
    };
  }

  /**
   * Finds a single user by unique criteria (e.g., ID or email).
   * Includes sensitive data like password hash. USE WITH CAUTION.
   * Needed internally by auth.
   */
  async findOne(userWhereUniqueInput: USER_PAYMENT_METHOD_WHERE_UNIQUE) {
    const user = await this.userPaymentMethodRepository.findOne({
      where: userWhereUniqueInput,
    });
    if (!user) {
      logger.warn(
        `UserService: User not found for criteria:`,
        userWhereUniqueInput,
      );
    }
    return user;
  }

  /**
   * Finds a user specifically by their ID.
   * Used by SessionSerializer.
   */
  async findOneById(id: string) {
    const user = await this.userPaymentMethodRepository.findOne({
      where: { id },
    });
    return user;
  }

  /**
   * Creates a new user. Hashes the password before saving.
   * Used potentially by a registration endpoint.
   */
  async create(data: CreateUserPaymentMethodDto) {
    const prev = new DomainEvent({
      action: this.userPaymentMethodRepository.EVENT_CREATED,
      entityName: this.userPaymentMethodRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(
      this.userPaymentMethodRepository.EVENT_CREATED,
      prev,
    );
    try {
      const entity = await this.userPaymentMethodRepository.create({
        data: {
          details: { dateails: data.details, id: data.userId },
          isDefault: data.isDefault ? true : false,
          paymentMethod: { connect: { id: data.paymentMethodId } },
          user: { connect: { id: data.userId } },
        },
      });

      const success = new DomainEvent({
        action: this.userPaymentMethodRepository.EVENT_CREATED_SUSSCESS,
        entityName: this.userPaymentMethodRepository.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(
        this.userPaymentMethodRepository.EVENT_CREATED_SUSSCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.userPaymentMethodRepository.EVENT_CREATED_FAILED,
        entityName: this.userPaymentMethodRepository.MODEL_NAME,
        payload: data,
        metadata: { error: error },
      });
      this.eventEmitter.emit(
        this.userPaymentMethodRepository.EVENT_CREATED_FAILED,
        failed,
      );

      if (error.code === "P2002") {
        throw new ConflictException(
          "El email o el nombre de usuario ya está en uso.",
        );
      }

      throw new InternalServerErrorException("Error inesperado.");
    }
  }

  /**
   * Updates a user by ID.
   * NOTE: Does not handle password updates securely here (needs separate logic).
   */
  async update(params: {
    where: { id: string };
    data: CreateUserPaymentMethodDto;
  }) {
    const { where, data } = params;
    return this.userPaymentMethodRepository.update({
      where,
      data: {
        active: data.active,
        details: data.details,
        isDefault: data.isDefault,
      },
    });
  }

  /**
   * Deletes a user by ID (soft delete if using deletedAt).
   */
  async delete(where: { id: string }) {
    // Implement soft delete if your repository supports it
    // Otherwise, use the actual delete method from repository
    return this.userPaymentMethodRepository.delete({ where });
  }

  /**
   * Finds multiple users (e.g., for an admin panel).
   * Excludes passwords by default.
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: USER_PAYMENT_METHOD_WHERE_UNIQUE;
    orderBy?: USER_PAYMENT_METHOD_ORDER;
  }): Promise<IUserPaymentMethod[]> {
    // Exclude password
    const { skip, take, where, orderBy } = params;
    // Adjust repository call if needed to exclude password
    const paymentMethod = await this.userPaymentMethodRepository.findMany({
      skip: skip ? skip : 0,
      take: take ? Number(take) : 10,
      where: where ? where : {},
      orderBy: orderBy ? orderBy : {},
    });
    return paymentMethod;
  }

  async getActions(permitList: string[]) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
    };

    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_PAYMENT_METHOD,
      ) ||
      permitList.includes(this.permitRepository.USER_ADDRESS_LIST)
    )
      actions.list = {
        key: "user-address-list-key-modal",
        label: "common.actions.list",
        icon: "list",
        link: "",
        action: "modal",
      };
    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_PAYMENT_METHOD,
      ) ||
      permitList.includes(this.permitRepository.USER_ADDRESS_UNIQUE)
    )
      actions.unique = {
        key: "user-address-unique-key-modal",
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/users/payment-methods/:id",
        action: "redirect",
      };
    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_PAYMENT_METHOD,
      ) ||
      permitList.includes(this.permitRepository.USER_ADDRESS_CREATED)
    )
      actions.create = {
        key: "user-address-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "",
        action: "modal",
      };
    // if (permitList.includes(this.permitRepository.USER_PAYMENT_METHOD_UPDATE)) actions.update = { key:'user-address-update-key-modal', label: 'common.actions.update', icon: 'edit', link:'', action: 'modal' };
    // if (permitList.includes(this.permitRepository.USER_PAYMENT_METHOD_DELETE)) actions.delete = { key:'user-address-delete-key-modal', label: 'common.actions.delete', icon: 'trash', link:'', action: 'modal' };

    return actions;
  }
}
