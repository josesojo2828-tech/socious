import { CreditCard, Plus } from "lucide-react";
import type { IPaymentMethod } from "@/types/backend/schema.types";

export const AddMethodButton = ({ method }: { method: Pick<IPaymentMethod, 'code' | 'name' | 'description'> }) => (
    <button className="flex items-center gap-4 p-4 w-full bg-base-100 border border-base-200 rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-left group">
        <div
            className="w-12 h-12 rounded-full flex items-center justify-center bg-base-200 text-base-content group-hover:bg-primary group-hover:text-primary-content transition-colors shrink-0"
        >
            {method.code === 'CARD' && <CreditCard size={20} />}
            {method.code === 'PAYPAL' && <span className="font-bold italic">P</span>}
            {method.code === 'CRYPTO' && <span className="font-bold">₿</span>}
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base-content text-sm">{method.name}</h3>
            <p className="text-xs text-base-content/60 truncate">{method.description}</p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
            <Plus size={20} />
        </div>
    </button>
);