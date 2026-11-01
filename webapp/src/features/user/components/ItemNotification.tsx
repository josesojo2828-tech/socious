import { useModalStore } from "@/shared/store/ui/useModalStore";
import { AlertTriangle, CheckCircle, Info, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { NotificationItemModal, type NotificationView } from "./modal/NotificationItemModal";
import { Button } from "@/shared/components/atoms/Button";
import { Text } from "@/shared/components/atoms/Text";

interface ItemNotificationProps {
    notif: NotificationView,
    markAsRead: (id: string) => void,
}

export function ItemNotification({ notif, markAsRead }: ItemNotificationProps) {

    const { openModal } = useModalStore();

    const deleteNotification = (id: number, e: MouseEvent) => {
        // e.stopPropagation();
        // setNotifications(notifications.filter(n => n.id !== id));
    };

    const getIcon = (type: string) => {
        const norm = type?.toLowerCase();
        switch (norm) {
            case 'success': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
            case 'error': return <AlertTriangle className="w-6 h-6 text-rose-500" />;
            default: return <Info className="w-6 h-6 text-emerald-500" />;
        }
    };

    return (
        <div
            key={notif.id}
            className={`group transition-all duration-200 border-b border-slate-100 dark:border-base-300/60 last:border-0 ${!notif.read ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-base-200/60'
                }`}
        >
            <div className="flex p-4 items-start gap-3">
                <div className="mt-1 shrink-0">
                    {getIcon(notif.type)}
                </div>

                <div className="flex-1 cursor-pointer min-w-0" onClick={() => openModal(<NotificationItemModal markAsRead={markAsRead} notification={notif} />)}>
                    <div className="flex justify-between items-start mb-0.5">
                        <Text as={'h3'} className={`font-semibold text-sm truncate ${!notif.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                            {notif.title}
                        </Text>
                        <Text as={'span'} className="text-[10px] text-slate-400 dark:text-slate-400 whitespace-nowrap ml-2">
                            {notif.time}
                        </Text>
                    </div>
                    <Text as={'p'} className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 leading-relaxed italic">
                        {notif.message}
                    </Text>
                </div>

                {!notif.read && (
                    <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" title="Nuevo"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
