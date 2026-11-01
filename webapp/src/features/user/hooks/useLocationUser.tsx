"use client";

import { apiClient } from "@/shared/api/api.client";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { User } from "@/types/backend/schema.types";
import { useState } from "react";

export const useLocationUser = (user: User | null) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

    // Patrón "adjust state when a prop changes" (react.dev): se refleja el
    // perfil del usuario en `location` comparando el usuario previo en render,
    // sin setState dentro de un effect. `undefined` inicial reproduce la
    // primera corrida del effect al montar.
    const [prevUser, setPrevUser] = useState<User | null | undefined>(undefined);
    if (user !== prevUser) {
        setPrevUser(user);
        if (user && user.nutritionistProfile) {
            const { lat, lng } = user.nutritionistProfile;
            setLocation(typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null);
        }
    }

    const { addToast } = useToastStore();

    const saveLocation = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            const response = await apiClient.post('/user/location', { lat, lng });
            console.log(response);

            // Sincronizar el store de auth para que persista en recarga
            const { user: currentUser, updateStorageUser } = useAuthStore.getState();
            if (currentUser && currentUser.nutritionistProfile) {
                updateStorageUser({
                    ...currentUser,
                    nutritionistProfile: {
                        ...currentUser.nutritionistProfile,
                        lat,
                        lng,
                    },
                });
            }

            setLoading(false);
            addToast({
                type: 'success',
                title: 'Ubicación guardada',
                message: '¡Gracias por compartir tu ubicación!',
            });
        } catch (err) {
            console.error("Error guardando ubicación:", err);
            setLoading(false);
            setError(true);
        }
    };

    return {
        loading,
        error,
        saveLocation,
        location,
        setLocation
    };
}
