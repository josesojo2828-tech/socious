"use client";

import { useState } from 'react';
import { Archive, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/atoms/Button';
import { apiClient } from '@/shared/api/api.client';
import { UserEndpoints } from '@/features/user';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useTranslation } from '@/context/i18n.context';

interface ArchiveConfirmModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ArchiveConfirmModal = ({
  patientId,
  patientName,
  onClose,
  onSuccess,
}: ArchiveConfirmModalProps) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await apiClient.post(UserEndpoints.actions.patient.archive(patientId), {
        reason: reason.trim() || undefined,
      });
      addToast({
        type: 'success',
        title: t('dashboard.patients.archive_success') || 'Paciente archivado',
        message: t('dashboard.patients.archive_success_message') || `Paciente "${patientName}" archivado correctamente.`,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al archivar paciente';
      addToast({ type: 'error', title: 'Error', message: msg });
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-base-content/50 hover:text-base-content/70 disabled:opacity-50"
      >
        <X size={20} />
      </button>

      <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          {/* Icono */}
          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-warning/10 sm:mx-0">
            <Archive className="h-6 w-6 text-warning" />
          </div>

          {/* Textos */}
          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 className="text-lg font-semibold leading-6 text-base-content">
              {t('dashboard.patients.archive_confirm_title') || 'Archivar Paciente'}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-base-content/70">
                {t('dashboard.patients.archive_confirm_body', { name: patientName }) ||
                  `¿Archivar a ${patientName}?`}
              </p>
            </div>

            {/* Motivo opcional */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-base-content mb-1">
                {t('dashboard.patients.archive_confirm_reason_label') || 'Motivo (opcional)'}
              </label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-base-300 px-3 py-2 text-sm text-base-content placeholder-base-content/50 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder={t('dashboard.patients.archive_confirm_reason_placeholder') || 'Ej: Paciente inactivo hace 6 meses'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sm:flex sm:flex-row-reverse sm:px-6 gap-2">
        <Button
          variant="primary"
          className="w-full sm:w-auto bg-warning hover:bg-warning/80 text-warning-content border-none"
          onClick={handleArchive}
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 size={16} className="animate-spin mr-1" />Archivando...</>
          ) : (
            t('dashboard.patients.archive') || 'Archivar'
          )}
        </Button>

        <Button
          variant="secondary"
          className="mt-3 w-full sm:mt-0 sm:w-auto bg-base-100 hover:bg-base-200 text-base-content border border-base-300"
          onClick={onClose}
          disabled={isLoading}
        >
          {t('common.actions.cancel') || 'Cancelar'}
        </Button>
      </div>
    </>
  );
};
