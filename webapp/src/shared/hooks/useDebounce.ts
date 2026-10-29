import { useState, useEffect } from 'react';

/**
 * Hook para retrasar la actualización de un valor hasta que pase un tiempo determinado.
 * Útil para búsquedas en tiempo real (Search Inputs).
 * * @param value El valor a observar (ej: lo que escribe el usuario)
 * @param delay El tiempo de espera en ms (ej: 300ms or 500ms)
 * @returns El valor "debounced" que solo cambia tras el delay
 */
export function useDebounce<T>(value: T, delay: number): T {
    // Estado local para guardar el valor retrasado
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Configuramos un timer para actualizar el valor después del delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Limpieza: Si el usuario escribe de nuevo (el valor cambia) o el componente se desmonta
        // antes de que termine el delay, limpiamos el timer anterior.
        // Esto es lo que evita que se ejecute la acción intermedia.
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Se ejecuta cada vez que value o delay cambian

    return debouncedValue;
}