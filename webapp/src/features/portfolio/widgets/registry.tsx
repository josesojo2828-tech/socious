import { HeroWidget } from "./public/HeroWidget";
import { AboutWidget } from "./public/AboutWidget";
import { ServicesWidget } from "./public/ServicesWidget";
import { TestimonialsWidget } from "./public/TestimonialsWidget";
import { PricingWidget } from "./public/PricingWidget";
import { FAQWidget } from "./public/FAQWidget";
import { ContactWidget } from "./public/ContactWidget";
import { SocialWidget } from "./public/SocialWidget";
import { GalleryWidget } from "./public/GalleryWidget";
import { CTASectionWidget } from "./public/CTASectionWidget";
import { MetricsWidget } from "./public/MetricsWidget";
import { CredentialsWidget } from "./public/CredentialsWidget";
import type { ComponentType } from "react";
import type { Palette, WidgetContentMap, WidgetDefinition, WidgetType } from "./types";
import {
  heroSchema,
  aboutSchema,
  servicesSchema,
  testimonialsSchema,
  pricingSchema,
  faqSchema,
  contactSchema,
  socialSchema,
  gallerySchema,
  ctaSchema,
  metricsSchema,
  credentialsSchema,
} from "@/types/backend/widgets.schema";
import { HeroEditor } from "@/features/portfolio/widgets/editor/HeroEditor";
import { AboutEditor } from "@/features/portfolio/widgets/editor/AboutEditor";
import { ServicesEditor } from "@/features/portfolio/widgets/editor/ServicesEditor";
import { TestimonialsEditor } from "@/features/portfolio/widgets/editor/TestimonialsEditor";
import { PricingEditor } from "@/features/portfolio/widgets/editor/PricingEditor";
import { FAQEditor } from "@/features/portfolio/widgets/editor/FAQEditor";
import { ContactEditor } from "@/features/portfolio/widgets/editor/ContactEditor";
import { SocialEditor } from "@/features/portfolio/widgets/editor/SocialEditor";
import { GalleryEditor } from "@/features/portfolio/widgets/editor/GalleryEditor";
import { CTAEditor } from "@/features/portfolio/widgets/editor/CTAEditor";
import { MetricsEditor } from "@/features/portfolio/widgets/editor/MetricsEditor";
import { CredentialsEditor } from "@/features/portfolio/widgets/editor/CredentialsEditor";

type WidgetRegistry = { [K in WidgetType]: WidgetDefinition<K> };

