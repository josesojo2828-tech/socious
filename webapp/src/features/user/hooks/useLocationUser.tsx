"use client";

import { apiClient } from "@/shared/api/api.client";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { User } from "@/types/backend/schema.types";
import { useEffect, useState } from "react";

export const useLocationUser = (user: User | null) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        if (user && user.nutritionistProfile) {
            const { lat, lng } = user.nutritionistProfile;
            if (typeof lat === 'number' && typeof lng === 'number') {
                setLocation({ lat, lng });
            } else {
                setLocation(null);
            }
        }
    }, [user])

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
