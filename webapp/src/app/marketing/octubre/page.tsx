'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Target,
  Video,
  Layers,
  Zap,
  Share2,
  BookOpen,
  Users,
  Award,
  Calendar,
  DollarSign,
  Smartphone,
  Activity,
  FileText,
  MessageSquare,
  ShoppingCart,
  ChevronRight,
  Copy,
  Check,
  Search,
  Play,
  Lightbulb,
  Send,
  Clock,
  HelpCircle,
  LucideIcon,
  CheckSquare,
  Film,
  PhoneCall,
  UserCheck,
  Briefcase,
  AlertCircle,
  Globe,
  GraduationCap,
  Building
} from 'lucide-react';

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export type BriefStatus = 'pendiente' | 'en_produccion' | 'publicado';

export interface BenefitPillar {
  id: number;
  title: string; // Funcionalidad real auditada
  category: string;
  icon: LucideIcon;
  painPoint: string; // Dolor que ataca
  keyBenefit: string; // Beneficio clave
  commAngle: string; // Ángulo de comunicación
  targetAudience: 'Nutricionistas' | 'Clínicas' | 'Ambos';
}

export interface PostFormat {
  title: string;
  slides: string[];
  caption: string;
  cta: string;
}

export interface ReelRecordingScript {
  duration: string;
  hook: string; // Hook (0-5s)
  development: string; // Desarrollo (5-30s)
  nutringestScreen: string; // Pantalla a mostrar en Nutringest
  cta: string; // Call to Action (30-45s)
  visualDirections: string;
  suggestedAudio: string;
}

export interface WhatsappFormat {
  storiesSequence: string[];
  stickerInteractive: string;
  ctaAction: string;
}

export interface ContentBrief {
  id: number;
  pillarId: number;
  pillarTitle: string;
  painPoint: string;
  solution: string;
  title: string;
  category: string;
  post: PostFormat;
  reel: ReelRecordingScript;
  whatsapp: WhatsappFormat;
}

export interface TutorialVideoSpec {
  stepNumber: number;
  title: string; // Título sugerido
  duration: string; // Duración estimada
  screensToRecord: string[]; // Pantallas de Nutringest a grabar
  mandatoryTalkingPoints: string[]; // Puntos hablados obligatorios
  actionItem: string;
}

export interface TutorialTrack {
  id: number;
  trackName: string;
  badge: string;
  description: string;
  totalTime: string;
  steps: TutorialVideoSpec[];
}

export interface QuickReplyScript {
  id: string;
  title: string;
  trigger: string; // Disparador / Palabra clave
  category: string;
  script: string;
  followUpAdvice: string;
}

// ==========================================
// 1. MATRIZ DE BENEFICIOS (10 PILARES AUDITADOS 100% REALES)
// ==========================================

const BENEFIT_PILLARS: BenefitPillar[] = [
  {
    id: 1,
    title: 'Creador Inteligente de Planes Nutricionales y Macros',
    category: 'Productividad & IA',
    icon: Zap,
    painPoint: 'Pérdida de 2+ horas diarias diseñando menús y ajustando macros manualmente en Excel.',
    keyBenefit: 'Generación automática de planes calculados (GEB/GET) por tomas en < 3 minutos.',
    commAngle: 'Ahorro masivo de tiempo para escalar consultas sin trabajar horas extra.',
    targetAudience: 'Ambos'
  },
  {
    id: 2,
    title: 'Historias Clínicas Especializadas (Deportiva, Pediátrica y Fórmulas)',
    category: 'Gestión Clínica',
    icon: FileText,
    painPoint: 'Fórmulas y anamnesis genéricas que no contemplan deportistas de alto rendimiento o nutrición infantil.',
    keyBenefit: 'Módulos dedicados para Historia Deportiva, Historia Pediátrica y cálculo preciso de Fórmulas Infantiles.',
    commAngle: 'Atención especializada de alto nivel adaptada a las necesidades reales de cada tipo de paciente.',
    targetAudience: 'Nutricionistas'
  },
  {
    id: 3,
    title: 'Antropometría ISAK y Evolución (Somatocarta y Curvas)',
    category: 'Evaluación Corporal',
    icon: Activity,
    painPoint: 'Calculadoras manuales lentas para pliegues, perímetros, diámetros y gráficos de crecimiento infantiles.',
    keyBenefit: 'Registro completo ISAK con Somatocarta 2D (Heath-Carter) y curvas de crecimiento pediátrico automáticas.',
    commAngle: 'Posicionamiento como profesional de élite con reportes visuales de impacto inmediato.',
    targetAudience: 'Nutricionistas'
  },
  {
    id: 4,
    title: 'Perfil Público / Portfolio del Nutricionista (/nutri/[username])',
    category: 'Posicionamiento & Web',
    icon: Globe,
    painPoint: 'No contar con una web profesional propia para proyectar autoridad, captar pacientes y recibir mensajes.',
    keyBenefit: 'Página web pública personalizada con presentación, botón directo a WhatsApp y solicitud de citas.',
    commAngle: 'Tu vitrina digital profesional para convertir visitantes de redes en pacientes agendados.',
    targetAudience: 'Ambos'
  },
  {
    id: 5,
    title: 'Comunidad y Red Social de Nutricionistas',
    category: 'Comunidad & Networking',
    icon: Users,
    painPoint: 'Aislamiento profesional sin un canal seguro para intercambiar casos, artículos científicos y networking.',
    keyBenefit: 'Red social integrada para publicar artículos científicos, debatir casos clínicos y conectar entre colegas.',
    commAngle: 'Crece junto a una red activa de profesionales de la salud nutricional.',
    targetAudience: 'Nutricionistas'
  },
  {
    id: 6,
    title: 'Nutrición e Alimentación Institucional (Comedores y Menús Masivos)',
    category: 'Nutrición Institucional',
    icon: Building,
    painPoint: 'Dificultad para gestionar planes de alimentación masivos para empresas o comedores corporativos.',
    keyBenefit: 'Cálculos automatizados para comedores empresariales y menús colectivos masivos por colaborador.',
    commAngle: 'Abre nuevas líneas de negocio atendiendo clientes corporativos e institucionales.',
    targetAudience: 'Ambos'
  },
  {
    id: 7,
    title: 'Marketplace Nutricional',
    category: 'Marketplace & Recursos',
    icon: ShoppingCart,
    painPoint: 'Falta de recursos pre-diseñados y pérdida de tiempo creando plantillas y recetarios desde cero.',
    keyBenefit: 'Catálogo colaborativo para compartir y adquirir plantillas, recetas y herramientas validadas.',
    commAngle: 'Monetiza tu material o acelera tu consulta aprovechando recursos de la comunidad.',
    targetAudience: 'Nutricionistas'
  },
  {
    id: 8,
    title: 'Convenios Universitarios & Campus',
    category: 'Convenios & Beneficios',
    icon: GraduationCap,
    painPoint: 'Falta de estrategias para captar estudiantes universitarios y gestionar beneficios educativos.',
    keyBenefit: 'Módulo de gestión de cupones, descuentos y alianzas con universidades y campus.',
    commAngle: 'Conecta con la comunidad universitaria y expande tu volumen de consultas jóvenes.',
    targetAudience: 'Ambos'
  },
  {
    id: 9,
    title: 'Portal y App Móvil Dedicada para el Paciente',
    category: 'Adherencia & Retención',
    icon: Smartphone,
    painPoint: 'Deserción a la 2ª semana por falta de seguimiento y dietas olvidadas en hojas impresas.',
    keyBenefit: 'App interactiva en iOS/Android con diario fotográfico, registro de agua y plan en el bolsillo.',
    commAngle: 'Multiplica por 2.5x la adherencia y experiencia del paciente con tu marca en su smartphone.',
    targetAudience: 'Ambos'
  },
  {
    id: 10,
    title: 'Dashboard Financiero, Paquetes y Control de Caja',
    category: 'Finanzas & Negocio',
    icon: DollarSign,
    painPoint: 'Falta de visibilidad sobre ingresos netos, cobros pendientes y rentabilidad de consultas.',
    keyBenefit: 'Dashboard de caja diaria, seguimiento de venta de paquetes e ingresos consolidados.',
    commAngle: 'Toma el control financiero total de tu práctica profesional y proyecta ingresos.',
    targetAudience: 'Clínicas'
  }
];

// ==========================================
// 2. 10 BRIEFS DE CONTENIDO LISTOS PARA EJECUTAR
// ==========================================

