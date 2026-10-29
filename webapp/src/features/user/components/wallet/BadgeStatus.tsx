export const StatusBadge = ({ status }: { status: any }) => {
  const styles: any = {
    SUCCESS: 'bg-success/10 text-success border-success/20',
    PENDING: 'bg-warning/10 text-warning border-warning/20',
    FAILED: 'bg-error/10 text-error border-error/20',
    CANCELED: 'bg-base-200 text-base-content/50 border-base-300'
  };

  const labels: any = {
    SUCCESS: 'Exitoso',
    PENDING: 'Pendiente',
    FAILED: 'Fallido',
    CANCELED: 'Cancelado'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};