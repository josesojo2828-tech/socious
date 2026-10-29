'use client';

import { create } from 'zustand';
import { apiClient } from "@/shared/api/api.client";
import { UserEndpoints } from "../services/user.endpoints";
import { Notification } from "@/types/backend/schema.types";

interface NotificationStoreState {
  notifications: Notification[];
  loading: boolean;
  error: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],
  loading: false,
  error: false,

  fetchNotifications: async () => {
    set({ loading: true, error: false });
    try {
      const response = await apiClient.get<{ data: Notification[] }>(UserEndpoints.notification.all());
      set({ notifications: response?.data?.data || [] });
    } catch {
      set({ error: true });
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    // Actualización optimista del contador y estado
    const current = get().notifications;
    set({
      notifications: current.map(n => n.id === id ? { ...n, read: true } : n)
    });
    try {
      await apiClient.post(UserEndpoints.notification.read(id));
    } catch (err) {
      console.error("Error al marcar notificación como leída:", err);
    }
  },

  markAllAsRead: async () => {
    // Actualización optimista
    const current = get().notifications;
    set({
      notifications: current.map(n => ({ ...n, read: true }))
    });
    try {
      await apiClient.post(UserEndpoints.notification.readAll());
    } catch (err) {
      console.error("Error al marcar todas las notificaciones como leídas:", err);
    }
  }
}));

export const useNotifications = () => {
  const notifications = useNotificationStore(state => state.notifications);
  const loading = useNotificationStore(state => state.loading);
  const error = useNotificationStore(state => state.error);
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
};
