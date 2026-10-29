export const StatusBadge = ({ status }: { status: any }) => {
    const styles: any = {
        ACTIVE: 'badge-success text-white',
        CANCELED: 'badge-error text-white',
        EXPIRED: 'badge-ghost',
        NEXT: 'badge-info text-white',
        DECLINED: 'badge-warning'
    };

    const labels: any = {
        ACTIVE: 'Activo',
        CANCELED: 'Cancelado',
        EXPIRED: 'Expirado',
        NEXT: 'Próximo',
        DECLINED: 'Rechazado'
    };

    return (
        <span className={`badge ${styles[status] || 'badge-ghost'} badge-sm font-semibold uppercase tracking-wider`}>
            {labels[status]}
        </span>
    );
};
