import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Loader2 } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { MenuEndpoints } from '@/features/nutringest/menu/services/menu.endpoint';
import { ExchangeListEndpoints } from '@/features/nutringest/exchange-list/services/exchange-list.endpoint';
import { EATING_MOMENTS } from '@/features/nutringest/patient/lib/eating-moments';

interface Props {
    type: 'menu' | 'exchange' | 'supplement';
    onAdd: (item: any) => void;
}

export const PlanItemSelector = ({ type, onAdd }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [selectedId, setSelectedId] = useState('');
    const [eatingMoment, setEatingMoment] = useState('Desayuno');
    const [portions, setPortions] = useState(1);

    // Supplement specific
    const [suppName, setSuppName] = useState('');
    const [suppDose, setSuppDose] = useState('');
    const [suppFreq, setSuppFreq] = useState('');

    useEffect(() => {
        if (!isOpen || type === 'supplement') return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const endpoint = type === 'menu'
                    ? MenuEndpoints.actions.list()
                    : ExchangeListEndpoints.actions.list();

                const response = await apiClient.get(endpoint);
                setOptions(response.data.list || response.data || []);
            } catch (error) {
                console.error("Error cargando opciones", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [isOpen, type]);

    const handleAdd = () => {
        if (type === 'supplement') {
            if (!suppName) return;
            onAdd({ name: suppName, dose: suppDose, frequency: suppFreq });
        } else {
            if (!selectedId) return;
            const selectedOption = options.find(o => o.id === selectedId);
            onAdd({
                // Datos para guardar (IDs)
                menuId: type === 'menu' ? selectedId : undefined,
                exchangeListId: type === 'exchange' ? selectedId : undefined,
                eatingMoment,
                portions: type === 'exchange' ? Number(portions) : undefined,

                // Datos visuales para la lista local
                name: selectedOption?.name
            });
        }

        // Reset and close
        setIsOpen(false);
        setSelectedId('');
        setSuppName('');
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
            >
                <Plus size={14} /> Agregar
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-base-100 rounded-xl shadow-xl border border-base-300 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-base-content/60 uppercase">
                            Agregar {type === 'menu' ? 'Menú' : type === 'exchange' ? 'Intercambio' : 'Suplemento'}
                        </h4>
                        <button onClick={() => setIsOpen(false)} className="text-base-content/50 hover:text-base-content/80"><X size={16} /></button>
                    </div>

                    <div className="space-y-3">
                        {type === 'supplement' ? (
                            <>
                                <input placeholder="Nombre (ej: Whey)" className="input-sm w-full border rounded" value={suppName} onChange={e => setSuppName(e.target.value)} />
                                <input placeholder="Dosis (ej: 30g)" className="input-sm w-full border rounded" value={suppDose} onChange={e => setSuppDose(e.target.value)} />
                                <input placeholder="Frecuencia (ej: Diario)" className="input-sm w-full border rounded" value={suppFreq} onChange={e => setSuppFreq(e.target.value)} />
                            </>
                        ) : (
                            <>
                                {isLoading ? <div className="text-center text-xs py-2">Cargando...</div> : (
                                    <select
                                        className="w-full px-2 py-1.5 bg-base-200 border border-base-300 rounded-lg text-sm"
                                        value={selectedId}
                                        onChange={e => setSelectedId(e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {options.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}
                                    </select>
                                )}

                                <select
                                    className="w-full px-2 py-1.5 bg-base-200 border border-base-300 rounded-lg text-sm"
                                    value={eatingMoment}
                                    onChange={e => setEatingMoment(e.target.value)}
                                >
                                    {EATING_MOMENTS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>

                                {type === 'exchange' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-base-content/60">Porciones:</span>
                                        <input
                                            type="number" step="0.5"
                                            className="w-20 px-2 py-1 bg-base-200 border border-base-300 rounded-lg text-sm"
                                            value={portions}
                                            onChange={e => setPortions(Number(e.target.value))}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            type="button"
                            onClick={handleAdd}
                            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};