const CONTENT_BRIEFS: ContentBrief[] = [
  {
    id: 1,
    pillarId: 1,
    pillarTitle: 'Creador Inteligente de Planes Nutricionales y Macros',
    painPoint: 'Pierdo 2 horas diarias armando dietas y calculando macros en Excel',
    solution: 'Generador inteligente de planes en 3 minutos con cálculo automático de GEB/macros',
    title: 'Brief #1: Por qué seguir usando Excel en 2026 está destruyendo tu tiempo',
    category: 'Productividad & IA',
    post: {
      title: 'Carrusel: 5 Razones por las que Excel está frenando el crecimiento de tu consultorio',
      slides: [
        'Slide 1 (Portada): "Si eres nutricionista y sigues usando Excel en 2026, estás perdiendo dinero y tiempo 💸"',
        'Slide 2: "El costo oculto: 2 horas por paciente combinando fórmulas manuales y corrigiendo calorías a mano."',
        'Slide 3: "El problema real: Cuando quieres escalar a 10 pacientes diarios, el día simplemente no te alcanza."',
        'Slide 4: "La solución moderna: Con Nutringest seleccionas requerimientos, ajustas equivalentes y el plan está listo en 3 min."',
        'Slide 5 (CTA): "Comenta la palabra \'PLAN\' y te regalamos 14 días de prueba para automatizar tu consulta."'
      ],
      caption:
        'El tiempo que pasas en planillas es tiempo que no usas para captar más pacientes o descansar. Automatiza lo operativo con Nutringest y enfócate en lo clínico. 🚀 #Nutricionistas #SoftwareNutricion #Productividad',
      cta: 'Comenta "PLAN" en esta publicación para recibir tu enlace demo.'
    },
    reel: {
      duration: '45 segundos',
      hook: 'Si tardas más de 15 minutos en armar un plan de alimentación completo, estás cometiendo un error costoso...',
      development:
        'Muestra el contraste entre el estrés de manipular celdas de Excel vacías versus la velocidad de generar un plan en Nutringest. Explica cómo la plataforma calcula GEB (Mifflin/Harris) y reparte macros por tomas automáticamente.',
      nutringestScreen: 'Pantalla de "Creador de Menús Nutringest": Selección de fórmulas GEB, ajuste de barra de macros y descarga inmediata de PDF.',
      cta: 'Deja de perder horas en planillas. Toca el link de mi perfil y prueba Nutringest gratis hoy mismo.',
      visualDirections: 'Usar pantalla dividida o cronómetro superpuesto comparando Excel (120 min) vs Nutringest (3 min).',
      suggestedAudio: 'Audio trending dinámico de ritmo de alta productividad.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1 (Encuesta): "¿Cuántas horas tardas promedio en armar un plan semanal?" -> [< 15 min ⚡] vs [1 a 2 horas 😫]',
        'Story 2 (Screencast): Video corto del creador de menús de Nutringest calculando macros automáticamente.',
        'Story 3 (CTA): "Prueba la forma inteligente de diseñar dietas en 3 min. Toca este link 📲"'
      ],
      stickerInteractive: 'Encuesta interactiva en Story 1 y Sticker de Enlace en Story 3.',
      ctaAction: 'Responder con la palabra "DEMO" para enviar acceso directo.'
    }
  },
  {
    id: 2,
    pillarId: 2,
    pillarTitle: 'Historias Clínicas Especializadas (Deportiva, Pediátrica y Fórmulas)',
    painPoint: 'Las fichas médicas genéricas no permiten evaluar atletas ni registrar crecimiento pediátrico o fórmulas infantiles',
    solution: 'Expediente digital con historias clínicas especializadas para deportistas, pediatría y cálculo de fórmulas infantiles',
    title: 'Brief #2: De expedientes genéricos a historias clínicas 100% especializadas',
    category: 'Gestión Clínica',
    post: {
      title: 'Carrusel: El riesgo de usar fichas nutricionales genéricas para todos tus pacientes',
      slides: [
        'Slide 1 (Portada): "⚠️ ¿Atiendes atletas o niños con las mismas plantillas que a un adulto sedentario?"',
        'Slide 2: "El problema: Un deportista requiere métricas de rendimiento y un lactante requiere seguimiento de fórmulas e hitos de desarrollo."',
        'Slide 3: "La solución especializada: Nutringest cuenta con Historias Clínicas Pediátricas, Deportivas y Cálculo de Fórmulas Infantiles."',
        'Slide 4: "Centraliza antecedentes de entrenamiento, suplementación y curvas de crecimiento en 1 solo lugar."',
        'Slide 5 (CTA): "Guarda este post y eleva el nivel clínico de tus consultas hoy mismo."'
      ],
      caption:
        'Cada paciente requiere un abordaje único. Con Nutringest dispones de historias clínicas diseñadas a la medida de la nutrición deportiva y pediátrica. 🏆👶 #NutricionDeportiva #NutricionPediatrica #Nutringest',
      cta: 'Guarda este post y visita el link del perfil para conocer la plataforma.'
    },
    reel: {
      duration: '40 segundos',
      hook: 'Si atiendes niños o deportistas en consulta, deja de adaptar fichas de adultos...',
      development:
        'Muestra rápida de la interfaz cambiando entre la Historia Clínica Deportiva (suplementos, cargas) y la Historia Pediátrica (cálculo de fórmulas e hitos de crecimiento) en Nutringest.',
      nutringestScreen: 'Vista de "Historias Especializadas": Selector de Historia Deportiva, Historia Pediátrica y Calculadora de Fórmulas Infantiles.',
      cta: 'Ofrece una consulta especializada de alto valor. Enlace en bio para probar Nutringest.',
      visualDirections: 'Transición dinámica entre equipamiento deportivo, medición infantil e interfaz del software.',
      suggestedAudio: 'Audio profesional e innovador.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1 (Screencast): Selección de Historia Pediátrica y Deportiva en Nutringest.',
        'Story 2: "Historias clínicas diseñadas específicamente para Nutrición Deportiva y Pediatría 📊✨"',
        'Story 3: "¿Quieres ver cómo funcionan las historias especializadas? Escríbeme \'HISTORIAS\'"'
      ],
      stickerInteractive: 'Caja de preguntas: "¿Qué porcentaje de tus pacientes son deportistas o niños?"',
      ctaAction: 'Enviar mensaje privado con la palabra "HISTORIAS".'
    }
  },
  {
    id: 3,
    pillarId: 3,
    pillarTitle: 'Antropometría ISAK y Evolución (Somatocarta y Curvas)',
    painPoint: 'Graficar somatocarta y calcular pliegues, perímetros y curvas pediátricas a mano consume tiempo valioso',
    solution: 'Módulo antropométrico completo con pliegues, Somatocarta 2D e informes de curvas pediátricas',
    title: 'Brief #3: Somatocarta ISAK 2D y curvas de crecimiento en 60 segundos',
    category: 'Evaluación Corporal',
    post: {
      title: 'Carrusel: Cómo entregar informes de composición corporal de nivel olímpico',
      slides: [
        'Slide 1 (Portada): "Sorprende a tus pacientes con reportes ISAK visuales y curvas de crecimiento 📊"',
        'Slide 2: "El problema: Dibujar la somatocarta a mano o entregar tablas de Excel confusas para el paciente."',
        'Slide 3: "La automatización: Digitas pliegues, perímetros y diámetros, y Nutringest genera la Somatocarta 2D al instante."',
        'Slide 4: "Reporte Ejecutivo: Exportación a PDF con gráficos comparativos y curvas de tendencia."',
        'Slide 5 (CTA): "Comenta \'ISAK\' para enviarte una muestra del informe en PDF."'
      ],
      caption:
        'La antropometría no solo mide el cuerpo, vende resultados visuales y tangibles. Impacta a tus pacientes con informes ejecutivos. 🏋️‍♂️ #Antropometria #ISAK #NutricionDeportiva',
      cta: 'Comenta "ISAK" para recibir una muestra del reporte en PDF.'
    },
    reel: {
      duration: '50 segundos',
      hook: 'Si realizas antropometría ISAK y sigues trazando la somatocarta a mano, necesitas ver este video...',
      development:
        'Muestra del cáliper sobre el escritorio. Carga acelerada de pliegues (tríceps, subescapular, supraespinal), perímetros y diámetros en Nutringest. Muestra en tiempo real de cómo el punto del somatotipo se posiciona automáticamente en las coordenadas de la somatocarta.',
      nutringestScreen: 'Pantalla de "Módulo Antropométrico Nutringest": Triángulo de Somatocarta 2D interactivo y botón de Descargar PDF Ejecutivo.',
      cta: 'Eleva el nivel de tus evaluaciones físicas. Prueba el módulo ISAK de Nutringest en el link de la bio.',
      visualDirections: 'Close-up a la digitación de valores de pliegues y zoom in a la Somatocarta 2D generada.',
      suggestedAudio: 'Audio de tendencia tecnológico futurista.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1: Foto llamativa del gráfico de somatocarta 2D generado en Nutringest.',
        'Story 2: "Calcula % de grasa, masa magra y somatotipo de Heath-Carter en automático 🎯"',
        'Story 3: "¿Haces evaluación física? Toca aquí para ver una demostración en vivo."'
      ],
      stickerInteractive: 'Sticker de Enlace directo a la demo antropométrica.',
      ctaAction: 'Clic en el link para solicitar demostración.'
    }
  },
  {
    id: 4,
    pillarId: 4,
    pillarTitle: 'Perfil Público / Portfolio del Nutricionista (/nutri/[username])',
    painPoint: 'No tener una página web profesional propia para mostrar servicios, solicitar citas y recibir mensajes',
    solution: 'Perfil público web personalizado (/nutri/[username]) con botón directo a WhatsApp y solicitud de citas',
    title: 'Brief #4: Tu página web profesional (/nutri/[username]) lista para agendar pacientes',
    category: 'Posicionamiento & Web',
    post: {
      title: 'Carrusel: Por qué todo nutricionista necesita su propio perfil web público en 2026',
      slides: [
        'Slide 1 (Portada): "Transforma tus seguidores de Instagram en pacientes agendados con tu Perfil Público 🌐"',
        'Slide 2: "El problema: Dar solo un número de teléfono en redes genera fricción y dudas en los prospectos."',
        'Slide 3: "Tu vitrina digital: Con Nutringest obtienes tu dirección `/nutri/tu_nombre` lista para compartir."',
        'Slide 4: "Conversión inmediata: Muestra tu especialidad, fotos, testimonios, botón a WhatsApp y solicitud de citas."',
        'Slide 5 (CTA): "Comenta la palabra \'PERFIL\' y activa tu portfolio profesional hoy mismo."'
      ],
      caption:
        'Tu reputación profesional merece una presencia web elegante y funcional. Configura tu perfil `/nutri/[username]` en Nutringest y capta pacientes en automático. 📲 #MarketingParaNutricionistas #PerfilNutri #Nutringest',
      cta: 'Comenta "PERFIL" para recibir información y activar el tuyo.'
    },
    reel: {
      duration: '35 segundos',
      hook: 'Si sigues enviando mensajes largos por DM para explicar tus servicios, necesitas esto...',
      development:
        'Muestra cómo un usuario navega por un perfil `/nutri/lic_maria` desde su celular, ve los servicios ofrecidos y toca el botón directo a WhatsApp para agendar.',
      nutringestScreen: 'Vista previa mobile del "Perfil Público (/nutri/[username])": Foto de portada, especialidad, botón flotante de WhatsApp y agendamiento.',
      cta: 'Crea tu página web profesional en 5 minutos. Enlace en bio para probar Nutringest.',
      visualDirections: 'Scroll fluido en smartphone mostrando la página `/nutri/[username]` y clic en WhatsApp.',
      suggestedAudio: 'Música moderna y limpia de tendencia.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1: Captura de pantalla de un perfil público `/nutri/ejemplo` en el celular.',
        'Story 2: "Tu propio portfolio web con botón a WhatsApp y solicitud de citas en 1 clic 🌐✨"',
        'Story 3: "¿Quieres tu enlace personalizado `/nutri/tu_usuario`? Escríbeme \'WEB\'"'
      ],
      stickerInteractive: 'Sticker de respuesta rápida "WEB".',
      ctaAction: 'Escribir "WEB" por mensaje directo.'
    }
  },
  {
    id: 5,
    pillarId: 5,
    pillarTitle: 'Comunidad y Red Social de Nutricionistas',
    painPoint: 'Aislamiento profesional sin un canal seguro para intercambiar casos, artículos científicos y networking',
    solution: 'Red social integrada para publicar artículos científicos, debatir casos clínicos y conectar entre colegas',
    title: 'Brief #5: Conecta, debate y publica artículos en la Red Social de Nutricionistas',
    category: 'Comunidad & Networking',
    post: {
      title: 'Carrusel: El espacio exclusivo donde los nutricionistas comparten ciencia y experiencias',
      slides: [
        'Slide 1 (Portada): "El networking profesional que faltaba en la nutrición hispanohablante 🤝"',
        'Slide 2: "El aislamiento: Trabajar solo en consultorio dificulta consultar dudas complejas de casos clínicos."',
        'Slide 3: "La comunidad Nutringest: Publica artículos científicos, lee análisis de otros colegas y debate intervenciones."',
        'Slide 4: "Conexión directa: Construye alianzas y mantente actualizado con evidencia científica reciente."',
        'Slide 5 (CTA): "Únete a la comunidad de Nutringest hoy mismo en el enlace del perfil."'
      ],
      caption:
        'Crecer profesionalmente requiere compartir conocimiento y estar al día con la evidencia. Sumate a la comunidad de Nutringest. 🔬📚 #NutricionBasadaEnEvidencia #ComunidadNutricional #Nutringest',
      cta: 'Visita el link en bio para unirte a la red social.'
    },
    reel: {
      duration: '40 segundos',
      hook: '¿Te gustaría debatir casos clínicos complejos con otros colegas nutricionistas en un entorno profesional?',
      development:
        'Demostración del feed de la Red Social de Nutringest: Lectura de un artículo publicado por un colega, comentarios profesionales e interacción en tiempo real.',
      nutringestScreen: 'Pantalla de "Comunidad Nutringest": Feed de artículos, post de evidencias científicas y perfil de profesionales interactuando.',
      cta: 'Sé parte de la red de nutricionistas más activa. Regístrate gratis en el link de la bio.',
      visualDirections: 'Navegación por el feed de artículos y reacciones de colegas.',
      suggestedAudio: 'Audio elegante e inspirador.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1: Captura de pantalla de un artículo publicado en la Comunidad de Nutringest.',
        'Story 2: "Publica artículos científicos y conecta con otros nutricionistas de la región 📖💡"',
        'Story 3: "¿Quieres acceder a la comunidad profesional? Toca aquí."'
      ],
      stickerInteractive: 'Sticker de enlace directo a la Comunidad.',
      ctaAction: 'Clic en el link para explorar la red social.'
    }
  },
  {
    id: 6,
    pillarId: 6,
    pillarTitle: 'Nutrición e Alimentación Institucional (Comedores y Menús Masivos)',
    painPoint: 'Dificultad para gestionar planes de alimentación masivos para empresas o comedores corporativos',
    solution: 'Cálculos automatizados para comedores empresariales y menús colectivos masivos por colaborador',
    title: 'Brief #6: Cómo calcular menús masivos para comedores empresariales sin morir en el intento',
    category: 'Nutrición Institucional',
    post: {
      title: 'Carrusel: El módulo que necesitas para ofrecer servicios a empresas y comedores',
      slides: [
        'Slide 1 (Portada): "Multiplica tus ingresos prestando servicios de Nutrición Institucional a empresas 🏢"',
        'Slide 2: "El desafío: Diseñar menús colectivos y calcular requerimientos para cientos de colaboradores en Excel es un caos."',
        'Slide 3: "Módulo Institucional: Nutringest automatiza la planificación de comedores corporativos y menús masivos."',
        'Slide 4: "Escalabilidad: Administra porciones gigantescas y listas de insumos por tipo de turno laboral."',
        'Slide 5 (CTA): "Comenta \'EMPRESAS\' para conocer cómo estructurar tu propuesta institucional."'
      ],
      caption:
        'La nutrición corporativa es una oportunidad de negocio masiva. Simplifica los cálculos de comedores industriales con Nutringest. 🍲🏭 #NutricionInstitucional #NutricionCorporativa #Nutringest',
      cta: 'Comenta "EMPRESAS" para recibir más información.'
    },
    reel: {
      duration: '40 segundos',
      hook: 'Si te pidieron cotizar o diseñar el menú de un comedor empresarial, no lo hagas a mano...',
      development:
        'Muestra cómo el módulo de Nutrición Institucional calcula cantidades masivas por colaborador y genera la minuta colectiva en cuestión de minutos.',
      nutringestScreen: 'Pantalla de "Nutrición Institucional": Calculadora de comedores empresariales, menús masivos y distribución por turnos.',
      cta: 'Escala tu práctica al sector corporativo. Prueba Nutringest en el link de la bio.',
      visualDirections: 'Imágenes de comedores/empresas alternadas con la interfaz masiva de Nutringest.',
      suggestedAudio: 'Audio de ritmo empresarial moderno.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1: Screenshot del panel de menús masivos para comedores empresariales.',
        'Story 2: "Diseña menús masivos y calculador institucional para comedores corporativos 🏢🥗"',
        'Story 3: "¿Atiendes empresas o comedores? Escríbeme \'INSTITUCIONAL\'"'
      ],
      stickerInteractive: 'Sticker de respuesta rápida "INSTITUCIONAL".',
      ctaAction: 'Escribir "INSTITUCIONAL" por DM.'
    }
  },
  {
    id: 7,
    pillarId: 7,
    pillarTitle: 'Marketplace Nutricional',
    painPoint: 'Falta de recursos pre-diseñados y pérdida de tiempo creando plantillas y recetarios desde cero',
    solution: 'Catálogo colaborativo para compartir y adquirir plantillas, recetas y herramientas validadas',
    title: 'Brief #7: Descubre y monetiza plantillas y recetarios en el Marketplace Nutricional',
    category: 'Marketplace & Recursos',
    post: {
      title: 'Carrusel: 3 Formas de aprovechar el Marketplace de Nutringest en tu consulta',
      slides: [
        'Slide 1 (Portada): "No reinventes la rueda: Accede a plantillas y recetas validadas por colegas 🛒"',
        'Slide 2: "1. Descarga recursos: Encuentra menús temáticos y plantillas creadas por especialistas de la comunidad."',
        'Slide 3: "2. Monetiza tu contenido: Publica tus propias guías y materiales para que otros nutriólogos las adquieran."',
        'Slide 4: "3. Calidad garantizada: Todo el material cumple con estándares nutricionales rigurosos."',
        'Slide 5 (CTA): "Comenta \'MARKET\' para explorar el catálogo oficial."'
      ],
      caption:
        'Ahorra tiempo de diseño o genera ingresos adicionales compartiendo tu talento. Explora el Marketplace Nutricional de Nutringest. 💡📚 #MarketplaceNutricional #RecursosNutricion #Nutringest',
      cta: 'Comenta "MARKET" para recibir acceso al catálogo.'
    },
    reel: {
      duration: '35 segundos',
      hook: '¿Sabías que puedes monetizar tus plantillas de nutrición o descargar materiales listos para usar?',
      development:
        'Recorrido visual por el Marketplace de Nutringest mostrando categorías de recetas, guías educativas y plantillas listas para integrar a la consulta.',
      nutringestScreen: 'Pantalla de "Marketplace Nutricional": Grid de productos, vista previa de plantillas y botón de descarga/compra.',
      cta: 'Descubre y comparte los mejores recursos nutricionales. Enlace en bio.',
      visualDirections: 'Navegación fluida por las tarjetas del Marketplace con animaciones de selección.',
      suggestedAudio: 'Audio de tendencia alegre y dinámico.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1: Muestra de una plantilla destacada dentro del Marketplace Nutricional.',
        'Story 2: "Accede a recetarios, plantillas y herramientas validadas en nuestro Marketplace 🛒✨"',
        'Story 3: "Toca aquí para explorar los recursos disponibles."'
      ],
      stickerInteractive: 'Sticker de Enlace directo al Marketplace.',
      ctaAction: 'Ingresar al Marketplace.'
    }
  },
  {
    id: 8,
    pillarId: 8,
    pillarTitle: 'Convenios Universitarios & Campus',
    painPoint: 'Falta de estrategias para captar estudiantes universitarios y gestionar beneficios educativos',
    solution: 'Módulo de gestión de cupones, descuentos y alianzas con universidades y campus',
    title: 'Brief #8: Atrae estudiantes y gestiona cupones con el Módulo de Convenios Campus',
    category: 'Convenios & Beneficios',
    post: {
      title: 'Carrusel: Cómo conectar tu consultorio con la comunidad universitaria de tu ciudad',
      slides: [
        'Slide 1 (Portada): "Llena tus horas libres ofreciendo convenios y beneficios a estudiantes universitarios 🎓"',
        'Slide 2: "El mercado universitario: Los jóvenes buscan asesoría nutricional pero requieren tarifas accesibles o cupones."',
        'Slide 3: "Módulo Campus: Nutringest te permite validar cupones y beneficios estudiantiles de convenios al instante."',
        'Slide 4: "Fidelización: Construye relaciones con futuros profesionales desde sus años de estudio."',
        'Slide 5 (CTA): "Guarda este post y descubre cómo activar convenios campus."'
      ],
      caption:
        'Los estudiantes universitarios son una excelente fuente de pacientes recurrentes. Gestiona cupones y convenios fácilmente con Nutringest. 🎓🍎 #ConveniosUniversitarios #NutricionCampus #Nutringest',
      cta: 'Guarda el post y visita el enlace del perfil.'
    },
    reel: {
      duration: '35 segundos',
      hook: 'Si quieres captar pacientes universitarios sin enredarte con códigos y cupones de descuento...',
      development:
        'Demostración de la validación de cupones universitarios y la aplicación automática de beneficios de convenios campus en la ficha del paciente.',
      nutringestScreen: 'Pantalla de "Convenios & Campus": Registro de alianzas universitarias, validador de cupones y listado de becados/beneficiarios.',
      cta: 'Activa tus alianzas universitarias con Nutringest. Link en bio.',
      visualDirections: 'Transición entre entorno campus/estudiantes y el módulo de convenios en pantalla.',
      suggestedAudio: 'Audio universitario/juvenil de tendencia.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1: Gráfico interactivo sobre beneficios estudiantiles y convenios universitarios.',
        'Story 2: "Gestiona cupones y convenios con facultades de forma súper organizada 🎓✨"',
        'Story 3: "¿Quieres saber más de los Convenios Campus? Haz clic aquí."'
      ],
      stickerInteractive: 'Sticker de Enlace directo al módulo.',
      ctaAction: 'Clic en el link para solicitar demo.'
    }
  },
  {
    id: 9,
    pillarId: 9,
    pillarTitle: 'Portal y App Móvil Dedicada para el Paciente',
    painPoint: 'Los pacientes abandonan el tratamiento a la segunda semana por falta de motivación y dietas impresas en papel',
    solution: 'Portal interactivo del paciente en App móvil con diario fotográfico y canal directo',
    title: 'Brief #9: Cómo lograr que el 90% de tus pacientes no abandonen su plan',
    category: 'Adherencia & Retención',
    post: {
      title: 'Carrusel: La razón número 1 por la que los pacientes no regresan a la 2ª consulta',
      slides: [
        'Slide 1 (Portada): "El 60% de los pacientes abandona su tratamiento nutricional por esta simple razón 📉"',
        'Slide 2: "El error tradicional: Entregar una hoja impresa o un PDF estático que termina arrugado en un cajón."',
        'Slide 3: "El nuevo estándar: Acompañamiento interactivo 24/7 a través de la App del paciente de Nutringest."',
        'Slide 4: "Funciones clave: Diario visual de comidas, registro de agua y consulta de plan desde el smartphone."',
        'Slide 5 (CTA): "Guarda este post y descubre cómo ofrecer una experiencia de cliente Elite."'
      ],
      caption:
        'La adherencia no se logra dando más teoría, sino facilitando la ejecución diaria. Pon tu marca en el smartphone de tu paciente con Nutringest. 💚 #AppNutricion #Adherencia #Nutringest',
      cta: 'Guarda la publicación para tu plan de fidelización.'
    },
    reel: {
      duration: '40 segundos',
      hook: 'Tus pacientes no rompen la dieta por falta de voluntad... la rompen porque tu plan no los acompaña día a día.',
      development:
        'Contraste visual entre una persona confundida con una hoja de papel doblada vs una persona feliz tomando foto a su plato de comida y subiéndola a la App Nutringest en 3 segundos.',
      nutringestScreen: 'Vista previa de la "App del Paciente (Mobile View)": Diario visual de fotos de platos, progreso de hidratación y consulta de menú.',
      cta: 'Dale a tus pacientes una App personalizada. Link en bio para iniciar.',
      visualDirections: 'Split Screen: "Método Antiguo (Papel)" vs "Método Nutringest (App Móvil)".',
      suggestedAudio: 'Música inspiradora de ritmo positivo.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1: Grabación de pantalla navegando por la App del paciente desde un celular.',
        'Story 2: "Tus pacientes consultan su plan, suben fotos de sus comidas y ven su progreso desde la App 📱✨"',
        'Story 3: "¿Quieres ofrecerle esta App a tus pacientes? Escríbeme \'APP\'"'
      ],
      stickerInteractive: 'Sticker de respuesta rápida con palabra clave "APP".',
      ctaAction: 'Escribir "APP" por mensaje directo.'
    }
  },
  {
    id: 10,
    pillarId: 10,
    pillarTitle: 'Dashboard Financiero, Paquetes y Control de Caja',
    painPoint: 'No sé con certeza cuánto dinero ingresa o cuál es la rentabilidad neta de mi práctica nutricional',
    solution: 'Dashboard financiero en tiempo real con control de pagos, paquetes e ingresos netos',
    title: 'Brief #10: Control de caja, venta de paquetes y finanzas claras para tu consulta',
    category: 'Finanzas & Negocio',
    post: {
      title: 'Carrusel: 3 Métricas financieras que todo nutricionista exitoso debe medir',
      slides: [
        'Slide 1 (Portada): "Si no mides los números de tu consulta, no tienes un negocio, tienes un pasatiempo 📈"',
        'Slide 2: "1. Ticket Promedio por Paciente: ¿Cuánto invierte un cliente durante todo su tratamiento?"',
        'Slide 3: "2. Tasa de Conversión a Paquetes: Dejar de vender consultas sueltas e impulsar programas de 3 meses."',
        'Slide 4: "3. Dashboard Nutringest: Visualiza ingresos netos, cuentas pendientes y caja diaria en tiempo real."',
        'Slide 5 (CTA): "Comenta \'FINANZAS\' y te enviamos un recurso de gestión para tu consultorio."'
      ],
      caption:
        'Tener pasión por la nutrición es maravilloso, pero administrar tus finanzas profesionalmente asegura la sostenibilidad de tu consulta. 💼 #FinanzasMedicas #GestionNutricional #Nutringest',
      cta: 'Comenta "FINANZAS" para recibir el recurso educativo.'
    },
    reel: {
      duration: '45 segundos',
      hook: 'El error financiero número 1 de los nutricionistas al administrar su consulta...',
      development:
        'Hablando a cámara sobre el peligro de cobrar consulta por consulta sin saber cuánto se va a facturar el próximo mes. Demostración del panel financiero de Nutringest para crear paquetes y rastrear cobros.',
      nutringestScreen: 'Pantalla de "Dashboard Financiero Nutringest": Gráficos de barra de ingresos mensuales, control de deudores y ventas por paquete.',
      cta: 'Administra tu consulta como una empresa próspera. Prueba el dashboard de Nutringest.',
      visualDirections: 'Gráficos interactivos de ingresos en pantalla con overlay de métricas.',
      suggestedAudio: 'Audio de negocios y mentalidad de crecimiento.'
    },
    whatsapp: {
      storiesSequence: [
        'Story 1 (Encuesta): "¿Llevas el control financiero exacto de tu consulta?" -> [Sí, al centavo 📊] vs [No, es un lío 🙈]',
        'Story 2: Captura del panel de control financiero de Nutringest.',
        'Story 3: "Toma el control total de tus ingresos. Toca el link para conocer más."'
      ],
      stickerInteractive: 'Encuesta interactiva en Story 1 y Link en Story 3.',
      ctaAction: 'Hacer clic para solicitar asesoría de gestión.'
    }
  }
];

