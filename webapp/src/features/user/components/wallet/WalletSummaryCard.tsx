'use client';

import { Wallet, Plus, ArrowUpRight, DollarSign, Banknote } from 'lucide-react';
import { useWalletAnalytics } from '../../hooks/analitics/useWalletAnalytics';
import { ExtractValue } from '@/shared/components/organisms/DynamicTable/StractValue';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { Button } from '@/shared/components/atoms/Button';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { UserEndpoints } from '../../services/user.endpoints';
import { useState, useEffect } from 'react';
import { useExchangeRate } from '@/shared/hooks/useExchangeRate';
import { apiClient } from '@/shared/api/api.client';

interface WalletSummaryCardProps {
    onReportPayment?: () => void;
}

interface WalletBalance {
    balance: number;
    balanceVES: number;
    rate: number;
    currency: string;
}

export const WalletSummaryCard = ({ onReportPayment }: WalletSummaryCardProps) => {
    const { wallet } = useWalletAnalytics();
    const { openModal, closeModal } = useModalStore();
    const { rate, loading: rateLoading } = useExchangeRate();
    const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'VES'>('USD');
    const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await apiClient.get<WalletBalance>('/api/wallet/balance');
                setWalletBalance(res.data);
            } catch (err) {
                console.error('Error fetching wallet balance:', err);
            }
        };
        fetchBalance();
    }, []);

    const handleReportClick = () => {
        const callback = (param: unknown) => {
            closeModal();
            window.location.reload();
        };
        openModal(<DynamicRenderForm cb={callback} path={UserEndpoints.form.wallet.report} />);
    };

    const displayBalance = walletBalance
        ? displayCurrency === 'VES'
            ? walletBalance.balanceVES
            : walletBalance.balance
        : wallet.data?.balance || 0;

    const formatCurrency = (amount: number, currency: 'USD' | 'VES') => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="relative overflow-hidden bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300 text-base-content">
            {/* Fondo Decorativo */}
            <div className="absolute -right-6 -bottom-6 text-base-content opacity-5 rotate-12 pointer-events-none">
                <Wallet size={180} strokeWidth={1} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                {/* Sección Izquierda: Información de Saldo */}
                <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-success/10 rounded-lg text-success">
                            <Wallet size={20} />
                        </div>
                        <span className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
                            Saldo Disponible
                        </span>
                    </div>

                    <div className="mt-1">
                        {wallet.loading || rateLoading ? (
                            <div className="h-10 w-48 bg-base-300 animate-pulse rounded-md"></div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="text-4xl font-mono font-extrabold text-base-content tracking-tight">
                                    {formatCurrency(displayBalance, displayCurrency)}
                                </div>

                                {/* Toggle USD/VES */}
                                <button
                                    onClick={() => setDisplayCurrency(displayCurrency === 'USD' ? 'VES' : 'USD')}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-base-200 hover:bg-base-300 transition-colors text-xs font-bold text-base-content/80"
                                    title={displayCurrency === 'USD' ? 'Ver en Bolívares' : 'Ver en Dólares'}
                                >
                                    {displayCurrency === 'USD' ? (
                                        <>
                                            <Banknote size={14} />
                                            <span>USD</span>
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign size={14} />
                                            <span>Bs</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Show converted amount */}
                    {walletBalance && rate && (
                        <p className="text-sm text-base-content/60 mt-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-success inline-block"></span>
                            {displayCurrency === 'USD'
                                ? `≈ ${formatCurrency(walletBalance.balanceVES, 'VES')}`
                                : `≈ ${formatCurrency(walletBalance.balance, 'USD')}`}
                            <span className="text-xs text-base-content/50 ml-1">
                                (BCV: {rate?.toFixed(2)} Bs/$)
                            </span>
                        </p>
                    )}

                    <p className="text-sm text-base-content/60 mt-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success inline-block"></span>
                        Billetera activa y verificada
                    </p>
                </div>

                {/* Sección Derecha: Botón de Acción */}
                <div className="w-full md:w-auto">
                    <Button
                        onClick={handleReportClick}
                        className="group relative btn-xl flex items-center justify-center gap-3 w-full md:w-auto px-8 btn-primary text-primary-content rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium opacity-80 uppercase">Nueva Acción</span>
                            <span className="text-base font-bold">Reportar Pago</span>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg ml-2 group-hover:bg-white/30 transition-colors">
                            <Plus size={20} className="text-current" />
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    );
};
