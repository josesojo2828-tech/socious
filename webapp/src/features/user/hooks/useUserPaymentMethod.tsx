import { useEffect, useState } from "react"
import { GetStructAndTable } from "../services/user.service";
import { UserEndpoints } from "../services/user.endpoints";
import { ReponseStrucTable, ActionsType } from "@/types/requets";
import { IUserPaymentMethod } from "@/types/backend/schema.types";
import { Column } from "@/types/backend/table.type";

type ListType = IUserPaymentMethod

export const useUserPaymentMethod = () => {
    const [title, setTitle] = useState('');
    const [list, setList] = useState<ListType[]>([]);
    const [page, setPage] = useState<{ current: number, total: number; limit: number, totalPages: number }>({ current: 1, limit: 10, total: 10, totalPages: 1 });
    const [column, setColumn] = useState<Column[]>([]);
    const [actions, setActions] = useState<Partial<ActionsType>>({});

    // Get initial Data and Struct (loader definido dentro del effect: el
    // setState ocurre tras el await, no sincrónicamente en el effect).
    useEffect(() => {
        const load = async () => {
            const response = await GetStructAndTable<ReponseStrucTable<ListType>>({ path: UserEndpoints.actions.paymentMethods() });
            if (column && column.length >= 1) {
                setList(response.list);
            } else {
                setColumn(response.columns);
                setPage({ current: response.currentPage, limit: response.limit, total: response.total, totalPages: response.totalPages });
                setActions(response.actions);
                setList(response.list);
                setTitle(response.pageTitle);
            }
        };
        void load();
    }, []);

    return {
        page,
        list,
        actions,
        column,
        title
    }
}
