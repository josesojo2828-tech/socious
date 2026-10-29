import { NextResponse } from "next/server";

export interface PlanFeature {
  text: string;
  includedInPro: boolean;
  includedInPremium: boolean;
  includedInClinica: boolean;
  category: "base" | "pro" | "clinic";
}

export interface Plan {
  id: string;
  name: string;
  badge: string;
  audience: string;
  description: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  secondaryPrice?: string;
  billingInfo: string;
  isRecommended?: boolean;
  recommendedLabel?: string;
  featuresHeader?: string;
  features: string[];
  specializedFeaturesHeader?: string;
  specializedFeatures?: string[];
  ctaText: string;
  ctaHref: string;
  externalCta?: boolean;
}

export interface Metric {
  id: string;
  value: string;
  label: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export interface UseCase {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge: string;
}

export interface FeatureStep {
  step: string;
  label: string;
  title: string;
  description: string;
  icon: string;
  checklist: string[];
  image?: string;
}

export interface LandingData {
  plans: Plan[];
  comparisonFeatures: PlanFeature[];
  metrics: Metric[];
  faqs: FaqItem[];
  useCases: UseCase[];
  features: {
    steps: FeatureStep[];
    specialtiesTagCloud: string[];
  };
  aiAssistant: {
    name: string;
    description: string;
    initialChat: Array<{
      id: string;
      sender: "assistant" | "user";
      text: string;
    }>;
  };
  exchangeRate: {
    rate: number;
    currency: string;
    rateFormatted: string;
    source: string;
    lastUpdated: string;
  };
}

export const LANDING_DATA_FALLBACK: LandingData = {
  plans: [
    {
      id: "pro",
      name: "PRO",
      badge: "Preventa",
      audience: "Consultorio Individual",
      description: "Todo lo que necesitas para tu consultorio individual",
      price: "$4.00",
      originalPrice: "$10.00/mes",
      discount: "Ahorra 60%",
      billingInfo: "Facturado mensualmente",
      featuresHeader: "Todo para empezar:",
      features: [
        "Pacientes Ilimitados",
        "Menús y Planes de Alimentación",
        "Listas de Intercambio",
        "Consultas y Seguimiento",
        "App/Portal para Pacientes",
        "Listas de Compras Automáticas",
        "Cálculo Antropométrico",
        "Base de Alimentos Completa"
      ],
      ctaText: "Comenzar prueba de 14 días",
      ctaHref: "#empezar"
    },
    {
      id: "premium",
      name: "PREMIUM",
      badge: "Más Adquirido",
      audience: "Profesional Full",
      isRecommended: true,
      recommendedLabel: "Opción Recomendada",
      description: "La opción favorita de los nutricionistas, con todo lo de PRO más herramientas especializadas",
      price: "$20.00",
      originalPrice: "$25.00/mes",
      discount: "Ahorra 20%",
      billingInfo: "Facturado mensualmente",
      featuresHeader: "Todo el plan PRO incluido:",
      features: [
        "Pacientes Ilimitados",
        "Menús y Planes de Alimentación",
        "Listas de Intercambio",
        "Consultas y Seguimiento",
        "App/Portal para Pacientes",
        "Listas de Compras Automáticas",
        "Cálculo Antropométrico",
        "Base de Alimentos Completa"
      ],
      specializedFeaturesHeader: "+ Herramientas Pro & Especialidades:",
      specializedFeatures: [
        "Plantillas de Dietas",
        "Portafolios Digitales",
        "Personalización de Plantillas",
        "Nutrición Deportiva",
        "Nutrición Pediátrica",
        "Sistema de Referidos",
        "Atención en Grupos"
      ],
      ctaText: "Comenzar prueba de 14 días",
      ctaHref: "#empezar"
    },
    {
      id: "clinica",
      name: "Clínica",
      badge: "Equipos",
      audience: "Equipos & Clínicas",
      description: "Para clínicas y equipos de nutricionistas",
      price: "$99.99",
      secondaryPrice: "o $9.99/nutricionista",
      billingInfo: "Facturado mensualmente",
      featuresHeader: "Para empresas y equipos:",
      features: [
        "Todo lo incluido en PREMIUM",
        "Gestión de Equipo",
        "Marca Personalizada",
        "Soporte Prioritario VIP",
        "Multi-nutricionista",
        "Analíticas Avanzadas"
      ],
      ctaText: "Hablar con el equipo",
      ctaHref: "https://wa.me/584243153383?text=Hola,%20quiero%20información%20sobre%20el%20plan%20Clínica%20de%20Nutringest",
      externalCta: true
    }
  ],
  comparisonFeatures: [
    { text: "Pacientes Ilimitados", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "Menús y Planes de Alimentación", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "Listas de Intercambio", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "Consultas y Seguimiento", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "App/Portal para Pacientes", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "Listas de Compras Automáticas", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "Cálculo Antropométrico", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "Base de Alimentos Completa", includedInPro: true, includedInPremium: true, includedInClinica: true, category: "base" },
    { text: "Plantillas de Dietas", includedInPro: false, includedInPremium: true, includedInClinica: true, category: "pro" },
    { text: "Portafolios Digitales", includedInPro: false, includedInPremium: true, includedInClinica: true, category: "pro" },
    { text: "Personalización de Plantillas", includedInPro: false, includedInPremium: true, includedInClinica: true, category: "pro" },
    { text: "Nutrición Deportiva", includedInPro: false, includedInPremium: true, includedInClinica: true, category: "pro" },
    { text: "Nutrición Pediátrica", includedInPro: false, includedInPremium: true, includedInClinica: true, category: "pro" },
    { text: "Sistema de Referidos", includedInPro: false, includedInPremium: true, includedInClinica: true, category: "pro" },
    { text: "Atención en Grupos", includedInPro: false, includedInPremium: true, includedInClinica: true, category: "pro" },
    { text: "Gestión de Equipo", includedInPro: false, includedInPremium: false, includedInClinica: true, category: "clinic" },
    { text: "Marca Personalizada", includedInPro: false, includedInPremium: false, includedInClinica: true, category: "clinic" },
    { text: "Soporte Prioritario VIP", includedInPro: false, includedInPremium: false, includedInClinica: true, category: "clinic" },
    { text: "Multi-nutricionista", includedInPro: false, includedInPremium: false, includedInClinica: true, category: "clinic" },
    { text: "Analíticas Avanzadas", includedInPro: false, includedInPremium: false, includedInClinica: true, category: "clinic" }
  ],
  metrics: [
    {
      id: "trial",
      value: "14 días",
      label: "de prueba gratis",
      description: "Sin tarjeta de crédito"
    },
    {
      id: "pro_savings",
      value: "60%",
      label: "de ahorro en PRO",
      description: "$4.00/mes en preventa, antes $10.00/mes"
    },
    {
      id: "premium_savings",
      value: "20%",
      label: "de ahorro en PREMIUM",
      description: "$20.00/mes en preventa, antes $25.00/mes"
    },
    {
      id: "campus_days",
      value: "120 días",
      label: "gratis para estudiantes",
      description: "Programa Nutringest Campus"
    }
  ],
  faqs: [
    {
      id: "faq-1",
      question: "¿Cómo funciona la prueba gratuita de 14 días?",
      answer: "Accedés a todas las funciones de PREMIUM desde el primer día. No pedimos tarjeta de crédito ni compromiso de permanencia: si no te sirve, la prueba termina y listo.",
      defaultOpen: true
    },
    {
      id: "faq-2",
      question: "¿Mis historias clínicas y los datos de mis pacientes están seguros?",
      answer: "La información vive en tu cuenta, con respaldo continuo en la nube y acceso restringido al profesional que la carga. Podés exportar lo que necesites en cualquier momento."
    },
    {
      id: "faq-3",
      question: "¿Puedo exportar los planes y reportes en PDF?",
      answer: "Sí. Los reportes y los planes alimentarios se exportan en PDF listo para imprimir en A4 o para enviar directamente a tu paciente."
    },
    {
      id: "faq-4",
      question: "¿Qué es Nutringest Campus y quiénes aplican?",
      answer: "Es el programa para estudiantes de último año o en pasantías: 120 días de acceso premium gratuito para que hagas tus prácticas con la plataforma completa."
    },
    {
      id: "faq-5",
      question: "¿Puedo tener mi propio portafolio público de nutricionista?",
      answer: "Sí, con los Portafolios Digitales publicás tu perfil con biografía, especialidades y datos de contacto para que nuevos pacientes te encuentren."
    }
  ],
  useCases: [
    {
      id: "clinical",
      icon: "ph-stethoscope",
      title: "Nutrición clínica",
      description: "Historia clínica y antecedentes, Cálculo Antropométrico y seguimiento de cada consulta en la misma ficha, con App/Portal para Pacientes para que vean su plan.",
      badge: "Incluido desde PRO"
    },
    {
      id: "sports",
      icon: "ph-barbell",
      title: "Nutrición deportiva",
      description: "Medición de composición corporal y planes por objetivo con Menús y Planes de Alimentación y Listas de Intercambio, apoyados en Plantillas de Dietas.",
      badge: "Plantillas y especialidades en PREMIUM"
    },
    {
      id: "pediatric",
      icon: "ph-baby",
      title: "Nutrición pediátrica",
      description: "Planes y seguimiento adaptados a cada etapa, con Nutrición Pediátrica y Personalización de Plantillas para dejar tus formatos listos.",
      badge: "Nutrición Pediátrica en PREMIUM"
    },
    {
      id: "teams",
      icon: "ph-users-three",
      title: "Grupos y empresas",
      description: "Atención en Grupos y Sistema de Referidos desde PREMIUM; con Clínica se suman Gestión de Equipo, Multi-nutricionista y Marca Personalizada.",
      badge: "Equipos en Clínica"
    }
  ],
  features: {
    steps: [
      {
        step: "01",
        label: "Paso 01",
        title: "Consolidá antecedentes e historia clínica",
        description: "Toda la información del paciente organizada desde el primer día: desde hábitos y antecedentes hasta el motivo de consulta.",
        icon: "ph-user-list",
        checklist: ["Historial Clínico Unificado", "Antecedentes y Hábitos"]
      },
      {
        step: "02",
        label: "Paso 02",
        title: "Medí con método",
        description: "Las mediciones y los cálculos salen de la plataforma, no de una calculadora aparte.",
        icon: "ph-ruler",
        checklist: ["Cálculo Antropométrico", "Base de Alimentos Completa"]
      },
      {
        step: "03",
        label: "Paso 03",
        title: "Armá el plan alimentario y las compras",
        description: "El menú, los intercambios y la lista de compras se generan desde el mismo plan y salen listos para entregar.",
        icon: "ph-fork-knife",
        checklist: ["Menús y Planes de Alimentación", "Listas de Intercambio", "Listas de Compras Automáticas"],
        image: "https://images.pexels.com/photos/15319038/pexels-photo-15319038.jpeg?auto=compress&cs=tinysrgb&w=1400"
      },
      {
        step: "04",
        label: "Paso 04",
        title: "Compartí el plan y seguí de cerca",
        description: "Tu paciente entra a ver su plan y vos retomás la consulta con el historial completo a mano.",
        icon: "ph-device-mobile",
        checklist: ["App/Portal para Pacientes", "Portal público con tu perfil de nutricionista"]
      }
    ],
    specialtiesTagCloud: [
      "Plantillas de Dietas",
      "Personalización de Plantillas",
      "Portafolios Digitales",
      "Nutrición Deportiva",
      "Nutrición Pediátrica",
      "Sistema de Referidos",
      "Atención en Grupos"
    ]
  },
  aiAssistant: {
    name: "Eggder Copilot",
    description: "Funciones, planes y Campus",
    initialChat: [
      {
        id: "msg-1",
        sender: "assistant",
        text: "¡Hola! Soy Eggder Copilot, el asistente inteligente de Nutringest. ¿Querés que te explique qué incluye cada plan?"
      },
      {
        id: "msg-2",
        sender: "user",
        text: "¿Cuál me conviene si trabajo sola en mi consultorio?"
      },
      {
        id: "msg-3",
        sender: "assistant",
        text: "Si trabajás sola, PRO cubre tu consultorio individual. Si además usás plantillas, nutrición deportiva o pediátrica, PREMIUM suma esas herramientas. Las dos tienen 14 días de prueba."
      }
    ]
  },
  exchangeRate: {
    rate: 36.5,
    currency: "USD/VES",
    rateFormatted: "36.50 Bs/USD",
    source: "Banco Central de Venezuela (BCV)",
    lastUpdated: "2026-09-27"
  }
};

export async function GET() {
  try {
    return NextResponse.json(LANDING_DATA_FALLBACK, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
      }
    });
  } catch (error: any) {
    console.error("Error serving landing page data:", error);
    return NextResponse.json(LANDING_DATA_FALLBACK, { status: 500 });
  }
}
