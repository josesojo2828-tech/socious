'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/shared/components/atoms/Button';
import { MenuDetail } from '../types/menu.details';
import { useTranslation } from "@/context/i18n.context";

interface Props {
    menu: MenuDetail;
    onAdd: () => void;
    onRemove: (mcId: string) => Promise<boolean>;
    canManage: boolean;
}

export const MenuCondimentsCard = ({ menu, onAdd, onRemove, canManage }: Props) => {
    const { t } = useTranslation();

    return (
        <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <span className="text-amber-600">🌿</span>
                    {t('dashboard.condiments_menu.title')}
                </h3>
                {canManage && (
                    <Button
                        variant="success"
                        size="sm"
                        onClick={onAdd}
                        className="gap-1.5"
                    >
                        <Plus size={16} />
                        {t('dashboard.condiments_menu.add_btn')}
                    </Button>
                )}
            </div>

            {menu.condiments && menu.condiments.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                    {menu.condiments.map((mc) => (
                        <span
                            key={mc.id}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-sm font-medium border border-amber-500/20"
                        >
                            {mc.condiment?.name}
                            {mc.quantity && (
                                <span className="text-amber-600/70 dark:text-amber-400/70 text-xs font-normal">
                                    {mc.quantity}{mc.unit || ''}
                                </span>
                            )}
                            {canManage && (
                                <button
                                    onClick={() => onRemove(mc.id)}
                                    className="p-0.5 text-amber-500/60 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-amber-500/20 rounded-full transition-all"
                                    title={t('dashboard.modals.add_condiment.remove_title')}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-base-content/50">{t('dashboard.condiments_menu.empty')}</p>
            )}
        </section>
    );
};