// ==========================================
// 3. ROADMAPS DE TUTORIALES (FICHAS TÉCNICAS REALES)
// ==========================================

const TUTORIAL_TRACKS: TutorialTrack[] = [
  {
    id: 1,
    trackName: 'Ruta 1: Onboarding, Perfil Público (/nutri/[username]) & Convenios Campus',
    badge: 'Nivel 1: Inicial / Imprescindible',
    description: 'Paso a paso para configurar tu perfil profesional, activar tu vitrina web pública con WhatsApp y gestionar convenios universitarios.',
    totalTime: '24 min total (4 Módulos)',
    steps: [
      {
        stepNumber: 1,
        title: 'Video 1.1: Registro de Cuenta y Configuración de Perfil Profesional',
        duration: '5 min video',
        screensToRecord: [
          'Panel de Ajustes > Perfil Profesional',
          'Carga de Logotipo Institucional (PNG HD)',
          'Firma Digitalizada e Información de Matrícula'
        ],
        mandatoryTalkingPoints: [
          'Explicar la importancia de la firma digitalizada para recetas y planes.',
          'Demostrar cómo el logotipo aparece automáticamente en el encabezado de los PDF.',
          'Configurar teléfono y correo oficial de contacto.'
        ],
        actionItem: 'Carga tu logo profesional y firma digital en la sección de Perfil.'
      },
      {
        stepNumber: 2,
        title: 'Video 1.2: Perfil Público / Portfolio (/nutri/[username]) y Botón a WhatsApp',
        duration: '6 min video',
        screensToRecord: [
          'Ajustes > Perfil Público (/nutri/[username])',
          'Configuración de Bio, Fotografía de Portada y Especialidades',
          'Vinculación de Botón Directo a WhatsApp y Solicitud de Citas'
        ],
        mandatoryTalkingPoints: [
          'Demostrar cómo activar y personalizar la URL pública `/nutri/[username]`.',
          'Mostrar el funcionamiento del botón flotante directo a WhatsApp.',
          'Configurar la sección de presentación y especialidades clínicas.'
        ],
        actionItem: 'Personaliza y comparte tu enlace público `/nutri/[username]`.'
      },
      {
        stepNumber: 3,
        title: 'Video 1.3: Catálogo de Servicios, Tarifas y Estructura de Paquetes',
        duration: '7 min video',
        screensToRecord: [
          'Configuración > Servicios y Tarifas',
          'Creación de Servicio (Primera vez, Control, Antropometría)',
          'Estructura de Paquete de 3 Meses'
        ],
        mandatoryTalkingPoints: [
          'Recomendar la venta de paquetes de seguimiento para elevar la retención.',
          'Asignar duraciones fijas (30, 45, 60 min) para la atención.',
          'Configurar la moneda de cobro local y métodos de pago.'
        ],
        actionItem: 'Registra tus 3 servicios principales con precios y duraciones.'
      },
      {
        stepNumber: 4,
        title: 'Video 1.4: Convenios Universitarios & Campus: Gestión de Cupones',
        duration: '6 min video',
        screensToRecord: [
          'Módulo Convenios & Campus',
          'Creación de Convenio Universitario / Facultad',
          'Validador de Cupones de Descuento para Estudiantes'
        ],
        mandatoryTalkingPoints: [
          'Explicar el potencial de captar pacientes en campus universitarios.',
          'Demostrar cómo generar y validar cupones de descuento exclusivos.',
          'Monitorear las consultas agendadas bajo alianzas académicas.'
        ],
        actionItem: 'Crea tu primer convenio universitario de prueba con cupón.'
      }
    ]
  },
  {
    id: 2,
    trackName: 'Ruta 2: Historias Especializadas, Antropometría ISAK y Curvas',
    badge: 'Nivel 2: Intermedio / Práctica Clínica',
    description: 'Aprende a gestionar la anamnesis digital, historias clínicas para deportistas y pediatría, gráficos ISAK y curvas de crecimiento.',
    totalTime: '35 min total (4 Módulos)',
    steps: [
      {
        stepNumber: 1,
        title: 'Video 2.1: Alta Express de Paciente y Pre-Anamnesis Digital',
        duration: '7 min video',
        screensToRecord: [
          'Módulo Pacientes > Alta Express',
          'Envío de Link de Cuestionario Pre-Anamnesis',
          'Recepción de Respuestas en la Ficha del Paciente'
        ],
        mandatoryTalkingPoints: [
          'Demostrar cómo enrolar un nuevo paciente en menos de 30 segundos.',
          'Explicar el beneficio de enviar la pre-anamnesis antes de la consulta.',
          'Revisar las respuestas ingresadas en la ficha digital.'
        ],
        actionItem: 'Crea tu primer paciente de prueba y envía la pre-anamnesis.'
      },
      {
        stepNumber: 2,
        title: 'Video 2.2: Historias Especializadas: Historia Deportiva, Pediátrica y Fórmulas',
        duration: '8 min video',
        screensToRecord: [
          'Expediente Digital > Pestaña Historia Deportiva',
          'Pestaña Historia Pediátrica',
          'Calculadora de Fórmulas Infantiles'
        ],
        mandatoryTalkingPoints: [
          'Mostrar el registro de datos de entrenamiento y suplementación deportiva.',
          'Explicar el diligenciamiento de la historia clínica pediátrica.',
          'Demostrar el cálculo de dilución y calorías en fórmulas infantiles.'
        ],
        actionItem: 'Diligencia una historia deportiva y una fórmula infantil de prueba.'
      },
      {
        stepNumber: 3,
        title: 'Video 2.3: Módulo Antropométrico ISAK (Pliegues, Perímetros y Somatocarta 2D)',
        duration: '12 min video',
        screensToRecord: [
          'Expediente > Módulo Antropometría ISAK',
          'Formulario de Pliegues, Perímetros y Diámetros',
          'Gráfico de Somatocarta 2D de Heath-Carter y Exportación PDF'
        ],
        mandatoryTalkingPoints: [
          'Explicar la selección de fórmulas de % de grasa según el perfil del paciente.',
          'Demostrar cómo la somatocarta se dibuja automáticamente en tiempo real.',
          'Descargar y mostrar el acabado ejecutivo del reporte en PDF.'
        ],
        actionItem: 'Ingresa una toma de pliegues ficticia y exporta el informe PDF.'
      },
      {
        stepNumber: 4,
        title: 'Video 2.4: Curvas de Crecimiento Pediátrico, Fotos Comparativas y Notas SOAP',
        duration: '8 min video',
        screensToRecord: [
          'Expediente > Curvas de Crecimiento OMS Pediátricas',
          'Comparador de Fotos de Progreso (Antes / Después)',
          'Editor de Notas Clínicas SOAP'
        ],
        mandatoryTalkingPoints: [
          'Mostrar la evolución en las curvas de crecimiento percentilado.',
          'Explicar el uso privado de las fotos de avance corporal.',
          'Estructurar las notas de seguimiento bajo el formato profesional SOAP.'
        ],
        actionItem: 'Registra una toma de control y revisa las curvas de crecimiento.'
      }
    ]
  },
  {
    id: 3,
    trackName: 'Ruta 3: Creador de Menús, Nutrición Institucional y App del Paciente',
    badge: 'Nivel 3: Avanzado / Diseño Nutricional',
    description: 'Aprende a diseñar menús calculados en 3 minutos, gestionar alimentación masiva institucional y conectar la App del Paciente.',
    totalTime: '40 min total (4 Módulos)',
    steps: [
      {
        stepNumber: 1,
        title: 'Video 3.1: Cálculo Energético y Distribución de Macronutrientes',
        duration: '8 min video',
        screensToRecord: [
          'Creador de Menús > Calculador GEB / GET',
          'Ajuste de Macronutrientes (% VCT y g/kg)',
          'Configuración de Tiempos de Comida'
        ],
        mandatoryTalkingPoints: [
          'Seleccionar fórmulas GEB (Mifflin-St Jeor, Harris-Benedict, Cunningham).',
          'Ajustar la distribución de macros por objetivo (Déficit, Mantenimiento, Superávit).',
          'Establecer el número de tomas diarias recomendadas.'
        ],
        actionItem: 'Fija una meta calórica de 2,000 kcal y reparte los macronutrientes.'
      },
      {
        stepNumber: 2,
        title: 'Video 3.2: Selección de Alimentos, Recetas Propias y Reglas de Sustitución',
        duration: '12 min video',
        screensToRecord: [
          'Creador de Menús > Buscador de Alimentos Validado',
          'Módulo de Recetas Propias',
          'Configuración de Alimentos Sustitutos Inteligentes'
        ],
        mandatoryTalkingPoints: [
          'Búsqueda ultra-rápida de insumos en la base de alimentos validados.',
          'Integración de preparaciones personalizadas de la clínica.',
          'Habilitar reglas de intercambio para que el paciente elija alternativas.'
        ],
        actionItem: 'Crea una receta propia (ej. Pancakes de Avena) e intégrala al menú.'
      },
      {
        stepNumber: 3,
        title: 'Video 3.3: Nutrición e Alimentación Institucional (Comedores y Menús Masivos)',
        duration: '10 min video',
        screensToRecord: [
          'Módulo Nutrición Institucional',
          'Calculadora para Comedores Empresariales por Colaborador',
          'Generación de Menús Masivos y Minutas Colectivas'
        ],
        mandatoryTalkingPoints: [
          'Configurar planes masivos para empresas o servicios de alimentación.',
          'Calcular requerimientos y raciones masivas por turno.',
          'Exportar reportes de insumos para compras institucionales.'
        ],
        actionItem: 'Simula un plan de comedor empresarial para 50 colaboradores.'
      },
      {
        stepNumber: 4,
        title: 'Video 3.4: Envío de Credenciales y Sincronización con App Móvil del Paciente',
        duration: '10 min video',
        screensToRecord: [
          'Módulo Paciente > Activar Credenciales App Móvil',
          'Vista de la App Móvil del Paciente (Diario Fotográfico y Agua)',
          'Recepción y Respuesta de Comentarios en el Panel'
        ],
        mandatoryTalkingPoints: [
          'Enviar credenciales de acceso a la App por WhatsApp o correo en 1 clic.',
          'Explicar al paciente cómo cargar fotos de sus platos y registrar agua.',
          'Monitorear la interacción y dar feedback profesional desde la plataforma.'
        ],
        actionItem: 'Simula el inicio de sesión en la App del paciente desde tu celular.'
      }
    ]
  },
  {
    id: 4,
    trackName: 'Ruta 4: Red Social, Marketplace Nutricional y Finanzas',
    badge: 'Nivel 4: Masterclass / Redes & Negocio',
    description: 'Participa en la comunidad científica, publica/descarga en el Marketplace y gestiona la caja de tu consulta.',
    totalTime: '30 min total (4 Módulos)',
    steps: [
      {
        stepNumber: 1,
        title: 'Video 4.1: Publicación de Artículos Científicos en la Red Social de Nutricionistas',
        duration: '7 min video',
        screensToRecord: [
          'Comunidad Nutringest > Publicar Artículo',
          'Editor de Texto y Carga de Referencias Científicas',
          'Interacción y Comentarios entre Profesionales'
        ],
        mandatoryTalkingPoints: [
          'Demostrar cómo redactar y publicar un post científico o caso de estudio.',
          'Mostrar la interacción con comentarios de otros nutricionistas.',
          'Fomentar la construcción de autoridad profesional dentro de la red.'
        ],
        actionItem: 'Publica tu primer post o comentario en la Red Social de Nutricionistas.'
      },
      {
        stepNumber: 2,
        title: 'Video 4.2: Marketplace Nutricional: Publicar y Descargar Recursos',
        duration: '8 min video',
        screensToRecord: [
          'Módulo Marketplace Nutricional',
          'Búsqueda y Descarga de Plantillas / Recetarios de Colegas',
          'Formulario de Publicación de Material Propio'
        ],
        mandatoryTalkingPoints: [
          'Explorar el catálogo de recursos creados por otros profesionales.',
          'Explicar los pasos para subir un material propio al Marketplace.',
          'Integrar plantillas adquiridas directamente al creador de menús.'
        ],
        actionItem: 'Explora el Marketplace y descarga un recurso de prueba.'
      },
      {
        stepNumber: 3,
        title: 'Video 4.3: Dashboard Financiero, Registro de Pagos y Caja Diaria',
        duration: '8 min video',
        screensToRecord: [
          'Módulo Finanzas > Dashboard de Caja',
          'Registro de Cobros de Paquetes y Consultas',
          'Cierre de Caja Diaria y Balance de Ingresos'
        ],
        mandatoryTalkingPoints: [
          'Registrar cobros en efectivo, transferencia o pasarela de pago.',
          'Rastrear cuotas pendientes de programas o paquetes vendidos.',
          'Visualizar el resumen de ingresos diarios y mensuales.'
        ],
        actionItem: 'Registra el cobro simulado de un paquete de consultas.'
      },
      {
        stepNumber: 4,
        title: 'Video 4.4: Métricas Analíticas de Retención y Seguimiento de Pacientes',
        duration: '7 min video',
        screensToRecord: [
          'Módulo Analytics > Métricas de Retención',
          'Filtro de Pacientes Activos vs Inactivos',
          'Canales Directos de Contacto vía WhatsApp'
        ],
        mandatoryTalkingPoints: [
          'Analizar la tasa de retención mensual de pacientes.',
          'Identificar pacientes que no han agendado control en los últimos 30 días.',
          'Enviar mensajes de seguimiento directo por WhatsApp.'
        ],
        actionItem: 'Filtra tu lista de pacientes y prepara un mensaje de seguimiento.'
      }
    ]
  }
];