export const widgetRegistry: WidgetRegistry = {
  hero: {
    type: "hero",
    label: "Hero / Perfil",
    icon: "LayoutDashboard",
    schema: heroSchema,
    defaultContent: {
      fullName: "",
      professionalTitle: "Nutricionista",
      location: "Argentina",
      description: "",
    },
    component: HeroWidget as any,
    editorComponent: HeroEditor,
  },
  metrics: {
    type: "metrics",
    label: "Métricas & Logros",
    icon: "BarChart3",
    schema: metricsSchema,
    defaultContent: {
      title: "Cifras y Resultados",
      items: [
        { value: "+500", label: "Pacientes Atendidos", subtext: "Planes personalizados" },
        { value: "8+", label: "Años de Experiencia", subtext: "Nutrición clínica" },
        { value: "99%", label: "Satisfacción", subtext: "Evaluaciones 5 estrellas" },
        { value: "100%", label: "Personalizado", subtext: "Adaptado a tu rutina" },
      ],
    },
    component: MetricsWidget as any,
    editorComponent: MetricsEditor,
  },
  credentials: {
    type: "credentials",
    label: "Trayectoria",
    icon: "GraduationCap",
    schema: credentialsSchema,
    defaultContent: {
      title: "Trayectoria & Credenciales",
      items: [
        {
          title: "Licenciatura en Nutrición",
          institution: "Universidad de Buenos Aires",
          year: "2018 - 2023",
          type: "education",
          description: "Graduación con honores. Especialización en nutrición clínica y deportiva.",
        },
        {
          title: "Certificación Antropometría ISAK Nivel 2",
          institution: "International Society for the Advancement of Kinanthropometry",
          year: "2023",
          type: "certification",
          description: "Evaluación avanzada de composición corporal y somatotipo.",
        },
      ],
    },
    component: CredentialsWidget as any,
    editorComponent: CredentialsEditor,
  },
  about: {
    type: "about",
    label: "Sobre Mí",
    icon: "User",
    schema: aboutSchema,
    defaultContent: {
      biography:
        "Soy Licenciada en Nutrición con más de 10 años de experiencia ayudando a personas a mejorar su calidad de vida a través de la alimentación consciente y personalizada.",
      philosophy:
        "Creo en una nutrición sin restricciones extremas, donde el equilibrio y el disfrute son la clave para mantener hábitos saludables a largo plazo.",
    },
    component: AboutWidget as any,
    editorComponent: AboutEditor,
  },
  services: {
    type: "services",
    label: "Enlaces Destacados",
    icon: "Briefcase",
    schema: servicesSchema,
    defaultContent: {
      title: "Mis Servicios",
      items: [
        {
          name: "Nutrición Personalizada",
          description: "Planes diseñados específicamente para tus necesidades y objetivos.",
          icon: "Apple",
        },
        {
          name: "Nutrición Deportiva",
          description: "Optimizá tu rendimiento con una alimentación adaptada a tu entrenamiento.",
          icon: "Activity",
        },
        {
          name: "Reeducación Alimentaria",
          description: "Aprendé a comer conscientemente sin dietas restrictivas.",
          icon: "Leaf",
        },
      ],
    },
    component: ServicesWidget as any,
    editorComponent: ServicesEditor,
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonios",
    icon: "Star",
    schema: testimonialsSchema,
    defaultContent: {
      title: "Lo que dicen mis pacientes",
      items: [
        {
          patientName: "María García",
          text: "Desde que empecé, mi energía mejoró notablemente. Bajé de peso sin pasar hambre.",
          rating: 5,
        },
        {
          patientName: "Juan Pérez",
          text: "La mejor decisión para mi salud. Aprendí a comer bien y ahora entiendo mi cuerpo.",
          rating: 5,
        },
      ],
    },
    component: TestimonialsWidget as any,
    editorComponent: TestimonialsEditor,
  },
  pricing: {
    type: "pricing",
    label: "Planes",
    icon: "DollarSign",
    schema: pricingSchema,
    defaultContent: {
      title: "Planes",
      plans: [
        {
          name: "Consulta Inicial",
          price: "$45",
          features: ["Evaluación completa", "Plan personalizado", "Seguimiento por WhatsApp"],
          ctaText: "Reservá tu turno",
          ctaLink: "/contacto",
        },
        {
          name: "Plan Mensual",
          price: "$120",
          features: ["4 consultas", "Plan de comidas", "Soporte 24/7", "Ajustes semanales"],
          ctaText: "Empezá ahora",
          ctaLink: "/contacto",
        },
        {
          name: "Plan Trimestral",
          price: "$300",
          features: [
            "12 consultas",
            "Plan completo",
            "Soporte prioritario",
            "Análisis de progreso",
            "Recetas exclusivas",
          ],
          ctaText: "Ahorrá 25%",
          ctaLink: "/contacto",
        },
      ],
    },
    component: PricingWidget as any,
    editorComponent: PricingEditor,
  },
  faq: {
    type: "faq",
    label: "FAQ",
    icon: "HelpCircle",
    schema: faqSchema,
    defaultContent: {
      title: "Preguntas Frecuentes",
      items: [
        {
          question: "¿Cuánto tiempo toma ver resultados?",
          answer:
            "Los resultados varían según cada persona, pero generalmente los primeros cambios se notan entre las 2 y 4 semanas.",
        },
        {
          question: "¿Tienen planes para vegetarianos?",
          answer:
            "Sí, adaptamos todos los planes a cualquier estilo de alimentación, incluyendo vegetariano, vegano, y sin gluten.",
        },
        {
          question: "¿Cómo son las consultas?",
          answer:
            "Las consultas son virtuales por videollamada, con una duración de 45 a 60 minutos. También ofrecemos consultas presenciales.",
        },
      ],
    },
    component: FAQWidget as any,
    editorComponent: FAQEditor,
  },
  contact: {
    type: "contact",
    label: "Contacto",
    icon: "Mail",
    schema: contactSchema,
    defaultContent: {
      email: "nutricionista@email.com",
      phone: "+54 11 1234-5678",
      whatsapp: "+54 11 1234-5678",
      address: "Av. Corrientes 1234, CABA, Argentina",
      showContactForm: false,
    },
    component: ContactWidget as any,
    editorComponent: ContactEditor,
  },
  social: {
    type: "social",
    label: "Redes Sociales",
    icon: "Share2",
    schema: socialSchema,
    defaultContent: {
      platforms: [
        { platform: "instagram", url: "https://instagram.com/mi.nutricionista", enabled: true },
        { platform: "linkedin", url: "https://linkedin.com/in/mi.nutricionista", enabled: true },
        { platform: "youtube", url: "", enabled: false },
        { platform: "twitter", url: "", enabled: false },
        { platform: "tiktok", url: "", enabled: false },
        { platform: "facebook", url: "", enabled: false },
      ],
    },
    component: SocialWidget as any,
    editorComponent: SocialEditor,
  },
  gallery: {
    type: "gallery",
    label: "Galería",
    icon: "Image",
    schema: gallerySchema,
    defaultContent: {
      title: "Galería",
      images: [
        { url: "/placeholder-1.jpg", caption: "Plato saludable" },
        { url: "/placeholder-2.jpg", caption: "Consultorio" },
      ],
    },
    component: GalleryWidget as any,
    editorComponent: GalleryEditor,
  },
  cta: {
    type: "cta",
    label: "CTA",
    icon: "Target",
    schema: ctaSchema,
    defaultContent: {
      title: "Empezá tu transformación hoy",
      description:
        "Dá el primer paso hacia una vida más saludable. Agendá tu consulta y descubrí cómo podemos trabajar juntos.",
      buttonText: "Quiero empezar",
      buttonLink: "/contacto",
    },
    component: CTASectionWidget as any,
    editorComponent: CTAEditor,
  },
};

export function getWidgetDefinition<K extends WidgetType>(type: K): WidgetDefinition<K> {
  return widgetRegistry[type];
}

export const widgetTypes: WidgetType[] = [
  "hero",
  "services",
  "social",
];
