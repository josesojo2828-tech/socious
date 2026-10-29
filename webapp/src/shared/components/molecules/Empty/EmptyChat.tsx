import { FileWarning } from 'lucide-react'; // Asumiendo que instalaste lucide-react

export const EmptyChart = ({ message = "No hay datos para mostrar" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-64 w-full bg-base-100 rounded-box border border-dashed border-base-300 text-base-content/50">
    <FileWarning size={48} className="mb-2 opacity-50" />
    <span className="text-sm font-medium">{message}</span>
  </div>
);