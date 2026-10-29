import { useCallback } from 'react';
import { Form } from '@/types/backend/form';
import { apiClient } from '@/shared/api/api.client'; // Usamos el cliente genérico
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

interface UseDynamicFormProps {
    /** * La URL exacta de donde sacar el JSON del formulario.
     * Ej: '/users/form/create' o '/subscriptions/form/renew?plan=pro'
     */
    endpoint: string;

    /** Ruta para redirigir al terminar exitosamente */
    onSuccessRedirect?: string;

    /** Callback opcional para ejecutar algo extra al terminar (ej: cerrar un modal) */
    onSuccess?: (data: any) => void;
}

export function useDynamicForm({ endpoint, onSuccessRedirect, onSuccess }: UseDynamicFormProps) {
    const { addToast } = useToastStore();
    const router = useRouter();

    // 1. Carga Genérica con React Query
    const { data: formStructure, isLoading, error } = useQuery({
        queryKey: ['dynamicForm', endpoint],
        queryFn: async () => {
            if (!endpoint) return null;
            const { data } = await apiClient.get<Form>(endpoint);
            return data;
        },
        enabled: !!endpoint,
        staleTime: 1000 * 60 * 5, // Cache form structure for 5 minutes
    });

    if (error) {
        console.error(`Error loading form from ${endpoint}:`, error);
        // Note: Logic to show toast on query error is best done via useEffect or the global error handler, 
        // but to mimic previous behavior we might let the component handle it or use the effect below.
        // However, React Query handles errors gracefully.
    }

    // 2. Envío Genérico con Mutation
    const mutation = useMutation({
        mutationFn: async (formData: any) => {
            if (!formStructure) throw new Error("Form structure not loaded");

            const { data } = await apiClient.request({
                url: formStructure.action,
                method: formStructure.method.toLowerCase(),
                data: formData
            });
            return data;
        },
        onSuccess: (data) => {
            addToast({
                type: 'success',
                title: '¡Éxito!',
                message: 'Operación realizada correctamente.'
            });

            if (onSuccess) onSuccess(data);

            if (onSuccessRedirect) {
                router.push(onSuccessRedirect);
            }
        },
        onError: (error: any) => {
            console.error("Error submitting form:", error);
            const msg = error.response?.data?.message || 'Hubo un problema al guardar los datos.';

            addToast({
                type: 'error',
                title: 'Error',
                message: msg
            });
        }
    });

    const submitForm = useCallback((formData: any) => {
        mutation.mutate(formData);
    }, [mutation]);

    return {
        formStructure: formStructure || null,
        isLoading,
        isSubmitting: mutation.isPending,
        submitForm
    };
}