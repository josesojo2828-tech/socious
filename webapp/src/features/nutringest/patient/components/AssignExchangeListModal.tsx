import React, { useState, useEffect } from 'react';
import { X, Search, Layers, Loader2, PieChart } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { ExchangeListEndpoints } from '@/features/nutringest/exchange-list/services/exchange-list.endpoint';
import { EATING_MOMENTS } from '@/features/nutringest/patient/lib/eating-moments';
import { useTranslation } from "@/context/i18n.context";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { exchangeListId: string, portions: number, eatingMoment: string }) => Promise<boolean>;
}

export const AssignExchangeListModal = ({ isOpen, onClose, onSubmit }: Props) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [availableLists, setAvailableLists] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [listId, setListId] = useState('');
    const [portions, setPortions] = useState<number>(1);
    const [eatingMoment, setEatingMoment] = useState('Almuerzo');

    // Fetch Lists
    useEffect(() => {
        if (!isOpen) return;
        const fetchLists = async () => {
            try {
                const response = await apiClient.get(ExchangeListEndpoints.actions.list());
                setAvailableLists(response.data.list || response.data || []);
            } catch (error) {
                console.error("Error fetching lists", error);
            }
        };
        fetchLists();
    }, [isOpen]);

    const filteredLists = availableLists.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!listId) return;

        setIsLoading(true);
        const success = await onSubmit({ exchangeListId: listId, portions: Number(portions), eatingMoment });
        setIsLoading(false);

        if (success) {
            onClose();
            setListId('');
            setPortions(1);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Layers size={18} />
                    </div>
                    {t('dashboard.modals.assign_exchange.title')}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-base-300 rounded-full text-base-content/50 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">

                {/* Selección de Lista */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-base-content/60 uppercase">{t('dashboard.modals.assign_exchange.group_label')}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                        <input
                            type="text"
                            placeholder={t('dashboard.modals.assign_exchange.search_placeholder')}
                            className="w-full pl-9 pr-3 py-2 bg-base-200 border border-base-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="border border-base-300 rounded-xl max-h-40 overflow-y-auto bg-base-100 mt-2">
                        {filteredLists.length === 0 ? (
                            <div className="p-4 text-center text-xs text-base-content/50">{t('dashboard.modals.assign_exchange.no_results')}</div>
                        ) : (
                            filteredLists.map(list => (
                                <div
                                    key={list.id}
                                    onClick={() => setListId(list.id)}
                                    className={`px-4 py-2 text-sm cursor-pointer border-b border-base-200 last:border-0 flex justify-between items-center transition-colors ${listId === list.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-base-200 text-base-content/90'
                                        }`}
                                >
                                    <span className="font-medium">{list.name}</span>
                                    <span className="text-xs text-base-content/50">~{list.baseKcal} kcal</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Porciones */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-base-content/60 uppercase">{t('dashboard.modals.assign_exchange.portions_label')}</label>
                        <div className="relative">
                            <PieChart className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                            <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                required
                                className="w-full pl-9 pr-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-blue-500"
                                value={portions}
                                onChange={(e) => setPortions(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Momento */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-base-content/60 uppercase">{t('dashboard.modals.assign_exchange.moment_label')}</label>
                        <select
                            className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-blue-500 appearance-none"
                            value={eatingMoment}
                            onChange={(e) => setEatingMoment(e.target.value)}
                        >
                            {EATING_MOMENTS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-base-300 rounded-lg text-sm font-medium hover:bg-base-200">
                        {t('dashboard.modals.assign_exchange.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={!listId || isLoading}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading && <Loader2 size={14} className="animate-spin" />}
                        {t('dashboard.modals.assign_exchange.assign')}
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
};