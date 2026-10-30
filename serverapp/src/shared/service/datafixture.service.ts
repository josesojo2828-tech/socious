import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import SubscriptionPlanReporitory from "src/modules/subscription/repository/subscription-plan.repository";
import UserReporitory from "src/modules/user/repository/user.repository";
import * as bcrypt from "bcrypt";
import PaymentMethodReporitory from "src/modules/payment-method/repository/payment-method.repository";
import CmsRepository from "src/modules/cms/repository/cms.repository";
import { PrismaService } from "nestjs-prisma";
import { seedPlans } from "src/database/seeds/plans.seed";

@Injectable()
export class DataFixtureService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DataFixtureService.name);

  constructor(
    private readonly userRepository: UserReporitory,
    private readonly subscriptionRepository: SubscriptionPlanReporitory,
    private readonly permitRepository: PermitReporitory,
    private readonly paymentMethodRepository: PaymentMethodReporitory,
    private readonly cmsRepository: CmsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.loadFixtures();
      this.logger.log("Data fixtures loaded successfully");
    } catch (error) {
      this.logger.error("Failed to load data fixtures", error);
    }
  }

  async loadFixtures() {
    const { superadmin, admin, user, patient } =
      (await this.loadPermitsFixtures()) as any;
    const fixUser = await this.loadUsersFixtures(superadmin.id);
    const fixSubscriptionPlans = await this.loadSubscriptionPlansFixtures();
    const fixPaymentMethods = await this.loadPaymentMethodsFixtures();
    const fixCms = await this.loadCorporateContentFixtures();
    const fixOrganization = fixUser
      ? await this.loadOrganizationFixture(fixUser.id)
      : null;

    // Plans (S9): must exist before any organization is created, because
    // organization creation subscribes the owner to the default plan.
    await seedPlans(this.prisma, {
      log: (message) => this.logger.log(message.trim()),
    });

    return {
      subscription: { superadmin, admin, user, patient },
      fixUser,
      fixSubscriptionPlans,
      fixPaymentMethods,
      fixCms,
      fixOrganization,
    };
  }

  /**
   * Bootstrap tenant (Socius ERP).
   *
   * Every tenant-scoped surface needs an organization to resolve, and the DB
   * integration suites need at least one Organization + User + active AddOn to
   * run. Upsert-based and idempotent, like the rest of this loader, so a boot
   * never duplicates or clobbers it.
   */
  async loadOrganizationFixture(superadminId: string) {
    const organization = await this.prisma.organization.upsert({
      where: { slug: "socius-demo" },
      create: {
        name: "Socius Demo",
        slug: "socius-demo",
        status: "ACTIVE",
        defaultCurrency: "USD",
        currencyVisibility: { showUSD: true, showVES: true, showUSDT: true },
      },
      update: {
        name: "Socius Demo",
        status: "ACTIVE",
      },
    });

    const member = await this.prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: superadminId,
        },
      },
      create: {
        organizationId: organization.id,
        userId: superadminId,
        role: "OWNER",
        status: "ACTIVE",
      },
      update: {
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    const branchCount = await this.prisma.branch.count({
      where: { organizationId: organization.id, isDefault: true },
    });
    if (branchCount === 0) {
      await this.prisma.branch.create({
        data: {
          organizationId: organization.id,
          name: "Principal",
          isDefault: true,
        },
      });
    }

    return { organization, member };
  }

  async loadPermitsFixtures() {
    const superadmin = await this.permitRepository.upsert({
      create: {
        id: this.permitRepository.PermitSuperAdmin.name,
        name: this.permitRepository.PermitSuperAdmin.name,
        description: this.permitRepository.PermitSuperAdmin.description,
        list: this.permitRepository.PermitSuperAdmin.list,
      },
      update: {
        name: this.permitRepository.PermitSuperAdmin.name,
        description: this.permitRepository.PermitSuperAdmin.description,
        list: this.permitRepository.PermitSuperAdmin.list,
      },
      where: { id: this.permitRepository.PermitSuperAdmin.name },
    });

    const admin = await this.permitRepository.upsert({
      create: {
        id: this.permitRepository.PermitAdmin.name,
        name: this.permitRepository.PermitAdmin.name,
        description: this.permitRepository.PermitAdmin.description,
        list: this.permitRepository.PermitAdmin.list,
      },
      update: {
        name: this.permitRepository.PermitAdmin.name,
        description: this.permitRepository.PermitAdmin.description,
        list: this.permitRepository.PermitAdmin.list,
      },
      where: { id: this.permitRepository.PermitAdmin.name },
    });

    const user = await this.permitRepository.upsert({
      create: {
        id: this.permitRepository.PermitUser.name,
        name: this.permitRepository.PermitUser.name,
        description: this.permitRepository.PermitUser.description,
        list: this.permitRepository.PermitUser.list,
      },
      update: {
        name: this.permitRepository.PermitUser.name,
        description: this.permitRepository.PermitUser.description,
        list: this.permitRepository.PermitUser.list,
      },
      where: { id: this.permitRepository.PermitUser.name },
    });

    const patient = await this.permitRepository.upsert({
      create: {
        id: this.permitRepository.PermitPatient.name,
        name: this.permitRepository.PermitPatient.name,
        description: this.permitRepository.PermitPatient.description,
        list: this.permitRepository.PermitPatient.list,
      },
      update: {
        name: this.permitRepository.PermitPatient.name,
        description: this.permitRepository.PermitPatient.description,
        list: this.permitRepository.PermitPatient.list,
      },
      where: { id: this.permitRepository.PermitPatient.name },
    });

    const clinic = await this.permitRepository.upsert({
      create: {
        id: this.permitRepository.PermitClinic.name,
        name: this.permitRepository.PermitClinic.name,
        description: this.permitRepository.PermitClinic.description,
        list: this.permitRepository.PermitClinic.list,
      },
      update: {
        name: this.permitRepository.PermitClinic.name,
        description: this.permitRepository.PermitClinic.description,
        list: this.permitRepository.PermitClinic.list,
      },
      where: { id: this.permitRepository.PermitClinic.name },
    });

    return { superadmin, admin, user, patient, clinic };

  }

  async loadUsersFixtures(permitId: string) {
    const password = await bcrypt.hash("123456", 10);
    const user = await this.userRepository.upsert({
      where: { email: "superadmin@example.com" },
      create: {
        email: "superadmin@example.com",
        password,
        permits: { connect: { id: permitId } },
        username: "superadmin",
      },
      update: {
        email: "superadmin@example.com",
        username: "superadmin",
      },
    });

    return user;
  }

  async loadSubscriptionPlansFixtures() {
    // Plan PRO — Individual para nutricionistas ($10.00/mes normal, preventa $4.00/mes)
    const pro = await this.subscriptionRepository.upsert({
      where: { id: "PRO" },
      create: {
        id: "PRO",
        name: "PRO",
        description: "Plan profesional individual con acceso completo a todas las herramientas de Nutringest para potenciar tu consulta nutricional.",
        price: 4.00,
        selected: true,
        badge: "PREVENTA",
        featured: false,
        colorTheme: { bg: "#ffffff", text: "#1e293b", accent: "#10b981", badge: "#10b981" },
        content: {
          features: [
            "Pacientes ilimitados con historial clínico completo",
            "Creación y personalización de menús y planes dietéticos",
            "Base de datos de alimentos y listas de intercambio",
            "Seguimiento de consultas y evolución de pacientes",
            "Módulo de antropometría con indicadores y gráficos",
            "Lista de compras para cada paciente",
            "Portal del paciente para compartir planes y comunicarte"
          ],
          grants: [
            "PRO_ACCESS",
            "COMMUNITY_ACCESS",
            "CALCULADORA_PREMIUM_ACCESS"
          ],
          modules: ["COMMUNITY"]
        },
      },
      update: {
        name: "PRO",
        description: "Plan profesional individual con acceso completo a todas las herramientas de Nutringest para potenciar tu consulta nutricional.",
        price: 4.00,
        selected: true,
        badge: "PREVENTA",
        featured: false,
        colorTheme: { bg: "#ffffff", text: "#1e293b", accent: "#10b981", badge: "#10b981" },
        content: {
          features: [
            "Pacientes ilimitados con historial clínico completo",
            "Creación y personalización de menús y planes dietéticos",
            "Base de datos de alimentos y listas de intercambio",
            "Seguimiento de consultas y evolución de pacientes",
            "Módulo de antropometría con indicadores y gráficos",
            "Lista de compras para cada paciente",
            "Portal del paciente para compartir planes y comunicarte"
          ],
          grants: [
            "PRO_ACCESS",
            "COMMUNITY_ACCESS",
            "CALCULADORA_PREMIUM_ACCESS"
          ],
          modules: ["COMMUNITY"]
        },
      },
    });

    // Plan Clínica — Para clínicas y equipos ($99.99/mes)
    const clinica = await this.subscriptionRepository.upsert({
      where: { id: "Clinica" },
      create: {
        id: "Clinica",
        name: "Clínica",
        description: "Solución integral para clínicas y equipos de nutricionistas con herramientas colaborativas y gestión centralizada de pacientes.",
        price: 99.99,
        selected: false,
        badge: null,
        featured: false,
        colorTheme: { bg: "#ffffff", text: "#1e293b", accent: "#7c3aed", badge: "#7c3aed" },
        content: {
          features: [
            "Todo lo del plan PREMIUM para cada nutricionista del equipo",
            "Gestión de múltiples nutricionistas bajo una misma clínica",
            "Panel de control centralizado con métricas y analytics",
            "Personalización de marca (logo, colores, dominio)",
            "Gestión centralizada del equipo",
            "Soporte prioritario con tiempo de respuesta garantizado",
            "Reportes avanzados y exportación de datos del equipo"
          ],
          grants: [
            "PREMIUM_ACCESS",
            "COMMUNITY_ACCESS",
            "COMMUNITY_BROWSE",
            "COMMUNITY_IMPORT",
            "COMMUNITY_PUBLISH",
            "PORTFOLIO_MANAGE",
            "INSTITUTIONAL_FOOD_ACCESS",
            "CALCULADORA_PREMIUM_ACCESS"
          ],
          modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"]
        },
      },
      update: {
        name: "Clínica",
        description: "Solución integral para clínicas y equipos de nutricionistas con herramientas colaborativas y gestión centralizada de pacientes.",
        price: 99.99,
        selected: false,
        badge: null,
        featured: false,
        colorTheme: { bg: "#ffffff", text: "#1e293b", accent: "#7c3aed", badge: "#7c3aed" },
        content: {
          features: [
            "Todo lo del plan PREMIUM para cada nutricionista del equipo",
            "Gestión de múltiples nutricionistas bajo una misma clínica",
            "Panel de control centralizado con métricas y analytics",
            "Personalización de marca (logo, colores, dominio)",
            "Gestión centralizada del equipo",
            "Soporte prioritario con tiempo de respuesta garantizado",
            "Reportes avanzados y exportación de datos del equipo"
          ],
          grants: [
            "PREMIUM_ACCESS",
            "COMMUNITY_ACCESS",
            "COMMUNITY_BROWSE",
            "COMMUNITY_IMPORT",
            "COMMUNITY_PUBLISH",
            "PORTFOLIO_MANAGE",
            "INSTITUTIONAL_FOOD_ACCESS",
            "CALCULADORA_PREMIUM_ACCESS"
          ],
          modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"]
        },
      },
    });

    // Plan PREMIUM — El plan más completo con herramientas avanzadas ($25.00/mes normal, $20.00/mes preventa)
    const premium = await this.subscriptionRepository.upsert({
      where: { id: "Premium" },
      create: {
        id: "Premium",
        name: "PREMIUM",
        description: "El plan más completo para nutricionistas que buscan llevar su práctica al siguiente nivel con herramientas avanzadas.",
        price: 20.00,
        selected: true,
        badge: "MÁS ADQUIRIDO",
        featured: true,
        colorTheme: { bg: "#ffffff", text: "#1e293b", accent: "#f59e0b", badge: "#f59e0b" },
        content: {
          features: [
            "Pacientes ilimitados con historial clínico completo",
            "Creación y personalización de menús y planes dietéticos",
            "Base de datos de alimentos y listas de intercambio",
            "Seguimiento de consultas y evolución de pacientes",
            "Módulo de antropometría con indicadores y gráficos",
            "Plantillas de dietas reutilizables para agilizar tu trabajo",
            "Lista de compras para cada paciente",
            "Portal del paciente para compartir planes y comunicarte",
            "Portafolios digitales para mostrar tu trabajo",
            "Personalización avanzada de plantillas",
            "Servicio de alimentación especializado",
            "Nutrición deportiva especializada",
            "Nutrición pediátrica especializada",
            "Sistema de referidos entre profesionales",
            "Atención y consultas en grupos"
          ],
          grants: [
            "PREMIUM_ACCESS",
            "COMMUNITY_ACCESS",
            "COMMUNITY_BROWSE",
            "COMMUNITY_IMPORT",
            "COMMUNITY_PUBLISH",
            "PORTFOLIO_MANAGE",
            "INSTITUTIONAL_FOOD_ACCESS",
            "CALCULADORA_PREMIUM_ACCESS"
          ],
          modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"]
        },
      },
      update: {
        name: "PREMIUM",
        description: "El plan más completo para nutricionistas que buscan llevar su práctica al siguiente nivel con herramientas avanzadas.",
        price: 20.00,
        selected: true,
        badge: "MÁS ADQUIRIDO",
        featured: true,
        colorTheme: { bg: "#ffffff", text: "#1e293b", accent: "#f59e0b", badge: "#f59e0b" },
        content: {
          features: [
            "Pacientes ilimitados con historial clínico completo",
            "Creación y personalización de menús y planes dietéticos",
            "Base de datos de alimentos y listas de intercambio",
            "Seguimiento de consultas y evolución de pacientes",
            "Módulo de antropometría con indicadores y gráficos",
            "Plantillas de dietas reutilizables para agilizar tu trabajo",
            "Lista de compras para cada paciente",
            "Portal del paciente para compartir planes y comunicarte",
            "Portafolios digitales para mostrar tu trabajo",
            "Personalización avanzada de plantillas",
            "Servicio de alimentación especializado",
            "Nutrición deportiva especializada",
            "Nutrición pediátrica especializada",
            "Sistema de referidos entre profesionales",
            "Atención y consultas en grupos"
          ],
          grants: [
            "PREMIUM_ACCESS",
            "COMMUNITY_ACCESS",
            "COMMUNITY_BROWSE",
            "COMMUNITY_IMPORT",
            "COMMUNITY_PUBLISH",
            "PORTFOLIO_MANAGE",
            "INSTITUTIONAL_FOOD_ACCESS",
            "CALCULADORA_PREMIUM_ACCESS"
          ],
          modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"]
        },
      },
    });

    // Limpieza de planes legacy (Basic)
    for (const legacyId of ["Basic"]) {
      try {
        const legacyPlans = await this.subscriptionRepository.findMany({
          where: { id: legacyId },
          take: 1,
          skip: 0,
        });
        if (legacyPlans && legacyPlans.length > 0 && !legacyPlans[0].deletedAt) {
          await this.subscriptionRepository.delete({ where: { id: legacyId } });
        }
      } catch (e) {
        // Ignorar si no existe o ya está borrado
      }
    }

    return { pro, clinica, premium };
  }

  async loadPaymentMethodsFixtures() {
    // const card = await this.paymentMethodRepository.upsert({
    //     where: { id: "Credit-Card" },
    //     create: {
    //         id: "Credit-Card",
    //         name: "Credit Card",
    //         description: "Credit Card",
    //         code: "CREDIT_CARD",
    //         active: false,
    //         colorStart: "3D3D3D",
    //         colorEnd: "555555",
    //         colorText: 'FFFFFF',
    //         imagePath: '/public/images/payment-methods/visa.png',

    //     },
    //     update: {
    //         name: "Credit Card",
    //         description: "Credit Card",
    //         code: "CREDIT_CARD",
    //         active: false,
    //         colorStart: "3D3D3D",
    //         colorEnd: "555555",
    //         colorText: 'FFFFFF',
    //         imagePath: '/public/images/payment-methods/visa.png',
    //     },
    // });
    const paypal = await this.paymentMethodRepository.upsert({
      where: { id: "PayPal" },
      create: {
        id: "PayPal",
        name: "PayPal",
        description: "PayPal",
        code: "PAYPAL",
        active: true,
        colorStart: "003087",
        colorEnd: "009cde",
        colorText: "FFFFFF",
        imagePath: "/public/images/payment-methods/paypal.png",
        fields: [
          {
            name: "Email",
            type: "text",
            required: true,
            placeholder: "Email",
            label: "Email",
            description: "Email",
            defaultValue: "",
            validations: [
              {
                type: "email",
                message: "Invalid email",
              },
            ],
          },
        ],
      },
      update: {
        name: "PayPal",
        description: "PayPal",
        code: "PAYPAL",
        active: true,
        colorStart: "003087",
        colorEnd: "009cde",
        colorText: "FFFFFF",
        imagePath: "/public/images/payment-methods/paypal.png",
        fields: [
          {
            name: "Email",
            type: "text",
            required: true,
            placeholder: "Email",
            label: "Email",
            description: "Email",
            defaultValue: "",
            validations: [
              {
                type: "email",
                message: "Invalid email",
              },
            ],
          },
        ],
      },
    });
    // const stripe = await this.paymentMethodRepository.upsert({
    //     where: { id: "Stripe" },
    //     create: {
    //         id: "Stripe",
    //         name: "Stripe",
    //         description: "Stripe",
    //         code: "STRIPE",
    //         active: false,
    //         colorStart: "635BFF",
    //         colorEnd: "6B7AFE",
    //         colorText: 'FFFFFF',
    //         imagePath: '/public/images/payment-methods/stripe.png',
    //     },
    //     update: {
    //         name: "Stripe",
    //         description: "Stripe",
    //         code: "STRIPE",
    //         active: false,
    //         colorStart: "635BFF",
    //         colorEnd: "6B7AFE",
    //         colorText: 'FFFFFF',
    //         imagePath: '/public/images/payment-methods/stripe.png',
    //     },
    // });
    const crypto = await this.paymentMethodRepository.upsert({
      where: { id: "Crypto" },
      create: {
        id: "Binance",
        name: "Binance",
        description: "Binance",
        code: "BINANCE",
        active: true,
        colorStart: "1E2026",
        colorEnd: "2C2E35",
        colorText: "FFFFFF",
        imagePath: "/public/images/payment-methods/binance.png",
        fields: [
          {
            name: "Email",
            type: "text",
            required: true,
            placeholder: "Email",
            label: "Email",
            description: "Email",
            defaultValue: "",
            validations: [
              {
                type: "email",
                message: "Invalid email",
              },
            ],
          },
        ],
      },
      update: {
        name: "Binance",
        description: "Binance",
        code: "BINANCE",
        active: true,
        colorStart: "1E2026",
        colorEnd: "2C2E35",
        colorText: "FFFFFF",
        imagePath: "/public/images/payment-methods/binance.png",
        fields: [
          {
            name: "Email",
            type: "text",
            required: true,
            placeholder: "Email",
            label: "Email",
            description: "Email",
            defaultValue: "",
            validations: [
              {
                type: "email",
                message: "Invalid email",
              },
            ],
          },
        ],
      },
    });
    // const mercadopago = await this.paymentMethodRepository.upsert({
    //     where: { id: "MercadoPago" },
    //     create: {
    //         id: "MercadoPago",
    //         name: "MercadoPago",
    //         description: "MercadoPago",
    //         code: "MercadoPago",
    //         active: false,
    //         colorStart: "009EE3",
    //         colorEnd: "00B2F6",
    //         colorText: 'FFFFFF',
    //         imagePath: '/public/images/payment-methods/mercadopago.png',
    //     },
    //     update: {
    //         name: "MercadoPago",
    //         description: "MercadoPago",
    //         code: "MercadoPago",
    //         active: false,
    //         colorStart: "009EE3",
    //         colorEnd: "00B2F6",
    //         colorText: 'FFFFFF',
    //         imagePath: '/public/images/payment-methods/mercadopago.png',
    //     },
    // });
    const pagomovil = await this.paymentMethodRepository.upsert({
      where: { id: "PagoMobil" },
      create: {
        id: "PagoMobil",
        name: "PagoMóvil",
        description: "PagoMóvil",
        code: "PAGOMOVIL",
        active: true,
        colorStart: "F7CA18",
        colorEnd: "F4B800",
        colorText: "FFFFFF",
        imagePath: "/public/images/payment-methods/pagomovil.webp",
        fields: [
          {
            name: "Phone",
            type: "text",
            required: true,
            placeholder: "Phone",
            label: "Phone",
            description: "Phone",
            defaultValue: "",
            validations: [
              {
                type: "phone",
                message: "Invalid phone",
              },
            ],
          },
          {
            name: "Cedula",
            type: "text",
            required: true,
            placeholder: "Cedula",
            label: "Cedula",
            description: "Cedula",
            defaultValue: "",
            validations: [
              {
                type: "cedula",
                message: "Invalid cedula",
              },
            ],
          },
          {
            name: "Banco",
            type: "text",
            required: true,
            placeholder: "Banco",
            label: "Banco",
            description: "Banco",
            defaultValue: "",
            validations: [
              {
                type: "bank",
                message: "Invalid bank",
              },
            ],
          },
        ],
      },
      update: {
        name: "PagoMóvil",
        description: "PagoMóvil",
        code: "PAGOMOVIL",
        active: true,
        colorStart: "F7CA18",
        colorEnd: "F4B800",
        colorText: "FFFFFF",
        imagePath: "/public/images/payment-methods/pagomovil.webp",
        fields: [
          {
            name: "Phone",
            type: "text",
            required: true,
            placeholder: "Phone",
            label: "Phone",
            description: "Phone",
            defaultValue: "",
            validations: [
              {
                type: "phone",
                message: "Invalid phone",
              },
            ],
          },
          {
            name: "Cedula",
            type: "text",
            required: true,
            placeholder: "Cedula",
            label: "Cedula",
            description: "Cedula",
            defaultValue: "",
            validations: [
              {
                type: "cedula",
                message: "Invalid cedula",
              },
            ],
          },
          {
            name: "Banco",
            type: "text",
            required: true,
            placeholder: "Banco",
            label: "Banco",
            description: "Banco",
            defaultValue: "",
            validations: [
              {
                type: "bank",
                message: "Invalid bank",
              },
            ],
          },
        ],
      },
    });

    return { paypal, crypto, pagomovil };
  }

  async loadCorporateContentFixtures() {
    const items = [
      {
        key: "terms",
        title: "Términos y Condiciones",
        description: "Condiciones generales de uso de la plataforma Nutringest",
        // The legal documents are published from `docs/legal/` by
        // `npm run seed:legal`. This fixture only creates them when they are
        // missing, so a backend restart never replaces the published text.
        overwrite: false,
        content: `# Términos y Condiciones

> **Documento pendiente de publicación.** La versión vigente se publica desde \`docs/legal/terms-and-conditions.md\` con \`npm run seed:legal\`. Este texto es un marcador de posición y no constituye los términos en vigor.

Bienvenido a **Nutringest**. Al acceder y utilizar nuestros servicios, usted acepta cumplir con los siguientes términos y condiciones de uso:

## 1. Uso del Servicio
La plataforma está diseñada exclusivamente para profesionales de la salud y sus pacientes. Usted se compromete a hacer un uso lícito y ético de las herramientas provistas.

## 2. Registro de Cuentas
Para utilizar la plataforma completa, debe registrar una cuenta y proporcionar información verídica y actualizada.

## 3. Modificaciones
Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado del servicio constituye la aceptación de los nuevos términos.`,
      },
      {
        key: "privacy",
        title: "Políticas de Privacidad",
        description: "Políticas de protección de datos personales en Nutringest",
        // Same as `terms`: the published document wins over this fixture.
        overwrite: false,
        content: `# Políticas de Privacidad

> **Documento pendiente de publicación.** La versión vigente se publica desde \`docs/legal/privacy-policy.md\` con \`npm run seed:legal\`. Este texto es un marcador de posición y no constituye el aviso en vigor.

En **Nutringest**, nos tomamos muy en serio la seguridad y confidencialidad de sus datos y los de sus pacientes.

## 1. Recolección de Información
Recopilamos información personal relevante para el diagnóstico nutricional, el seguimiento clínico y la gestión administrativa de las consultas.

## 2. Uso de Datos
Los datos médicos y antropométricos no serán vendidos ni compartidos con terceros sin el consentimiento expreso del usuario, salvo requerimiento legal.

## 3. Seguridad de la Información
Implementamos estrictas medidas de seguridad técnica y organizativa para prevenir el acceso no autorizado o la pérdida de datos.`,
      },
      {
        key: "mission",
        title: "Misión",
        description: "Propósito y razón de ser de Nutringest",
        content: `Proveer a nutricionistas y dietistas con una solución de software avanzada y confiable que simplifique la gestión integral de su consulta, desde la medición antropométrica y la planificación dietética hasta la administración de citas, permitiéndoles dedicar más tiempo al cuidado personalizado de sus pacientes y menos a la gestión operativa.`,
      },
      {
        key: "vision",
        title: "Visión",
        description: "Meta y aspiración futura de Nutringest",
        content: `Ser la plataforma de referencia global que empodera a los profesionales de la nutrición para optimizar su práctica clínica y elevar el estándar de atención, transformando la administración de pacientes, mediciones y planes alimenticios en una experiencia fluida, precisa e intuitiva.`,
      },
      {
        key: "values",
        title: "Valores",
        description: "Principios fundamentales de Nutringest",
        content: `**1. Precisión Clínica**
Comprometidos con la fiabilidad de los datos y la documentación, asegurando que cada cálculo y registro clínico sea un fundamento sólido para las decisiones de tratamiento.

**2. Eficiencia Profesional**
Diseñamos soluciones para ahorrar tiempo, optimizar flujos de trabajo y permitir que los profesionales centren su energía en la atención directa y personalizada al paciente.

**3. Innovación Adaptable**
Impulsamos la mejora continua de la plataforma, integrando nuevas investigaciones y tecnologías para mantener a nuestros usuarios a la vanguardia de la práctica nutricional.

**4. Integridad y Confianza**
Operamos con la máxima transparencia y un compromiso inquebrantable con la seguridad de la información, construyendo una relación de confianza absoluta con la comunidad de nutricionistas.`,
      },
    ];

    const results: any[] = [];
    for (const item of items) {
      const { overwrite = true, ...data } = item;

      // Items marked `overwrite: false` are created only when missing. Their
      // real source of truth lives outside the database (the published legal
      // documents), so a restart must not replace what was published.
      if (!overwrite) {
        const existing = await this.cmsRepository.findOne({
          where: { key: item.key },
        });

        if (existing) {
          this.logger.log(
            `Contenido corporativo "${item.key}" ya existe: no se sobreescribe`,
          );
          results.push(existing);
          continue;
        }
      }

      const res = await this.cmsRepository.upsert({
        where: { key: item.key },
        create: data,
        update: {
          title: data.title,
          description: data.description,
          content: data.content,
        },
      });
      results.push(res);
    }
    return results;
  }
}
