import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client"; // Import Prisma types
import PermitReporitory from "../permit/repository/permit.repository";
import { Actions } from "src/shared/types/dashboard.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import { User, UserStatus, UserWallet } from "src/shared/types/schema.types";
import {
  Form,
  FormInput,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import { I18nService } from "src/shared/lang/i18n.service";
import WalletReporitory from "./repository/wallet.repository";
import {
  WALLET_ORDER,
  WALLET_WHERE,
  WALLET_WHERE_UNIQUE,
} from "./dto/wallet.type";
import { PrismaService } from "nestjs-prisma";
import { ExchangeService } from "../exchange/exchange.service";
import { writeFinancialAudit } from "src/shared/helpers/audit-log";

@Injectable()
export class WalletService {
  constructor(
    private walletRepository: WalletReporitory,
    private permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
    private readonly prisma: PrismaService,
    private readonly exchangeService: ExchangeService,
  ) { }

  async getPaginate(query: FilterParamsDto) {
    // const { sortBy, sortOrder } = query;

    const limit = query && query.limit ? Number(query.limit) : 10;
    const page = query && query.page ? Number(query.page) : 1;

    const where: WALLET_WHERE[] = [];

    where.push({ deletedAt: null });
    where.push({ user: { deletedAt: null } });

    const currentPage = page && page > 0 ? page : 1;
    const skip = (currentPage - 1) * limit;

    const listPromise = this.walletRepository.findMany({
      where: { AND: where },
      skip,
      take: limit,
      orderBy: {
        // [sortBy as keyof WALLET_ORDER]: sortOrder,
      },
    });
    const totalPromise = this.walletRepository.count({
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

  async findOneById(id: string) {
    const entity = await this.walletRepository.findOne({ where: { id } });
    return entity;
  }

  async deleteWallet(where: { id: string }) {
    return this.walletRepository.delete({ where });
  }

  async updateWallet(id: string, balance: number, actorId?: string | null) {
    const updated = await this.walletRepository.update({
      where: { id },
      data: { balance },
    });

    await writeFinancialAudit(this.prisma, {
      action: "WALLET_BALANCE_SET",
      entityType: "UserWallet",
      entityId: id,
      actorId: actorId ?? null,
      amount: balance,
    });

    return updated;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: WALLET_WHERE_UNIQUE;
    where?: WALLET_WHERE;
    orderBy?: WALLET_ORDER;
  }): Promise<UserWallet[]> {
    // Exclude password
    const { skip, take, cursor, where, orderBy } = params;
    const entites = await this.walletRepository.findMany({
      skip: skip ? skip : 0,
      take: take ? Number(take) : 10,
      where: where ? where : {},
      orderBy: orderBy ? orderBy : {},
    });
    return entites;
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

    if (permitList.includes(this.permitRepository.USER_WALLET_LIST))
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/wallets",
        action: "redirect",
      };
    if (permitList.includes(this.permitRepository.USER_WALLET_UNIQUE))
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/wallets/:id",
      };
    // if (permitList.includes(this.permitRepository.USER_WALLET_CREATED)) actions.create = { key: 'user-create-key-modal', label: 'common.actions.create', icon: 'plus', link: '/api/user/form/create', action: 'modal', form: form.formCreate };
    // if (permitList.includes(this.permitRepository.USER_WALLET_UPDATE)) actions.update = { key: 'user-update-key-modal', label: 'common.actions.update', icon: 'edit', link: '/api/user/form/update', action: 'modal', form: form.formUpdate };
    // if (permitList.includes(this.permitRepository.USER_WALLET_DELETE)) actions.delete = { label: 'common.actions.delete', icon: 'trash', link: '/api/user/:id/delete', action: 'modal' };

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

  /**
   * Find wallet by user ID.
   */
  async findByUserId(userId: string) {
    return this.prisma.userWallet.findUnique({
      where: { userId },
    });
  }

  /**
   * Get wallet balance with real-time VES conversion.
   */
  async getBalanceWithConversion(userId: string) {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      return { balance: 0, balanceVES: 0, rate: 0, currency: 'USD' };
    }

    const rate = await this.exchangeService.getBcvRate();
    const balance = Number(wallet.balance);
    const balanceVES = balance * rate;

    return {
      balance,
      balanceVES,
      rate,
      currency: wallet.currency,
    };
  }

  /**
   * Deduct balance from wallet (USD).
   * Usa un UPDATE condicional atómico para evitar double-spending por concurrencia.
   */
  async deductBalance(walletId: string, amountUsd: number) {
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      throw new BadRequestException("El monto a deducir debe ser mayor a 0");
    }

    const result = await this.prisma.userWallet.updateMany({
      where: { id: walletId, deletedAt: null, balance: { gte: amountUsd } },
      data: { balance: { decrement: amountUsd } },
    });

    if (result.count === 0) {
      const wallet = await this.prisma.userWallet.findUnique({
        where: { id: walletId },
      });
      if (!wallet) throw new NotFoundException("Wallet not found");
      throw new BadRequestException("Insufficient balance");
    }

    return this.prisma.userWallet.findUnique({ where: { id: walletId } });
  }

  /**
   * Deduct balance in VES from wallet.
   * Usa un UPDATE condicional atómico para evitar double-spending por concurrencia.
   */
  async deductBalanceVES(walletId: string, amountVes: number) {
    if (!Number.isFinite(amountVes) || amountVes <= 0) {
      throw new BadRequestException("El monto a deducir debe ser mayor a 0");
    }

    const result = await this.prisma.userWallet.updateMany({
      where: { id: walletId, deletedAt: null, balanceVES: { gte: amountVes } },
      data: { balanceVES: { decrement: amountVes } },
    });

    if (result.count === 0) {
      const wallet = await this.prisma.userWallet.findUnique({
        where: { id: walletId },
      });
      if (!wallet) throw new NotFoundException("Wallet not found");
      throw new BadRequestException("Insufficient VES balance");
    }

    return this.prisma.userWallet.findUnique({ where: { id: walletId } });
  }
}
