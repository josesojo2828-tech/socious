import React from 'react';
import { ArrowLeft, Share2, Edit3, Utensils } from 'lucide-react';
import Link from 'next/link';
import { ExchangeListDetail } from '../types/exchange-list.unique.type';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { ExchangeListEndpoints } from '../services/exchange-list.endpoint';
import { useModalStore } from '@/shared/store/ui/useModalStore';

interface Props {
    list: ExchangeListDetail;
    pageId: string;
    refresh: () => void;
}

const Badge = ({ children, color = "gray" }: { children: React.ReactNode, color?: "orange" | "blue" | "gray" }) => {
    const colors = {
        orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        blue: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        gray: "bg-base-200 text-base-content/70 border-base-300",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${colors[color]}`}>
            {children}
        </span>
    );
};

export const ExchangeListHeader = ({ list, pageId, refresh }: Props) => {
    const { openModal, closeModal } = useModalStore();

    return (
        <div className="flex flex-col gap-6">
            {/* 1. TOP BAR NAVIGATION */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-xs font-bold text-base-content/70 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider"
                >
                    <ArrowLeft size={16} /> Regresar
                </button>
                <div className="flex gap-2">
                    {/* <button className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-emerald-600">
                        <Share2 size={18} />
                    </button> */}
                    {/* Aquí podrías abrir el modal de edición */}
                    <button onClick={() => openModal(<DynamicRenderForm cb={() => { closeModal(); refresh() }} path={ExchangeListEndpoints.forms.update(pageId)} pathSend={ExchangeListEndpoints.actions.update(pageId)} />)} className="btn btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white gap-2 shadow-lg shadow-emerald-500/20">
                        <Edit3 size={16} />
                        Editar Lista
                    </button>
                </div>
            </div>

            {/* 2. HEADER CARD */}
            <div className="bg-base-100 rounded-2xl p-6 border border-base-300 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1">
                    <div className="flex gap-2 mb-3">
                        {list.tags && list.tags.length > 0
                            ? list.tags.map(tag => <Badge key={tag} color="gray">#{tag}</Badge>)
                            : <Badge color="gray">#General</Badge>
                        }
                    </div>
                    <h1 className="text-3xl font-black text-base-content mb-2">{list.name}</h1>
                    <p className="text-base-content/70 leading-relaxed text-sm md:text-base">
                        {list.description}
                    </p>
                </div>
                {/* KPI Rápido */}
                <div className="flex items-center gap-4 bg-orange-500/10 px-5 py-4 rounded-xl border border-orange-500/20 shrink-0">
                    <div className="p-3 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full">
                        <Utensils size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Total Opciones</p>
                        <p className="text-2xl font-black text-base-content">{list.items.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};