// ==========================================
// 4. PLANTILLAS DE RESPUESTA RÁPIDA (SCRIPTS VENTAS / DM / WA)
// ==========================================

const QUICK_REPLY_SCRIPTS: QuickReplyScript[] = [
  {
    id: 'script-1',
    title: 'Respuesta Rápida a la palabra clave "PLAN" (Software & Demo)',
    trigger: 'Prospecto comenta "PLAN" en un post o escribe por DM preguntando por el software.',
    category: 'Captación de Prospectos',
    script:
      '¡Hola [Nombre]! 👋 Qué bueno saludarte. Vi que estás interesad@ en optimizar la creación de tus planes nutricionales.\n\n' +
      'Con Nutringest puedes calcular el GEB (Mifflin/Harris), distribuir macros por tomas y generar el menú semanal en PDF + App en menos de 3 minutos ⚡.\n\n' +
      '🎁 Te activé un acceso de prueba gratis por 14 días (sin tarjeta de crédito) para que lo pruebes en tu próxima consulta:\n' +
      '👉 [Enlace de Registro Gratuito]\n\n' +
      '¿Atiendes consultas presenciales, virtuales o ambas? ¡Cuéntame y te guío con la configuración inicial! 😊',
    followUpAdvice: 'Si responde el tipo de consulta, enviar el video tutorial corto de 5 min correspondiente.'
  },
  {
    id: 'script-2',
    title: 'Respuesta Rápida a la palabra clave "ISAK" (Antropometría, Somatocarta & Curvas)',
    trigger: 'Prospecto interesado en el módulo antropométrico o evaluación física.',
    category: 'Venta Especializada',
    script:
      '¡Hola [Nombre]! 📊 Gracias por escribirnos. Nuestro módulo antropométrico ISAK está diseñado exactamente para profesionales exigentes.\n\n' +
      'Al ingresar los pliegues, perímetros y diámetros, Nutringest genera automáticamente:\n' +
      '✅ Somatocarta 2D de Heath-Carter al instante.\n' +
      '✅ Curvas de crecimiento pediátrico percentiladas.\n' +
      '✅ Reportes ejecutivos en PDF de nivel olímpico para impresionar a tus pacientes.\n\n' +
      'Mira una muestra rápida de cómo se ve el reporte aquí: [Link a PDF Ejemplo / Video Short]\n\n' +
      '¿Te gustaría probarlo con tus propios datos de evaluación este fin de semana?',
    followUpAdvice: 'Enviar enlace directo al registro con el módulo antropométrico desplegado.'
  },
  {
    id: 'script-3',
    title: 'Respuesta Rápida a la palabra clave "PERFIL" (Perfil Público /nutri/[username])',
    trigger: 'Prospecto interesado en crear su propia página web profesional.',
    category: 'Posicionamiento Web',
    script:
      '¡Hola [Nombre]! 🌐 Tu Perfil Público `/nutri/[username]` es la mejor forma de proyectar autoridad y captar pacientes desde tus redes sociales.\n\n' +
      'Con tu enlace personal obtienes:\n' +
      '🍏 Tu propia página web con foto, bio y especialidades.\n' +
      '💬 Botón directo a tu WhatsApp profesional.\n' +
      '📅 Formulario de solicitud de citas en 1 clic.\n\n' +
      'Puedes configurar tu perfil en menos de 5 minutos ingresando aquí: [Enlace Demo Perfil]\n\n' +
      '¿Actualmente cuentas con sitio web o usas tus redes sociales para captar consultas?',
    followUpAdvice: 'Enviar ejemplo de perfil activo `/nutri/ejemplo` para demostración visual.'
  },
  {
    id: 'script-4',
    title: 'Respuesta Rápida a "INSTITUCIONAL" (Nutrición Masiva & Comedores)',
    trigger: 'Prospecto interesado en prestar servicios a empresas, comedores o instituciones.',
    category: 'Nutrición Institucional',
    script:
      '¡Hola [Nombre]! 🏢 Nuestro módulo de Nutrición e Alimentación Institucional está diseñado para gestionar menús masivos y comedores empresariales con facilidad.\n\n' +
      'Podrás:\n' +
      '📊 Calcular requerimientos colectivos por grupo o colaborador.\n' +
      '🥗 Diseñar minutas masivas para comedores industriales.\n' +
      '📦 Generar listas de insumos consolidadas para compras masivas.\n\n' +
      'Mira una breve demostración del módulo institucional aquí: [Link Demo Institucional]\n\n' +
      '¿Manejas actualmente algún cliente corporativo o comedor empresarial?',
    followUpAdvice: 'Agendar breve llamada de 10 min si gestiona un contrato corporativo.'
  },
  {
    id: 'script-5',
    title: 'Manejo de Objeción: "Yo ya utilizo plantillas de Excel y me funcionan bien"',
    trigger: 'El prospecto indica que prefiere seguir usando sus archivos de Excel.',
    category: 'Manejo de Objeciones',
    script:
      '¡Entiendo perfectamente [Nombre]! Excel ha sido el aliado histórico de todos los nutricionistas 🙌.\n\n' +
      'Sin embargo, cuando buscas atender a más de 5 o 10 pacientes por semana, Excel presenta 2 problemas invisibles:\n' +
      '1️⃣ Consume entre 1 y 2 horas por paciente en armado manual.\n' +
      '2️⃣ El paciente recibe una hoja estática que suele olvidar en un cajón.\n\n' +
      'Nutringest no reemplaza tu criterio profesional; automatiza el cálculo repetitivo en 3 min y le entrega al paciente una App interactiva en su celular.\n\n' +
      '¿Te parecería bien hacer la prueba con 1 solo paciente esta semana y comparar la diferencia de tiempo?',
    followUpAdvice: 'Ofrecer acompañamiento por WhatsApp de 10 minutos para subir su primer menú.'
  }
];

