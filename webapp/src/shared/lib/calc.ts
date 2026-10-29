
export const calculateProgress = (startDate: Date | string, endDate: Date | string): number => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();

    // 1. Validaciones de seguridad
    if (start >= end) return 100; // Si las fechas son iguales o están invertidas, asumimos completado
    if (now <= start) return 0;   // Si aún no ha empezado

    // 2. Cálculo matemático
    const totalDuration = end - start;
    const elapsed = now - start;

    const percentage = (elapsed / totalDuration) * 100;

    // 3. "Clamping": Asegurar que nunca devuelva menos de 0 ni más de 100
    // Math.min(..., 100) -> Si da 105%, devuelve 100.
    // Math.max(..., 0)   -> Si da -5%, devuelve 0.
    return Math.min(Math.max(percentage, 0), 100);
};
