import { apiClient } from "@/shared/api/api.client"
import { useToastStore } from "../store/ui/useToastStore";
import { invalidateFormCache } from "@/shared/service/form.service";

export const useHandleForm = () => {

    const { addToast } = useToastStore();

    const SendForm = async ({ 
        data, 
        path, 
        method = "POST", 
        formPath,
        cb 
    }: { 
        data: any; 
        path: string; 
        method?: "POST" | "PUT" | "PATCH"; 
        formPath?: string;
        cb?: () => void; 
    }) => {
        try {
            console.log(`========== ENVIANDO FORMULARIO [${method}] ==========`);
            console.log(data);
            console.log(path);
            const response = await apiClient.request({
                url: path,
                method: method,
                data: data
            });
            addToast({ message: 'Éxito', type: 'success' });
            
            // Si se especificó el path del formulario, invalidamos su caché tras una mutación exitosa
            if (formPath) {
                invalidateFormCache(formPath);
            }
            
            if (cb) cb();
            return response.data;
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error?.message || 'Error temporal';
            addToast({ type: 'error', message: errorMsg });
        }
    }

    return {
        SendForm
    }
}
