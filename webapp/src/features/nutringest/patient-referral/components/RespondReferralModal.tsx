'use client';

import { useState } from 'react';
import { Textarea } from '@/shared/components/atoms/Textarea';
import { Button } from '@/shared/components/atoms/Button';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { PatientReferralService } from '../services/patient-referral.service';
import type { PatientReferral } from '@/types/nutringest/patient-referral.interface';

interface RespondReferralModalProps {
    referral: PatientReferral;
    action: 'accept' | 'reject';
    onDone: () => void;
}

export const RespondReferralModal = ({ referral, action, onDone }: RespondReferralModalProps) => {
    const { closeModal } = useModalStore();
    const { addToast } = useToastStore();
    const [responseMessage, setResponseMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isAccept = action === 'accept';

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const payload = responseMessage.trim() ? { responseMessage: responseMessage.trim() } : undefined;
            const res = isAccept
                ? await PatientReferralService.accept(referral.id, payload)
                : await PatientReferralService.reject(referral.id, payload);

            addToast({
                type: 'success',
                title: isAccept ? 'Referido aceptado' : 'Referido rechazado',
                message: res.data?.message || 'Operación realizada con éxito.',
            });
            closeModal();
            onDone();
        } catch (err: any) {
            console.error(err);
            setError(
                err?.response?.data?.message ||
                    (isAccept ? 'No se pudo aceptar el referido.' : 'No se pudo rechazar el referido.'),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-2">
                {isAccept ? 'Aceptar referido' : 'Rechazar referido'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                {isAccept
                    ? 'Confirma que quieres sumarte al equipo de cuidado del paciente. Puedes agregar un mensaje de respuesta opcional.'
                    : 'Se le notificará al nutricionista remitente. Puedes agregar una razón opcional.'}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje de respuesta (opcional)
            </label>
            <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={isAccept ? 'Ej: ¡Gracias por el referido, me encargo del caso!' : 'Ej: Ya no tengo cupos disponibles.'}
                className="w-full"
                rows={3}
                disabled={loading}
            />

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" onClick={closeModal} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    variant={isAccept ? 'success' : 'error'}
                    loading={loading}
                    loadingText={isAccept ? 'Aceptando...' : 'Rechazando...'}
                    onClick={handleSubmit}
                >
                    {isAccept ? 'Aceptar' : 'Rechazar'}
                </Button>
            </div>
        </div>
    );
};