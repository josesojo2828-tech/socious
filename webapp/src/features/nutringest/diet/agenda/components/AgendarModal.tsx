"use client";

import { useTranslation } from '@/context/i18n.context';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { CalendarPlus, Pencil } from 'lucide-react';
import { ConsultationEndpoints } from '../../services/consultation.endpoint';

interface AgendarModalProps {
    start?: Date;
    patientId?: string;
    consultationId?: string;
    onCreated?: () => void;
    onUpdated?: () => void;
}

export function AgendarModal({ start, patientId, consultationId, onCreated, onUpdated }: AgendarModalProps) {
    const { t } = useTranslation();

    const isEditing = Boolean(consultationId);
    const path = isEditing
        ? ConsultationEndpoints.forms.update(consultationId!)
        : ConsultationEndpoints.forms.create() +
          (start ? '?start=' + start.toISOString() : '') +
          (patientId ? (start ? '&' : '?') + 'patientId=' + patientId : '');

    return (
        <div className="w-full bg-transparent font-sans text-agenda-ink">
            <header className="mb-5 flex items-center gap-3 border-b border-agenda-border pb-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-agenda-primary-soft text-agenda-primary">
                    {isEditing ? <Pencil className="h-5 w-5" /> : <CalendarPlus className="h-5 w-5" />}
                </span>
                <h3 className="text-lg font-bold tracking-tight text-agenda-ink">
                    {isEditing
                        ? t('dashboard.calendar.ficha.edit') || 'Editar / Reagendar Cita'
                        : t('dashboard.calendar.agendar.title')}
                </h3>
            </header>

            <DynamicRenderForm
                path={path}
                cb={() => {
                    if (isEditing) {
                        onUpdated ? onUpdated() : onCreated?.();
                    } else {
                        onCreated?.();
                    }
                }}
            />
        </div>
    );
}

export default AgendarModal;
