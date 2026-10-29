import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";

@Injectable()
export class AutorenewSubscriptionService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onApplicationBootstrap() {
    this.logger.log("Inicializando AutorenewSubscriptionService scheduler...");
    // Ejecutar inmediatamente al iniciar
    this.pipeline().catch((err) => {
      this.logger.error("Error ejecutando el pipeline de autorenovación en el inicio:", err);
    });

    // Ejecutar cada 6 horas (21600000 ms)
    setInterval(() => {
      this.logger.log("Ejecutando pipeline programado de autorenovación...");
      this.pipeline().catch((err) => {
        this.logger.error("Error en ejecución programada de autorenovación:", err);
      });
    }, 6 * 60 * 60 * 1000);
  }

  async pipeline() {
    // await this.prisma.subscription.updateMany({ where: { status: 'CANCELED' }, data: { status: 'ACTIVE', autoRenew: true } });

    // await this.prisma.subscription.update({
    //     where:{id:'0b5390a1-465f-49be-ac57-4068544ff216'},
    //     data: {
    //         status: 'ACTIVE',
    //         autoRenew: false,
    //         endDate: new Date(),
    //         startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
    //     }
    // });

    // await this.prisma.subscription.update({
    //     where:{id:'9cf301c9-6a94-4f52-b19b-228045d8d1d0'},
    //     data: {
    //         status: 'ACTIVE',
    //         autoRenew: true,
    //         endDate: new Date(),
    //         startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
    //     }
    // });

    const entities = await this.getSubscriptionDeclied();
    const date = new Date();
    this.logger.log(
      `Subscripciones vencidas: [${entities.total}] suscripciones ${date.toLocaleString()}`,
    );

    this.logger.log(`CANCELANDO SUBSCRIPCIONES SIN AUTORENEW`);
    await this.cancel(entities.notRenew.map((entity) => entity.id));

    this.logger.log(`RENOVANDO SUBSCRIPCIONES`);
    await this.renewSubscriptionNextAndUpdate(entities.renew);

    return entities;
  }

  async renewSubscriptionNextAndUpdate(list: any[]) {
    const listPromise: any[] = [];
    list.forEach(async (item) => {
      const entity = await this.prisma.subscription.findFirst({
        where: { AND: [{ userId: item.userId }, { status: "NEXT" }] },
      });
      if (entity) {
        listPromise.push(this.renew([entity.id]));
      }
      listPromise.push(this.cancel([item.id]));
    });

    const listEntity = await Promise.all(listPromise);
    return { listEntity };
  }

  async cancel(list: string[]) {
    const subs = await this.prisma.subscription.findMany({
      where: { id: { in: list } },
    });
    const response = await this.prisma.subscription.updateMany({
      where: { id: { in: list } },
      data: { status: "DECLINED" },
    });
    for (const sub of subs) {
      this.eventEmitter.emit('subscription.expired', {
        userId: sub.userId,
        organizationId: sub.organizationId,
      });
    }
    return response;
  }

  async renew(list: string[]) {
    const subs = await this.prisma.subscription.findMany({
      where: { id: { in: list } },
    });
    const response = await this.prisma.subscription.updateMany({
      where: { id: { in: list } },
      data: {
        status: "ACTIVE",
        autoRenew: true,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      },
    });
    for (const sub of subs) {
      this.eventEmitter.emit('subscription.activated', {
        userId: sub.userId,
        organizationId: sub.organizationId,
      });
    }
    return response;
  }

  async getSubscriptionDeclied() {
    const whereAutoRenew: Prisma.SubscriptionWhereInput = {
      AND: [
        { status: "ACTIVE" },
        { endDate: { lt: new Date() } },
        { autoRenew: true },
      ],
    };
    const whereNotRenew: Prisma.SubscriptionWhereInput = {
      AND: [
        { status: "ACTIVE" },
        { endDate: { lt: new Date() } },
        { autoRenew: false },
      ],
    };

    const entityRenewPromise = this.prisma.subscription.findMany({
      where: whereAutoRenew,
      include: { plan: true, user: true },
    });
    const entityNotRenewPromise = this.prisma.subscription.findMany({
      where: whereNotRenew,
      include: { plan: true, user: true },
    });

    const countRenewPromise = this.prisma.subscription.count({
      where: whereAutoRenew,
    });
    const countNotRenewPromise = this.prisma.subscription.count({
      where: whereNotRenew,
    });

    const [renew, notRenew, totalRenew, totalNotRenew] = await Promise.all([
      entityRenewPromise,
      entityNotRenewPromise,
      countRenewPromise,
      countNotRenewPromise,
    ]);

    this.logger.log(
      `Total renew: ${totalRenew} | Total not renew: ${totalNotRenew}`,
    );
    this.logger.log(`Total: ${totalRenew + totalNotRenew}`);

    return {
      renew,
      notRenew,
      total: totalRenew + totalNotRenew,
      totalRenew,
      totalNotRenew,
    };
  }
}
