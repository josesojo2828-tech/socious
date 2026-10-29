import { Wallet } from "lucide-react";


export const PaymentCardVisual = ({ method }: { method: any }) => {
    const cardStyle = {
        background: `linear-gradient(135deg, ${method.paymentMethod.colorStart || '#333'} 0%, ${method.paymentMethod.colorEnd || '#000'} 100%)`,
        color: method.paymentMethod.colorText || '#fff'
    };
    const isCard = method.paymentMethod.code === 'CARD';

    return (
        <div
            className="relative w-full aspect-[1.58/1] rounded-2xl p-6 shadow-xl transition-transform hover:scale-[1.02] flex flex-col justify-between overflow-hidden group cursor-pointer"
            style={cardStyle}
        >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>

            <div className="flex justify-between items-start z-10">
                {isCard ? (
                    <div className="w-12 h-8 bg-white/20 rounded-md backdrop-blur-sm border border-white/10 flex items-center justify-center">
                        {/* Chip icon simulation */}
                        <div className="w-8 h-5 border border-white/30 rounded-[2px] grid grid-cols-2 gap-[1px]">
                            <div className="border-r border-white/30"></div>
                            <div></div>
                        </div>
                    </div>
                ) : <Wallet size={32} />}
            </div>

            <div className="z-10 mt-4">
                {isCard ? (
                    <div className="font-mono text-xl md:text-2xl tracking-widest opacity-90 drop-shadow-md truncate">
                        •••• •••• •••• {method.details.last4}
                    </div>
                ) : (
                    <div className="font-medium text-lg opacity-90">{method.details.email}</div>
                )}
            </div>

            <div className="flex justify-between items-end z-10 mt-auto">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase opacity-70 tracking-wider">Titular</span>
                    <span className="font-medium text-sm tracking-wide truncate max-w-[120px]">{method.details.holder || 'Usuario'}</span>
                </div>
                {isCard ? (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase opacity-70 tracking-wider">Vence</span>
                        <span className="font-medium text-sm tracking-wide">{method.details.expiry}</span>
                    </div>
                ) : (
                    <span className="font-bold text-lg opacity-80">{method.paymentMethod.name}</span>
                )}
            </div>
        </div>
    );
};