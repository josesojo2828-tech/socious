import { useUniqueObject } from "@/shared/hooks/crud/useUniqueObject"
import { IUserPaymentMethod } from "@/types/backend/schema.types";
import { UserEndpoints } from "../../services/user.endpoints";
import { Bitcoin, CreditCard, Wallet } from "lucide-react";
import { HOST } from "@/constants";
import { ExtractValue } from "@/shared/components/organisms/DynamicTable/StractValue";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { Button } from "@/shared/components/atoms/Button";
import { DynamicRenderForm } from "@/shared/components/organisms/DynamicForm/DynamicRenderForm";

interface FichaPaymentMethodProps {
    id: string;
    HandleDelete: (id: string) => void;
    HandleUpdate: (id: string) => void;
}

export function FichaPaymentMethod({ id, HandleDelete, HandleUpdate }: FichaPaymentMethodProps) {

    const { closeModal, openModal } = useModalStore();
    const { entity } = useUniqueObject<IUserPaymentMethod>({ path: UserEndpoints.actions.paymentMethodUnique(id), extraKey: 'methods' });

    const getMetaInfo = () => {
        try {
            const details = entity?.details as any;
            const innerDetails = details?.dateails || details?.details || details || {};
            const code = entity?.paymentMethod?.code;

            if (code === 'CARD') {
                return {
                    title: innerDetails?.brand || 'Tarjeta',
                    sub: `•••• •••• •••• ${innerDetails?.last4 || '0000'}`,
                    exp: innerDetails?.expMonth && innerDetails?.expYear ? `${innerDetails.expMonth}/${innerDetails.expYear}` : null
                };
            }
            if (code === 'PAYPAL' || entity?.paymentMethodId === 'PayPal') {
                return { 
                    title: 'PayPal', 
                    sub: innerDetails?.email ? `Cuenta: ${innerDetails.email}` : 'Cuenta vinculada' 
                };
            }
            if (code === 'CRYPTO') {
                const addr = innerDetails?.walletAddress || '';
                return {
                    title: 'Wallet Crypto',
                    sub: addr ? `${addr.substring(0, 6)}...${addr.slice(-4)}` : 'Dirección no disponible'
                };
            }
            if (code === 'PagoMobil' || entity?.paymentMethodId === 'PagoMobil') {
                return {
                    title: innerDetails?.bank || 'Pago Móvil',
                    sub: `Tel: ${innerDetails?.phone || ''} | CI: ${innerDetails?.identity || ''}`
                };
            }
            if (code === 'Binance' || entity?.paymentMethodId === 'Binance') {
                return {
                    title: 'Binance Pay',
                    sub: `Email: ${innerDetails?.email || ''} | ID/Usuario: ${innerDetails?.username || ''}`
                };
            }
            return { 
                title: entity?.paymentMethod?.name || 'Método de Pago', 
                sub: innerDetails ? JSON.stringify(innerDetails) : 'Detalles no disponibles' 
            };
        } catch {
            return { title: entity?.paymentMethod?.name || 'Método de Pago', sub: 'Error en datos' };
        }
    };

    const renderIcon = () => {
        if (entity?.paymentMethod.imagePath) {
            return <img width={200} height={200} src={`${HOST}${entity?.paymentMethod.imagePath}`} alt="icon" className="w-6 h-6 object-contain" />;
        }
        // Iconos por defecto
        const iconProps = { size: 24, style: { color: brandColor } };

        switch (entity?.paymentMethod.code) {
            case 'BTC': case 'CRYPTO': return <Bitcoin {...iconProps} />;
            case 'PAYPAL': return <Wallet {...iconProps} />;
            default: return <CreditCard {...iconProps} />;
        }
    };

    const brandColor = entity?.paymentMethod.colorStart || '#6366f1';
    const meta = getMetaInfo();

    return (
        <>
            <div
                style={{
                    color: `#${entity?.paymentMethod.colorText}`,
                    background: `linear-gradient(135deg, #${entity?.paymentMethod.colorStart}, #${entity?.paymentMethod.colorEnd})`,
                }}
                className={`group relative flex items-center justify-between p-4`}
            >
                <div className="flex items-center gap-4">
                    {/* Contenedor del Icono: Estilo "Soft" con opacidad */}
                    <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center transition-colors"
                        style={{ backgroundColor: `${brandColor}15` }} // 15 es hex para ~10% opacidad
                    >
                        {renderIcon()}
                    </div>

                    {/* Información Principal */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm md:text-base">
                                {meta.title}
                            </span>
                        </div>
                        <span className="text-xs md:text-sm font-medium font-mono mt-0.5">
                            {meta.sub}
                        </span>
                    </div>
                </div>

                {/* Acción / Estado (Derecha) */}
                <div className="flex items-center gap-3">
                    {meta.exp && (
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-[10px] text-base-content/50 uppercase font-bold">Expira</span>
                            <span className="text-xs text-base-content/70 font-medium">{meta.exp}</span>
                        </div>
                    )}
                </div>
            </div>
            <footer className="flex items-center justify-end gap-2 p-4 border-t border-base-300">
                <Button onClick={() => HandleUpdate(id)}>Editar</Button>
                <Button onClick={() => HandleDelete(id)}>Eliminar</Button>
                <Button onClick={() => closeModal()}>Cerrar</Button>
            </footer>
        </>
    )
}
