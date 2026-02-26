"use client";

/**
 * useNotifications hook — e-Dr TIM Delivery System
 * Migré depuis geolocation.js (section notifications)
 * Gestion des notifications FCM + polling API (30s)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getNotifications, type ApiNotification } from "@/lib/api-client";

const STORAGE_KEY = "delivery_fcm_notifications_v1";
const MAX_NOTIFICATIONS = 50;
const REFRESH_INTERVAL_MS = 30000;

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  content: string;
  receivedAt: string;
  read: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ========================
  // STORAGE HELPERS
  // ========================

  const saveToStorage = useCallback((notifs: AppNotification[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIFICATIONS)));
    } catch (e) {
      console.error("Erreur sauvegarde notifications:", e);
    }
  }, []);

  const loadFromStorage = useCallback((): AppNotification[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  }, []);

  // ========================
  // MERGE API + LOCAL
  // ========================

  const mergeWithApi = useCallback(
    (apiNotifs: ApiNotification[], current: AppNotification[]): AppNotification[] => {
      const existingIds = new Set(current.map((n) => n.id));
      const mapped: AppNotification[] = apiNotifs.map((n) => ({
        id: String(n.id),
        title: n.title,
        body: n.content,
        content: n.content,
        receivedAt: n.created_at,
        read: n.read,
      }));

      const merged = [...current];
      mapped.forEach((n) => {
        if (!existingIds.has(n.id)) {
          merged.push(n);
        } else {
          const idx = merged.findIndex((m) => m.id === n.id);
          if (idx !== -1) merged[idx].read = n.read;
        }
      });

      return merged
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
        .slice(0, MAX_NOTIFICATIONS);
    },
    []
  );

  // ========================
  // FETCH FROM API
  // ========================

  const fetchFromApi = useCallback(async () => {
    try {
      const apiNotifs = await getNotifications();
      setNotifications((current) => {
        const merged = mergeWithApi(apiNotifs, current);
        saveToStorage(merged);
        setUnreadCount(merged.filter((n) => !n.read).length);
        return merged;
      });
    } catch (e) {
      console.error("Erreur récupération notifications:", e);
    }
  }, [mergeWithApi, saveToStorage]);

  // ========================
  // ACTIONS
  // ========================

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((current) => {
        const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
        saveToStorage(updated);
        setUnreadCount(updated.filter((n) => !n.read).length);
        return updated;
      });
    },
    [saveToStorage]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => {
      const updated = current.map((n) => ({ ...n, read: true }));
      saveToStorage(updated);
      setUnreadCount(0);
      return updated;
    });
  }, [saveToStorage]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveToStorage([]);
    setUnreadCount(0);
  }, [saveToStorage]);

  const addFcmNotification = useCallback(
    (title: string, body: string) => {
      const newNotif: AppNotification = {
        id: Date.now().toString(),
        title,
        body,
        content: body,
        receivedAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((current) => {
        const updated = [newNotif, ...current].slice(0, MAX_NOTIFICATIONS);
        saveToStorage(updated);
        setUnreadCount((c) => c + 1);
        return updated;
      });
    },
    [saveToStorage]
  );

  // ========================
  // INITIALISATION
  // ========================

  useEffect(() => {
    const stored = loadFromStorage();
    setNotifications(stored);
    setUnreadCount(stored.filter((n) => !n.read).length);

    // Fetch initial
    fetchFromApi();

    // Auto-refresh toutes les 30s
    intervalRef.current = setInterval(fetchFromApi, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFromApi, loadFromStorage]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    addFcmNotification,
    refresh: fetchFromApi,
  };
}
