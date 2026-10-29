import { icons } from 'lucide-react';
import { FC } from 'react';

// 1. Extraemos dinámicamente los nombres de los iconos validos de Lucide
// Esto crea un tipo gigante: "Activity" | "Airplay" | ... | "Zap"
export type IconName = keyof typeof icons;

interface DynamicIconProps {
    name: string; // Lo dejamos string por si viene de DB, pero internamente lo validamos
    size?: number;
    color?: string; // Hex, rgb, o nombre
    className?: string; // Para clases de Tailwind
}

export const DynamicIcon: FC<DynamicIconProps> = ({
    name,
    size = 24,
    color,
    className
}) => {

    // 2. Normalización (Opcional pero recomendada)
    // Lucide usa PascalCase (ej: 'ArrowRight'). 
    // Si tu DB manda 'arrow-right' o 'arrow_right', deberías convertirlo aquí.
    // Asumiremos que envías el nombre correcto (PascalCase) por ahora.

    // 3. Validación: Buscamos el icono en el objeto de iconos
    const LucideIcon = icons[name as IconName];

    // 4. Manejo de Error: Si el icono no existe, renderizamos un Fallback
    if (!LucideIcon) {
        console.warn(`DynamicIcon: El icono '${name}' no existe en lucide-react.`);
        // Retorna un icono por defecto o null
        const FallbackIcon = (icons as any).HelpCircle;
        return <FallbackIcon size={size} color="gray" className={className} />;
    }

    // 5. Renderizado Exitoso
    return (
        <LucideIcon
            size={size}
            color={color}
            className={className}
            strokeWidth={1.5} // Puedes hacerlo prop también
        />
    );
};
