import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { CreateInstitutionalCalculationDto } from "../dto/create-calculation.dto";
import { CreateInstitutionalMenuDto } from "../dto/create-menu.dto";
import { InstitutionalCalculationEngine } from "./institutional-calculation.engine";
import { InstitutionalActivityLevel, PriceUnit, InstitutionalCollaboratorStatus } from "@prisma/client";
import { NotificationType } from "src/shared/types/schema.types";
import NotificationRepository from "src/modules/notification/repository/notification.repository";
import { MailService } from "src/modules/mail/mail.service";
import { WorkspaceContextService } from "../../../../shared/services/workspace-context.service";
import { Logger } from "@nestjs/common";
const logger = new Logger("institutional-food.service");


@Injectable()
export class InstitutionalFoodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationRepo: NotificationRepository,
    private readonly mailService: MailService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  /**
   * Crea una simulación de cálculo institucional y persiste los resultados.
   */
  async createCalculation(
    nutritionistId: string,
    dto: CreateInstitutionalCalculationDto
  ) {
    // 1. Obtener factor de actividad física
    const activityFactor = InstitutionalCalculationEngine.getActivityFactor(
      dto.activityLevel,
      dto.activityFactor
    );

    // 2. Ejecutar motor de cálculo para la parte poblacional (Pasos 1-7)
    const calculationResult = InstitutionalCalculationEngine.runCalculation({
      femaleCount: dto.femaleCount,
      maleCount: dto.maleCount,
      sampleWeights: dto.sampleWeights,
      activityLevel: dto.activityLevel,
      activityFactor,
      meals: dto.meals,
    });

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    // 3. Persistir en la base de datos en una transacción
    return this.prisma.$transaction(async (tx) => {
      const calculation = await tx.institutionalCalculation.create({
        data: {
          title: dto.title,
          description: dto.description,
          nutritionistId,
          totalPeople: dto.totalPeople,
          maleCount: dto.maleCount,
          femaleCount: dto.femaleCount,
          sampleWeights: dto.sampleWeights,
          averageWeight: calculationResult.averageWeight,
          activityLevel: dto.activityLevel,
          activityFactor,
          vct: calculationResult.vct,
          ...(orgId && orgId !== 'personal' ? { organization: { connect: { id: orgId } } } : {}),
        },
      });

      // Crear las configuraciones de comidas calculadas
      const mealConfigsData = calculationResult.meals.map((meal) => ({
        calculationId: calculation.id,
        mealType: meal.mealType,
        percentage: meal.percentage,
        targetKcal: meal.targetKcal,
        proteinPercentage: meal.proteinPercentage,
        fatPercentage: meal.fatPercentage,
        carbsPercentage: meal.carbsPercentage,
        proteinGrams: meal.proteinGrams,
        fatGrams: meal.fatGrams,
        carbsGrams: meal.carbsGrams,
      }));

      await tx.institutionalMealConfig.createMany({
        data: mealConfigsData,
      });

      // Retornar el cálculo con sus comidas
      return tx.institutionalCalculation.findUnique({
        where: { id: calculation.id },
        include: { meals: true },
      });
    });
  }

  /**
   * Obtiene el catálogo de disciplinas deportivas activas, ordenado
   * alfabéticamente por nombre.
   */
  async findAllSportDisciplines() {
    const disciplines = await this.prisma.sportDiscipline.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        metValue: true,
        category: true,
      },
    });

    return disciplines.map((discipline) => ({
      id: discipline.id,
      name: discipline.name,
      code: discipline.code,
      metValue: Number(discipline.metValue),
      category: discipline.category,
    }));
  }

  /**
   * Agrega y costea un menú asociado a una simulación de cálculo.
   */
  async createMenu(
    nutritionistId: string,
    calculationId: string,
    dto: CreateInstitutionalMenuDto
  ) {
    // 1. Verificar existencia de la simulación y acceso (creador o colaborador editor)
    const calculation = await this.prisma.institutionalCalculation.findFirst({
      where: {
        id: calculationId,
        OR: [
          { nutritionistId },
          { collaborators: { some: { nutritionistId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      },
    });

    if (!calculation) {
      throw new NotFoundException(
        "No se encontró el cálculo institucional especificado o no tienes permisos de edición."
      );
    }

    const totalPeople = calculation.totalPeople;
    const itemsWithCosting: any[] = [];
    let totalMenuCost = 0;
    let menuCostPerCapita = 0;

    // 2. Procesar y costear cada ingrediente/alimento del menú
    for (const item of dto.items) {
      const foodItem = await this.prisma.foodItem.findUnique({
        where: { id: item.foodId },
      });

      if (!foodItem) {
        throw new NotFoundException(
          `No se encontró el alimento con ID ${item.foodId}.`
        );
      }

      // Determinar el precio unitario a usar
      const currentPriceNum = foodItem.currentPrice
        ? Number(foodItem.currentPrice)
        : null;

      const unitPrice =
        item.unitPrice !== undefined ? item.unitPrice : currentPriceNum;

      if (unitPrice === null || unitPrice === undefined) {
        throw new BadRequestException(
          `El alimento "${foodItem.name}" no tiene un precio registrado en el sistema. Debe proveer un unitPrice manual.`
        );
      }

      // Costear porción (Paso 9 y 10)
      const costing = InstitutionalCalculationEngine.calculateMenuItemCosting({
        portionGrams: item.portionGrams,
        unitPrice,
        priceUnit: foodItem.priceUnit,
        totalPeople,
        wasteFactor: Number(foodItem.wasteFactor),
      });

      totalMenuCost += costing.totalCost;
      menuCostPerCapita += costing.perCapitaCost;

      itemsWithCosting.push({
        foodId: item.foodId,
        mealType: item.mealType,
        portionGrams: item.portionGrams,
        unitPrice,
        perCapitaCost: costing.perCapitaCost,
        totalQuantity: costing.totalQuantity,
        totalCost: costing.totalCost,
      });
    }

    // Redondear costos totales del menú
    totalMenuCost = parseFloat(totalMenuCost.toFixed(2));
    menuCostPerCapita = parseFloat(menuCostPerCapita.toFixed(2));

    // 3. Guardar menú y sus ítems en la base de datos en una transacción
    return this.prisma.$transaction(async (tx) => {
      const menu = await tx.institutionalMenu.create({
        data: {
          calculationId,
          name: dto.name,
          totalCost: totalMenuCost,
          costPerCapita: menuCostPerCapita,
        },
      });

      const menuItemsData = itemsWithCosting.map((item) => ({
        menuId: menu.id,
        foodId: item.foodId,
        mealType: item.mealType,
        portionGrams: item.portionGrams,
        unitPrice: item.unitPrice,
        perCapitaCost: item.perCapitaCost,
        totalQuantity: item.totalQuantity,
        totalCost: item.totalCost,
      }));

      await tx.institutionalMenuItem.createMany({
        data: menuItemsData,
      });

      return tx.institutionalMenu.findUnique({
        where: { id: menu.id },
        include: {
          items: {
            include: { food: true },
          },
        },
      });
    });
  }

  /**
   * Obtiene una simulación con sus comidas, menús y colaboradores asociados.
   */
  async getCalculation(id: string) {
    const calculation = await this.prisma.institutionalCalculation.findUnique({
      where: { id },
      include: {
        meals: true,
        collaborators: {
          include: {
            nutritionist: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        sportDiscipline: {
          select: {
            id: true,
            name: true,
            category: true,
            metValue: true,
          },
        },
        menus: {
          include: {
            items: {
              include: { food: true },
            },
          },
        },
      },
    });

    if (!calculation) {
      throw new NotFoundException("Cálculo institucional no encontrado.");
    }

    return calculation;
  }

  /**
   * Agrega o actualiza un colaborador a un cálculo institucional.
   */
  async addCollaborator(
    ownerNutriId: string,
    calculationId: string,
    targetNutriId: string,
    role: any = 'EDITOR'
  ) {
    const calculation = await this.prisma.institutionalCalculation.findUnique({
      where: { id: calculationId },
    });

    if (!calculation) {
      throw new NotFoundException("Cálculo institucional no encontrado.");
    }

    if (calculation.nutritionistId !== ownerNutriId) {
      throw new ForbiddenException(
        "Solo el creador principal puede agregar o modificar colaboradores."
      );
    }

    if (targetNutriId === ownerNutriId) {
      throw new BadRequestException("No puedes agregarte a ti mismo como colaborador.");
    }

    const collaboratorNutri = await this.prisma.nutritionist.findUnique({
      where: { id: targetNutriId },
      include: { user: true },
    });

    if (!collaboratorNutri) {
      throw new NotFoundException("El nutricionista a agregar no existe.");
    }

    const ownerNutri = await this.prisma.nutritionist.findUnique({
      where: { id: ownerNutriId },
      include: { user: true },
    });

    const result = await this.prisma.institutionalCalculationCollaborator.upsert({
      where: {
        calculationId_nutritionistId: {
          calculationId,
          nutritionistId: targetNutriId,
        },
      },
      create: {
        calculationId,
        nutritionistId: targetNutriId,
        role: role || 'EDITOR',
        status: InstitutionalCollaboratorStatus.PENDING,
        assignedById: ownerNutriId,
      },
      update: {
        role: role || 'EDITOR',
        status: InstitutionalCollaboratorStatus.PENDING,
        assignedById: ownerNutriId,
      },
      include: {
        nutritionist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Enviar notificación e email al nutricionista invitado
    if (collaboratorNutri.user?.id) {
      const ownerName = ownerNutri?.user
        ? `${ownerNutri.user.firstName} ${ownerNutri.user.lastName}`.trim()
        : "Un colega nutricionista";

      await this.notificationRepo.create({
        userId: collaboratorNutri.user.id,
        title: "Invitación a Cálculo Colectivo",
        message: `El Lic. ${ownerName} te ha invitado a colaborar en el cálculo institucional '${calculation.title}'.`,
        type: NotificationType.INFO,
        entityId: calculationId,
        entityType: "INSTITUTIONAL_CALCULATION",
      });

      if (collaboratorNutri.user.email) {
        this.mailService.sendMail({
          to: collaboratorNutri.user.email,
          subject: "Invitación a colaborar en cálculo institucional — Nutringest",
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
                <tr><td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
                        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                        <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Alimentación Colaborativa</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px;">
                        <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">¡Fuiste invitado a colaborar! 🤝</h2>
                        <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 16px;">
                          El <strong>Lic. ${ownerName}</strong> te ha invitado a colaborar en el cálculo institucional:
                        </p>
                        <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:24px 0;">
                          <p style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 4px;">${calculation.title}</p>
                          <p style="font-size:14px;color:#64748b;margin:0;">Rol: ${role || "EDITOR"}</p>
                        </div>
                        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                          Ingresá a tu panel de Nutringest para revisar la invitación y gestionar el cálculo.
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
        }).catch((err) => logger.error("Error enviando email de invitación institucional", err));
      }
    }

    return result;
  }

  /**
   * Responde (acepta o rechaza) a una invitación de colaboración.
   */
  async respondCollaboratorInvitation(
    targetNutriId: string,
    calculationId: string,
    accept: boolean
  ) {
    const collaborator = await this.prisma.institutionalCalculationCollaborator.findUnique({
      where: {
        calculationId_nutritionistId: {
          calculationId,
          nutritionistId: targetNutriId,
        },
      },
      include: {
        calculation: {
          include: {
            nutritionist: {
              include: { user: true },
            },
          },
        },
        nutritionist: {
          include: { user: true },
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundException("No se encontró la invitación a este cálculo.");
    }

    const newStatus = accept
      ? InstitutionalCollaboratorStatus.ACCEPTED
      : InstitutionalCollaboratorStatus.REJECTED;

    const updated = await this.prisma.institutionalCalculationCollaborator.update({
      where: { id: collaborator.id },
      data: { status: newStatus },
      include: {
        nutritionist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Notificar al nutricionista propietario
    const ownerUser = collaborator.calculation?.nutritionist?.user;
    if (ownerUser?.id) {
      const invitedName = collaborator.nutritionist?.user
        ? `${collaborator.nutritionist.user.firstName} ${collaborator.nutritionist.user.lastName}`.trim()
        : "Un colega";

      const actionText = accept ? "aceptó" : "rechazó";

      await this.notificationRepo.create({
        userId: ownerUser.id,
        title: "Respuesta de Colaboración",
        message: `El Lic. ${invitedName} ${actionText} tu invitación para colaborar en '${collaborator.calculation.title}'.`,
        type: accept ? NotificationType.SUCCESS : NotificationType.WARNING,
        entityId: calculationId,
        entityType: "INSTITUTIONAL_CALCULATION",
      });

      if (ownerUser.email) {
        this.mailService.sendMail({
          to: ownerUser.email,
          subject: `Respuesta de colaboración: ${collaborator.calculation.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
                <tr><td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
                        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px;">
                        <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Respuesta de Colaboración</h2>
                        <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 16px;">
                          El <strong>Lic. ${invitedName}</strong> <strong>${actionText}</strong> tu invitación para colaborar en el proyecto <strong>${collaborator.calculation.title}</strong>.
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
        }).catch((err) => logger.error("Error enviando email de respuesta institucional", err));
      }
    }

    return updated;
  }

  /**
   * Elimina un colaborador de un cálculo institucional.
   */
  async removeCollaborator(
    ownerNutriId: string,
    calculationId: string,
    targetNutriId: string
  ) {
    const calculation = await this.prisma.institutionalCalculation.findUnique({
      where: { id: calculationId },
    });

    if (!calculation) {
      throw new NotFoundException("Cálculo institucional no encontrado.");
    }

    if (calculation.nutritionistId !== ownerNutriId) {
      throw new ForbiddenException(
        "Solo el creador principal puede remover colaboradores."
      );
    }

    await this.prisma.institutionalCalculationCollaborator.deleteMany({
      where: {
        calculationId,
        nutritionistId: targetNutriId,
      },
    });

    return { success: true };
  }

  /**
   * Obtiene el historial de precios de un alimento.
   */
  async getPriceHistory(foodId: string) {
    const food = await this.prisma.foodItem.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      throw new NotFoundException("Alimento no encontrado.");
    }

    return this.prisma.foodPriceHistory.findMany({
      where: { foodId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Obtiene listado paginado de simulaciones (propias y compartidas) con filtros de búsqueda y rol de admin.
   */
  async listCalculations(
    nutritionistId: string | null,
    isAdmin: boolean,
    query: { page?: number; limit?: number; q?: string }
  ) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    // Get organizationId from workspace context
    const orgId = this.workspaceContext.getWorkspaceId();

    const where: any = {};

    // Filter by organizationId on the institutional calculation itself
    if (orgId && orgId !== 'personal') {
      where.organizationId = orgId;
    } else {
      // Personal workspace: only return calculations with null organizationId
      where.organizationId = null;
    }

    if (!isAdmin && nutritionistId) {
      where.OR = [
        { nutritionistId },
        { collaborators: { some: { nutritionistId } } },
      ];
    }

    if (query.q) {
      where.title = { contains: query.q, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      this.prisma.institutionalCalculation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          nutritionist: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          collaborators: {
            include: {
              nutritionist: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.institutionalCalculation.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Elimina una simulación y limpia sus relaciones en cascada.
   */
  async deleteCalculation(nutritionistId: string, id: string, isAdmin: boolean) {
    const calculation = await this.prisma.institutionalCalculation.findUnique({
      where: { id },
    });

    if (!calculation) {
      throw new NotFoundException("Cálculo institucional no encontrado.");
    }

    if (!isAdmin && calculation.nutritionistId !== nutritionistId) {
      throw new ForbiddenException(
        "No tienes permisos para eliminar esta simulación institucional."
      );
    }

    await this.prisma.institutionalCalculation.delete({
      where: { id },
    });

    return { success: true };
  }
}
