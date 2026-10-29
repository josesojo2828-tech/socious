import { useTranslation } from "@/context/i18n.context";
import { FORMATTER_TYPE } from "@/types/requets";
import { FC, ReactNode } from "react";

interface ExtractValueProps {
    object: any;
    value: string;
    formatter?: FORMATTER_TYPE | string;
}

export const ExtractValue: FC<ExtractValueProps> = ({ object, value, formatter }) => {

    const { t } = useTranslation();

    if (!value) return <span className="text-base-content/50">—</span>;

    // 1. Navegamos dinámicamente sin importar cuan largo sea el path
    // Usamos ?. para evitar crash si una propiedad intermedia no existe
    const result = value.split('.').reduce((acc, currentKey) => {
        return acc ? acc[currentKey] : undefined;
    }, object);

    // 2. Si es un Array (ej: tags), lo renderizamos como etiquetas/badges
    if (Array.isArray(result)) {
        if (result.length === 0) return <span className="text-base-content/50 text-xs font-normal">-</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[240px]">
                {result.map((tag: string, idx: number) => {
                    const tagClean = String(tag).replace(/^#/, '');
                    const tagLower = tagClean.toLowerCase();
                    let colorClass = "bg-success/10 text-success border-success/30";
                    
                    if (['diabetes', 'hipertension', 'hiposodico', 'anti-inflamatorio', 'bajo-ig', 'keto', 'hospitalario'].includes(tagLower)) {
                        colorClass = "bg-info/10 text-info border-info/30";
                    } else if (['desayuno', 'almuerzo', 'cena', 'snack'].includes(tagLower)) {
                        colorClass = "bg-warning/10 text-warning border-warning/30";
                    }

                    return (
                        <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
                            #{tagClean}
                        </span>
                    );
                })}
            </div>
        );
    }

    // 3. PROTECCIÓN CONTRA OBJETOS COMPLEJOS:
    if (typeof result === 'object' && result !== null) {
        console.warn(`ExtractValue Error: La ruta '${value}' apunta a un objeto, no a un valor final.`);
        return JSON.stringify(result);
    }

    // 4. Si es undefined o null, devuelve el fallback
    if (result === undefined || result === null) {
        return <span className="text-base-content/50">—</span>;
    }

    // 5. APLICACIÓN DEL FORMATTER
    if (formatter) {
        return <>{getFormattedValue(result, formatter, t)}</>;
    }

    return <>{result}</>;
}

const getTranslatedValue = (value: any, t: (key: string) => string): string => {
    const strVal = String(value);
    const lowerVal = strVal.toLowerCase();
    
    // Lista de rutas posibles de traducción para enums
    const keysToTry = [
        `dashboard.create_consultation.types.${lowerVal}`,
        `dashboard.create_consultation.status.${lowerVal}`,
        `dashboard.modals.create_consultation.types.${lowerVal}`,
        `dashboard.modals.create_consultation.status.${lowerVal}`,
        `form.labels.status_${lowerVal}`,
        `form.labels.${lowerVal}`,
        `common.status.${lowerVal}`,
        `common.${lowerVal}`
    ];
    
    for (const key of keysToTry) {
        const trans = t(key);
        if (trans !== key) {
            return trans;
        }
    }
    
    // Si no se encuentra, formateamos de manera amigable (Capitalize)
    return strVal.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const getStatusColorClass = (value: string): string => {
    const val = String(value).toUpperCase();
    switch (val) {
        // Consultas
        case 'SCHEDULED':
            return 'bg-info/10 text-info border-info/20';
        case 'COMPLETED':
            return 'bg-success/10 text-success border-success/20';
        case 'CANCELED':
            return 'bg-error/10 text-error border-error/20';
        case 'NO_SHOW':
            return 'bg-warning/10 text-warning border-warning/20';
            
        // Suscripciones / Planes / General
        case 'ACTIVE':
        case 'SUCCESS':
            return 'bg-success/10 text-success border-success/20';
        case 'PENDING':
        case 'DRAFT':
            return 'bg-warning/10 text-warning border-warning/20';
        case 'FAILED':
        case 'SUSPENDED':
            return 'bg-error/10 text-error border-error/20';
        case 'ARCHIVED':
            return 'bg-base-200 text-base-content/70 border-base-300';
            
        default:
            return 'bg-base-200 text-base-content/70 border-base-300';
    }
};

const getFormattedValue = (value: any, formatter: string, t: (key: string) => string): ReactNode => {
    if (value === null || value === undefined) return value;

    switch (formatter) {
        case 'date':
            // Ajusta 'es-ES' según tu i18n context si es necesario
            return new Date(value).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

        case 'currency':
            return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(Number(value));

        case 'percentage':
            return `${Number(value)}%`;

        case 'number':
            return new Intl.NumberFormat('es-ES').format(Number(value));

        case 'boolean':
            return value ? "Sí" : "No"; // O podrías retornar iconos <Check /> / <X />

        case 'truncate':
            return (
                <div className="max-w-md line-clamp-2 text-xs text-base-content/70 font-normal leading-relaxed">
                    {String(value)}
                </div>
            );

        case 'capitalize':
            return String(value).charAt(0).toUpperCase() + String(value).slice(1);

        case 'email':
            return <a href={`mailto:${value}`} className="text-emerald-500 hover:underline">{value}</a>;

        case 'username':
            return <span className="font-semibold text-base-content">@{value}</span>;

        // Casos visuales (Badges)
        case 'badge':
            return (
                <span className="px-2 py-1 rounded-full bg-base-200 text-xs font-bold text-base-content">
                    {getTranslatedValue(value, t)}
                </span>
            );

        case 'status':
        case 'status_badge':
            return (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${getStatusColorClass(value)}`}>
                    {getTranslatedValue(value, t)}
                </span>
            );

        case 'image':
        case 'avatar':
            return (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-base-300 bg-base-100 flex items-center justify-center shrink-0">
                    {value ? (
                        <img 
                            src={String(value)} 
                            alt="thumbnail" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <span className="text-xs text-base-content/50 font-semibold">🍲</span>
                    )}
                </div>
            );

        default:
            return value;
    }
};
