
export const getDaysRemaining = (dateInput: Date | string): string => {
    const now = new Date();
    const target = new Date(dateInput);

    // 1. Resetear las horas a medianoche para comparar solo fechas calendario
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    // 2. Calcular diferencia en milisegundos
    const diffTime = target.getTime() - now.getTime();

    // 3. Convertir a días (milisegundos / (1000ms * 60s * 60min * 24h))
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 4. Retornar texto formateado
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`; // O "Vencido"
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Falta 1 día';

    return `${diffDays} días`;
};
