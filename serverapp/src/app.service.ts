import { Injectable } from "@nestjs/common";
import {
  Logos,
  Service,
  Experience,
  Stats,
  Testimonials,
} from "./shared/types/landing.type";

@Injectable()
export class AppService {
  /**
   * Logos de clientes ficticios de "Subkit"
   * (Asumiendo que 'url' es la URL de la imagen del logo)
   */
  getLogos(): Logos[] {
    return [
      {
        title: "landing.logos_item.techcorp",
        url: "/public/images/logos/techcorp-logo.svg", // Ruta a tu logo en 'public/'
      },
      {
        title: "landing.logos_item.techcorp",
        url: "/public/images/logos/saasify-logo.svg",
      },
      {
        title: "landing.logos_item.techcorp",
        url: "/public/images/logos/elearn-logo.svg",
      },
      {
        title: "landing.logos_item.techcorp",
        url: "/public/images/logos/fintech-logo.svg",
      },
    ];
  }

  /**
   * Los servicios principales de "Subkit"
   */
  getServices(): Service[] {
    return [
      {
        title: "landing.service_items.subscription.title",
        description: "landing.service_items.subscription.description",
        url: "#",
      },
      {
        title: "landing.service_items.wallet.title",
        description: "landing.service_items.wallet.description",
        url: "#",
      },
      {
        title: "landing.service_items.auth.title",
        description: "landing.service_items.auth.description",
        url: "#",
      },
    ];
  }

  /**
   * Estadísticas clave de "Subkit"
   * (Asumiendo que el tipo 'Stats' es { value: string, label: string })
   */
  getStats(): Stats[] {
    return [
      {
        value: "99.9%",
        stat: "landing.stats_item.uptime",
      },
      {
        value: "100k+",
        stat: "landing.stats_item.subscriptions",
      },
      {
        value: "50M+",
        stat: "landing.stats_item.apiCalls",
      },
      {
        value: "1ms",
        stat: "landing.stats_item.avgResponse",
      },
    ];
  }

  /**
   * Experiencia/Características de "Subkit"
   * (Asumiendo que el tipo 'Experience' es { title: string })
   */
  getExperiense(): Experience[] {
    return [
      {
        title: "landing.experience_item.secure",
      },
      {
        title: "landing.experience_item.payments",
      },
      {
        title: "landing.experience_item.wallets",
      },
      {
        title: "landing.experience_item.apis",
      },
    ];
  }

  /**
   * Testimonios de clientes ficticios de "Subkit"
   * (Asumiendo que 'Testimonials' incluye 'imageUrl')
   */
  getTestimonials(): Testimonials[] {
    return [
      {
        name: "Ana García",
        imageUrl: "/public/images/01.png",
        role: "Directora de Tecnología (CTO), FinTech App", // Clave para 'CTO, FinTech App'
        quote:
          "La integración del sistema de wallets de Subkit nos ahorró meses de desarrollo. Su API es limpia, robusta y la documentación es impecable. ¡Increíble!", // Clave para la cita
      },
      {
        name: "Carlos Mendoza",
        imageUrl: "/public/images/02.png",
        role: "Fundador, SaaS de E-learning",
        quote:
          "Lanzamos nuestro servicio de suscripción en tres semanas gracias a Subkit. La gestión de autenticación y roles es sólida como una roca. 100% recomendado.",
      },
      {
        name: "Laura Jiménez",
        imageUrl: "/public/images/03.png",
        role: "Gerente de Producto, Media Corp",
        quote:
          "Manejar pagos recurrentes era nuestro mayor dolor de cabeza. Subkit lo simplificó todo. Su soporte técnico es de primer nivel y la plataforma es muy confiable.",
      },
    ];
  }
}
