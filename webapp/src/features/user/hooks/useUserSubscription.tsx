import { useToastStore } from "@/shared/store/ui/useToastStore";
import { UserEndpoints } from "../services/user.endpoints";
import { apiClient } from "@/shared/api/api.client";

export const useUserSubscription = () => {

    const { addToast } = useToastStore();

    async function SetAutoRenew(id: string, cb?: () => void) {
        const url = UserEndpoints.actions.subscriptionAutorew(id);
        const response = await apiClient.post(url);
        addToast({ message: 'Autorenovación establecida', type: 'success' });
        if(cb) cb();
        return response.data;
    }

    return {
        SetAutoRenew,
    }
}
