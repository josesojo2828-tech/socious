import { Injectable } from "@nestjs/common";
import { DomainEvent } from "src/shared/event/domain-listener";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Form,
  FormInput,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import PermitReporitory from "../permit/repository/permit.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import SubscriptionPlanReporitory from "./repository/transaction.repository";
import {
  TRANSACTION_CREATE,
  TRANSACTION_DEFAULT_INCLUDE,
  TRANSACTION_ORDER,
  TRANSACTION_UPDATE,
  TRANSACTION_WHERE,
  TransactionCreate,
  TransactionUpdate,
} from "./dto/transaction.type";
import { TransactionStatus, User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { SubscriptionService } from "../user/services/subscription.service";
import { SUBSCRIPTION_WHERE } from "../user/dto/subscription.type";
import UserPaymentMethodReporitory from "../user/repository/user-payment-method.repository";
import TransactionReporitory from "./repository/transaction.repository";
import WalletReporitory from "../wallet/repository/wallet.repository";

import { MailService } from "../mail/mail.service";
import { PrismaService } from "nestjs-prisma";
import { writeFinancialAudit } from "src/shared/helpers/audit-log";
import { Logger } from "@nestjs/common";
const logger = new Logger("transaction.service");


@Injectable()
export class TransactionService {
  constructor(
    // private readonly transactionRepository: SubscriptionReporitory,
    private eventEmitter: EventEmitter2,

    private readonly permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
    private readonly transactionRepository: TransactionReporitory,
    private readonly subscriptionUserService: SubscriptionService,
    private readonly paymentmethodUserRepository: UserPaymentMethodReporitory,
    private readonly walletRepository: WalletReporitory,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) { }

  public async setStatus({
    id,
    status,
    userSession,
  }: {
    id: string;
    status: TransactionStatus;
    userSession: User;
  }) {
    const prev = new DomainEvent({
      action: this.transactionRepository.EVENT_SET_STATUS,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: { id, status },
    });
    const success = new DomainEvent({
      action: this.transactionRepository.EVENT_SET_STATUS_SUCCESS,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: { id, status },
    });
    const failed = new DomainEvent({
      action: this.transactionRepository.EVENT_SET_STATUS_FAILED,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: { id, status },
    });

    this.eventEmitter.emit(prev.action, prev);
    try {
      let entity: any;

      if (status === "SUCCESS") {
        // Idempotencia: sólo una llamada puede transicionar a SUCCESS y acreditar el saldo.
        const current = await this.prisma.transaction.findUnique({
          where: { id },
          include: TRANSACTION_DEFAULT_INCLUDE,
        });
        if (!current) throw new Error(`Transacción no encontrada: ${id}`);

        // Si ya estaba en SUCCESS, no volvemos a acreditar (retry de webhook / doble click).
        if (current.status === "SUCCESS") {
          return this.transactionRepository.format(current);
        }

        const transitioned = await this.prisma.$transaction(async (tx) => {
          const claim = await tx.transaction.updateMany({
            where: { id, status: { not: "SUCCESS" } },
            data: { status: "SUCCESS" },
          });
          if (claim.count === 0) return false;

          const wallet = await tx.userWallet.findFirst({
            where: { userId: current.userId },
            select: { id: true },
          });
          const walletId = wallet?.id;
          if (walletId) {
            // Determine which balance to increment based on original currency
            if (current.originalCurrency === "VES" && current.originalAmount) {
              // VES payment: increment VES balance
              await tx.userWallet.update({
                where: { id: walletId },
                data: { balanceVES: { increment: current.originalAmount } },
              });
            } else {
              // USD payment: increment USD balance (default)
              await tx.userWallet.update({
                where: { id: walletId },
                data: { balance: { increment: current.amount } },
              });
            }
          }

          return true;
        });

        // Otra llamada concurrente ya acreditó: no duplicamos.
        if (!transitioned) {
          const existing = await this.prisma.transaction.findUnique({
            where: { id },
            include: TRANSACTION_DEFAULT_INCLUDE,
          });
          return this.transactionRepository.format(existing);
        }

        entity = await this.transactionRepository.findOne({ where: { id } });

        await writeFinancialAudit(this.prisma, {
          action: "TRANSACTION_STATUS_SUCCESS",
          entityType: "Transaction",
          entityId: id,
          actorId: userSession?.id ?? null,
          amount: Number(current.amount),
          metadata: { previousStatus: current.status },
        });
      } else {
        entity = await this.transactionRepository.update({
          data: { status },
          where: { id },
        });
      }

      if (status === "CANCELED")
        this.eventEmitter.emit(
          this.transactionRepository.EVENT_SET_STATUS_TYPE_CANCELED,
          success,
        );
      else if (status === "FAILED")
        this.eventEmitter.emit(
          this.transactionRepository.EVENT_SET_STATUS_TYPE_FAILED,
          success,
        );
      else if (status === "PENDING")
        this.eventEmitter.emit(
          this.transactionRepository.EVENT_SET_STATUS_TYPE_PENDING,
          success,
        );
      else if (status === "SUCCESS") {
        this.eventEmitter.emit(
          this.transactionRepository.EVENT_SET_STATUS_TYPE_SUCCESS,
          {
            ...success,
            action: this.transactionRepository.EVENT_SET_STATUS_TYPE_SUCCESS,
          },
        );
      }

      this.eventEmitter.emit(success.action, success);

      // Send email notification to user about payment status
      if (entity.user?.email && (status === "SUCCESS" || status === "FAILED" || status === "CANCELED")) {
        const isApproved = status === "SUCCESS";
        const titleText = isApproved ? "Pago Aprobado y Comprobante Digital" : "Actualización sobre tu Pago";
        const statusBadge = isApproved
          ? `<span style="background:#dcfce7;color:#15803d;padding:6px 16px;border-radius:20px;font-weight:700;font-size:14px;">APROBADO</span>`
          : `<span style="background:#fee2e2;color:#b91c1c;padding:6px 16px;border-radius:20px;font-weight:700;font-size:14px;">${status}</span>`;

        this.mailService.sendMail({
          to: entity.user.email,
          subject: `${titleText} — Nutringest`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
                <tr><td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:${isApproved ? "#059669" : "#dc2626"};padding:32px 40px;text-align:center;">
                        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                        <p style="color:#ffffff;opacity:0.9;margin:8px 0 0;font-size:14px;">Comprobante de Transacción</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px;">
                        <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Hola ${entity.user.firstName || "Usuario"}</h2>
                        <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 24px;">
                          ${isApproved ? "Tu pago ha sido verificado y procesado exitosamente. Se ha acreditado el saldo en tu billetera." : "Te informamos que tu reporte de pago no ha podido ser procesado exitosamente."}
                        </p>
                        <div style="background:#f1f5f9;border-radius:12px;padding:24px;margin:24px 0;">
                          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                            <span style="color:#64748b;font-size:14px;">Estado:</span>
                            <span>${statusBadge}</span>
                          </div>
                          <p style="color:#334155;font-size:14px;margin:8px 0;"><strong>Código Referencia:</strong> ${entity.referenceCode || entity.id}</p>
                          <p style="color:#334155;font-size:14px;margin:8px 0;"><strong>Monto:</strong> $${entity.amount} USD</p>
                          <p style="color:#334155;font-size:14px;margin:8px 0;"><strong>Descripción:</strong> ${entity.description || "Recarga de saldo Nutringest"}</p>
                          <p style="color:#334155;font-size:14px;margin:8px 0 0;"><strong>Fecha:</strong> ${new Date(entity.createdAt).toLocaleDateString("es-ES")}</p>
                        </div>
                        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                          Podés consultar tu historial de transacciones en cualquier momento ingresando a tu panel.
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
        }).catch((err) => logger.error("Error enviando comprobante de pago", err));
      }

      return this.transactionRepository.format(entity);
    } catch (error) {
      this.eventEmitter.emit(failed.action, {
        ...failed,
        metadata: { error: error },
      });
      return { error: true, object: error };
    }
  }

  // COMMON

  public async pagination({
    query,
    pwhere,
    userSession,
  }: {
    query: FilterParamsDto;
    pwhere?: TRANSACTION_WHERE[];
    userSession: User;
  }) {
    const columns = this.transactionRepository.getColumns();

    const methods = await this.paymentmethodUserRepository.findMany({
      skip: 0,
      take: 100,
      orderBy: { createdAt: "desc" },
      where: { deletedAt: null },
    });

    const form = this.transactionRepository.getFormCreate({
      paymentsMethods: methods,
    });
    const paginate = await this.getPaginate(query); // { currentPage, limit, totalPages, hasPrev, hasNext, list, total }
    const actions = await this.getActions(
      userSession?.permits?.list,
      { formCreate: form },
      "transactions",
    );

    const statusOptions = [
      { label: "common.status.PENDING", value: "PENDING" },
      { label: "common.status.SUCCESS", value: "SUCCESS" },
      { label: "common.status.FAILED", value: "FAILED" },
      { label: "common.status.CANCELED", value: "CANCELED" },
    ];

    // B. Opciones de Tipo (Datos Planos Manuales)
    const typeOptions = [
      { label: "common.type.DEPOSIT", value: "DEPOSIT" },
      { label: "common.type.WITHDRAW", value: "WITHDRAW" },
      { label: "common.type.PAYMENT", value: "PAYMENT" },
      { label: "common.type.REFUND", value: "REFUND" },
    ];

    // C. Opciones de Métodos de Pago
    const paymentMethodOptions = methods.map((method) => ({
      label: `${method.paymentMethod?.name || "Método"} ${method.isDefault ? "(Default)" : ""}`,
      value: method.id,
    }));

    const filters = this.transactionRepository.getFilters({
      statusOptions,
      typeOptions, // <--- Agregado
      paymentMethodOptions,
      query,
    });

    return {
      pageTitle: "common.transactions.index",
      actions,

      filters,

      ...paginate, // currentPage, limit, totalPages, hasPrev, hasNext, list, total

      // PARAMS TABLE
      columns: columns,
      sortParams: {
        sortBy: query && query.sortBy ? query.sortBy : "",
        sortOrder: query && query.sortOrder ? query.sortOrder : "",
      },

      currentQuery: query,
    };
  }

  public async unique({ id, userSession }: { id: string; userSession: User }) {
    const entity = await this.transactionRepository.findOne({ where: { id } });
    const actions = await this.getActions(
      userSession.permits.list,
      { formCreate: undefined },
      "subscription-plan",
    );

    // validar si existe la entity
    const where: SUBSCRIPTION_WHERE[] = [];
    where.push({ planId: id });
    where.push({ status: "ACTIVE" });
    // const internaltable = await this.subscriptionUserService.getPaginate({ }, where);

    return {
      pageTitle: `${entity.status} ${entity?.referenceCode}`,
      actions,
      object: entity,

      // subs: {...internaltable, title: 'common.subscription.active_now'}
    };
  }

  public async create({
    userSession,
    data,
  }: {
    data: TransactionCreate;
    userSession: User;
  }) {
    const prev = new DomainEvent({
      action: this.transactionRepository.EVENT_CREATED,
      userId: userSession.id,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: data,
    });
    const success = new DomainEvent({
      action: this.transactionRepository.EVENT_CREATED_SUSSCESS,
      userId: userSession.id,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: data,
    });
    const failed = new DomainEvent({
      action: this.transactionRepository.EVENT_CREATED_FAILED,
      userId: userSession.id,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: data,
    });

    const dataCreate: TRANSACTION_CREATE = {
      description: data.description,
      amount: data.amount,
      referenceCode: data.referenceCode,
      status: data.status,
      type: "DEPOSIT",
      currency: data.currency || "USD",
      originalAmount: data.originalAmount,
      originalCurrency: data.originalCurrency,
      exchangeRateUsed: data.exchangeRateUsed,
      user: { connect: { id: userSession.id } },
      paymentMethod: { connect: { id: data.paymentMethodId } },
    };

    this.eventEmitter.emit(this.transactionRepository.EVENT_CREATED, prev);
    try {
      const entityPromise = this.transactionRepository.create({
        data: dataCreate,
      });

      const entity = await entityPromise;
      this.eventEmitter.emit(
        this.transactionRepository.EVENT_CREATED_SUSSCESS,
        { ...success, payload: entity },
      );
      return this.transactionRepository.format(entity);
    } catch (error) {
      this.eventEmitter.emit(this.transactionRepository.EVENT_CREATED_FAILED, {
        ...failed,
        metadata: { error: error },
      });
      return { error: true, object: error };
    }
  }

  public async update({
    userSession,
    data,
    id,
  }: {
    data: TransactionUpdate;
    userSession: User;
    id: string;
  }) {
    const prev = new DomainEvent({
      action: this.transactionRepository.EVENT_UPDATED,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: data,
    });
    const success = new DomainEvent({
      action: this.transactionRepository.EVENT_UPDATED_SUCCESS,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: data,
    });
    const failed = new DomainEvent({
      action: this.transactionRepository.EVENT_UPDATED_FAILED,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: data,
    });

    /* valicaciones && que los datos sean correctos && que los datos no esten en uso */
    // if (!data.name) throw new Error('El nombre es obligatorio');
    // if (!data.description) throw new Error('La descripción es obligatorio');
    // if (!data.price) throw new Error('El precio es obligatorio');
    // if (!data.currency) throw new Error('La moneda es obligatorio');

    const dataCreate: TRANSACTION_UPDATE = {};

    if (data.description) dataCreate.description = data.description;
    if (data.referenceCode) dataCreate.referenceCode = data.referenceCode;
    if (data.status) dataCreate.status = data.status;

    this.eventEmitter.emit(this.transactionRepository.EVENT_UPDATED, prev);
    try {
      const entityPromise = this.transactionRepository.update({
        data: dataCreate,
        where: { id },
      });
      const entity = await entityPromise;
      this.eventEmitter.emit(
        this.transactionRepository.EVENT_UPDATED_SUCCESS,
        success,
      );
      return this.transactionRepository.format(entity);
    } catch (error) {
      this.eventEmitter.emit(this.transactionRepository.EVENT_UPDATED_FAILED, {
        ...failed,
        metadata: { error: error },
      });
      return { error: true, object: error };
    }
  }

  public async delete({ userSession, id }: { id: string; userSession: User }) {
    const prev = new DomainEvent({
      action: this.transactionRepository.EVENT_DELETED,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: id,
    });
    const success = new DomainEvent({
      action: this.transactionRepository.EVENT_DELETED_SUCCESS,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: id,
    });
    const failed = new DomainEvent({
      action: this.transactionRepository.EVENT_DELETED_FAILED,
      entityName: this.transactionRepository.MODEL_NAME,
      payload: id,
    });

    this.eventEmitter.emit(this.transactionRepository.EVENT_DELETED, prev);
    try {
      const entityPromise = this.transactionRepository.delete({
        where: { id },
      });
      const entity = await entityPromise;
      this.eventEmitter.emit(
        this.transactionRepository.EVENT_DELETED_SUCCESS,
        success,
      );
      return this.transactionRepository.format(entity);
    } catch (error) {
      this.eventEmitter.emit(this.transactionRepository.EVENT_DELETED_FAILED, {
        ...failed,
        metadata: { error: error },
      });
      return { error: true, object: error };
    }
  }

  /**
   * Lógica de filtrado y paginación para Transacciones
   */
  private async getPaginate(query: FilterParamsDto, pwhere?: any[]) {
    // 1. Desestructurar DTO
    const {
      q,
      status, // TransactionStatus
      type, // TransactionType
      paymentMethodId,
      createdAt_gte,
      createdAt_lte,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;

    // 2. Construcción del WHERE
    const where: any[] = [];

    // A. Filtros forzados (ej: ver solo mis transacciones)
    if (pwhere) pwhere.forEach((wh) => where.push(wh));

    // B. Base
    where.push({ deletedAt: null });

    // C. Búsqueda Global (q)
    if (q) {
      where.push({
        OR: [
          { referenceCode: { contains: q, mode: "insensitive" } }, // Código referencia
          { user: { email: { contains: q, mode: "insensitive" } } }, // Email usuario
          { user: { username: { contains: q, mode: "insensitive" } } }, // Username
          // También podrías buscar por descripción si lo deseas
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    // D. Filtros Específicos
    if (status) where.push({ status: status });
    if (type) where.push({ type: type });
    if (paymentMethodId) where.push({ paymentMethodId: paymentMethodId });

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
      this.transactionRepository.findMany({
        where: whereClause,
        skip: Number(skip),
        take: Number(limit),
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          paymentMethod: {
            include: { paymentMethod: true }, // Para ver el logo/nombre del método real
          },
        },
      }),
      this.transactionRepository.count({
        where: whereClause,
      }),
    ]);

    // 5. Resultados
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

  // private async getPaginate(query: FilterParamsDto, pwhere?: TRANSACTION_WHERE[]) {
  //   // const { sortBy, sortOrder } = query;

  //   const limit = query && query.limit ? Number(query.limit) : 10;
  //   const page = query && query.page ? Number(query.page) : 1;

  //   const where: TRANSACTION_WHERE[] = []
  //   if (pwhere) pwhere.forEach(wh => where.push(wh));

  //   where.push({ deletedAt: null });
  //   // where.push({ user: { deletedAt: null } });
  //   // where.push({ permits: { id: { not: this.permitRepository.SUPERADMIN } } });

  //   const currentPage = page && page > 0 ? page : 1;
  //   const skip = (currentPage - 1) * limit;

  //   const listPromise = this.transactionRepository.findMany({
  //     where: { AND: where },
  //     skip,
  //     take: limit,
  //     orderBy: {
  //       // [sortBy as keyof TRANSACTION_ORDER]: sortOrder,
  //     },
  //   });
  //   const totalPromise = this.transactionRepository.count({
  //     where: { AND: where },
  //   });
  //   const list = await listPromise;
  //   const total = await totalPromise;
  //   const totalRecords = total;
  //   const totalPages = Math.ceil(totalRecords / limit);
  //   // ¿Hay una página anterior? Sí, si la página actual es mayor a 1.
  //   const hasPrev = currentPage > 1;
  //   // ¿Hay una página siguiente? Sí, si la página actual es menor que el total de páginas.
  //   const hasNext = currentPage < totalPages;

  //   return { list, total, totalRecords, totalPages, currentPage, limit, hasPrev, hasNext };
  // }

  async getActions(
    permitList: string[],
    form: {
      formCreate?: Form;
      formUpdate?: Form;
      formPassword?: Form;
      formUpdateStatus?: Form;
    },
    object: string,
  ) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
      password: null,
      status: null,
    };

    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_TRANSACTION,
      ) ||
      permitList.includes(this.permitRepository.TRANSACTION_LIST)
    )
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/transactions",
        action: "redirect",
      };
    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_TRANSACTION,
      ) ||
      permitList.includes(this.permitRepository.TRANSACTION_UNIQUE)
    )
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/transactions/:id",
      };
    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_TRANSACTION,
      ) ||
      permitList.includes(this.permitRepository.TRANSACTION_CREATED)
    )
      actions.create = {
        form: form.formCreate,
        key: "transaction-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/transactions/form/create",
        action: "modal",
      };
    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_TRANSACTION,
      ) ||
      permitList.includes(this.permitRepository.TRANSACTION_UPDATE)
    )
      actions.update = {
        form: form.formUpdate,
        key: "transaction-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/transactions/form/update",
        action: "modal",
      };
    if (
      permitList.includes(
        this.permitRepository.MY_CURRENT_ACTION_TRANSACTION,
      ) ||
      permitList.includes(this.permitRepository.TRANSACTION_DELETE)
    )
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/transactions/:id/delete",
        action: "modal",
      };

    if (permitList.includes(this.permitRepository.TRANSACTION_UPDATE))
      actions.status = {
        label: "common.actions.status",
        icon: "card",
        link: "/transactions/form/status",
        form: form.formUpdateStatus,
        key: "transaction-update-status-key-modal",
        action: "modal",
      };

    return actions;
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
