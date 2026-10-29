  "use client";

  import { useModalStore } from "@/shared/store/ui/useModalStore";
  import { AlertTriangle, Bell, Check, CheckCircle, Info, Trash2 } from "lucide-react";
  import { useRef, useState } from "react";
  import { ItemNotification } from "../ItemNotification";
  import { useNotifications } from "../../hooks/useNotifications";

  export const UserNotificationsSection = () => {

    const { error, loading, notifications, markAsRead } = useNotifications();

    return (
      <div className="p-4 font-sans text-base-content">
        {/* Lista de Notificaciones */}
        <div className="flex flex-col gap-3">
          {
            loading
              ? <div>Cargando...</div>
              : (
                notifications.length === 0 || error|| notifications.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                    <p>No tienes notificaciones nuevas</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <ItemNotification markAsRead={markAsRead} key={notif.id} notif={notif} />
                  ))
                )
              )
          }
        </div>
      </div>
    );
  }