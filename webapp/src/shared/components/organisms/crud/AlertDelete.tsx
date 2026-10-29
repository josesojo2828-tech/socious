import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react'; // Asegúrate de tener estos iconos
import { Button } from '@/shared/components/atoms/Button'; // Tu componente botón

interface DeleteAlertProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    isLoading?: boolean;
}

export const DeleteAlert = ({
    isOpen,
    onClose,
    onConfirm,
    title = "¿Estás seguro?",
    description = "Esta acción no se puede deshacer. Esto eliminará permanentemente el registro.",
    isLoading = false,
}: DeleteAlertProps) => {

    return (
        <>
            <button
                onClick={onClose}
                disabled={isLoading}
                className="absolute top-4 right-4 text-base-content/50 hover:text-base-content/70 disabled:opacity-50"
            >
                <X size={20} />
            </button>

            <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">

                    {/* Icono de Alerta (Rojo suave) */}
                    <div className="mx-auto flex h-36 w-36 flex-shrink-0 items-center justify-center rounded-full bg-error/10 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-error" aria-hidden="true" />
                    </div>

                    {/* Textos */}
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <h3 className="text-lg font-semibold leading-6 text-base-content">
                            {title}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-base-content/70">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer con Botones */}
            <div className="sm:flex sm:flex-row-reverse sm:px-6 gap-2">

                <Button
                    variant="error" // Asumiendo que tienes variantes, si no usa clases de Tailwind directas
                    className="w-full sm:w-auto bg-error hover:bg-error/80 text-error-content border-none"
                    onClick={() => {onConfirm(); onClose();}}
                    disabled={isLoading}
                >
                    {isLoading ? 'Eliminando...' : 'Sí, Eliminar'}
                </Button>

                <Button
                    variant="secondary"
                    className="mt-3 w-full sm:mt-0 sm:w-auto bg-base-100 hover:bg-base-200 text-base-content border border-base-300"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    Cancelar
                </Button>

            </div>
        </>
    );
};