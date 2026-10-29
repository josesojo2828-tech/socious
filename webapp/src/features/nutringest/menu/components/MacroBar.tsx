import { useTranslation } from "@/context/i18n.context";

interface MacroBarMenuProps {
    name: string;
    label: string;
    value: number;
    target: number;
    color: string;
}

export const MacroBarMenu = ({ name, label, value, target, color }: MacroBarMenuProps) => {
    const { t } = useTranslation();
    const percentage = Math.min((value / target) * 100, 100);
    const isOver = value > target;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm notranslate ${color}`} translate="no">
                        {label}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-base-content leading-tight">
                            {name}
                        </span>
                        <span className="text-xs text-base-content/70 font-semibold">
                            {value.toFixed(1)}g
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-base-content/50 uppercase tracking-tighter">
                        {t('dashboard.menu.obj')}: {target}g
                    </div>
                </div>
            </div>
            <div className="h-3 bg-base-200 rounded-full overflow-hidden shadow-inner relative">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${color} ${isOver ? 'opacity-80' : ''}`}
                    style={{ width: `${percentage}%` }}
                >
                    {percentage > 20 && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    )}
                </div>
            </div>
            {isOver && (
                <div className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                    {t('dashboard.menu.exceeds_target')}
                </div>
            )}
        </div>
    );
};
