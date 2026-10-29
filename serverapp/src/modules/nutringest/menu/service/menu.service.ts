import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { type File } from "@nest-lab/fastify-multer";
import { safeExtensionFromMime } from "src/shared/helpers/file.util";

// Repositories & Services
import MenuRepository from "../repository/menu.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { StorageService } from "src/modules/file/storage.service";

// DTOs & Types
import {
  MENU_CREATE,
  MENU_UPDATE,
  MENU_WHERE,
  CreateMenuDto,
  AddMenuItemDto,
  AddMenuCondimentDto,
} from "../dto/menu.type";
import { User, Menu, MenuCategory, Nutritionist } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { Form, FormSection } from "src/shared/types/form/form";
import { DomainEvent } from "src/shared/event/domain-listener";

// Errors
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import DietRepository from "../../consultation/repository/diet.repository";
import { PrismaService } from "nestjs-prisma";
import { PermissionService } from "src/modules/permit/service/permission.service";
import { WorkspaceContextService } from "../../../../shared/services/workspace-context.service";

@Injectable()
export class MenuService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly menuRepository: MenuRepository,
    private readonly permitRepository: PermitReporitory, // Para validar permisos en getActions
    private readonly i18n: I18nService,
    private readonly logger: LoggerService,
    private readonly dietRepository: DietRepository,
    private readonly prisma: PrismaService, // Para gestión directa de items y recálculos
    private readonly permissionService: PermissionService,
    private readonly storageService: StorageService, // Para subir/quitar fotos (MinIO)
    private readonly workspaceContext: WorkspaceContextService,
  ) { }

  /**
   * Asegura que el usuario tenga un perfil de nutricionista activo.
   * Si no está cargado en la sesión, lo busca por userId o lo auto-aprovisiona.
   */
  public async ensureNutritionistProfile(userSession: User): Promise<Nutritionist | null> {
    if (userSession?.nutritionistProfile?.id) {
      return userSession.nutritionistProfile;
    }

    if (!userSession?.id) {
      return null;
    }

    try {
      let profile = await this.prisma?.nutritionist?.findUnique({
        where: { userId: userSession.id },
      });

      if (!profile && this.prisma?.nutritionist?.create) {
        profile = await this.prisma.nutritionist.create({
          data: {
            userId: userSession.id,
          },
        });
      }

      if (profile) {
        userSession.nutritionistProfile = profile;
      }
      return profile;
    } catch (error) {
      this.logger.logInfo(`Error al resolver perfil de nutricionista para user ${userSession.id}: ${error}`);
      try {
        const fallback = await this.prisma?.nutritionist?.findUnique({
          where: { userId: userSession.id },
        });
        if (fallback) {
          userSession.nutritionistProfile = fallback;
          return fallback;
        }
      } catch {}
      return null;
    }
  }

  // 1. Obtener Detalle con Ingredientes Poblados
  public async findOneWithItems({
    id,
    userSession,
  }: {
    id: string;
    userSession: User;
  }) {
    const menu = await this.prisma.menu.findFirst({
      where: {
        id,
        deletedAt: null,
        archivedAt: null,
      },
      include: {
        items: {
          include: {
            food: true, // Traemos la info nutricional del alimento
          },
        },
        condiments: {
          include: {
            condiment: true,
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException("Menú no encontrado o no tienes permisos.");
    }

    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const isPatient = userSession.permits?.name === "PATIENT" || (userSession.patientProfiles && userSession.patientProfiles.length > 0);
    const patientId = isPatient ? userSession.patientProfiles?.[0]?.id : undefined;

    if (!isAdmin) {
      if (isPatient) {
        // Verificar que este menú esté asignado a este paciente en un plan activo
        const assigned = await this.prisma.assignedMenu.findFirst({
          where: {
            menuId: id,
            plan: {
              patientId: patientId,
              status: "ACTIVE",
            },
          },
        });
        if (!assigned) {
          throw new ForbiddenException("No tienes permiso para acceder a este menú.");
        }
      } else {
        // Verificar propiedad del nutricionista o si es un menú marcado como público/comunidad
        const nutProfile = await this.ensureNutritionistProfile(userSession);
        const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;
        if (menu.nutritionistId !== nutritionistId && !menu.isCommunity) {
          throw new ForbiddenException("No tienes permiso para acceder a este menú.");
        }
      }
    }

    let publishedAt: Date | null = null;
    if (menu.isCommunity) {
      const meta = await this.prisma.communityMetadata.findUnique({
        where: { entityType_entityId: { entityType: 'menu', entityId: menu.id } },
        select: { publishedAt: true },
      });
      publishedAt = meta?.publishedAt ?? null;
    }

    const canViewCondiments = this.permissionService.hasCommunityAccess(userSession);

    return { ...menu, publishedAt, canViewCondiments };
  }

  // 2. Agregar Ingrediente y Recalcular Totales
  public async addItem({
    menuId,
    data,
    userSession,
  }: {
    menuId: string;
    data: AddMenuItemDto;
    userSession: User;
  }) {
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;

    // A. Validar Menú
    const menu = await this.prisma.menu.findFirst({
      where: {
        id: menuId,
        nutritionistId: nutritionistId,
        deletedAt: null,
        archivedAt: null,
      },
    });
    if (!menu)
      throw new ForbiddenException("No tienes permiso para editar este menú.");

    // B. Validar Alimento
    const food = await this.prisma.foodItem.findUnique({
      where: { id: data.foodId },
    });
    if (!food) throw new NotFoundException("Alimento no encontrado.");

    // C. Crear Item
    await this.prisma.menuItem.create({
      data: {
        menuId,
        foodId: data.foodId,
        quantity: data.quantity,
        unit: data.unit,
        portionLabel: data.portionLabel,
      },
    });

    // D. Recalcular Totales del Menú
    await this.recalculateMenuTotals(menuId);
    return await this.findOneWithItems({ id: menuId, userSession });
  }

  // 3. Eliminar Ingrediente y Recalcular Totales
  public async removeItem({
    itemId,
    userSession,
  }: {
    itemId: string;
    userSession: User;
  }) {
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;

    // A. Validar Item y Propiedad
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { menu: true },
    });

    if (
      !item ||
      item.menu.nutritionistId !== nutritionistId
    ) {
      throw new ForbiddenException("No puedes eliminar este ingrediente.");
    }

    if (item.menu.archivedAt || item.menu.deletedAt) {
      throw new ForbiddenException(
        "No puedes modificar un menú archivado o eliminado.",
      );
    }

    // B. Eliminar
    await this.prisma.menuItem.delete({ where: { id: itemId } });

    // C. Recalcular Totales
    await this.recalculateMenuTotals(item.menuId);
    return await this.findOneWithItems({ id: item.menuId, userSession });
  }

  // 4. Actualizar Ingrediente y Recalcular Totales
  public async updateItem({
    itemId,
    data,
    userSession,
  }: {
    itemId: string;
    data: AddMenuItemDto;
    userSession: User;
  }) {
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;

    // A. Validar Item y Propiedad
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { menu: true },
    });

    if (
      !item ||
      item.menu.nutritionistId !== nutritionistId
    ) {
      throw new ForbiddenException("No puedes editar este ingrediente.");
    }

    if (item.menu.archivedAt || item.menu.deletedAt) {
      throw new ForbiddenException(
        "No puedes modificar un menú archivado o eliminado.",
      );
    }

    // B. Actualizar
    await this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        quantity: data.quantity,
        unit: data.unit,
        portionLabel: data.portionLabel,
        foodId: data.foodId,
      },
    });

    // C. Recalcular Totales
    await this.recalculateMenuTotals(item.menuId);
    return await this.findOneWithItems({ id: item.menuId, userSession });
  }

  // 5. Agregar Condimento al Menú
  public async addCondiment({
    menuId,
    data,
    userSession,
  }: {
    menuId: string;
    data: AddMenuCondimentDto;
    userSession: User;
  }) {
    // A. Validar Propiedad del Menú (owner o admin)
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;
    const menu = await this.menuRepository.findOne({
      where: { id: menuId, deletedAt: null, archivedAt: null, ...(isAdmin ? {} : { nutritionistId: nutritionistId }) },
    });
    if (!menu)
      throw new ForbiddenException("No tienes permiso para editar este menú.");

    // B. Validar Condimento
    const condiment = await this.prisma.condiment.findUnique({
      where: { id: data.condimentId },
    });
    if (!condiment) throw new NotFoundException("Condimento no encontrado.");

    // C. Crear o Actualizar Vínculo (upsert idempotente ante el @unique compuesto menuId + condimentId)
    await this.prisma.menuCondiment.upsert({
      where: { menuId_condimentId: { menuId, condimentId: data.condimentId } },
      create: {
        menuId,
        condimentId: data.condimentId,
        quantity: data.quantity,
        unit: data.unit,
      },
      update: {
        quantity: data.quantity,
        unit: data.unit,
      },
    });

    // D. Devolver el Detalle Completo (condimentos + canViewCondiments + publishedAt)
    return await this.findOneWithItems({ id: menuId, userSession });
  }

  // 6. Eliminar Condimento del Menú
  public async removeCondiment({
    condimentId,
    userSession,
  }: {
    condimentId: string;
    userSession: User;
  }) {
    // A. Validar Vínculo
    const link = await this.prisma.menuCondiment.findUnique({
      where: { id: condimentId },
      include: { menu: true },
    });
    if (!link) throw new NotFoundException("Vínculo de condimento no encontrado.");

    if (link.menu.archivedAt || link.menu.deletedAt) {
      throw new ForbiddenException(
        "No puedes modificar un menú archivado o eliminado.",
      );
    }

    // B. Validar Propiedad del Menú (owner o admin)
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;
    if (
      link.menu.nutritionistId !== nutritionistId &&
      !isAdmin
    ) {
      throw new ForbiddenException("No tienes permiso para editar este menú.");
    }

    // C. Eliminar Vínculo
    await this.prisma.menuCondiment.delete({ where: { id: condimentId } });

    // D. Devolver el Detalle Completo
    return await this.findOneWithItems({ id: link.menuId, userSession });
  }

  // 7. Subir Foto del Menú (owner o admin)
  public async uploadImage({
    menuId,
    file,
    userSession,
  }: {
    menuId: string;
    file: File;
    userSession: User;
  }) {
    // A. Validar Propiedad del Menú (owner o admin)
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;
    const menu = await this.menuRepository.findOne({
      where: { id: menuId, deletedAt: null, archivedAt: null, ...(isAdmin ? {} : { nutritionistId: nutritionistId }) },
    });
    if (!menu)
      throw new ForbiddenException("No tienes permiso para editar este menú.");

    // B. Validar Archivo
    if (!file || !file.buffer) {
      throw new BadRequestException("Debe subir una imagen.");
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size && file.size > maxSize) {
      throw new BadRequestException("La imagen excede el tamaño máximo permitido de 5MB.");
    }

    const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("Solo se permiten imágenes PNG, JPG, JPEG, WEBP.");
    }

    const fileExtension = safeExtensionFromMime(file.mimetype, file.originalname);
    const filename = `menu_${menuId}_${Date.now()}.${fileExtension}`;

    await this.storageService.uploadFile(file.buffer, filename, file.mimetype);
    const fileUrl = await this.storageService.getFileUrl(filename);

    // C. Guardar la URL en el Menú
    await this.prisma.menu.update({
      where: { id: menuId },
      data: { imageUrl: fileUrl },
    });

    return await this.findOneWithItems({ id: menuId, userSession });
  }

  // 8. Quitar Foto del Menú (owner o admin)
  public async removeImage({
    menuId,
    userSession,
  }: {
    menuId: string;
    userSession: User;
  }) {
    // A. Validar Propiedad del Menú (owner o admin)
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;
    const menu = await this.menuRepository.findOne({
      where: { id: menuId, deletedAt: null, archivedAt: null, ...(isAdmin ? {} : { nutritionistId: nutritionistId }) },
    });
    if (!menu)
      throw new ForbiddenException("No tienes permiso para editar este menú.");

    // B. Eliminar Archivo en MinIO (solo los subidos con el prefijo menu_)
    if (menu.imageUrl) {
      const filename = menu.imageUrl.split("/").pop();
      if (filename && filename.startsWith("menu_")) {
        try {
          await this.storageService.deleteFile(filename);
        } catch (error) {
          this.logger.error(`Error eliminando foto de menú de MinIO: ${filename}`, error);
        }
      }
    }

    // C. Limpiar la URL en el Menú
    await this.prisma.menu.update({
      where: { id: menuId },
      data: { imageUrl: null },
    });

    return await this.findOneWithItems({ id: menuId, userSession });
  }

  /**
   * MÉTODO PRIVADO CRÍTICO: Recalcula Kcal/Macros del Menú
   * Suma (CantidadIngrediente / BaseAlimento) * MacroAlimento
   */
  private async recalculateMenuTotals(menuId: string): Promise<Menu> {
    // 1. Obtener todos los items con sus datos nutricionales
    const menuItems = await this.prisma.menuItem.findMany({
      where: { menuId },
      include: { food: true },
    });

    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    // 2. Sumar iterativamente
    for (const item of menuItems) {
      const food = item.food;
      // Evitar división por cero si baseQuantity es 0 o null (fallback a 100)
      const baseQty = Number(food.baseQuantity) || 100;
      const ratio = Number(item.quantity) / baseQty;

      totalKcal += Number(food.calories) * ratio;
      totalProtein += Number(food.proteins) * ratio;
      totalCarbs += Number(food.carbohydrates) * ratio;
      totalFats += Number(food.fats) * ratio;
    }

    // 3. Actualizar la cabecera del Menú con cálculo de energía basado en macros para consistencia total (Atwater: 4-4-9)
    const macroKcal = (totalProtein * 4) + (totalCarbs * 4) + (totalFats * 9);

    const result = await this.prisma.menu.update({
      where: { id: menuId },
      data: {
        totalKcal: macroKcal,
        totalProtein: totalProtein,
        totalCarbs: totalCarbs,
        totalFats: totalFats,
      },
      include: {
        items: { include: { food: true } },
      },
    });

    return {
      ...result,
      tags: result.tags as string,
      category: result.category as MenuCategory,
      totalKcal: result.totalKcal ? Number(result.totalKcal) : null,
      totalProtein: result.totalProtein ? Number(result.totalProtein) : null,
      totalCarbs: result.totalCarbs ? Number(result.totalCarbs) : null,
      totalFats: result.totalFats ? Number(result.totalFats) : null,
    } as unknown as Menu;
  }

  /**
   * ---------------------------------------------------
   * LÓGICA DE NEGOCIO Y CRUD
   * ---------------------------------------------------
   */

  public async create({
    userSession,
    data,
  }: {
    data: CreateMenuDto;
    userSession: User;
  }) {
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;

    // 1. Preparar Payload del Evento
    const prev = new DomainEvent({
      action: this.menuRepository.EVENT_CREATED,
      entityName: this.menuRepository.MODEL_NAME,
      payload: { ...data, nutritionistId },
    });

    this.eventEmitter.emit(this.menuRepository.EVENT_CREATED, prev);
    this.logger.logInfo(
      `Creando menú para nutricionista: ${userSession.username}`,
    );

    try {
      // Get organizationId from workspace context
      const orgId = this.workspaceContext.getWorkspaceId();

      // 2. Transformación de Datos (Frontend -> DB)
      const dataCreate: MENU_CREATE = {
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags,
        prepTime: data.prepTime != null && data.prepTime !== ('' as any) ? Number(data.prepTime) : null,
        difficulty: data.difficulty || null,

        nutritionist: { connect: { id: nutritionistId } }, // Vincular al nutricionista actual
        createdBy: { connect: { id: userSession.id } },

        ...(orgId && orgId !== 'personal' ? { organization: { connect: { id: orgId } } } : {}),

        items: {
          create: data.items
            ? data.items.map((item) => ({
              quantity: item.quantity,
              unit: item.unit,
              portionLabel: item.portionLabel,
              food: { connect: { id: item.foodId } }, // Conectamos por ID
            }))
            : [],
        },
      };

      // 4. Ejecución
      let entity = await this.menuRepository.create({ data: dataCreate });

      if (!entity) {
        throw new EntityNotFoundException("No se pudo crear el menú");
      }

      // Recalcular si se crearon ítems inicialmente
      if (data.items && data.items.length > 0) {
        entity = await this.recalculateMenuTotals(entity.id);
      }

      // 5. Evento de Éxito
      const success = new DomainEvent({
        action: this.menuRepository.EVENT_CREATED_SUCCESS,
        entityName: this.menuRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.menuRepository.EVENT_CREATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      // 6. Manejo de Fallos
      const failed = new DomainEvent({
        action: this.menuRepository.EVENT_CREATED_FAILED,
        entityName: this.menuRepository.MODEL_NAME,
        payload: data,
        metadata: { error },
      });
      this.eventEmitter.emit(this.menuRepository.EVENT_CREATED_FAILED, failed);

      throw error; // Dejar subir al filtro global
    }
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: Partial<CreateMenuDto>;
    userSession: User;
    id: string;
  }) {
    const prev = new DomainEvent({
      action: this.menuRepository.EVENT_UPDATED,
      entityName: this.menuRepository.MODEL_NAME,
      payload: { id, data },
    });
    this.eventEmitter.emit(this.menuRepository.EVENT_UPDATED, prev);

    try {
      // 1. Verificar Propiedad (Ownership)
      const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
      const nutProfile = await this.ensureNutritionistProfile(userSession);
      const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;
      const existing = await this.menuRepository.findOne({
        where: {
          id,
          deletedAt: null,
          archivedAt: null,
          ...(isAdmin ? {} : { nutritionistId }),
        },
      });

      if (!existing) {
        throw new EntityNotFoundException("Menu");
      }

      // 2. Mapeo de Datos
      const dataUpdate: MENU_UPDATE = {};
      if (data.category) dataUpdate.category = data.category;
      if (data.description !== undefined) dataUpdate.description = data.description;
      if (data.name) dataUpdate.name = data.name;
      if (data.tags !== undefined) dataUpdate.tags = data.tags;
      if (data.prepTime !== undefined) dataUpdate.prepTime = (data.prepTime != null && data.prepTime !== ('' as any)) ? Number(data.prepTime) : null;
      if (data.difficulty !== undefined) dataUpdate.difficulty = data.difficulty || null;

      // 3. Ejecución
      const entity = await this.menuRepository.update({
        where: { id },
        data: dataUpdate,
      });

      const success = new DomainEvent({
        action: this.menuRepository.EVENT_UPDATED_SUCCESS,
        entityName: this.menuRepository.MODEL_NAME,
        payload: entity,
      });
      this.eventEmitter.emit(
        this.menuRepository.EVENT_UPDATED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.menuRepository.EVENT_UPDATED_FAILED,
        entityName: this.menuRepository.MODEL_NAME,
        payload: { id, data },
        metadata: { error },
      });
      this.eventEmitter.emit(this.menuRepository.EVENT_UPDATED_FAILED, failed);
      throw error;
    }
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.menuRepository.EVENT_DELETED,
      entityName: this.menuRepository.MODEL_NAME,
      payload: id,
    });
    this.eventEmitter.emit(this.menuRepository.EVENT_DELETED, prev);

    try {
      // 1. Verificar Propiedad
      const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
      const nutProfile = await this.ensureNutritionistProfile(userSession);
      const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;
      const existing = await this.menuRepository.findOne({
        where: {
          id,
          deletedAt: null,
          ...(isAdmin ? {} : { nutritionistId }),
        },
      });
      if (!existing) {
        throw new EntityNotFoundException("Menú");
      }

      // 2. Ejecución (Soft Delete en Repo)
      const entity = await this.menuRepository.delete({ where: { id } });

      const success = new DomainEvent({
        action: this.menuRepository.EVENT_DELETED_SUCCESS,
        entityName: this.menuRepository.MODEL_NAME,
        payload: id,
      });
      this.eventEmitter.emit(
        this.menuRepository.EVENT_DELETED_SUCCESS,
        success,
      );

      return entity;
    } catch (error) {
      const failed = new DomainEvent({
        action: this.menuRepository.EVENT_DELETED_FAILED,
        entityName: this.menuRepository.MODEL_NAME,
        payload: id,
        metadata: { error },
      });
      this.eventEmitter.emit(this.menuRepository.EVENT_DELETED_FAILED, failed);
      throw error;
    }
  }

  /**
   * Archiva un menú. No borra ni desasigna: solo lo saca de la lista activa,
   * bloquea su edición y su ficha, y lo oculta del plan del paciente.
   */
  public async archive({ userSession, id }: { id: string; userSession: User }) {
    const existing = await this.findOwnedForLifecycle({ id, userSession });
    if (!existing) throw new EntityNotFoundException("Menú");
    if (existing.archivedAt) {
      throw new ConflictException("El menú ya está archivado.");
    }

    return await this.menuRepository.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  /**
   * Devuelve un menú archivado a la lista activa.
   */
  public async unarchive({ userSession, id }: { id: string; userSession: User }) {
    const existing = await this.findOwnedForLifecycle({ id, userSession });
    if (!existing) throw new EntityNotFoundException("Menú");
    if (!existing.archivedAt) {
      throw new ConflictException("El menú no está archivado.");
    }

    return await this.menuRepository.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  private async findOwnedForLifecycle({
    id,
    userSession,
  }: {
    id: string;
    userSession: User;
  }) {
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const nutProfile = await this.ensureNutritionistProfile(userSession);
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;

    return await this.menuRepository.findOne({
      where: {
        id,
        deletedAt: null,
        ...(isAdmin ? {} : { nutritionistId }),
      },
    });
  }

  /**
   * ---------------------------------------------------
   * LÓGICA DE VISTAS (PAGINATION, UNIQUE, FORMS)
   * ---------------------------------------------------
   */

  public async pagination({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const columns = this.menuRepository.getColumns();
    const form = this.menuRepository.getFormCreate({}); // Formulario vacío para el modal de "Crear"

    const isAdmin = userSession?.permits?.list?.includes("USER_LIST") || userSession?.permits?.list?.includes("PERMIT_DASHBOARD");
    const isPatient = userSession?.permits?.name === "PATIENT" || (userSession?.patientProfiles && userSession.patientProfiles.length > 0);
    const patientId = isPatient ? userSession.patientProfiles?.[0]?.id : undefined;

    const nutProfile = (!isAdmin && !isPatient && userSession)
      ? await this.ensureNutritionistProfile(userSession)
      : null;
    const nutritionistId = (isAdmin || isPatient)
      ? undefined
      : (nutProfile?.id ?? userSession?.nutritionistProfile?.id ?? undefined);

    const paginate = await this.getPaginate(
      query,
      nutritionistId,
      patientId,
    );
    const actions = await this.getActions(
      userSession.permits?.list || [],
      { formCreate: form },
      "menu",
    );
    const filters = this.menuRepository.getFilters({ query });

    return {
      pageTitle: "common.titles.menus", // "Mis Menús"
      form,
      actions,
      filters,
      ...paginate, // list, total, pages...
      columns,
      sortParams: {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      currentQuery: query,
    };
  }

  public async unique({ id, userSession }: { id: string; userSession: User }) {
    // Buscar paciente asegurando que pertenece al nutricionista
    const isAdmin = userSession.permits?.list?.includes("USER_LIST") || userSession.permits?.list?.includes("PERMIT_DASHBOARD");
    const isPatient = userSession.permits?.name === "PATIENT" || (userSession.patientProfiles && userSession.patientProfiles.length > 0);
    const patientId = isPatient ? userSession.patientProfiles?.[0]?.id : undefined;
    const nutProfile = (!isAdmin && !isPatient) ? await this.ensureNutritionistProfile(userSession) : null;
    const nutritionistId = nutProfile?.id ?? userSession.nutritionistProfile?.id;

    const entity = await this.menuRepository.findOne({
      where: {
        id,
        deletedAt: null,
        archivedAt: null,
        ...(isAdmin ? {} : (isPatient ? {
          assignedMenus: {
            some: {
              plan: {
                patientId: patientId,
                status: "ACTIVE",
              },
            },
          },
        } : { nutritionistId: nutritionistId })),
      },
    });

    if (!entity) {
      throw new EntityNotFoundException("Menú");
    }

    const actions = await this.getActions(
      userSession.permits?.list || [],
      { formCreate: undefined },
      "menu",
    );
    const formUpdate = this.menuRepository.getFormUpdate({ object: entity });
    // const from = this.dietRepository.getFormCreate({  patientId: entity.id });

    return {
      pageTitle: `${entity.name}`,
      actions,
      object: entity,
      form: formUpdate,
      dietCreate: {
        key: "patient-diet-create-modal",
        label: "common.actions.create_diet",
        icon: "plus",
        link: "/dashboard/diets/form/create?patientId=" + entity.id,
        action: "modal",
        color: "primary",
      },
    };
  }

  // --- MÉTODOS AUXILIARES PRIVADOS ---

  private async getPaginate(query: FilterParamsDto, nutritionistId?: string, patientId?: string) {
    const {
      q,
      createdAt_gte,
      createdAt_lte,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query || {};

    const limit = Number(query?.limit) || 10;
    const page = Number(query?.page) || 1;

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    // Construcción del WHERE dinámico
    const where: MENU_WHERE[] = [];

    // 1. Filter by organizationId on the menu itself
    if (orgId && orgId !== 'personal') {
      where.push({ organizationId: orgId });
    } else {
      // Personal workspace: only return menus with null organizationId
      where.push({ organizationId: null });
    }

    // 2. Filtro Base: Pertenencia y No Borrado
    if (nutritionistId) {
      where.push({ nutritionistId: nutritionistId });
    }
    if (patientId) {
      where.push({
        assignedToPlans: {
          some: {
            plan: {
              patientId: patientId,
              status: "ACTIVE",
            },
          },
        },
      });
    }
    where.push({ deletedAt: null });

    // 3. Archivados: solo se listan cuando la vista lo pide explícitamente.
    where.push(
      query?.includeArchived === true
        ? { archivedAt: { not: null } }
        : { archivedAt: null },
    );

    // 2. Búsqueda por Nombre, Apellido, Email
    if (q) {
      where.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    // 3. Filtro de Fechas
    if (createdAt_gte || createdAt_lte) {
      const dateFilter: any = {};
      if (createdAt_gte) dateFilter.gte = new Date(createdAt_gte);
      if (createdAt_lte) dateFilter.lte = new Date(createdAt_lte);
      where.push({ createdAt: dateFilter });
    }

    const currentPage = page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    // Prisma clause
    const whereClause = { AND: where };

    const [list, total] = await Promise.all([
      this.menuRepository.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.menuRepository.count({ where: whereClause }),
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
    form: { formCreate?: Form; formUpdate?: Form },
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

    // LISTAR
    actions.list = {
      label: "common.actions.list",
      icon: "list",
      link: "/dashboard/menu",
      action: "redirect",
    };

    // VER DETALLE
    actions.unique = {
      label: "common.actions.unique",
      icon: "eye",
      link: "/dashboard/menu/:id",
    };

    // CREAR
    if (form.formCreate) {
      actions.create = {
        form: form.formCreate,
        key: "menu-create-modal",
        label: "common.actions.create_menu",
        icon: "plus",
        link: "/menu/create",
        action: "modal",
      };
    }

    // EDITAR
    if (form.formUpdate) {
      actions.update = {
        form: form.formUpdate,
        key: "menu-update-modal",
        label: "common.actions.edit",
        icon: "edit",
        link: "/menu/update",
        action: "modal",
      };
    }

    // ELIMINAR
    actions.delete = {
      label: "common.actions.delete",
      icon: "trash",
      link: "/menu/:id/delete",
      action: "modal",
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
