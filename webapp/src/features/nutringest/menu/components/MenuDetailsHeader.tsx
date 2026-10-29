import React from 'react';
import { ArrowLeft, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { MenuDetailProps } from '../types/menu.details';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { MenuEndpoints } from '../services/menu.endpoint';

export const MenuDetailHeader = ({ menu, reload }: MenuDetailProps) => {
    const { openModal, closeModal } = useModalStore();

    return (
        <header className="mt-6 px-6 py-4 flex flex-col gap-3">
            <Link 
                href="/dashboard/menu"
                className="flex items-center gap-2 text-xs font-bold text-base-content/70 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider self-start"
            >
                <ArrowLeft size={16} /> Regresar
            </Link>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="text-xs font-medium text-base-content/70 flex items-center gap-1 mb-0.5">
                            Menús <span className="text-base-content/30">/</span> {menu.category || 'GENERAL'}
                        </div>
                        <h1 className="text-lg font-bold text-base-content leading-none">{menu.name}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => openModal(<DynamicRenderForm pathSend={MenuEndpoints.actions.update(menu.id)} cb={() => { closeModal(); reload() }} path={MenuEndpoints.forms.update(menu.id)} />)} className="btn btn-outline btn-sm border-base-300 text-base-content/80 hover:bg-base-200 gap-2">
                        <Edit3 size={16} />
                        Editar
                    </button>
                </div>
            </div>
        </header>
    );
};