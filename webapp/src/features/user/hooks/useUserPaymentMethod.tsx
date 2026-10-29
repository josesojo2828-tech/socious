import { useEffect, useState } from "react"
import { GetStructAndTable } from "../services/user.service";
import { UserEndpoints } from "../services/user.endpoints";
import { ReponseStrucTable } from "@/types/requets";
import { IUserPaymentMethod } from "@/types/backend/schema.types";
import { Column } from "@/types/backend/table.type";

interface Props {}

type ListType = IUserPaymentMethod

export const useUserPaymentMethod = ({ }: Props) => {
    const [title, setTitle] = useState('');
    const [list, setList] = useState<ListType[]>([]);
    const [page, setPage] = useState<{ current: number, total: number; limit: number, totalPages:number }>({ current:1,limit:10,total:10, totalPages: 1 });
    const [column, setColumn] = useState<Column[]>([]);
    const [actions, setActions] = useState<any>({});

    // Get initial Data and Struct
    const GetInitialPaginate = async () => {
        const response = await GetStructAndTable<ReponseStrucTable<ListType>>({ path: UserEndpoints.actions.paymentMethods() });
        setColumn(response.columns);
        setPage({ current:response.currentPage, limit:response.limit, total:response.total, totalPages:response.totalPages });
        setActions(response.actions);
        setList(response.list);
        setTitle(response.pageTitle);
    }

    // Get unique data 
    const GetPaginate = async () => {
        const response = await GetStructAndTable<ReponseStrucTable<ListType>>({ path: UserEndpoints.actions.paymentMethods() });
        setList(response.list);
    }

    useEffect(() => {
        if(column && column.length >= 1) GetPaginate()
        else GetInitialPaginate()
    }, []);

    return {
        page,
        list,
        actions,
        column,
        title
    }
}

