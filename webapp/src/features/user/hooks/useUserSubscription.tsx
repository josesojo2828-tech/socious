import { useEffect, useState } from "react"
import { GetStructAndTable } from "../services/user.service";
import { UserEndpoints } from "../services/user.endpoints";
import { ReponseStrucTable } from "@/types/requets";
import { IUserPaymentMethod, Subscription } from "@/types/backend/schema.types";
import { Column } from "@/types/backend/table.type";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { apiClient } from "@/shared/api/api.client";

interface Props { }

type ListType = Subscription

export const useUserSubscription = ({ }: Props) => {

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