// ==========================================
// MAIN PLAYBOOK COMPONENT
// ==========================================

export default function MarketingPlaybookPage() {
  const [activeTab, setActiveTab] = useState<'guide' | 'pillars' | 'briefs' | 'tutorials' | 'scripts'>('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFormatTab, setActiveFormatTab] = useState<Record<number, 'post' | 'reel' | 'whatsapp'>>({});
  const [expandedTrack, setExpandedTrack] = useState<number | null>(1);

  // BRIEF CHECKLIST STATUS STATE (Persisted in state)
  const [briefStatus, setBriefStatus] = useState<Record<number, BriefStatus>>({
    1: 'pendiente',
    2: 'en_produccion',
    3: 'pendiente',
    4: 'publicado',
    5: 'pendiente',
    6: 'pendiente',
    7: 'en_produccion',
    8: 'pendiente',
    9: 'pendiente',
    10: 'pendiente'
  });

  const updateBriefStatus = (briefId: number, status: BriefStatus) => {
    setBriefStatus((prev) => ({ ...prev, [briefId]: status }));
  };

  // Copy helper with visual feedback
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to get selected format tab for briefs
  const getFormatTab = (briefId: number) => activeFormatTab[briefId] || 'post';
  const setFormatTab = (briefId: number, tab: 'post' | 'reel' | 'whatsapp') => {
    setActiveFormatTab((prev) => ({ ...prev, [briefId]: tab }));
  };

  // Filter Pillars
  const filteredPillars = useMemo(() => {
    return BENEFIT_PILLARS.filter((pillar) => {
      const matchesSearch =
        pillar.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pillar.painPoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pillar.keyBenefit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pillar.commAngle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || pillar.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Filter Briefs
  const filteredBriefs = useMemo(() => {
    return CONTENT_BRIEFS.filter((brief) => {
      const matchesSearch =
        brief.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brief.painPoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brief.solution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brief.pillarTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || brief.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Filter Quick Reply Scripts
  const filteredScripts = useMemo(() => {
    return QUICK_REPLY_SCRIPTS.filter((s) => {
      return (
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.script.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-indigo-500 selection:text-white">
      {/* BACKGROUND DECORATIVE GRADIENTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* HEADER & BRANDING PLAYBOOK BANNER */}
        <header className="rounded-xl bg-white border border-slate-200 p-6 sm:p-10 shadow-xs shadow-slate-100 mb-8 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Playbook Práctico de Trabajo · Equipo de Marketing
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
                Nutringest <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 bg-clip-text text-transparent">Marketing & Content Operating Playbook</span>
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-3xl leading-relaxed">
                Plantilla de ejecución inmediata con funcionalidades 100% reales auditadas de Nutringest: Matriz de Beneficios, 10 Briefs Listos con Checklist, Guía de Grabación para Tutoriales y Scripts de Ventas.
              </p>
            </div>

            <div className="flex flex-wrap lg:flex-col gap-3 shrink-0">
              <a
                href="#playbook-nav"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-xs"
              >
                <Briefcase className="w-4 h-4" /> Ir a los Briefs de Trabajo
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Funcionalidades Reales Auditadas
              </span>
            </div>
          </div>

          {/* QUICK STATS STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8 pt-6 border-t border-slate-200">
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200">
              <div className="text-xl sm:text-2xl font-bold text-indigo-600">10</div>
              <div className="text-[11px] text-slate-600 font-medium">Pilares de Beneficio</div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200">
              <div className="text-xl sm:text-2xl font-bold text-sky-600">30</div>
              <div className="text-[11px] text-slate-600 font-medium">Briefs por Canal</div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200">
              <div className="text-xl sm:text-2xl font-bold text-emerald-700">100%</div>
              <div className="text-[11px] text-slate-600 font-medium">Guiones con Screens</div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">16</div>
              <div className="text-[11px] text-slate-600 font-medium">Fichas de Tutorial Video</div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200">
              <div className="text-xl sm:text-2xl font-bold text-amber-600">5</div>
              <div className="text-[11px] text-slate-600 font-medium">Scripts de Respuesta DM</div>
            </div>
          </div>
        </header>

        {/* NAVIGATION BAR TABS */}
        <div id="playbook-nav" className="sticky top-4 z-40 mb-8 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-2 shadow-xs shadow-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'guide'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> 1. Guía del Playbook
            </button>
            <button
              onClick={() => setActiveTab('pillars')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'pillars'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" /> 2. Matriz de Beneficios (10)
            </button>
            <button
              onClick={() => setActiveTab('briefs')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'briefs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" /> 3. 10 Briefs & Checklist
            </button>
            <button
              onClick={() => setActiveTab('tutorials')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'tutorials'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Video className="w-4 h-4" /> 4. Guía de Grabación
            </button>
            <button
              onClick={() => setActiveTab('scripts')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'scripts'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> 5. Scripts de Respuesta DM
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar brief, pilar, guion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* SECTION 1: HEADER & GUÍA DE USO DEL PLAYBOOK */}
        {activeTab === 'guide' && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 shadow-xs shadow-slate-100 rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-600" /> Guía de Trabajo Operativo para el Equipo de Marketing
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                Este playbook ha sido estructurado para ser una <strong className="font-semibold text-slate-900">herramienta de producción diaria</strong>. Alineado 100% con el código auditado de Nutringest, elimina la duda de <em>"¿qué publicamos hoy?"</em> y entrega a cada rol la información exacta necesaria para producir sin fricción.
              </p>

              {/* ROLE WORKFLOW CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">1. Content Strategist</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Selecciona el Pilar de Beneficio y Dolor objetivo a atacar. Asigna los Briefs al equipo utilizando los badges de estado.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                    <Film className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">2. Creator / Filmmaker</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sigue el <strong className="text-slate-800">Guion de Grabación</strong> (Hook, Desarrollo, Pantalla Nutringest a mostrar, CTA) y las fichas técnicas de tutoriales.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">3. Graphic Designer</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Toma la estructura exacta de Slides para Carruseles y copia los textos listos con el botón de copiar.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">4. Community Manager</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Responde a los comentarios y DMs (palabras clave "PLAN", "ISAK", "PERFIL", "INSTITUCIONAL") utilizando los Scripts de Respuesta Rápida.
                  </p>
                </div>
              </div>

              {/* STEP BY STEP PLAYBOOK EXECUTION */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600" /> Flujo de Trabajo en 5 Pasos para cada Pieza de Contenido
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-indigo-600 font-bold block mb-1">Paso 1: Elección</span>
                    <p className="text-slate-600">Consulta la Matriz de Beneficios y escoge 1 de los 10 pilares del software.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-sky-600 font-bold block mb-1">Paso 2: Copiado</span>
                    <p className="text-slate-600">Haz clic en <strong>"Copiar Brief Completo"</strong> para transferir la pauta al diseñador o creador.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-emerald-700 font-bold block mb-1">Paso 3: Grabación</span>
                    <p className="text-slate-600">Graba la pantalla exacta de Nutringest según las indicaciones de la Ficha Técnica.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-purple-600 font-bold block mb-1">Paso 4: Estado</span>
                    <p className="text-slate-600">Cambia el badge a <span className="text-sky-700 font-semibold">[En Producción]</span> y luego a <span className="text-emerald-700 font-semibold">[Publicado]</span>.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-amber-600 font-bold block mb-1">Paso 5: Cierre</span>
                    <p className="text-slate-600">Atiende los leads que comenten usando los <strong>Scripts de Ventas por WhatsApp / DM</strong>.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: 10 PILARES DEL PRODUCTO (MATRIZ DE BENEFICIOS) */}
        {activeTab === 'pillars' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs shadow-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" /> Matriz de Beneficios del Producto (10 Pilares Auditados)
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">
                  Resumen ejecutable de funcionalidades 100% reales: Dolor que ataca, Beneficio clave y Ángulo de comunicación.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  'all',
                  'Productividad & IA',
                  'Gestión Clínica',
                  'Evaluación Corporal',
                  'Posicionamiento & Web',
                  'Comunidad & Networking',
                  'Nutrición Institucional',
                  'Marketplace & Recursos',
                  'Convenios & Beneficios',
                  'Adherencia & Retención',
                  'Finanzas & Negocio'
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'Todas las Categorías' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* TABULAR / CARD MATRIX DISPLAY */}
            <div className="space-y-4">
              {filteredPillars.map((pillar) => {
                const IconComp = pillar.icon;
                return (
                  <div
                    key={pillar.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs shadow-slate-100 transition-all"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      {/* COL 1: FUNCIONALIDAD */}
                      <div className="lg:col-span-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Pilar #{pillar.id} · {pillar.category}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                            {pillar.title}
                          </h3>
                          <span className="text-[11px] text-slate-500 inline-block mt-0.5">
                            Audiencia: <strong className="text-slate-800">{pillar.targetAudience}</strong>
                          </span>
                        </div>
                      </div>

                      {/* COL 2: DOLOR QUE ATACA */}
                      <div className="lg:col-span-3 bg-rose-50/60 p-3 rounded-xl border border-rose-200/80">
                        <span className="text-[10px] font-bold uppercase text-rose-700 block mb-1">
                          🔴 Dolor que Ataca:
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {pillar.painPoint}
                        </p>
                      </div>

                      {/* COL 3: BENEFICIO CLAVE */}
                      <div className="lg:col-span-3 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-1">
                          🟢 Beneficio Clave Nutringest:
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {pillar.keyBenefit}
                        </p>
                      </div>

                      {/* COL 4: ÁNGULO COMUNICACIÓN */}
                      <div className="lg:col-span-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-200/80">
                        <span className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">
                          🎯 Ángulo Comunicacional:
                        </span>
                        <p className="text-xs text-indigo-900 font-medium italic leading-relaxed">
                          "{pillar.commAngle}"
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: 10 BRIEFS DE CONTENIDO LISTOS PARA EJECUTAR */}
        {activeTab === 'briefs' && (
          <div className="space-y-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs shadow-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" /> 10 Briefs de Contenido Listos para Ejecutar
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">
                  Cada brief incluye paquete de 3 formatos, Guion paso a paso de grabación, Botón "Copiar Brief Completo" y Badges de Checklist.
                </p>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                📋 Haz clic en los badges para cambiar el estado del Brief ([ ] Pendiente, [En Producción], [Publicado])
              </div>
            </div>

            <div className="space-y-6">
              {filteredBriefs.map((brief) => {
                const currentFormat = getFormatTab(brief.id);
                const status = briefStatus[brief.id] || 'pendiente';

                // Helper to assemble full brief text for copy
                const fullBriefText =
                  `=== BRIEF DE CONTENIDO NUTRINGEST #${brief.id} ===\n` +
                  `PILAR: ${brief.pillarTitle}\n` +
                  `DOLOR: ${brief.painPoint}\n` +
                  `SOLUCIÓN: ${brief.solution}\n\n` +
                  `--- 1. POST / CARRUSEL ---\n` +
                  `Título: ${brief.post.title}\n` +
                  `Slides:\n${brief.post.slides.join('\n')}\n` +
                  `Caption: ${brief.post.caption}\n` +
                  `CTA: ${brief.post.cta}\n\n` +
                  `--- 2. GUION DE GRABACIÓN REEL / TIKTOK (Paso a Paso) ---\n` +
                  `Duración: ${brief.reel.duration}\n` +
                  `HOOK (0-5s): ${brief.reel.hook}\n` +
                  `DESARROLLO (5-30s): ${brief.reel.development}\n` +
                  `PANTALLA NUTRINGEST A MOSTRAR: ${brief.reel.nutringestScreen}\n` +
                  `CTA (30-45s): ${brief.reel.cta}\n` +
                  `Indicaciones Visuales: ${brief.reel.visualDirections}\n` +
                  `Audio Sugerido: ${brief.reel.suggestedAudio}\n\n` +
                  `--- 3. SECUENCIA DE STORIES / WHATSAPP ---\n` +
                  `Stories:\n${brief.whatsapp.storiesSequence.join('\n')}\n` +
                  `Sticker Interactivo: ${brief.whatsapp.stickerInteractive}\n` +
                  `Acción CTA: ${brief.whatsapp.ctaAction}`;

                return (
                  <div
                    key={brief.id}
                    className="bg-white border border-slate-200 shadow-xs shadow-slate-100 rounded-xl p-6 transition-all hover:border-slate-300"
                  >
                    {/* BRIEF HEADER & CHECKLIST STATUS BADGES */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Brief #{brief.id} · {brief.category}
                          </span>

                          {/* DYNAMIC CHECKLIST STATUS BADGES */}
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                              onClick={() => updateBriefStatus(brief.id, 'pendiente')}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                                status === 'pendiente'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              [ ] Pendiente
                            </button>

                            <button
                              onClick={() => updateBriefStatus(brief.id, 'en_produccion')}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                                status === 'en_produccion'
                                  ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              [⏳ En Producción]
                            </button>

                            <button
                              onClick={() => updateBriefStatus(brief.id, 'publicado')}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                                status === 'publicado'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              [✅ Publicado]
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {brief.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Pilar asociado: <strong className="text-slate-800">{brief.pillarTitle}</strong>
                        </p>
                      </div>

                      {/* COPY FULL BRIEF BUTTON */}
                      <button
                        onClick={() => handleCopyText(fullBriefText, `brief-full-${brief.id}`)}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95"
                      >
                        {copiedId === `brief-full-${brief.id}` ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" /> ¡Brief Completo Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" /> Copiar Brief Completo
                          </>
                        )}
                      </button>
                    </div>

                    {/* FORMAT SWITCHER SUB-TABS */}
                    <div className="flex items-center gap-2 my-4 bg-slate-100 p-1.5 rounded-xl w-fit border border-slate-200">
                      <button
                        onClick={() => setFormatTab(brief.id, 'post')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          currentFormat === 'post'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" /> 1. Carrusel (Post)
                      </button>

                      <button
                        onClick={() => setFormatTab(brief.id, 'reel')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          currentFormat === 'reel'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" /> 2. Guion Reel (Paso a Paso)
                      </button>

                      <button
                        onClick={() => setFormatTab(brief.id, 'whatsapp')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          currentFormat === 'whatsapp'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" /> 3. Story / Estado WA
                      </button>
                    </div>

                    {/* FORMAT 1: CARRUSEL */}
                    {currentFormat === 'post' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" /> {brief.post.title}
                          </h4>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-slate-600">Guion de Slides para Diseño:</span>
                          <div className="space-y-1.5">
                            {brief.post.slides.map((slide, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 font-medium flex items-start justify-between gap-3 shadow-xs"
                              >
                                <span>{slide}</span>
                                <button
                                  onClick={() => handleCopyText(slide, `slide-${brief.id}-${idx}`)}
                                  className="text-slate-400 hover:text-slate-700 shrink-0"
                                  title="Copiar slide"
                                >
                                  {copiedId === `slide-${brief.id}-${idx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Caption Sugerido:
                            </span>
                            <p className="text-xs text-slate-800 leading-relaxed">
                              {brief.post.caption}
                            </p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              Call To Action (CTA):
                            </span>
                            <p className="text-xs text-indigo-700 font-medium">
                              {brief.post.cta}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORMAT 2: GUION DE GRABACIÓN REEL PASO A PASO */}
                    {currentFormat === 'reel' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Film className="w-4 h-4 text-sky-600" /> Guion Paso a Paso de Grabación (Reel / TikTok)
                            </h4>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-mono border border-sky-200">
                              ⏱️ {brief.reel.duration}
                            </span>
                          </div>
                        </div>

                        {/* STEP-BY-STEP RECORDING SCRIPT GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          {/* STEP 1: HOOK */}
                          <div className="bg-white border border-sky-200 p-3.5 rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                              1. Hook Inicial (0-5s)
                            </span>
                            <p className="text-slate-900 font-semibold italic">
                              "{brief.reel.hook}"
                            </p>
                          </div>

                          {/* STEP 2: DESARROLLO */}
                          <div className="bg-white border border-indigo-200 p-3.5 rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                              2. Desarrollo del Guion (5-30s)
                            </span>
                            <p className="text-slate-700 leading-relaxed">
                              {brief.reel.development}
                            </p>
                          </div>

                          {/* STEP 3: PANTALLA NUTRINGEST A MOSTRAR */}
                          <div className="bg-white border border-emerald-200 p-3.5 rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                              3. Pantalla a Mostrar en Nutringest
                            </span>
                            <p className="text-emerald-900 font-medium">
                              🖥️ {brief.reel.nutringestScreen}
                            </p>
                          </div>

                          {/* STEP 4: CALL TO ACTION */}
                          <div className="bg-white border border-purple-200 p-3.5 rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                              4. Call to Action (30-45s)
                            </span>
                            <p className="text-purple-900 font-medium">
                              📢 {brief.reel.cta}
                            </p>
                          </div>
                        </div>

                        {/* VISUAL & AUDIO DIRECTIONS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              🎬 Indicaciones Visuales para el Creador:
                            </span>
                            <p className="text-slate-800">
                              {brief.reel.visualDirections}
                            </p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              🎵 Audio / Ritmo Sugerido:
                            </span>
                            <p className="text-indigo-700 font-medium">
                              {brief.reel.suggestedAudio}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORMAT 3: STORY / WHATSAPP */}
                    {currentFormat === 'whatsapp' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Send className="w-4 h-4 text-emerald-700" /> Secuencia de Stories / Estados de WhatsApp
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {brief.whatsapp.storiesSequence.map((story, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs"
                            >
                              <div>
                                <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mb-2 inline-block">
                                  Story #{idx + 1}
                                </span>
                                <p className="text-xs text-slate-800 leading-relaxed mt-1">
                                  {story}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              💬 Sticker / Elemento Interactivo:
                            </span>
                            <p className="text-xs text-slate-800">
                              {brief.whatsapp.stickerInteractive}
                            </p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                              📲 Acción de Conversión Directa:
                            </span>
                            <p className="text-xs text-emerald-800 font-medium">
                              {brief.whatsapp.ctaAction}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: GUÍA DE GRABACIÓN PARA TUTORIALES (ROADMAP ONBOARDING) */}
        {activeTab === 'tutorials' && (
          <div className="space-y-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs shadow-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-700" /> Guía de Grabación para Tutoriales (Fichas Técnicas Video Onboarding)
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">
                  Especificación por video: Título sugerido, Duración estimada, Pantallas de Nutringest a grabar y Puntos hablados obligatorios.
                </p>
              </div>

              <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                🎓 16 Fichas Técnicas de Grabación
              </div>
            </div>

            <div className="space-y-6">
              {TUTORIAL_TRACKS.map((track) => {
                const isExpanded = expandedTrack === track.id;

                return (
                  <div
                    key={track.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all shadow-xs shadow-slate-100"
                  >
                    {/* TRACK ACCORDION HEADER */}
                    <div
                      onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                      className="p-6 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            {track.badge}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> {track.totalTime}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mt-1">
                          {track.trackName}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600">
                          {track.description}
                        </p>
                      </div>

                      <button className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold hover:bg-slate-200 transition-all">
                        {isExpanded ? 'Ocultar Fichas Técnicas' : 'Ver Fichas Técnicas'}
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {/* EXPANDED STEP TECHNICAL SPECS */}
                    {isExpanded && (
                      <div className="p-6 pt-2 bg-slate-50/70 border-t border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {track.steps.map((step) => (
                            <div
                              key={step.stepNumber}
                              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 transition-all flex flex-col justify-between space-y-3 shadow-xs"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Ficha #{step.stepNumber}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    ⏱️ Duración: {step.duration}
                                  </span>
                                </div>

                                <h4 className="text-base font-bold text-slate-900 mb-3">
                                  {step.title}
                                </h4>

                                {/* PANTALLAS DE NUTRINGEST A GRABAR */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3 space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-sky-700 block mb-1">
                                    🖥️ Pantallas de Nutringest a Grabar (Screencast):
                                  </span>
                                  {step.screensToRecord.map((screen, sIdx) => (
                                    <div key={sIdx} className="text-xs text-slate-700 flex items-center gap-1.5">
                                      <span className="text-indigo-600">•</span> {screen}
                                    </div>
                                  ))}
                                </div>

                                {/* PUNTOS HABLADOS OBLIGATORIOS */}
                                <div className="space-y-1.5 mb-3">
                                  <span className="text-[11px] font-semibold text-slate-500 block">
                                    🗣️ Puntos Hablados Obligatorios:
                                  </span>
                                  {step.mandatoryTalkingPoints.map((tp, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{tp}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-200 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold uppercase text-indigo-700 block mb-0.5">
                                  📌 Acción Práctica Recomendada:
                                </span>
                                <p className="text-xs text-slate-800 font-medium">
                                  {step.actionItem}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 5: PLANTILLAS DE RESPUESTA RÁPIDA (SCRIPTS VENTAS DM / WA) */}
        {activeTab === 'scripts' && (
          <div className="space-y-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs shadow-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-600" /> Plantillas de Respuesta Rápida (Script de Ventas por WhatsApp / DM)
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">
                  Guiones copiables para Community Managers y Ventas: Calificación de leads y respuesta a palabras clave.
                </p>
              </div>

              <div className="text-xs text-amber-900 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                💬 5 Guiones de Conversión Inmediata
              </div>
            </div>

            <div className="space-y-6">
              {filteredScripts.map((scriptItem) => (
                <div
                  key={scriptItem.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs shadow-slate-100 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {scriptItem.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        {scriptItem.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        ⚡ <strong>Disparador:</strong> {scriptItem.trigger}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCopyText(scriptItem.script, scriptItem.id)}
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95"
                    >
                      {copiedId === scriptItem.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" /> ¡Script Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copiar Script
                        </>
                      )}
                    </button>
                  </div>

                  {/* SCRIPT TEXT BOX */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {scriptItem.script}
                  </div>

                  {/* FOLLOW UP ADVICE */}
                  <div className="bg-indigo-50/60 border border-indigo-200 p-3 rounded-lg flex items-center gap-2 text-xs text-indigo-900">
                    <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>Siguiente Paso Sugerido:</strong> {scriptItem.followUpAdvice}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-16 bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs shadow-slate-100 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Nutringest 2026 · Playbook de Marketing Interno
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Herramienta de Trabajo Activa para Creadores & Growth Team
            </h3>
            <p className="text-xs text-slate-600">
              Mantén actualizados los badges de estado para sincronizar la producción de la agencia y el equipo de marketing.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
