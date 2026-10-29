import { Button } from '@/shared/components/atoms/Button';
import { useModalStore } from '@/shared/store/ui/useModalStore';

interface ModalActionsProps {
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  hideCancel?: boolean;
}

export const ModalActions = ({
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  isDisabled = false,
  hideCancel = false,
}: ModalActionsProps) => {
  const { closeModal } = useModalStore();

  return (
    <div className="flex gap-3 justify-end w-full">
      {!hideCancel && (
        <Button 
          variant="ghost" 
          onClick={closeModal} 
          disabled={isLoading}
        >
          {cancelText}
        </Button>
      )}
      
      <Button 
        variant="primary" 
        onClick={onConfirm} 
        loading={isLoading}
        disabled={isDisabled}
      >
        {confirmText}
      </Button>
    </div>
  );
};