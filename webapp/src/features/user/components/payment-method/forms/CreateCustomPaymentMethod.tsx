import { HOST } from "@/constants";
import { usePaymentMethod } from "@/features/payment-method/hooks/usePaymentMethod";
import { Button } from "@/shared/components/atoms/Button";
import type { IPaymentMethod } from "@/types/backend/schema.types";
// import { PaypalData, PaypalForm } from "./PaypalForm";
// import { BinanceData, BinanceForm } from "./BinanceForm";
// import { PagoMovilData, PagoMovilForm } from "./PagoMovilForm";

interface CreateCustomPaymentMethodProps {
    cb: () => void;
    setElementToForm: (item: string) => void;
}

export function CreateCustomPaymentMethod({ setElementToForm }: CreateCustomPaymentMethodProps) {
    const { list, loading } = usePaymentMethod();
    if (loading) return <div>Loading...</div>

    console.log(list)

    return (
        <div className="grid md:grid-cols-3 gap-5">
            {
                list && list.length > 0 && list.map((item, index) => {
                    // Aseguramos que tengan el # si vienen sin él de la DB
                    const colorStart = `#${item.colorStart}`;
                    const colorEnd = `#${item.colorEnd}`;
                    const colorText = `#${item.colorText}`;

                    return (
                        <Button
                            key={index}
                            onClick={() => setElementToForm(item.id)}
                            className="w-full h-auto py-3 rounded-lg flex flex-col items-center justify-center font-bold shadow-md"
                            style={{
                                background: `linear-gradient(to right, ${colorStart}, ${colorEnd})`,
                                color: colorText
                            }}
                        >
                            <img src={`${HOST}${item.imagePath}`} alt={item.name} className="w-16 h-16 rounded-full" />
                            {item.name}
                        </Button>
                    )
                })
            }
        </div>
    )
}
