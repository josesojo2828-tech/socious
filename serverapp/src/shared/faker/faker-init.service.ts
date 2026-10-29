import { Injectable } from "@nestjs/common";
import { faker } from "@faker-js/faker";
import { UserStatus, Prisma, SubscriptionStatus } from "@prisma/client";

// Servicios y Repositorios
import { UserService } from "src/modules/user/services/user.service";
import { LoggerService } from "../logger/logger.service";
import PaymentMethodReporitory from "src/modules/payment-method/repository/payment-method.repository";
import SubscriptionPlanReporitory from "src/modules/subscription/repository/subscription-plan.repository";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { UserPaymentMethodService } from "src/modules/user/services/user-payment-method.service";
import SubscriptionReporitory from "src/modules/user/repository/subscription.repository";
import { CreateUserDto } from "src/modules/user/dto/user.types";

interface FakerConfig {
  userCount: number;
  paymentsByUser: number;
  historyCount: number; // Cantidad de suscripciones pasadas
}

@Injectable()
export class FakerInitService {
  constructor(
    private readonly userService: UserService,
    private readonly userPaymentMethodService: UserPaymentMethodService,

    // Repositorios directos para cosas que no requieren mucha lógica de negocio
    private readonly paymentMethodRepository: PaymentMethodReporitory,
    private readonly subscriptionPlanRepository: SubscriptionPlanReporitory,
    private readonly permitRepository: PermitReporitory,
    private readonly subscriptionRepository: SubscriptionReporitory,

    private readonly logger: LoggerService,
  ) {}

  public async pipeline(config: FakerConfig) {
    this.logger.logInfo(
      `Iniciando Faker Pipeline: ${config.userCount} usuarios`,
    );

    // 1. PRE-CARGA: Obtener IDs necesarios para relaciones
    // Asumimos que ya corriste los fixtures básicos y existen estos datos
    const permits = await this.permitRepository.findMany({
      skip: 0,
      take: 10,
      where: { deletedAt: null },
    });
    const plans = await this.subscriptionPlanRepository.findMany({
      skip: 0,
      take: 10,
      where: { deletedAt: null },
    });
    const basePaymentMethods = await this.paymentMethodRepository.findMany({
      skip: 0,
      take: 10,
      where: { deletedAt: null },
    });

    if (
      permits.length === 0 ||
      plans.length === 0 ||
      basePaymentMethods.length === 0
    ) {
      this.logger.error(
        "Faltan datos base (Permisos, Planes o Métodos de Pago). Corre los fixtures primero.",
      );
      return;
    }

    // Filtramos para usar solo el permiso de 'USUARIO' (asumiendo que no es el primero, ajusta según tu lógica)
    // Si no tienes lógica de nombres, usamos el primero que encuentre.
    const userPermitId =
      permits.find((p) => p.name.toUpperCase().includes("USER"))?.id ||
      permits[0].id;

    // 2. BUCLE DE CREACIÓN DE USUARIOS
    for (let i = 0; i < config.userCount; i++) {
      try {
        // A. Crear Usuario
        const sex = faker.person.sexType();
        const firstName = faker.person.firstName(sex);
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName });
        const username =
          faker.internet.username({ firstName, lastName }) +
          `_${faker.string.numeric(3)}`;

        // Usamos el DTO esperado por tu UserService
        const userDto: CreateUserDto = {
          firstName,
          lastName,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password: "abc.12345", // El servicio se encargará del hash
          permitId: userPermitId,
          passwordConfirm: "abc.12345", // El servicio se encargará del hash
          status: UserStatus.ACTIVE, // Si tu DTO lo permite
        };

        // Llamamos al servicio (esto crea wallet y suscripción free automáticamente)
        const user = await this.userService.createUser(userDto);
        this.logger.logInfo(
          `Usuario creado: ${user.username} (${i + 1}/${config.userCount})`,
        );

        // B. Crear Métodos de Pago del Usuario
        await this.createFakePaymentMethods(
          user.id,
          basePaymentMethods,
          config.paymentsByUser,
        );

        // C. Crear Historial de Suscripciones (Pasadas)
        await this.createSubscriptionHistory(
          user.id,
          plans,
          config.historyCount,
        );
      } catch (error) {
        this.logger.logError(`Error creando usuario faker ${i}`, error);
        // Continuamos con el siguiente aunque este falle
      }
    }

    this.logger.logInfo("Faker Pipeline Finalizado con éxito.");
  }

  /**
   * Genera métodos de pago asociados al usuario
   */
  private async createFakePaymentMethods(
    userId: string,
    baseMethods: any[],
    count: number,
  ) {
    for (let j = 0; j < count; j++) {
      // Elegir un método base al azar (Tarjeta, Paypal, etc)
      const baseMethod = faker.helpers.arrayElement(baseMethods);

      let details = {};

      // Generar detalles realistas según el código del método
      if (baseMethod.code === "CARD") {
        details = {
          last4: faker.finance.creditCardNumber("####"),
          brand: faker.finance.creditCardIssuer(),
          expMonth: faker.number.int({ min: 1, max: 12 }),
          expYear: faker.number.int({ min: 2025, max: 2030 }),
        };
      } else if (baseMethod.code === "PAYPAL") {
        details = { email: faker.internet.email({ provider: "paypal.com" }) };
      } else {
        details = { info: "Fake account info" };
      }

      await this.userPaymentMethodService.create({
        userId,
        paymentMethodId: baseMethod.id,
        details: details,
        isDefault: j === 0, // El primero es default
        active: true,
      });
    }
  }

  /**
   * Genera historial de suscripciones pasadas para simular antigüedad
   */
  private async createSubscriptionHistory(
    userId: string,
    plans: any[],
    count: number,
  ) {
    // Ordenamos planes para variar, o elegimos random

    for (let k = 0; k < count; k++) {
      const plan = faker.helpers.arrayElement(plans);

      // Fechas en el pasado
      const daysAgoStart = (k + 1) * 60; // Hace 2 meses, 4 meses, etc.
      const startDate = faker.date.recent({
        days: 30,
        refDate: new Date(Date.now() - daysAgoStart * 24 * 60 * 60 * 1000),
      });
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1); // Duró 1 mes

      // Status: Generalmente EXPIRED o CANCELED para historial
      const status = faker.helpers.arrayElement([
        SubscriptionStatus.EXPIRED,
        SubscriptionStatus.CANCELED,
      ]);

      // Creamos directamente con el repositorio para saltarnos validaciones de "Suscripción activa única" del servicio
      // ya que queremos inyectar historia.
      await this.subscriptionRepository.create({
        data: {
          user: { connect: { id: userId } },
          plan: { connect: { id: plan.id } },
          startDate: startDate,
          endDate: endDate,
          status: status,
          autoRenew: false,
        } as any,
      });
    }
  }
}
