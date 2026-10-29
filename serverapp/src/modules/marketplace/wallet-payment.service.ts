import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ReportPaymentDto } from './dto/report-payment.dto';

@Injectable()
export class WalletPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async reportPayment(userId: string, dto: ReportPaymentDto) {
    return this.prisma.walletPayment.create({
      data: {
        userId,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        proofUrl: dto.proofUrl,
        note: dto.note,
      },
    });
  }

  async getMyPayments(userId: string) {
    return this.prisma.walletPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.userWallet.findFirst({ where: { userId } });
    if (!wallet) {
      // Crear wallet si no existe
      const newWallet = await this.prisma.userWallet.create({
        data: { userId, balance: 0, currency: 'USD' },
      });
      return { balance: Number(newWallet.balance), currency: newWallet.currency };
    }
    return { balance: Number(wallet.balance), currency: wallet.currency };
  }

  async findAllPending() {
    return this.prisma.walletPayment.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.walletPayment.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, adminId: string, reviewNote?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Reclamo atómico: sólo una llamada puede pasar el pago de PENDING a APPROVED.
      const claim = await tx.walletPayment.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote,
        },
      });

      if (claim.count === 0) {
        const existing = await tx.walletPayment.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Pago no encontrado');
        throw new BadRequestException('El pago ya fue procesado');
      }

      const payment = await tx.walletPayment.findUnique({ where: { id } });
      if (!payment) throw new NotFoundException('Pago no encontrado');
      const wallet = await tx.userWallet.findFirst({
        where: { userId: payment.userId, deletedAt: null },
      });
      if (!wallet) throw new BadRequestException('El usuario no tiene wallet');

      await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: payment.amount } },
      });

      await tx.financialAuditLog.create({
        data: {
          action: "WALLET_PAYMENT_APPROVED",
          entityType: "WalletPayment",
          entityId: id,
          actorId: adminId,
          amount: payment.amount,
        },
      });

      return payment;
    });
  }

  async reject(id: string, adminId: string, reviewNote?: string) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.walletPayment.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote,
        },
      });

      if (claim.count === 0) {
        const existing = await tx.walletPayment.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Pago no encontrado');
        throw new BadRequestException('El pago ya fue procesado');
      }

      await tx.financialAuditLog.create({
        data: {
          action: "WALLET_PAYMENT_REJECTED",
          entityType: "WalletPayment",
          entityId: id,
          actorId: adminId,
        },
      });

      return tx.walletPayment.findUnique({ where: { id } });
    });
  }
}
