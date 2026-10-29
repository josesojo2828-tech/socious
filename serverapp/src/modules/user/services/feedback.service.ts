import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client"; // Import Prisma types
import PermitReporitory from "../../permit/repository/permit.repository";
import { Actions } from "src/shared/types/dashboard.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainEvent } from "src/shared/event/domain-listener";
import FeedbackRepository from "../repository/feedback.repository";
import { User } from "src/shared/types/schema.types";
import { CreateLocationDto } from "../dto/user.types";
import { PrismaService } from "nestjs-prisma";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import { CreateFeedbackDto, FEEDBACK_CREATE, FEEDBACK_WHERE } from "../dto/feedback.type";
import { Logger } from "@nestjs/common";
const logger = new Logger("feedback.service");


@Injectable()
export class FeedbackService {
  constructor(
    private feedbackRepository: FeedbackRepository,
    private permitRepository: PermitReporitory,
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

  async getPaginate(query: FilterParamsDto, pwhere?: FEEDBACK_WHERE) {
    // const { sortBy, sortOrder } = query;

    const limit = query && query.limit ? Number(query.limit) : 10;
    const page = query && query.page ? Number(query.page) : 1;

    const where: FEEDBACK_WHERE = pwhere ?? {};

    const currentPage = page && page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    const listPromise = this.feedbackRepository.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        // [sortBy as keyof Prisma.UserOrderByWithRelationInput]: sortOrder as Prisma.SortOrder,
      },
    });
    const totalPromise = this.feedbackRepository.count({
      where,
    });

    const list = await listPromise;
    const total = await totalPromise;

    const totalRecords = total;
    const totalPages = Math.ceil(totalRecords / limit);

    // ¿Hay una página anterior? Sí, si la página actual es mayor a 1.
    const hasPrev = currentPage > 1;

    // ¿Hay una página siguiente? Sí, si la página actual es menor que el total de páginas.
    const hasNext = currentPage < totalPages;

    return {
      list,
      total,
      totalRecords,
      totalPages,
      currentPage,
      limit,
      hasPrev,
      hasNext,
    };
  }

  /**
   * Finds a single user by unique criteria (e.g., ID or email).
   * Includes sensitive data like password hash. USE WITH CAUTION.
   * Needed internally by auth.
   */
  async findOne(userWhereUniqueInput: FEEDBACK_WHERE) {
    const user = await this.feedbackRepository.findOne({
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
    const user = await this.feedbackRepository.findOne({ where: { id } });
    return user;
  }

  /**
   * Creates a new user. Hashes the password before saving.
   * Used potentially by a registration endpoint.
   */
  async create(data: CreateFeedbackDto, userId?: string) {
    const prev = new DomainEvent({
      action: this.feedbackRepository.EVENT_CREATED,
      entityName: this.feedbackRepository.MODEL_NAME,
      payload: data,
    });
    this.eventEmitter.emit(this.feedbackRepository.EVENT_CREATED, prev);

    const permit = await this.permitRepository.findOne({ where: { name: "USER" } });

    if (!permit) {
      throw new EntityNotFoundException("Permit not found");
    }

    const CreateObject: FEEDBACK_CREATE = {
      message: `${data.metadata.rangoPrecio}$ ${data.message}`,
      metadata: data.metadata,
      user: {
        connectOrCreate: {
          where: userId ? { id: userId } : { email: data.metadata.email },
          create: {
            email: data.metadata.email,
            fullName: data.metadata.fullName,
            profile: { create: { name: "", path: "" } },
            permits: { connect: { id: permit?.id } },
          },
        },
      },
    };

    try {
      const entity = await this.feedbackRepository.create({ data: CreateObject });

      const success = new DomainEvent({
        action: this.feedbackRepository.EVENT_CREATED_SUSSCESS,
        entityName: this.feedbackRepository.MODEL_NAME,
        payload: data,
      });
      this.eventEmitter.emit(
        this.feedbackRepository.EVENT_CREATED_SUSSCESS,
        success,
      );

      return entity;
    } catch (error) {
      logger.error("🔥 Error in FeedbackService.create:", error);
      const failed = new DomainEvent({
        action: this.feedbackRepository.EVENT_CREATED_FAILED,
        entityName: this.feedbackRepository.MODEL_NAME,
        payload: data,
        metadata: { error: error.message || error },
      });
      this.eventEmitter.emit(
        this.feedbackRepository.EVENT_CREATED_FAILED,
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
    data: Prisma.UserUpdateInput;
  }) {
    const { where, data } = params;
    if (data.password) {
      logger.warn(
        "Attempting to update password via general updateUser method. This should be handled separately.",
      );
      delete data.password; // Safer: Disallow password update here
    }
    return this.feedbackRepository.update({ where, data });
  }

  /**
   * Deletes a user by ID (soft delete if using deletedAt).
   */
  async delete(where: { id: string }) {
    // Implement soft delete if your repository supports it
    // Otherwise, use the actual delete method from repository
    return this.feedbackRepository.delete({ where });
  }

  /**
   * Finds multiple users (e.g., for an admin panel).
   * Excludes passwords by default.
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: FEEDBACK_WHERE;
    orderBy?: Prisma.FeedbackOrderByWithRelationInput;
  }): Promise<any[]> {
    // Exclude password
    const { skip, take, where, orderBy } = params;
    // Adjust repository call if needed to exclude password
    const address = await this.feedbackRepository.findMany({
      skip: skip ? skip : 0,
      take: take ? Number(take) : 10,
      where: where ? where : {},
      orderBy: orderBy ? orderBy : {},
    });
    return address;
  }

  getActions(permitList: string[]) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
    };

    if (permitList.includes(this.permitRepository.USER_ADDRESS_LIST))
      actions.list = {
        key: "user-address-list-key-modal",
        label: "common.actions.list",
        icon: "list",
        link: "",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.USER_ADDRESS_UNIQUE))
      actions.unique = {
        key: "user-address-unique-key-modal",
        label: "common.actions.unique",
        icon: "eye",
        link: "",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.USER_ADDRESS_CREATED))
      actions.create = {
        key: "user-address-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.USER_ADDRESS_UPDATE))
      actions.update = {
        key: "user-address-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.USER_ADDRESS_DELETE))
      actions.delete = {
        key: "user-address-delete-key-modal",
        label: "common.actions.delete",
        icon: "trash",
        link: "/users/address/:id/delete",
        action: "modal",
      };

    return actions;
  }

  async setLocation(userSession: User, data: CreateLocationDto) {
    const nutritionist = await this.prisma.nutritionist.findFirst({
      where: { userId: userSession.id },
    });

    if (!nutritionist)
      throw new EntityNotFoundException("Nutricionista no encontrado");

    return await this.prisma.nutritionist.update({
      data: {
        lat: data.lat,
        lng: data.lng,
      },
      where: {
        id: nutritionist.id,
      },
    });
  }
}
