// ─── Data Layer: Recursos Didácticos & Marketplace ──────────────────────────
// Centralizado para escalabilidad. Modelo unificado de datos (Free, Premium, Paid).

export type RecursoTier = "FREE" | "PREMIUM" | "PAID";
export type RecursoType = "Fichas Visuales" | "Guías & Plantillas" | "Herramientas Clínicas" | "E-books & Libros";
export type RecursoCategory = "Hidratación" | "Porciones & Antropometría" | "Hábitos" | "Nutrición Deportiva" | "Pediatría";

export interface RecursoDidactico {
    id: string;
    title: string;
    category: RecursoCategory;
    type: RecursoType;
    tier: RecursoTier;
    price?: number;
    description: string;
    icon: string;
    iconId?: string;
    downloadUrl?: string;
    gradient: string;
    pages: number;
    tags: string[];
    fileFormat?: string;
    author?: {
        name: string;
        email: string;
        isOfficial: boolean;
        avatar?: string;
    };
    previewUrl?: string;
}

export const RECURSOS: RecursoDidactico[] = [
    {
        id: "masterclass_antropometria",
        title: "Masterclass Antropometría ISAK 1 & Somatocarta Pro",
        category: "Porciones & Antropometría",
        type: "Herramientas Clínicas",
        tier: "PREMIUM",
        iconId: "antropometria",
        description:
            "Protocolo completo de marcaje de puntos anatómicos, cálculo de masa grasa/muscular y graficación en somatocarta.",
        icon: "📊",
        gradient: "from-indigo-500 to-purple-700",
        pages: 18,
        fileFormat: "VIDEO + PDF",
        tags: ["Masterclass", "ISAK", "Composición"],
        author: {
            name: "Dra. Sofía Peralta (Nutringest Expert)",
            email: "sofia.peralta@nutringest.com",
            isOfficial: true,
        },
    },
    {
        id: "excel_prescripcion_pro",
        title: "Plantilla Excel de Prescripción Energética & Deporte",
        category: "Nutrición Deportiva",
        type: "Guías & Plantillas",
        tier: "PREMIUM",
        iconId: "fitness",
        description:
            "Automatización en Excel para cálculo de tasa metabólica basal (Harris-Benedict, Cunningham) y periodización de carbohidratos.",
        icon: "🏋️",
        gradient: "from-indigo-500 to-purple-700",
        pages: 5,
        fileFormat: "EXCEL .XLSX",
        tags: ["Deporte", "Plantilla", "Cálculo"],
        author: {
            name: "Lic. Carlos Mendoza",
            email: "carlos.mendoza@nutringest.com",
            isOfficial: false,
        },
    },
    {
        id: "armstrong",
        title: "Escala de Armstrong",
        category: "Hidratación",
        type: "Fichas Visuales",
        tier: "FREE",
        description:
            "Monitoreá tu nivel de hidratación diario a través del color de la orina y accedé a sugerencias de consumo de agua personalizadas.",
        icon: "💧",
        gradient: "from-sky-400 to-blue-600",
        pages: 1,
        fileFormat: "PDF",
        tags: ["Salud", "Agua", "Clínica"],
        author: {
            name: "Nutringest Official",
            email: "nutringest@gmail.com",
            isOfficial: true,
        },
    },
    {
        id: "porcion",
        title: "Método de la Mano",
        category: "Porciones & Antropometría",
        type: "Fichas Visuales",
        tier: "PREMIUM",
        description:
            "Una guía visual interactiva para medir las porciones de alimentos saludables usando el tamaño de tus manos como referencia.",
        icon: "✋",
        gradient: "from-[#10b981] to-[#047857]",
        pages: 2,
        fileFormat: "PDF",
        tags: ["Porciones", "Alimentación", "Guía"],
        author: {
            name: "Nutringest Official",
            email: "nutringest@gmail.com",
            isOfficial: true,
        },
    },
    {
        id: "jarra",
        title: "Jarra del Buen Beber",
        category: "Hidratación",
        type: "Fichas Visuales",
        tier: "FREE",
        description:
            "Guía oficial sobre el consumo de bebidas saludables, vasos recomendados y el impacto metabólico de los refrescos y jugos.",
        icon: "🥛",
        gradient: "from-cyan-400 to-teal-600",
        pages: 1,
        fileFormat: "PDF",
        tags: ["Bebidas", "Salud", "Nutrición"],
        author: {
            name: "Nutringest Official",
            email: "nutringest@gmail.com",
            isOfficial: true,
        },
    },
    {
        id: "hambre-diario",
        title: "Diario de Hambre & Saciedad",
        category: "Hábitos",
        type: "Guías & Plantillas",
        tier: "PREMIUM",
        description:
            "Ejercicios terapéuticos de reconexión corporal, afirmaciones positivas, escala biofísica de saciedad y registro diario.",
        icon: "🌸",
        gradient: "from-pink-400 to-rose-600",
        pages: 49,
        fileFormat: "PDF / Imprimible",
        tags: ["Emociones", "Conducta", "Hábitos"],
        author: {
            name: "Nutringest Official",
            email: "nutringest@gmail.com",
            isOfficial: true,
        },
    },
];

/** Categorías y Tipos disponibles para filtros */
export const TYPES_FILTERS = [
    "Todos",
    "Fichas Visuales",
    "Guías & Plantillas",
    "Herramientas Clínicas",
    "E-books & Libros",
] as const;

export const CATEGORIAS = [
    "Todas",
    "Hidratación",
    "Porciones & Antropometría",
    "Hábitos",
    "Nutrición Deportiva",
    "Pediatría",
] as const;

/** Obtiene un recurso por su ID */
export function getRecursoById(id: string): RecursoDidactico | undefined {
    return RECURSOS.find((r) => r.id === id);
}

