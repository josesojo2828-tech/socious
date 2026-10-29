import { Eye, Pencil, Trash } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { ActionsType } from '@/types/requets';

interface TableActionsProps {
    onUpdate: () => void;
    onDelete: () => void;
    onView: () => void;
    actions: ActionsType;
    t: (key: string) => string;
}

export const TableActions = ({ onDelete, onUpdate, onView, actions, t }: TableActionsProps) => {
    return (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            {actions.view !== false && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-success hover:bg-success/10"
                    onClick={onView}
                    title={t('Ver Ficha')}
                >
                    <Eye size={16} />
                </Button>
            )}
            {actions.update && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-warning hover:bg-warning/10"
                    onClick={onUpdate}
                    title={t('Actualizar')}
                >
                    <Pencil size={16} />
                </Button>
            )}
            {actions.delete && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-error hover:bg-error/10"
                    onClick={onDelete}
                    title={t('Eliminar')}
                >
                    <Trash size={16} />
                </Button>
            )}
        </div>
    );
};
