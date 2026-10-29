// wallet/wallet-analitics.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma"; // Usando el import que especificaste
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { User } from "src/shared/types/schema.types"; // Importamos Prisma y User
import {
  WalletSummaryCard,
  LatestTransaction,
  BalanceRangeDistribution,
} from "../dto/wallet-analytics.dto"; // Asumo que creaste este DTO/Interface
import { Prisma } from "@prisma/client";
import { RenderPieChart } from "src/shared/types/dashboard.type";
import { Column, DefTable } from "src/shared/types/table/table.type";

@Injectable()
export default class WalletAnaliticsService {
  constructor(
    private prisma: PrismaService,
    private permitRepository: PermitReporitory,
    private readonly i18n: I18nService,
  ) {}

  /**
   * 💰 Obtiene el resumen de totales de billeteras (Cards).
   * @param lang Idioma para la traducción.
   */
  private async getWalletSummary(lang: string, organizationId?: string | null): Promise<WalletSummaryCard> {
    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    let totalWallets: number;
    let totalBalance: Prisma.Decimal;

    if (organizationId) {
      // Obtener billeteras de usuarios de la organización
      const orgUserIds = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
        },
        select: { userId: true },
      });

      const userIds = orgUserIds.map((m) => m.userId);

      totalWallets = await this.prisma.userWallet.count({
        where: {
          userId: { in: userIds },
          deletedAt: null,
        },
      });

      const balanceResult = await this.prisma.userWallet.aggregate({
        _sum: { balance: true },
        where: {
          userId: { in: userIds },
          deletedAt: null,
        },
      });

      totalBalance = balanceResult._sum.balance || new Prisma.Decimal(0);
    } else {
      totalWallets = await this.prisma.userWallet.count({
        where: { deletedAt: null },
      });

      const balanceResult = await this.prisma.userWallet.aggregate({
        _sum: { balance: true },
        where: { deletedAt: null },
      });

      totalBalance = balanceResult._sum.balance || new Prisma.Decimal(0);
    }

    // Mapear al formato de CustomCard
    return {
      totalWallets: {
        color: "blue",
        title: this.i18n.translate("common.wallet.total_wallets", lang),
        icon: "wallet-fill",
        value: totalWallets,
      },
      totalBalance: {
        color: "green",
        title: this.i18n.translate("common.wallet.total_balance", lang),
        icon: "cash-stack",
        value: totalBalance,
      },
    };
  }

  /**
   * 📊 Clasifica las billeteras por rangos de saldo.
   * Uso: Gráfico de barras.
   */
  private async getBalanceRangeDistribution(organizationId?: string | null): Promise<RenderPieChart> {
    const ranges = [
      { label: "$0", min: 0, max: 0 },
      { label: "$0.01 - $100", min: 0.01, max: 100 },
      { label: "$100.01 - $1000", min: 100.01, max: 1000 },
      { label: ">$1000", min: 1000.01, max: Infinity },
    ];

    const results: BalanceRangeDistribution[] = [];

    // Obtener userIds de la organización si aplica
    let userIds: string[] | null = null;
    if (organizationId) {
      const orgUserIds = await this.prisma.organizationMember.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
        },
        select: { userId: true },
      });
      userIds = orgUserIds.map((m) => m.userId);
    }

    // Ejecución de conteo para cada rango
    for (const range of ranges) {
      let count;

      // Lógica para rangos (mayor que o entre)
      const balanceFilter =
        range.max === Infinity
          ? { gt: new Prisma.Decimal(range.min) }
          : {
              gte: new Prisma.Decimal(range.min),
              lte: new Prisma.Decimal(range.max),
            };

      const whereClause: any = {
        balance: balanceFilter,
        deletedAt: null,
      };

      if (userIds) {
        whereClause.userId = { in: userIds };
      }

      count = await this.prisma.userWallet.count({
        where: whereClause,
      });

      results.push({
        label: range.label,
        value: count,
      });
    }

    return {
      keyLabel: "label",
      keyValue: "value",
      title: "Distribución de Saldo",
      id: "distributionChart",
      data: results,
    };
  }

  /**
   * 🔀 Obtiene los últimos depósitos y retiros.
   * Uso: Tablas de actividad reciente de la billetera.
   */
  private async getLatestTransactions(limit: number = 5, organizationId?: string | null): Promise<DefTable> {
    // Filtro base para组织
    const orgFilter = organizationId ? { organizationId } : {};

    const where: Prisma.TransactionWhereInput = {
      type: { in: ["DEPOSIT", "WITHDRAW", "PAYMENT"] },
      deletedAt: null,
      ...orgFilter,
    };

    const latestTx = await this.prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        referenceCode: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      take: limit,
    });

    const total = latestTx.length;

    const list = latestTx.map((tx) => ({
      id: tx.id,
      type: tx.type as LatestTransaction["type"],
      amount: tx.amount,
      referenceCode: tx.referenceCode,
      createdAt: tx.createdAt,
      userFullName: `${tx.user.firstName} ${tx.user.lastName}` || "N/A",
    }));

    const columns: Column[] = [
      { field: "type", label: "form.labels.type" },
      { field: "amount", label: "form.labels.amount" },
      { field: "referenceCode", label: "form.labels.referenceCode" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
      {
        field: "userFullName",
        label: "form.labels.userFullName",
        formatter: "date",
      },
    ];

    return {
      title: "common.wallet.last_payments",
      total,
      list,
      columns,
      limit,
    };
  }

  // ----------------------------------------------------------------
  // MÉTODO INDEX PRINCIPAL
  // ----------------------------------------------------------------

  /**
   * 📊 Método principal que ejecuta las analíticas de billeteras según los permisos.
   */
  async index(userSession: User, lang: string, organizationId?: string | null): Promise<Record<string, any>> {
    const userPermits = userSession.permits.list;
    const promiseList: Promise<any>[] = [];
    const keyMap: string[] = [];

    // 1. Resumen y Distribución de Saldo (ANALYTICS_WALLET_SUMMARY)
    if (userPermits.includes(this.permitRepository.ANALYTICS_WALLET_SUMMARY)) {
      promiseList.push(
        Promise.all([
          this.getWalletSummary(lang, organizationId),
          this.getBalanceRangeDistribution(organizationId),
        ]),
      );
      keyMap.push(this.permitRepository.ANALYTICS_WALLET_SUMMARY);
    }

    // 2. Últimas Transacciones (ANALYTICS_WALLET_TRANSACTIONS)
    if (
      userPermits.includes(this.permitRepository.ANALYTICS_WALLET_TRANSACTIONS)
    ) {
      promiseList.push(this.getLatestTransactions(5, organizationId));
      keyMap.push(this.permitRepository.ANALYTICS_WALLET_TRANSACTIONS);
    }

    // 3. Ejecutar todas las promesas en paralelo
    const results = await Promise.all(promiseList);

    // 4. Mapear y estructurar el resultado final
    const finalData: Record<string, any> = {};
    let resultIndex = 0;

    if (keyMap.includes(this.permitRepository.ANALYTICS_WALLET_SUMMARY)) {
      const [summary, distribution] = results[resultIndex++];
      finalData[this.permitRepository.ANALYTICS_WALLET_SUMMARY] = {
        summary,
        distribution,
      };
    }

    if (keyMap.includes(this.permitRepository.ANALYTICS_WALLET_TRANSACTIONS)) {
      finalData[this.permitRepository.ANALYTICS_WALLET_TRANSACTIONS] =
        results[resultIndex++];
    }

    return finalData;
  }
}
