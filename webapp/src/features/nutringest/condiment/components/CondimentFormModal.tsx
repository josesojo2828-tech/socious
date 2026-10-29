'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/shared/components/atoms/Input';
import { Button } from '@/shared/components/atoms/Button';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { Condiment } from '../types/condiment.type';
import { CondimentEndpoints } from '../services/condiment.endpoint';

interface CondimentFormModalProps {
    condiment?: Condiment | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const CondimentFormModal = ({ condiment, onClose, onSuccess }: CondimentFormModalProps) => {
    const { addToast } = useToastStore();
    const [name, setName] = useState(condiment?.name || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEditing = Boolean(condiment?.id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (isEditing) {
                await apiClient.post(CondimentEndpoints.actions.update(condiment!.id), { name: name.trim() });
                addToast({
                    type: 'success',
                    title: 'Condimento actualizado',
                    message: 'El condimento fue actualizado correctamente.',
                });
            } else {
                await apiClient.post(CondimentEndpoints.actions.create(), { name: name.trim() });
                addToast({
                    type: 'success',
                    title: 'Condimento creado',
                    message: 'El condimento fue creado correctamente.',
                });
            }
            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || 'No se pudo guardar el condimento.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
                <X size={20} />
            </button>

            <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    {isEditing ? 'Editar condimento' : 'Crear condimento'}
                </h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre
                    </label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Aceite de oliva"
                        autoFocus
                        disabled={loading}
                        error={!!error}
                    />
                    {error && (
                        <p className="mt-1 text-xs text-red-600">{error}</p>
                    )}
                </div>
            </div>

            <div className="sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <Button
                    type="submit"
                    variant="success"
                    className="w-full sm:w-auto"
                    loading={loading}
                    loadingText="Guardando..."
                >
                    Guardar
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full sm:mt-0 sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancelar
                </Button>
            </div>
        </form>
    );
};
