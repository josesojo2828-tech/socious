import { useState } from "react";
import { z } from "zod";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";

const feedbackSchema = z.object({
    title: z.string().min(5, "El título es muy corto"),
    description: z.string().min(10, "Por favor, danos más detalles"),
    type: z.enum(["bug", "integration"]),
});

type FeedbackInput = z.infer<typeof feedbackSchema>;

export const useFeedback = () => {
    const { addToast } = useToastStore();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const sendFeedback = async (data: FeedbackInput) => {
        setLoading(true);
        setError(null);
        setSuccess(false);


        try {
            const payload = {
                message: `${title}: ${description}`,
                userId: user?.id,
                metadata: {
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                }
            };

            await apiClient.post("/api/user/feedback", payload);
            addToast({ title: "Feedback enviado", message: "Gracias por tu feedback.", type: "success" });
            const drawer = document.getElementById("feedback-drawer") as HTMLInputElement;
            if (drawer) setTimeout(() => drawer.checked = false, 2000);

        } catch (err) {
            addToast({ title: "Error al enviar feedback", message: "Por favor, inténtalo de nuevo.", type: "error" });
            if (err instanceof z.ZodError) {
                // setError(err.errors[0].message);
            } else {
                setError("Ocurrió un error al enviar el feedback. Inténtalo de nuevo.");
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        sendFeedback,
        loading,
        error,
        success,
        setSuccess,
        title, setTitle,
        description, setDescription
    };
};